"""FastAPI main entry point."""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, AsyncGenerator, Callable
from datetime import datetime, timezone
import uuid
import json
import time
import asyncio

from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from starlette.requests import Request
from starlette.responses import JSONResponse

from .config import config
from .llm.client import create_llm_client
from .memory.session import get_session_memory, Session
from .memory.feedback import get_feedback_memory
from .tools.base import get_tool_registry
from .agents import ensure_initialized, get_agent, AgentType
from .agents.base import AgentResponse
from .guardrails.sanitization import sanitize_user_input
from .utils.logger import logger
from .utils.tracing import TraceContext, get_trace_summary


class GuestbookMessageRequest(BaseModel):
    author: str = "匿名"
    content: str
    avatar: Optional[str] = None
    isOwnerReply: bool = False
    replyTo: Optional[str] = None


# ============ Rate Limiting Setup ============
# Uses slowapi with IP-based rate limiting.
# Different routes have different limits to prevent API abuse.
limiter = Limiter(key_func=get_remote_address)


def _rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    """Custom 429 handler with Retry-After header."""
    retry_after = getattr(exc, "retry_after", 60)
    logger.warning("Rate limit exceeded", path=str(request.url.path), client=get_remote_address(request))
    return JSONResponse(
        status_code=429,
        content={
            "detail": "请求过于频繁，请稍后再试。(Too Many Requests)",
            "retry_after": retry_after,
        },
        headers={"Retry-After": str(retry_after)},
    )


# Create FastAPI app
app = FastAPI(
    title="Heya Studio Backend",
    description="AI Agent backend for Heya Studio",
    version="1.0.0"
)

# Register rate limiter state and exception handler
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request models - must match frontend AgentChatRequest
class AgentChatRequest(BaseModel):
    """Agent chat request from frontend."""
    message: str
    sessionId: Optional[str] = None
    context: Optional[Dict[str, Any]] = None


class BackendPageConfig(BaseModel):
    """Page config in request context."""
    version: Optional[str] = "1.0"
    metadata: Optional[Dict[str, Any]] = None
    theme: Optional[Dict[str, Any]] = None
    layout: Optional[Dict[str, Any]] = None
    components: Optional[List[Dict[str, Any]]] = None


class CreatePageRequest(BaseModel):
    """Create page request from frontend save action."""
    title: str
    slug: Optional[str] = None
    pageConfig: Dict[str, Any]
    themeId: Optional[str] = None
    isPublic: bool = True


class UpdatePageRequest(BaseModel):
    """Update page request from frontend save action."""
    title: Optional[str] = None
    pageConfig: Optional[Dict[str, Any]] = None
    themeId: Optional[str] = None
    isPublic: Optional[bool] = None
    isPublished: Optional[bool] = None


_PAGE_STORE: Dict[str, Dict[str, Any]] = {}


def _now_iso() -> str:
    """Return UTC ISO timestamp for mock persistence records."""
    return datetime.now(timezone.utc).isoformat()


def _slugify_title(title: str) -> str:
    """Create a simple stable slug from title for local mock pages."""
    normalized = "".join(ch.lower() if ch.isalnum() else "-" for ch in title.strip())
    normalized = "-".join(part for part in normalized.split("-") if part)
    return normalized[:48] or f"page-{uuid.uuid4().hex[:8]}"


def _make_page_response(page: Dict[str, Any]) -> Dict[str, Any]:
    """Normalize internal page record to frontend PageResponse shape."""
    return {
        "id": page["id"],
        "user_id": page.get("user_id", "local-user"),
        "title": page["title"],
        "slug": page["slug"],
        "page_config": page["page_config"],
        "theme_id": page.get("theme_id"),
        "is_public": page.get("is_public", True),
        "is_published": page.get("is_published", False),
        "view_count": page.get("view_count", 0),
        "created_at": page["created_at"],
        "updated_at": page["updated_at"],
    }


def _frontend_template(template: Dict[str, Any], similarity: Optional[float] = None) -> Dict[str, Any]:
    """Normalize Python template records to the frontend BackendTemplate shape."""
    template_id = template.get("id", f"template-{uuid.uuid4().hex[:8]}")
    style = template.get("style") or template.get("theme") or "sakura"
    item = {
        "id": template_id,
        "name": template.get("name", "未命名模板"),
        "description": template.get("description", ""),
        "category": style,
        "tags": template.get("tags", [style]),
        "thumbnailUrl": template.get("preview_url") or template.get("thumbnailUrl"),
        "previewUrl": template.get("preview_url") or template.get("previewUrl"),
        "templateConfig": template.get("config", {"version": "1.0", "theme": {"id": style}, "components": []}),
        "isOfficial": True,
        "creatorId": "heya-studio",
        "useCount": 0,
        "ratingAverage": None,
        "ratingCount": 0,
        "createdAt": "2026-04-29T00:00:00+00:00",
        "updatedAt": "2026-04-29T00:00:00+00:00",
    }
    if similarity is not None:
        item["similarity"] = similarity
    return item


# Workflow step for streaming status
class WorkflowStep(BaseModel):
    """A single step in the agent workflow."""
    type: str = Field(..., description="Step type: status|thinking|tool_call|tool_result|profile_update|skill_match|generating|validation|done|error|ask_user|suggestion")
    message: str = Field(..., description="Human-readable status message")
    data: Optional[Dict[str, Any]] = None
    timestamp: float = Field(default_factory=time.time)


# Response models - must match frontend AgentChatResponse
class AgentChatResponse(BaseModel):
    """Agent chat response to frontend."""
    sessionId: str
    response: str
    action: Optional[Dict[str, Any]] = None
    currentConfig: Optional[Dict[str, Any]] = None
    suggestions: Optional[List[Dict[str, Any]]] = None
    requiresConfirmation: Optional[bool] = False
    state: Optional[str] = None
    # New field: workflow steps for status visualization
    workflow: Optional[List[Dict[str, Any]]] = None


# Workflow event collector - captures agent execution steps
class WorkflowCollector:
    """Collects workflow events during agent execution."""
    
    def __init__(self):
        self.steps: List[WorkflowStep] = []
        self._callbacks: List[Callable[[WorkflowStep], None]] = []
    
    def add_step(self, type: str, message: str, data: Optional[Dict[str, Any]] = None):
        """Add a workflow step."""
        step = WorkflowStep(type=type, message=message, data=data)
        self.steps.append(step)
        # Notify callbacks (for SSE streaming)
        for callback in self._callbacks:
            callback(step)
    
    def on_step(self, callback: Callable[[WorkflowStep], None]):
        """Register a callback for new steps."""
        self._callbacks.append(callback)
    
    def to_dict_list(self) -> List[Dict[str, Any]]:
        """Convert steps to list of dicts."""
        return [step.model_dump() for step in self.steps]
    
    def clear(self):
        """Clear all steps."""
        self.steps.clear()
        self._callbacks.clear()


# Global workflow collector for current request
_current_workflow: Optional[WorkflowCollector] = None


def get_workflow_collector() -> WorkflowCollector:
    """Get current workflow collector."""
    global _current_workflow
    if _current_workflow is None:
        _current_workflow = WorkflowCollector()
    return _current_workflow


def emit_workflow_event(type: str, message: str, data: Optional[Dict[str, Any]] = None):
    """Emit a workflow event to the current collector."""
    collector = get_workflow_collector()
    collector.add_step(type, message, data)


# Initialize on startup
@app.on_event("startup")
async def startup_event():
    """Initialize on startup."""
    logger.info("Heya Studio Backend starting up...")
    ensure_initialized()
    logger.info("Startup complete", mock_llm=config.llm.mock)


@app.get("/")
@limiter.limit("30/minute")
async def root(request: Request):
    """Root endpoint."""
    return {"message": "Heya Studio Backend", "version": "1.0.0"}


@app.get("/health")
@limiter.limit("60/minute")
async def health_check(request: Request):
    """Health check endpoint."""
    return {"status": "healthy", "config": {"mock_llm": config.llm.mock}}


@app.post("/api/agent/chat", response_model=AgentChatResponse)
@limiter.limit("10/minute")
async def agent_chat(request: Request, chat_request: AgentChatRequest):
    """
    Main agent chat endpoint.
    
    This is the core API that frontend calls for all agent interactions.
    
    Flow:
    1. Get or create session
    2. Route to appropriate agent (Router Agent)
    3. Process with target agent
    4. Return response in AgentChatResponse format
    """
    
    # Reset workflow collector for this request
    global _current_workflow
    _current_workflow = WorkflowCollector()
    workflow = get_workflow_collector()
    
    # Ensure initialized
    ensure_initialized()
    
    # Get session memory
    memory = get_session_memory()
    
    # Get or create session
    if chat_request.sessionId:
        session = memory.get_session(chat_request.sessionId)
        if not session:
            session = memory.create_session(chat_request.sessionId)
    else:
        session = memory.create_session()
    
    # Add message to session
    session.add_message("user", chat_request.message)
    
    # Sanitize user input to prevent prompt injection
    sanitized_message = sanitize_user_input(chat_request.message)
    
    # Build context
    context = chat_request.context or {}
    if context.get("existingConfig"):
        session.save_config(context["existingConfig"])
    
    # Emit initial status
    workflow.add_step("status", "🤔 正在分析你的需求...", {"intent": "analyze"})
    
    # Get router agent
    router = get_agent(AgentType.ROUTER)
    if not router:
        workflow.add_step("error", "❌ Router agent 未初始化", {"error": "Router not initialized"})
        raise HTTPException(status_code=500, detail="Router agent not initialized")
    
    # Tier 2: Agent Tracing - 追踪整个请求链路
    trace_ctx = TraceContext("handle_chat", input_summary=sanitized_message[:100])
    trace_ctx.__enter__()
    
    try:
        # Route to appropriate agent
        workflow.add_step("thinking", "正在判断你的意图...")
        
        # Tracing: Router Agent span
        router_span = trace_ctx.root_span.create_child("router_agent", input_summary=sanitized_message[:80])
        router_response = await router.run(sanitized_message, session, context)
        router_span.set_output(f"intent={router_response.action.get('data', {}).get('intent', 'chat')}")
        router_span.end()
        
        # Get target agent from router result
        target_agent_type = router_response.action.get("data", {}).get("intent", "chat")
        extracted_context = router_response.action.get("data", {}).get("extracted_context", {})
        
        # Emit routing result
        workflow.add_step("status", f"✅ 识别到意图：{target_agent_type}", {"intent": target_agent_type})
        
        # Emit extracted context
        if extracted_context:
            for key, value in extracted_context.items():
                if value:
                    workflow.add_step("profile_update", f"✅ 识别到：{key} = {value}", {"field": key, "value": value})
        
        # Map intent to agent type
        agent_type_map = {
            "new_page": AgentType.DESIGN,
            "modify_page": AgentType.MODIFY,
            "chat": AgentType.CHAT
        }
        
        target_type = agent_type_map.get(target_agent_type, AgentType.CHAT)
        target_agent = get_agent(target_type)
        
        if not target_agent:
            workflow.add_step("error", f"❌ Agent {target_type} 未初始化", {"error": f"Agent {target_type} not initialized"})
            raise HTTPException(status_code=500, detail=f"Agent {target_type} not initialized")
        
        # Merge extracted context
        context.update(extracted_context)
        
        # Run target agent with workflow events (use sanitized input)
        # Tracing: Target Agent span
        target_span = trace_ctx.root_span.create_child(f"{target_type.value}_agent", input_summary=sanitized_message[:80])
        if target_type == AgentType.DESIGN:
            agent_response = await _run_design_agent_with_workflow(target_agent, sanitized_message, session, context, workflow)
        elif target_type == AgentType.MODIFY:
            agent_response = await _run_modify_agent_with_workflow(target_agent, sanitized_message, session, context, workflow)
        else:
            # Chat Agent 思考过程
            workflow.add_step("thinking", "🤖 分析你的问题...")
            # 尝试判断是否是 FAQ 匹配
            if any(kw in sanitized_message.lower() for kw in ["怎么", "如何", "什么是", "帮助", "功能"]):
                workflow.add_step("observing", "📚 匹配到知识库答案")
            else:
                workflow.add_step("acting", "⚡ 正在思考回复...")
            agent_response = await target_agent.run(sanitized_message, session, context)
            workflow.add_step("observing", "📊 生成个性化回复")
        target_span.set_output(agent_response.response[:100] if agent_response.response else "")
        target_span.end()
        
        # Save session
        memory.save_session(session)
        
        # Add agent response to session
        if agent_response.response:
            session.add_message("assistant", agent_response.response)
        
        # Emit completion
        workflow.add_step("done", "✨ 完成！", {
            "config": agent_response.current_config,
            "response": agent_response.response[:100] if agent_response.response else ""
        })
        
        # Add suggestions
        if agent_response.suggestions:
            suggestion_texts = [s.get("name", "") for s in agent_response.suggestions[:3]]
            workflow.add_step("suggestion", "💡 你可以说：", {"suggestions": suggestion_texts})
        
        # Finalize trace
        trace_ctx.set_output(f"intent={target_agent_type}, response_len={len(agent_response.response or '')}")
        trace_ctx.__exit__(None, None, None)
        
        # Build response - must match frontend AgentChatResponse
        response = AgentChatResponse(
            sessionId=session.id,
            response=agent_response.response,
            action=agent_response.action,
            currentConfig=agent_response.current_config,
            suggestions=agent_response.suggestions,
            requiresConfirmation=agent_response.requires_confirmation,
            state=agent_response.state or session.state.value,
            workflow=workflow.to_dict_list()
        )
        
        return response
        
    except Exception as e:
        # Finalize trace with error
        trace_ctx.__exit__(type(e), e, e.__traceback__)
        
        # Error handling - return friendly message
        workflow.add_step("error", f"❌ 处理失败：{str(e)}", {"error": str(e)})
        
        return AgentChatResponse(
            sessionId=session.id,
            response=f"抱歉，处理时出现了一些问题：{str(e)}。请再试一次。",
            action={"type": "error", "data": {"error": str(e)}},
            currentConfig=session.get_config(),
            state=session.state.value,
            workflow=workflow.to_dict_list()
        )


async def _run_design_agent_with_workflow(
    agent, 
    message: str, 
    session: Session, 
    context: Dict[str, Any],
    workflow: WorkflowCollector
) -> AgentResponse:
    """Run design agent with workflow events."""
    
    # Check if we have enough info
    profile = session.get_profile() or {}
    mbti = profile.get("mbti", "")
    _oshi = profile.get("oshi")
    if isinstance(_oshi, list) and _oshi:
        oshi_name = _oshi[0].get("name", "") if isinstance(_oshi[0], dict) else str(_oshi[0])
    elif isinstance(_oshi, dict):
        oshi_name = _oshi.get("name", "")
    else:
        oshi_name = ""
    
    # Router 阶段：补充用户画像信息
    workflow.add_step("thinking", "🤖 分析你的需求...")
    if mbti or oshi_name:
        workflow.add_step("thinking", f"📋 识别到用户画像: {f'MBTI {mbti}' if mbti else ''}{'，推: ' + oshi_name if oshi_name else ''}")
    workflow.add_step("thinking", "🎯 识别意图: 创建新页面")
    
    if not profile.get("oshi") and not profile.get("mbti"):
        workflow.add_step("ask_user", "需要更多信息来生成主页", {
            "question": "告诉我你的推是谁，或者你的 MBTI？",
            "options": ["我有推し角色", "我的 MBTI 是...", "跳过，直接生成"]
        })
    
    # Match skill - 风格匹配阶段
    workflow.add_step("thinking", "💭 正在匹配最适合你的风格...")
    from .skills.loader import get_skill_loader
    skill_loader = get_skill_loader()
    skill = skill_loader.match_skill(message, profile)
    
    if skill:
        theme_id = skill.id.replace("-style", "")
        workflow.add_step("thinking", f"💭 匹配到「{skill.name}」风格，{theme_id}色调")
        workflow.add_step("skill_match", f"🎨 匹配到「{skill.name}」", {
            "skill": skill.id,
            "reason": "关键词匹配"
        })
    else:
        theme_id = "sakura"
        workflow.add_step("thinking", "💭 使用默认「樱花风」风格")
        workflow.add_step("skill_match", "🎨 使用默认「樱花风」", {
            "skill": "sakura-style",
            "reason": "默认风格"
        })
    
    # === LLM call 闭包，用于 GenerateConfigLLMTool 和 Self-Reflection ===
    async def llm_call(messages, schema=None):
        from .llm.client import Message
        formatted = [Message(role=m["role"], content=m["content"]) for m in messages]
        if schema:
            return await agent.llm.chat_with_schema(messages=formatted, schema=schema, temperature=0.7)
        else:
            return await agent.llm.chat(messages=formatted, temperature=0.7)
    
    from .tools.config_llm import GenerateConfigLLMTool, GenerateConfigInput
    from .agents.self_reflect import self_reflect
    from .utils.tracing import TraceContext
    
    # === Self-Reflection + Retry 循环 ===
    max_retries = 2
    retry_count = 0
    gen_result = None
    reflection = None
    rewrite_guidance = None
    
    while retry_count <= max_retries:
        # 配置生成阶段：生成前展示 LLM 的思考
        profile_desc = f"{mbti}" if mbti else "通用"
        if oshi_name:
            profile_desc += f" + {oshi_name}粉丝"
        workflow.add_step("thinking", f"💭 基于用户画像（{profile_desc}），规划 {theme_id} 风格布局...")
        workflow.add_step("thinking", "💭 需要包含组件: hero-section, oshi-card, attribute-wall...")
        
        workflow.add_step("acting", "⚡ 调用 LLM 生成完整配置...")
        workflow.add_step("generating", f"🤖 正在生成页面配置... (尝试 {retry_count + 1}/{max_retries + 1})", {"theme": theme_id, "attempt": retry_count + 1})
        
        gen_tool = GenerateConfigLLMTool(llm_call=llm_call)
        gen_input = GenerateConfigInput(user_profile=profile, theme_id=theme_id, rewrite_guidance=rewrite_guidance)
        
        # Tier 2 Tracing: GenerateConfigLLM span
        from .utils.tracing import get_trace_store
        _gen_span = get_trace_store().get_recent(1)
        # 简单记录，不嵌套（因为这里不在 TraceContext 内）
        from .utils.tracing import TraceSpan as _TS
        _llm_span = _TS(span_name="generate_config_llm", input_summary=f"theme={theme_id}, attempt={retry_count+1}")
        gen_result = await gen_tool.execute(gen_input)
        _llm_span.set_output(f"components={len(gen_result.config.components or [])}, errors={len(gen_result.quality_errors)}")
        _llm_span.end()
        
        # 配置生成阶段：生成后观察结果
        component_count = len(gen_result.config.components or [])
        workflow.add_step("observing", f"📊 LLM 返回 {component_count} 个组件，文案已个性化")
        workflow.add_step("generating", f"✅ 生成了 {component_count} 个组件", {"component_count": component_count})
        
        # === Self-Reflection 节点 ===
        workflow.add_step("thinking", "🔍 开始自我评估配置质量...")
        workflow.add_step("tool_call", "🔍 正在自我评估配置质量...", {"tool": "self_reflect"})
        
        reflection = await self_reflect(
            llm_call=llm_call,
            profile=profile,
            theme_id=theme_id,
            config=gen_result.config.model_dump()
        )
        
        # Self-Reflection 结果展示
        workflow.add_step("thinking", f"📊 评估结果: {reflection.score}/10 分")
        if reflection.issues:
            for issue in reflection.issues[:2]:
                workflow.add_step("thinking", f"⚠️ 发现问题: {issue[:50]}")
        
        if reflection.needs_rewrite and retry_count < max_retries:
            workflow.add_step("thinking", "🔄 根据改进建议重新生成...")
            workflow.add_step("reflection", f"⚠️ 评分 {reflection.score}/10，正在优化...", {
                "score": reflection.score,
                "issues": reflection.issues[:3]
            })
            retry_count += 1
            rewrite_guidance = reflection.rewrite_guidance
            continue  # 重试
        else:
            workflow.add_step("thinking", "✅ 配置质量达标")
            workflow.add_step("reflection", f"✅ 自我评估完成，评分 {reflection.score}/10", {
                "score": reflection.score,
                "issues": reflection.issues[:3] if reflection.issues else []
            })
            break  # 结束循环
    
    # Validate config - 校验阶段
    workflow.add_step("thinking", "🔍 校验配置格式和完整性...")
    workflow.add_step("tool_call", "🔍 正在校验配置...", {"tool": "validate_config"})
    from .tools.config import ValidateConfigTool, ValidateConfigInput
    val_tool = ValidateConfigTool()
    val_result = await val_tool.execute(ValidateConfigInput(config=gen_result.config.model_dump()))
    
    if val_result.passed:
        workflow.add_step("observing", f"✅ 校验通过，{val_result.score} 分")
        workflow.add_step("validation", "✅ 配置校验通过", {"valid": True, "score": val_result.score})
    else:
        workflow.add_step("observing", f"⚠️ 校验发现 {len(val_result.issues)} 个问题")
        workflow.add_step("validation", f"⚠️ 配置有 {len(val_result.issues)} 个问题", {
            "valid": False,
            "issues": [i.message for i in val_result.issues[:3]]
        })
    
    # Save config
    session.save_config(gen_result.config.model_dump())
    session.state = "preview"
    
    # Build response
    return AgentResponse(
        session_id=session.id,
        response=f"太好了！我为你生成了一个{theme_id}风格的主页 ✨ 快看看效果怎么样！",
        action={"type": "generate", "data": {"theme": theme_id}},
        current_config=gen_result.config.model_dump(),
        suggestions=[
            {"type": "style", "name": "换风格", "description": "试试其他风格"},
            {"type": "component", "name": "加组件", "description": "添加更多元素"},
            {"type": "save", "name": "保存", "description": "保存页面"}
        ],
        state="preview"
    )


async def _run_modify_agent_with_workflow(
    agent,
    message: str,
    session: Session,
    context: Dict[str, Any],
    workflow: WorkflowCollector
) -> AgentResponse:
    """Run modify agent with workflow events."""
    
    config = context.get("existingConfig", session.get_config()) or {}
    
    # 理解修改指令阶段
    workflow.add_step("thinking", f"💭 理解修改指令: {message[:30]}...")
    workflow.add_step("tool_call", "🔍 正在分析修改指令...", {"tool": "detect_targets"})
    
    # Detect targets
    target_ids = context.get("selected_component_ids", [])
    target_types = []  # 用于后续展示
    
    if not target_ids:
        # Try keyword detection
        keywords_map = {
            "头像": ["hero-section", "avatar"],
            "名字": ["hero-section", "text"],
            "签名": ["hero-section"],
            "推": ["oshi-card"],
            "属性": ["attribute-wall"],
            "标签": ["tag-group"],
            "音乐": ["music-player"],
            "社交": ["social-links"],
            "引言": ["quote"],
        }
        
        components = config.get("components", [])
        for keyword, component_types in keywords_map.items():
            if keyword in message:
                target_types.extend(component_types)
                for comp in components:
                    if comp.get("type") in component_types:
                        target_ids.append(comp.get("id"))
        
        # 识别目标组件
        if target_types:
            workflow.add_step("thinking", f"📋 识别目标组件: {', '.join(set(target_types[:3]))}")
        
        if target_ids:
            workflow.add_step("observing", f"📊 找到 {len(target_ids)} 个目标组件")
            workflow.add_step("tool_result", f"✅ 找到 {len(target_ids)} 个目标组件", {"targets": target_ids})
        else:
            workflow.add_step("ask_user", "你想修改哪个组件？", {
                "question": "可以点击选择，或者告诉我是哪种类型的组件",
                "options": ["头像", "推し卡", "属性墙", "全部组件"]
            })
    else:
        workflow.add_step("thinking", "📋 已选中目标组件")
    
    # Apply modification
    workflow.add_step("acting", "⚡ 执行修改...")
    workflow.add_step("generating", "🤖 正在应用修改...", {"targets": target_ids})
    
    from .tools.config import ModifyConfigTool, ModifyConfigInput
    mod_tool = ModifyConfigTool()
    mod_result = await mod_tool.execute(ModifyConfigInput(
        config=config,
        instruction=message,
        target_ids=target_ids if target_ids else None
    ))
    
    # 观察修改结果
    changes = len(mod_result.changes) if mod_result.changes else 0
    workflow.add_step("observing", f"📊 修改了 {changes} 处")
    
    if mod_result.changes:
        workflow.add_step("tool_result", f"✅ 修改了 {changes} 个地方", {"changes": mod_result.changes})
    else:
        workflow.add_step("tool_result", "⚠️ 没有找到匹配的修改", {})
    
    # Save config
    session.save_config(mod_result.config)
    
    return AgentResponse(
        session_id=session.id,
        response=f"好的，我帮你调整了一下！看看新的效果 ✨",
        action={"type": "modify", "data": {"changes": mod_result.changes}},
        current_config=mod_result.config,
        suggestions=[
            {"type": "style", "name": "换个颜色", "description": "换个配色试试"},
            {"type": "layout", "name": "调整布局", "description": "调整组件位置"},
            {"type": "done", "name": "就这样吧", "description": "保存当前配置"}
        ],
        state="preview"
    )


@app.post("/api/agent/chat/stream")
@limiter.limit("10/minute")
async def agent_chat_stream(request: Request, chat_request: AgentChatRequest):
    """
    SSE streaming endpoint for agent chat.
    
    Emits workflow events as they happen, then final response.
    
    SSE event format:
    event: workflow
    data: {"type": "status", "message": "...", "data": {...}, "timestamp": ...}
    
    Final event:
    event: done
    data: {"sessionId": "...", "response": "...", "currentConfig": {...}}
    """
    
    async def event_generator() -> AsyncGenerator[str, None]:
        # Reset workflow collector
        global _current_workflow
        _current_workflow = WorkflowCollector()
        workflow = get_workflow_collector()
        
        # Queue for SSE events
        event_queue: asyncio.Queue[WorkflowStep] = asyncio.Queue()
        
        # Register callback to push events to queue
        def on_step(step: WorkflowStep):
            # Use put_nowait since we're in async context - avoid thread issues
            try:
                event_queue.put_nowait(step)
            except asyncio.QueueFull:
                pass  # Skip if queue is full
        
        workflow.on_step(on_step)
        
        # Container to share session ID with generator
        session_id_container: list = []
        
        # Run agent in background
        async def run_agent():
            try:
                # Call the main chat logic and capture session ID
                session_id = await _process_chat_request(chat_request, workflow)
                session_id_container.append(session_id)
            except Exception as e:
                workflow.add_step("error", f"❌ 错误：{str(e)}", {"error": str(e)})
        
        # Start agent task
        agent_task = asyncio.create_task(run_agent())
        
        # Emit events as they come
        while not agent_task.done():
            try:
                # Wait for next event with timeout
                step = await asyncio.wait_for(event_queue.get(), timeout=0.1)
                yield f"event: workflow\ndata: {json.dumps(step.model_dump(), ensure_ascii=False)}\n\n"
            except asyncio.TimeoutError:
                continue
        
        # Emit any remaining events
        while not event_queue.empty():
            step = await event_queue.get()
            yield f"event: workflow\ndata: {json.dumps(step.model_dump(), ensure_ascii=False)}\n\n"
        
        # Get final result from session
        memory = get_session_memory()
        # Use session ID from container (created by _process_chat_request) or original request
        final_session_id = session_id_container[0] if session_id_container else chat_request.sessionId
        session = memory.get_session(final_session_id) if final_session_id else None
        
        if session:
            final_data = {
                "sessionId": session.id,
                "response": session.messages[-1].content if session.messages else "",
                "currentConfig": session.get_config(),
                "workflow": workflow.to_dict_list()
            }
            yield f"event: done\ndata: {json.dumps(final_data, ensure_ascii=False)}\n\n"
        else:
            yield f"event: done\ndata: {json.dumps({'error': 'Session not found'}, ensure_ascii=False)}\n\n"
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


async def _process_chat_request(request: AgentChatRequest, workflow: WorkflowCollector) -> str:
    """Process chat request (used by SSE endpoint).
    
    Returns the session ID for the SSE final response.
    """
    
    ensure_initialized()
    memory = get_session_memory()
    
    if request.sessionId:
        session = memory.get_session(request.sessionId)
        if not session:
            session = memory.create_session(request.sessionId)
    else:
        session = memory.create_session()
    
    session.add_message("user", request.message)
    
    # Sanitize user input to prevent prompt injection
    sanitized_message = sanitize_user_input(request.message)
    
    context = request.context or {}
    if context.get("existingConfig"):
        session.save_config(context["existingConfig"])
    
    workflow.add_step("status", "🤔 正在分析你的需求...", {"intent": "analyze"})
    
    router = get_agent(AgentType.ROUTER)
    if not router:
        workflow.add_step("error", "❌ Router agent 未初始化", {})
        return session.id
    
    workflow.add_step("thinking", "正在判断你的意图...")
    try:
        router_response = await router.run(sanitized_message, session, context)
    except Exception as e:
        workflow.add_step("error", f"Router call failed: {str(e)}", {"error": str(e), "error_type": type(e).__name__})
        return session.id
    
    target_agent_type = router_response.action.get("data", {}).get("intent", "chat")
    extracted_context = router_response.action.get("data", {}).get("extracted_context", {})
    
    workflow.add_step("status", f"✅ 识别到意图：{target_agent_type}", {"intent": target_agent_type})
    
    if extracted_context:
        for key, value in extracted_context.items():
            if value:
                workflow.add_step("profile_update", f"✅ 识别到：{key} = {value}", {"field": key, "value": value})
    
    agent_type_map = {
        "new_page": AgentType.DESIGN,
        "modify_page": AgentType.MODIFY,
        "chat": AgentType.CHAT
    }
    
    target_type = agent_type_map.get(target_agent_type, AgentType.CHAT)
    target_agent = get_agent(target_type)
    
    if not target_agent:
        workflow.add_step("error", f"❌ Agent {target_type} 未初始化", {})
        return session.id
    
    context.update(extracted_context)
    
    if target_type == AgentType.DESIGN:
        agent_response = await _run_design_agent_with_workflow(target_agent, sanitized_message, session, context, workflow)
    elif target_type == AgentType.MODIFY:
        agent_response = await _run_modify_agent_with_workflow(target_agent, sanitized_message, session, context, workflow)
    else:
        # Chat Agent 思考过程
        workflow.add_step("thinking", "🤖 分析你的问题...")
        # 尝试判断是否是 FAQ 匹配
        if any(kw in sanitized_message.lower() for kw in ["怎么", "如何", "什么是", "帮助", "功能"]):
            workflow.add_step("observing", "📚 匹配到知识库答案")
        else:
            workflow.add_step("acting", "⚡ 正在思考回复...")
        agent_response = await target_agent.run(sanitized_message, session, context)
        workflow.add_step("observing", "📊 生成个性化回复")
    
    memory.save_session(session)
    
    if agent_response.response:
        session.add_message("assistant", agent_response.response)
    
    workflow.add_step("done", "✨ 完成！", {"response": agent_response.response[:100] if agent_response.response else ""})
    
    if agent_response.suggestions:
        suggestion_texts = [s.get("name", "") for s in agent_response.suggestions[:3]]
        workflow.add_step("suggestion", "💡 你可以说：", {"suggestions": suggestion_texts})
    
    return session.id


@app.get("/api/skills")
@limiter.limit("30/minute")
async def list_skills(request: Request):
    """List available skills."""
    from .skills.loader import get_skill_loader
    
    loader = get_skill_loader()
    return {"skills": loader.get_catalog()}


@app.get("/api/debug/traces")
@limiter.limit("30/minute")
async def debug_traces(request: Request, n: int = 5):
    """Tier 2: Get recent agent trace summaries for debugging."""
    return {"traces": get_trace_summary(n)}


@app.get("/api/templates")
@limiter.limit("30/minute")
async def list_templates(request: Request, style: Optional[str] = None, limit: int = 10):
    """List available templates."""
    from .tools.templates import QueryTemplatesInput, QueryTemplatesTool
    
    tool = QueryTemplatesTool()
    result = await tool.execute(QueryTemplatesInput(
        query=style or "",
        style=style,
        limit=limit
    ))
    
    templates = [_frontend_template(t.model_dump()) for t in result.templates]
    return {
        "templates": templates,
        "count": len(templates),
        "total": result.total
    }


@app.get("/api/templates/search")
@limiter.limit("30/minute")
async def search_templates(request: Request, q: str = "", limit: int = 10):
    """Search templates with frontend-compatible response shape."""
    from .tools.templates import QueryTemplatesInput, QueryTemplatesTool

    tool = QueryTemplatesTool()
    result = await tool.execute(QueryTemplatesInput(
        query=q,
        limit=limit
    ))

    results = [
        _frontend_template(t.model_dump(), similarity=max(0.5, 1.0 - index * 0.08))
        for index, t in enumerate(result.templates)
    ]
    return {
        "results": results,
        "query": q,
        "count": len(results)
    }


@app.get("/api/components")
@limiter.limit("30/minute")
async def list_components(request: Request, query: str = "", limit: int = 20):
    """List available components."""
    from .tools.components import SearchComponentsTool
    
    tool = SearchComponentsTool()
    result = await tool.execute({
        "query": query or "anime",
        "limit": limit
    })
    
    return {
        "components": [c.model_dump() for c in result.components],
        "total": result.total
    }


# ============ 新增 API 端点 ============

# Bangumi 导入
@app.get("/api/bangumi/import/{username}")
@limiter.limit("30/minute")
async def import_bangumi_watchlist(request: Request, username: str, limit: int = 20):
    """Import Bangumi watchlist for a user (Mock)."""
    from .tools.bangumi_import import ImportBangumiWatchlistTool
    
    tool = ImportBangumiWatchlistTool()
    result = await tool.execute({
        "username": username,
        "limit": limit
    })
    
    return {
        "username": result.username,
        "items": [item.model_dump() for item in result.items],
        "total": result.total,
        "source": result.source
    }


@app.get("/api/bangumi/recommendations")
@limiter.limit("30/minute")
async def get_bangumi_recommendations(request: Request, tags: Optional[str] = None, limit: int = 5):
    """Get anime recommendations based on tags."""
    from .tools.bangumi_import import GetAnimeRecommendationsTool
    
    tool = GetAnimeRecommendationsTool()
    result = await tool.execute({
        "tags": tags.split(",") if tags else None,
        "limit": limit
    })
    
    return {
        "items": [item.model_dump() for item in result.items],
        "reason": result.reason
    }


# Guestbook 留言板
@app.post("/api/guestbook/{page_id}/message")
@limiter.limit("30/minute")
async def add_guestbook_message(request: Request, page_id: str, message_request: GuestbookMessageRequest):
    """Add a message to guestbook."""
    from .tools.guestbook import AddGuestbookMessageTool
    
    tool = AddGuestbookMessageTool()
    result = await tool.execute({
        "page_id": page_id,
        "author": message_request.author,
        "content": message_request.content,
        "avatar": message_request.avatar,
        "is_owner_reply": message_request.isOwnerReply,
        "reply_to": message_request.replyTo
    })
    
    return {
        "success": result.success,
        "message": result.message.model_dump()
    }


@app.get("/api/guestbook/{page_id}/messages")
@limiter.limit("30/minute")
async def get_guestbook_messages(request: Request, page_id: str, limit: int = 50, offset: int = 0):
    """Get messages from guestbook."""
    from .tools.guestbook import GetGuestbookMessagesTool
    
    tool = GetGuestbookMessagesTool()
    result = await tool.execute({
        "page_id": page_id,
        "limit": limit,
        "offset": offset
    })
    
    return {
        "pageId": result.page_id,
        "messages": [msg.model_dump() for msg in result.messages],
        "total": result.total
    }


@app.delete("/api/guestbook/{page_id}/message/{message_id}")
@limiter.limit("30/minute")
async def delete_guestbook_message(request: Request, page_id: str, message_id: str):
    """Delete a message from guestbook."""
    from .tools.guestbook import DeleteGuestbookMessageTool
    
    tool = DeleteGuestbookMessageTool()
    result = await tool.execute({
        "page_id": page_id,
        "message_id": message_id
    })
    
    return {
        "success": result.success,
        "message": result.message
    }


# ==============================================================================
# Local Pages API
# ==============================================================================

@app.post("/api/pages")
@limiter.limit("30/minute")
async def create_page(request: Request, page_request: CreatePageRequest):
    """Create a page in local in-memory storage for the current Python mainline."""
    page_id = f"page-{uuid.uuid4().hex[:12]}"
    now = _now_iso()
    theme_id = page_request.themeId or page_request.pageConfig.get("theme", {}).get("id", "sakura")
    record = {
        "id": page_id,
        "user_id": "local-user",
        "title": page_request.title,
        "slug": page_request.slug or _slugify_title(page_request.title),
        "page_config": page_request.pageConfig,
        "theme_id": theme_id,
        "is_public": page_request.isPublic,
        "is_published": False,
        "view_count": 0,
        "created_at": now,
        "updated_at": now,
    }
    _PAGE_STORE[page_id] = record
    return _make_page_response(record)


@app.get("/api/pages")
@limiter.limit("30/minute")
async def list_pages(request: Request, limit: int = 20):
    """List locally saved pages, newest first."""
    pages = sorted(_PAGE_STORE.values(), key=lambda page: page["updated_at"], reverse=True)
    selected = pages[:limit]
    return {
        "pages": [_make_page_response(page) for page in selected],
        "count": len(selected),
    }


@app.get("/api/pages/{page_id}")
@limiter.limit("30/minute")
async def get_page(request: Request, page_id: str):
    """Get a locally saved page."""
    page = _PAGE_STORE.get(page_id)
    if not page:
        raise HTTPException(status_code=404, detail=f"Page '{page_id}' not found")
    return _make_page_response(page)


@app.put("/api/pages/{page_id}")
@limiter.limit("30/minute")
async def update_page(request: Request, page_id: str, page_request: UpdatePageRequest):
    """Update a locally saved page."""
    page = _PAGE_STORE.get(page_id)
    if not page:
        raise HTTPException(status_code=404, detail=f"Page '{page_id}' not found")

    if page_request.title is not None:
        page["title"] = page_request.title
    if page_request.pageConfig is not None:
        page["page_config"] = page_request.pageConfig
        page["theme_id"] = page_request.themeId or page_request.pageConfig.get("theme", {}).get("id", page.get("theme_id"))
    if page_request.themeId is not None:
        page["theme_id"] = page_request.themeId
    if page_request.isPublic is not None:
        page["is_public"] = page_request.isPublic
    if page_request.isPublished is not None:
        page["is_published"] = page_request.isPublished
    page["updated_at"] = _now_iso()
    return _make_page_response(page)


@app.delete("/api/pages/{page_id}")
@limiter.limit("30/minute")
async def delete_page(request: Request, page_id: str):
    """Delete a locally saved page."""
    if page_id not in _PAGE_STORE:
        raise HTTPException(status_code=404, detail=f"Page '{page_id}' not found")
    del _PAGE_STORE[page_id]
    return {"deleted": True, "id": page_id}


# Request model for guestbook message
class GuestbookMessageRequest(BaseModel):
    """Guestbook message request."""
    author: str
    content: str
    avatar: Optional[str] = None
    isOwnerReply: bool = False
    replyTo: Optional[str] = None


# Request/Response models for feedback
class FeedbackRequest(BaseModel):
    """Feedback submission request."""
    session_id: str
    feedback_text: str
    feedback_type: str = "correction"
    user_input: str = ""
    component_type: Optional[str] = None


class FeedbackResponse(BaseModel):
    """Feedback response."""
    id: str
    session_id: str
    user_input: str
    feedback_text: str
    feedback_type: str
    component_type: Optional[str] = None
    created_at: str


# ==============================================================================
# Feedback Memory API
# ==============================================================================

@app.post("/api/feedback")
@limiter.limit("30/minute")
async def submit_feedback(request: Request, feedback_request: FeedbackRequest):
    """Submit user feedback (correction, preference, dislike).
    
    Tier 3 改进项 #3d: Feedback API 端点
    """
    fb_memory = get_feedback_memory()
    fb = fb_memory.add_feedback(
        session_id=feedback_request.session_id,
        feedback_text=feedback_request.feedback_text,
        feedback_type=feedback_request.feedback_type,
        user_input=feedback_request.user_input,
        component_type=feedback_request.component_type,
    )
    return {
        "id": fb.id,
        "session_id": fb.session_id,
        "user_input": fb.user_input,
        "feedback_text": fb.feedback_text,
        "feedback_type": fb.feedback_type,
        "component_type": fb.component_type,
        "created_at": fb.created_at.isoformat(),
    }


@app.get("/api/feedback/{session_id}")
@limiter.limit("30/minute")
async def get_session_feedback(request: Request, session_id: str):
    """Get all feedback for a specific session.
    
    Tier 3 改进项 #3d: Feedback API 端点
    """
    fb_memory = get_feedback_memory()
    feedbacks = fb_memory.get_feedback(session_id)

    return {
        "feedbacks": [
            {
                "id": fb.id,
                "session_id": fb.session_id,
                "user_input": fb.user_input,
                "feedback_text": fb.feedback_text,
                "feedback_type": fb.feedback_type,
                "component_type": fb.component_type,
                "created_at": fb.created_at.isoformat(),
            }
            for fb in feedbacks
        ],
        "total": len(feedbacks),
    }


@app.delete("/api/feedback/{session_id}")
@limiter.limit("30/minute")
async def clear_session_feedback(request: Request, session_id: str):
    """Clear all feedback for a specific session.
    
    Tier 3 改进项 #3d: Feedback API 端点
    """
    fb_memory = get_feedback_memory()
    fb_memory.clear_feedback(session_id)
    return {"cleared": True, "session_id": session_id}


# ==============================================================================
# Interrupt API (Tier 3 改进项 #5d)
# ==============================================================================

@app.get("/api/interrupt/{session_id}")
@limiter.limit("30/minute")
async def get_pending_interrupt(request: Request, session_id: str):
    """Query pending interrupt point for a session.
    
    Tier 3 改进项 #5d: 中断 API 端点
    """
    from .agents.interrupt import get_interrupt_store
    
    store = get_interrupt_store()
    pending = store.get_pending(session_id)
    
    if not pending:
        return {"has_pending": False, "interrupt": None}
    
    return {
        "has_pending": True,
        "interrupt": {
            "id": pending.id,
            "session_id": pending.session_id,
            "stage": pending.stage,
            "data": pending.data,
            "status": pending.status,
            "created_at": pending.created_at.isoformat(),
        }
    }


@app.post("/api/interrupt/{session_id}/confirm")
@limiter.limit("10/minute")
async def confirm_interrupt(request: Request, session_id: str):
    """Confirm or reject an interrupt point.
    
    Tier 3 改进项 #5d: 中断 API 端点
    
    Request body:
        action: "approve" or "reject"
        modifications: optional dict of changes
        reason: optional rejection reason
    """
    from .agents.interrupt import get_interrupt_store, InterruptConfirmRequest
    
    body = await request.json() if hasattr(request, 'json') else {}
    action = body.get("action", "approve")
    modifications = body.get("modifications")
    reason = body.get("reason")
    
    store = get_interrupt_store()
    pending = store.get_pending(session_id)
    
    if not pending:
        raise HTTPException(status_code=404, detail="No pending interrupt for this session")
    
    if action == "approve":
        result = store.approve(pending.id, modifications)
    else:
        result = store.reject(pending.id, reason)
    
    if not result:
        raise HTTPException(status_code=404, detail="Interrupt not found")
    
    # Also trigger DesignAgent confirm_generation if available
    try:
        design_agent = get_agent(AgentType.DESIGN)
        if design_agent:
            agent_response = await design_agent.confirm_generation(
                session_id=session_id,
                action=action,
                modifications=modifications
            )
            return {
                "interrupt_id": result.id,
                "status": result.status,
                "response": agent_response.response,
                "current_config": agent_response.current_config,
            }
    except Exception:
        pass
    
    return {
        "interrupt_id": result.id,
        "status": result.status,
    }


@app.get("/api/interrupt/history/{session_id}")
@limiter.limit("30/minute")
async def get_interrupt_history(request: Request, session_id: str):
    """Get interrupt history for a session.
    
    Tier 3 改进项 #5d: 中断 API 端点
    """
    from .agents.interrupt import get_interrupt_store
    
    store = get_interrupt_store()
    history = store.get_history(session_id)
    
    return {
        "history": [
            {
                "id": ip.id,
                "session_id": ip.session_id,
                "stage": ip.stage,
                "status": ip.status,
                "data": ip.data,
                "created_at": ip.created_at.isoformat(),
            }
            for ip in history
        ],
        "total": len(history),
    }


# ==============================================================================
# Demo Templates API
# ==============================================================================

@app.get("/api/templates/demos")
@limiter.limit("30/minute")
async def list_demo_templates(request: Request):
    """List all built-in demo templates."""
    from .tools.templates import DEMO_TEMPLATES
    
    return {
        "demos": [
            {
                "id": demo["id"],
                "name": demo["name"],
                "description": demo["description"],
                "theme": demo["theme"],
                "preview_colors": demo.get("preview_colors", []),
                "component_count": len(demo["config"]["components"]),
            }
            for demo in DEMO_TEMPLATES
        ],
        "total": len(DEMO_TEMPLATES)
    }


@app.get("/api/templates/demos/{demo_id}")
@limiter.limit("30/minute")
async def get_demo_template(request: Request, demo_id: str):
    """Get a specific demo template by ID."""
    from .tools.templates import DEMO_TEMPLATES
    
    for demo in DEMO_TEMPLATES:
        if demo["id"] == demo_id:
            return {
                "id": demo["id"],
                "name": demo["name"],
                "description": demo["description"],
                "theme": demo["theme"],
                "preview_colors": demo.get("preview_colors", []),
                "config": demo["config"]
            }
    
    raise HTTPException(status_code=404, detail=f"Demo template '{demo_id}' not found")


# Run server
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "src.main:app",
        host=config.server.host,
        port=config.server.port,
        reload=config.server.debug
    )
