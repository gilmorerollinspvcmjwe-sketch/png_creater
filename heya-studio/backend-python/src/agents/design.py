"""Design Agent - Core page generation agent.

Tier 2 改进项 #4: StateGraph 初步接入
- DesignAgent 继承 ReActAgent
- 注册实际工具: GenerateConfigLLM, ProfileExtractAgent, ApplySkillTool
- Think → Act → Observe 循环
- use_react: bool = False 参数，默认关闭
- 保持 backward compatibility：原来的 design_agent.run() 接口不变

Tier 3 改进项 #5: 实现人机交互中断
- 在 Self-Reflection 通过后、返回最终结果前创建 InterruptPoint
- 新增 confirm_generation() 方法
- 支持 approve/reject 操作
"""

from typing import Dict, Any, Optional, List
from ..agents.base import BaseAgent, AgentType, AgentResponse
from ..agents.react_loop import ReActAgent
from ..memory.session import Session, SessionState
from ..models.profile import UserProfile
from ..models.page import BackendPageConfig
from ..llm.schemas import ExtractedProfile


class DesignAgent(BaseAgent):
    """Design agent for page generation.

    Tier 2: 支持 ReAct 模式（use_react=True）和传统模式（默认）。
    ReAct 模式下，DesignAgent 使用 Think → Act → Observe 循环，
    通过注册的工具（generate_config, extract_profile, apply_skill）完成任务。
    """

    agent_type = AgentType.DESIGN
    name = "Design Agent"
    description = "主设计 Agent,负责页面生成"
    max_iterations = 8
    timeout_ms = 30000

    SYSTEM_PROMPT = """你是 Heya Studio 的 AI 设计助手。

你的任务是:
1. 收集用户信息(推、MBTI、爱好、风格偏好)
2. 根据用户信息生成个人主页配置
3. 与用户确认并迭代优化

生成页面配置时:
- 使用前端支持的组件类型
- 根据用户风格选择合适主题
- 组件数量建议 4-8 个
- 确保配置符合前端 BackendPageConfig 格式

回复风格:
- 友好、活泼、二次元风格
- 可以使用 emoji (◕‿◕) ✨
- 一次最多问 2 个问题,避免审问式"""

    REACT_SYSTEM_PROMPT = """你是 Heya Studio 的 AI 设计助手，使用 ReAct 模式工作。

## 可用工具
{tool_descriptions}

## 工作流程
1. Think: 分析用户需求，确定需要哪些工具
2. Act: 调用对应工具
3. Observe: 观察工具返回结果，决定下一步

## 调用工具格式
```json
{{"tool": "tool_name", "args": {{...}}}}
```

## 注意
- 先用 extract_profile 提取用户画像
- 再用 generate_config 生成配置
- 如果需要应用特定风格，用 apply_skill
- 最终给出友好的回复"""

    # Info collection priority
    INFO_PRIORITY = [
        ("oshi", "你最喜欢的推是谁呀?"),
        ("mbti", "你的 MBTI 是什么?"),
        ("hobbies", "平时喜欢做什么呢?"),
        ("style", "喜欢什么风格?比如樱花风、赛博朋克风?"),
    ]

    def __init__(self, llm_client, memory, tool_registry, use_react: bool = False, use_v2: bool = False):
        """初始化 DesignAgent。

        Args:
            llm_client: LLM 客户端
            memory: Session 内存
            tool_registry: 工具注册表
            use_react: 是否启用 ReAct 模式，默认 False
            use_v2: 是否启用 V2 BuilderAgent 模式，默认 False
                    当 use_v2=True 时，使用 BuilderAgent 的工具编排流水线
                    代替 LLM 直接生成 JSON。
        """
        super().__init__(llm_client, memory, tool_registry)
        self.use_react = use_react
        self.use_v2 = use_v2
        self._react_agent: Optional[ReActAgent] = None
        self._builder_agent = None

    def _get_react_agent(self, session: Session) -> ReActAgent:
        """懒初始化 ReAct Agent，注册实际工具。"""
        if self._react_agent is not None:
            return self._react_agent

        # 注册实际工具
        from ..tools.config_llm import GenerateConfigLLMTool
        from ..tools.skills import ApplySkillTool

        tools = []

        # 1. GenerateConfigLLM 作为 tool
        async def llm_call_wrapper(messages, schema=None):
            from ..llm.client import Message
            formatted = [Message(role=m["role"], content=m["content"]) for m in messages]
            if schema:
                return await self.llm.chat_with_schema(messages=formatted, schema=schema, temperature=0.7)
            else:
                return await self.llm.chat(messages=formatted, temperature=0.7)

        gen_tool = GenerateConfigLLMTool(llm_call=llm_call_wrapper)
        tools.append(gen_tool)

        # 2. ApplySkillTool 作为 tool
        apply_skill_tool = ApplySkillTool()
        tools.append(apply_skill_tool)

        # 3. ProfileExtractTool - 包装 ProfileExtractAgent 为 tool 接口
        profile_tool = _ProfileExtractToolWrapper(self.llm, self.memory, self.tools)
        tools.append(profile_tool)

        # 构建 system prompt
        tool_descs = "\n".join(
            f"- **{t.name}**: {t.description}" for t in tools
        )
        system_prompt = self.REACT_SYSTEM_PROMPT.format(tool_descriptions=tool_descs)

        # LLM call 函数
        async def react_llm_call(messages, schema=None):
            return await llm_call_wrapper(messages, schema)

        self._react_agent = ReActAgent(
            system_prompt=system_prompt,
            llm_call=react_llm_call,
            tools=tools,
            max_steps=6,
            temperature=0.7,
        )
        return self._react_agent

    def get_system_prompt(self) -> str:
        return self.SYSTEM_PROMPT

    def _get_builder_agent(self):
        """Lazily initialize BuilderAgent for V2 mode."""
        if self._builder_agent is not None:
            return self._builder_agent

        from .builder import BuilderAgent

        # Create LLM call wrapper for BuilderAgent
        async def llm_call_wrapper(messages, schema=None):
            from ..llm.client import Message
            formatted = [Message(role=m["role"], content=m["content"]) for m in messages]
            if schema:
                return await self.llm.chat_with_schema(messages=formatted, schema=schema, temperature=0.7)
            else:
                result = await self.llm.chat(messages=formatted, temperature=0.7)
                return {"content": result.content}

        self._builder_agent = BuilderAgent(llm_call=llm_call_wrapper)
        return self._builder_agent

    async def run(
        self,
        user_input: str,
        session: Session,
        context: Optional[Dict[str, Any]] = None
    ) -> AgentResponse:
        """Run design agent.

        保持 backward compatibility：
        - use_v2=True：走 BuilderAgent 工具编排流水线（Phase 1 MVP）
        - use_react=True：走 ReAct Think→Act→Observe 循环
        - 默认：走传统的状态机逻辑
        """
        if self.use_v2:
            return await self._run_v2(user_input, session, context)
        if self.use_react:
            return await self._run_react(user_input, session, context)

        # 传统模式
        state = session.state

        if state == SessionState.INITIAL:
            return await self._handle_initial(session, user_input, context)
        elif state == SessionState.COLLECTING:
            return await self._handle_collecting(session, user_input, context)
        elif state == SessionState.CONFIRMING:
            return await self._handle_confirming(session, user_input, context)
        elif state == SessionState.GENERATING:
            return await self._handle_generating(session, user_input, context)
        elif state == SessionState.PREVIEW:
            return await self._handle_preview(session, user_input, context)
        elif state == SessionState.ITERATING:
            return await self._handle_iterating(session, user_input, context)
        else:
            return await self._handle_done(session, user_input, context)

    async def _run_react(
        self,
        user_input: str,
        session: Session,
        context: Optional[Dict[str, Any]] = None
    ) -> AgentResponse:
        """ReAct 模式运行 DesignAgent。

        Think → Act → Observe 循环:
        - Think: 分析用户需求，确定需要哪些工具
        - Act: 调用对应工具（generate_config / extract_profile / apply_skill）
        - Observe: 观察工具返回结果
        """
        react_agent = self._get_react_agent(session)

        # 构建初始状态
        profile = session.get_profile() or {}
        initial_state = {
            "profile": profile,
            "theme_id": context.get("theme_id", "sakura") if context else "sakura",
            "session_id": session.id,
        }

        # 增强用户输入，附带当前画像
        enhanced_input = user_input
        if profile:
            profile_parts = []
            if profile.get("mbti"):
                profile_parts.append(f"MBTI: {profile['mbti']}")
            if profile.get("oshi"):
                oshi_names = [o.get("name", "") for o in profile.get("oshi", [])]
                profile_parts.append(f"推: {', '.join(oshi_names)}")
            if profile_parts:
                enhanced_input = f"{user_input}\n\n[当前用户画像: {'; '.join(profile_parts)}]"

        # 运行 ReAct 循环
        result = await react_agent.run(
            user_input=enhanced_input,
            initial_state=initial_state,
        )

        # 从 ReAct 结果中提取配置
        config = None
        for tc in result.get("tool_calls", []):
            if tc.get("tool") == "generate_config_llm":
                tc_result = tc.get("result", {})
                if "config" in tc_result:
                    config = tc_result["config"]
                    session.save_config(config)

        session.state = SessionState.PREVIEW if config else SessionState.COLLECTING

        return AgentResponse(
            session_id=session.id,
            response=result.get("response", "生成完成 ✨"),
            action={"type": "generate" if config else "chat", "data": {}},
            current_config=config or session.get_config(),
            suggestions=[
                {"type": "style", "name": "换风格", "description": "试试其他风格"},
                {"type": "component", "name": "加组件", "description": "添加更多元素"},
            ],
            state=session.state.value,
        )

    # ========== Phase 1 MVP: V2 BuilderAgent 模式 ==========

    async def _run_v2(
        self,
        user_input: str,
        session: Session,
        context: Optional[Dict[str, Any]] = None
    ) -> AgentResponse:
        """V2 模式：使用 BuilderAgent 工具编排流水线生成页面。

        LLM 只做组件选择 + 文案生成，代码做 JSON 拼装。
        """
        state = session.state

        # If we're in a state that needs user interaction, handle traditionally
        if state in (SessionState.PREVIEW, SessionState.ITERATING, SessionState.DONE):
            if state == SessionState.PREVIEW:
                return await self._handle_preview(session, user_input, context)
            elif state == SessionState.ITERATING:
                return await self._handle_iterating(session, user_input, context)
            else:
                return await self._handle_done(session, user_input, context)

        # For INITIAL / COLLECTING / CONFIRMING / GENERATING, check if we have
        # enough info to build, otherwise collect info traditionally
        profile = session.get_profile() or {}

        # Try to extract profile from current input
        new_info = await self._extract_profile(user_input, session)
        profile = self._merge_profile(profile, new_info)
        session.save_profile(profile)

        # Check if we have enough info to generate
        has_intent = any(kw in user_input for kw in ["\u751f\u6210", "\u521b\u5efa", "\u505a\u4e00\u4e2a", "\u5e2e\u6211"])
        has_enough = self._has_enough_info(profile)

        if not has_intent and not has_enough:
            # Still collecting
            session.state = SessionState.COLLECTING
            return self._ask_for_info(session, profile)

        if has_intent and not has_enough:
            # User wants to generate but we don't have enough info
            session.state = SessionState.COLLECTING
            return self._ask_for_info(session, profile)

        # ---- We have enough info: run BuilderAgent pipeline ----
        session.state = SessionState.GENERATING

        # Determine theme and skill
        theme_id = context.get("theme_id", "sakura") if context else "sakura"
        skill_id = None

        from ..skills.loader import get_skill_loader
        skill_loader = get_skill_loader()
        skill_match = skill_loader.match_skill(user_input, profile)
        if skill_match:
            skill, _ = skill_match
            skill_id = skill.id
            # Map skill ID to theme
            theme_map = {
                "sakura-style": "sakura",
                "cyberpunk-style": "night",
                "lavender-style": "lavender",
                "mint-style": "mint",
                "minimal-style": "mono",
            }
            theme_id = theme_map.get(skill_id, theme_id)

        # Style from profile
        if not skill_id and profile.get("style_preference"):
            style_map = {
                "\u6a31\u82b1": "sakura", "\u8d5b\u535a": "night", "\u85b0\u8863\u8349": "lavender",
                "\u8584\u8377": "mint", "\u6781\u7b80": "mono",
            }
            theme_id = style_map.get(profile.get("style_preference"), theme_id)

        # Run BuilderAgent
        builder = self._get_builder_agent()
        try:
            result = await builder.build(
                user_profile=profile,
                style_hint=user_input,
                theme_id=theme_id,
                skill_id=skill_id,
            )

            config = result["config"]
            session.save_config(config)
            session.state = SessionState.PREVIEW

            return AgentResponse(
                session_id=session.id,
                response=f"\u592a\u597d\u4e86\uff01\u6211\u4e3a\u4f60\u751f\u6210\u4e86\u4e00\u4e2a{theme_id}\u98ce\u683c\u7684\u4e3b\u9875 \u2728 {result['reasoning']}",
                action={"type": "generate", "data": {"theme": theme_id}},
                current_config=config,
                suggestions=[
                    {"type": "style", "name": "\u6362\u98ce\u683c", "description": "\u8bd5\u8bd5\u5176\u4ed6\u98ce\u683c"},
                    {"type": "component", "name": "\u52a0\u7ec4\u4ef6", "description": "\u6dfb\u52a0\u66f4\u591a\u5143\u7d20"},
                ],
                state=SessionState.PREVIEW.value,
            )
        except Exception as e:
            # Fallback to traditional generation on error
            session.state = SessionState.GENERATING
            return await self._handle_generating(session, user_input, context)

    # ========== Tier 3: 人机交互中断 ==========

    async def create_interrupt_preview(
        self,
        session: Session,
        config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Tier 3 改进项 #5: 在生成配置后创建中断点，等待用户确认。
        
        在 Self-Reflection 通过后调用，创建 preview 中断点。
        
        Returns:
            包含 interrupt_id 和状态的字典
        """
        from .interrupt import get_interrupt_store
        
        store = get_interrupt_store()
        
        # 配置摘要
        components = config.get("components", [])
        config_summary = {
            "theme": config.get("theme", {}).get("id", "unknown"),
            "component_count": len(components),
            "component_types": [c.get("type", "unknown") for c in components],
        }
        
        interrupt = store.create_interrupt(
            session_id=session.id,
            stage="preview",
            data=config_summary
        )
        
        return {
            "interrupt_id": interrupt.id,
            "status": interrupt.status,
            "stage": interrupt.stage,
            "summary": config_summary
        }
    
    async def confirm_generation(
        self,
        session_id: str,
        action: str = "approve",
        modifications: Optional[Dict[str, Any]] = None
    ) -> AgentResponse:
        """Tier 3 改进项 #5: 确认或拒绝生成结果。
        
        Args:
            session_id: 会话 ID
            action: "approve" 或 "reject"
            modifications: 拒绝时的修改建议
            
        Returns:
            AgentResponse
        """
        from .interrupt import get_interrupt_store
        
        store = get_interrupt_store()
        pending = store.get_pending(session_id)
        
        if not pending:
            return AgentResponse(
                session_id=session_id,
                response="没有待确认的配置，可以重新生成一个哦！",
                state="initial"
            )
        
        session = self.memory.get_session(session_id)
        if not session:
            return AgentResponse(
                session_id=session_id,
                response="会话已过期，请重新开始。",
                state="initial"
            )
        
        if action == "approve":
            store.approve(pending.id, modifications)
            config = session.get_config()
            
            # 如果有修改，应用修改
            if modifications and config:
                config.update(modifications)
                session.save_config(config)
            
            session.state = SessionState.DONE
            self.memory.save_session(session)
            
            return AgentResponse(
                session_id=session_id,
                response="太棒了！你的主页已经确认完成啦！✨",
                action={"type": "save", "data": {}},
                current_config=session.get_config(),
                state=SessionState.DONE.value
            )
        else:
            # Rejected
            store.reject(pending.id, reason=str(modifications) if modifications else None)
            session.state = SessionState.ITERATING
            self.memory.save_session(session)
            
            return AgentResponse(
                session_id=session_id,
                response="好的，我来调整一下！告诉我你想怎么改？",
                action={"type": "modify", "data": {"modifications": modifications}},
                current_config=session.get_config(),
                suggestions=[
                    {"type": "style", "name": "换风格", "description": "换个配色试试"},
                    {"type": "component", "name": "改组件", "description": "修改某个元素"}
                ],
                state=SessionState.ITERATING.value
            )

    # ========== 传统模式方法（保持不变） ==========

    async def _handle_initial(
        self,
        session: Session,
        user_input: str,
        context: Optional[Dict[str, Any]]
    ) -> AgentResponse:
        """Handle initial state."""
        has_intent = any(kw in user_input for kw in ["生成", "创建", "做一个"])

        if has_intent:
            profile = await self._extract_profile(user_input, session)
            if self._has_enough_info(profile):
                session.state = SessionState.GENERATING
                session.save_profile(profile)
                return await self._handle_generating(session, user_input, context)
            else:
                session.state = SessionState.COLLECTING
                session.save_profile(profile)
                return self._ask_for_info(session, profile)

        return AgentResponse(
            session_id=session.id,
            response="你好!我是 Heya Studio 的 AI 助手。我可以帮你生成一个漂亮的二次元风格主页。告诉我你的 MBTI、喜欢的推(偶像/角色)、爱好,我来为你设计独一无二的主页吧!(◕‿◕)",
            suggestions=[
                {"type": "template", "name": "樱花萌系模板", "description": "温柔浪漫的粉色系"},
                {"type": "template", "name": "赛博朋克模板", "description": "酷炫科技风"}
            ],
            state=SessionState.INITIAL.value
        )

    async def _handle_collecting(
        self,
        session: Session,
        user_input: str,
        context: Optional[Dict[str, Any]]
    ) -> AgentResponse:
        """Handle collecting state."""
        profile = session.get_profile() or {}
        new_info = await self._extract_profile(user_input, session)
        profile = self._merge_profile(profile, new_info)
        session.save_profile(profile)

        if any(kw in user_input for kw in ["跳过", "不知道", "无所谓"]):
            session.state = SessionState.GENERATING
            return await self._handle_generating(session, user_input, context)

        if self._has_enough_info(profile):
            session.state = SessionState.CONFIRMING
            return self._confirm_profile(session, profile)

        return self._ask_for_info(session, profile)

    async def _handle_confirming(
        self,
        session: Session,
        user_input: str,
        context: Optional[Dict[str, Any]]
    ) -> AgentResponse:
        """Handle confirming state."""
        if any(kw in user_input for kw in ["对", "是的", "确认", "没错", "好"]):
            session.state = SessionState.GENERATING
            return await self._handle_generating(session, user_input, context)

        if any(kw in user_input for kw in ["不对", "改", "换", "不是"]):
            session.state = SessionState.COLLECTING
            return await self._handle_collecting(session, user_input, context)

        profile = session.get_profile() or {}
        return self._confirm_profile(session, profile)

    async def _handle_generating(
        self,
        session: Session,
        user_input: str,
        context: Optional[Dict[str, Any]]
    ) -> AgentResponse:
        """Handle generating state."""
        profile = session.get_profile() or {}

        from ..skills.loader import get_skill_loader
        skill_loader = get_skill_loader()
        skill = skill_loader.match_skill(user_input, profile)

        theme_id = "sakura"
        if skill:
            theme_id = skill.id.replace("-style", "")
            if theme_id not in ["sakura", "lavender", "mint", "cream", "night", "pixel", "mono", "millennial"]:
                theme_id = "sakura"
        elif profile.get("style_preference"):
            style_map = {
                "樱花": "sakura", "赛博": "night", "薰衣草": "lavender",
                "薄荷": "mint", "极简": "mono"
            }
            theme_id = style_map.get(profile.get("style_preference"), "sakura")

        from ..tools.config import GenerateConfigTool
        gen_tool = GenerateConfigTool()
        gen_result = await gen_tool.execute({"user_profile": profile, "theme_id": theme_id})

        from ..tools.config import ValidateConfigTool
        val_tool = ValidateConfigTool()
        val_result = await val_tool.execute({"config": gen_result.config.model_dump()})

        session.save_config(gen_result.config.model_dump())
        session.state = SessionState.PREVIEW

        return AgentResponse(
            session_id=session.id,
            response=f"太好了!我为你生成了一个{theme_id}风格的主页 ✨ 快看看效果怎么样!",
            action={"type": "generate", "data": {"theme": theme_id}},
            current_config=gen_result.config.model_dump(),
            suggestions=[
                {"type": "style", "name": "换风格", "description": "试试其他风格"},
                {"type": "component", "name": "加组件", "description": "添加更多元素"}
            ],
            state=SessionState.PREVIEW.value
        )

    async def _handle_preview(
        self,
        session: Session,
        user_input: str,
        context: Optional[Dict[str, Any]]
    ) -> AgentResponse:
        """Handle preview state."""
        if any(kw in user_input for kw in ["好看", "喜欢", "满意", "不错", "好"]):
            session.state = SessionState.DONE
            return await self._handle_done(session, user_input, context)

        if any(kw in user_input for kw in ["不好看", "不喜欢", "改", "换"]):
            session.state = SessionState.ITERATING
            return await self._handle_iterating(session, user_input, context)

        return AgentResponse(
            session_id=session.id,
            response="你觉得这个设计怎么样?有什么想改的地方吗?",
            suggestions=[
                {"type": "style", "name": "换风格", "description": "换个配色试试"},
                {"type": "component", "name": "改组件", "description": "修改某个元素"}
            ],
            current_config=session.get_config(),
            state=SessionState.PREVIEW.value
        )

    async def _handle_iterating(
        self,
        session: Session,
        user_input: str,
        context: Optional[Dict[str, Any]]
    ) -> AgentResponse:
        """Handle iterating state."""
        config = session.get_config()

        from ..tools.config import ModifyConfigTool
        mod_tool = ModifyConfigTool()
        mod_result = await mod_tool.execute({"config": config, "instruction": user_input})

        session.save_config(mod_result.config)
        session.state = SessionState.PREVIEW

        return AgentResponse(
            session_id=session.id,
            response="好的,我帮你调整了一下!看看新的效果 ✨",
            action={"type": "modify", "data": {"changes": mod_result.changes}},
            current_config=mod_result.config,
            state=SessionState.PREVIEW.value
        )

    async def _handle_done(
        self,
        session: Session,
        user_input: str,
        context: Optional[Dict[str, Any]]
    ) -> AgentResponse:
        """Handle done state."""
        return AgentResponse(
            session_id=session.id,
            response="太棒了!你的主页已经完成啦!如果以后想改,随时来找我哦 (◕‿◕)✨",
            action={"type": "save", "data": {}},
            current_config=session.get_config(),
            state=SessionState.DONE.value
        )

    async def _extract_profile(
        self,
        user_input: str,
        session: Session
    ) -> Dict[str, Any]:
        """Extract user profile from input."""
        profile = session.get_profile() or {}
        import re

        mbti_match = re.search(r'[A-Z]{4}', user_input)
        if mbti_match and mbti_match.group() in [
            "INTJ", "INTP", "ENTJ", "ENTP",
            "INFJ", "INFP", "ENFJ", "ENFP",
            "ISTJ", "ISFJ", "ESTJ", "ESFJ",
            "ISTP", "ISFP", "ESTP", "ESFP"
        ]:
            profile["mbti"] = mbti_match.group()

        oshi_patterns = [r'推是(.+)', r'喜欢(.+)', r'最爱(.+)']
        for pattern in oshi_patterns:
            match = re.search(pattern, user_input)
            if match:
                oshi_name = match.group(1).strip()
                if len(oshi_name) < 20:
                    if "oshi" not in profile:
                        profile["oshi"] = []
                    profile["oshi"].append({"name": oshi_name})
                break

        styles = ["樱花", "赛博", "薰衣草", "薄荷", "极简", "粉色", "科技"]
        for style in styles:
            if style in user_input:
                profile["style_preference"] = style
                break

        return profile

    def _merge_profile(self, old: Dict[str, Any], new: Dict[str, Any]) -> Dict[str, Any]:
        """Merge profiles."""
        if not old:
            return new.copy()
        merged = old.copy()
        for key, value in new.items():
            if key == "oshi" and value:
                if "oshi" not in merged:
                    merged["oshi"] = []
                for o in value:
                    existing_names = [item.get("name") for item in merged.get("oshi", [])]
                    if o.get("name") not in existing_names:
                        merged["oshi"].append(o)
            else:
                merged[key] = value
        return merged

    def _has_enough_info(self, profile: Dict[str, Any]) -> bool:
        """Check if profile has enough info."""
        has_oshi = profile.get("oshi") and len(profile.get("oshi", [])) > 0
        has_mbti = profile.get("mbti")
        return has_oshi or has_mbti

    def _ask_for_info(self, session: Session, profile: Dict[str, Any]) -> AgentResponse:
        """Ask for missing info."""
        profile = profile or {}
        missing = []
        if not profile.get("oshi"):
            missing.append("oshi")
        if not profile.get("mbti") and not profile.get("style_preference"):
            missing.append("mbti")

        questions = []
        for field, question in self.INFO_PRIORITY:
            if field in missing:
                questions.append(question)

        if len(questions) == 0:
            questions = ["你喜欢什么风格?"]

        response = questions[0]
        if len(questions) > 1:
            response += f" 顺便问一下,{questions[1]}"

        return AgentResponse(
            session_id=session.id,
            response=response,
            suggestions=[
                {"type": "style", "name": "樱花风", "description": "温柔粉色系"},
                {"type": "style", "name": "赛博朋克", "description": "酷炫科技风"}
            ],
            requires_confirmation=False,
            state=SessionState.COLLECTING.value
        )

    def _confirm_profile(self, session: Session, profile: Dict[str, Any]) -> AgentResponse:
        """Confirm profile with user."""
        profile = profile or {}
        oshi_str = ""
        if profile.get("oshi"):
            oshi_names = [o.get("name") for o in profile.get("oshi", [])]
            oshi_str = "推：" + ", ".join(oshi_names[:2])

        mbti_str = f"MBTI:{profile.get('mbti', '未知')}" if profile.get("mbti") else ""
        style_str = f"风格:{profile.get('style_preference', '樱花')}" if profile.get("style_preference") else ""

        summary = "\n".join(filter(None, [oshi_str, mbti_str, style_str]))

        return AgentResponse(
            session_id=session.id,
            response=f"确认一下你的信息哦:\n{summary}\n这些信息对吗?",
            requires_confirmation=True,
            state=SessionState.CONFIRMING.value
        )


class _ProfileExtractToolWrapper:
    """将 ProfileExtractAgent 包装为 ReAct 可用的 Tool 接口。

    Tier 2: 让 ReActAgent 可以调用 ProfileExtractAgent 提取用户画像。
    """

    name = "extract_profile"
    description = "从用户输入中提取用户画像（推、MBTI、爱好等）"

    def __init__(self, llm_client, memory, tool_registry):
        self._llm = llm_client
        self._memory = memory
        self._tools = tool_registry

    def get_input_schema(self):
        """返回输入 schema。"""
        from pydantic import BaseModel, Field

        class ExtractProfileInput(BaseModel):
            text: str = Field(..., description="要提取画像的文本")
        return ExtractProfileInput

    async def execute(self, input_data):
        """执行画像提取。"""
        from ..agents.profile_extract import ProfileExtractAgent
        from ..memory.session import Session

        # 创建临时 session
        temp_session = Session(id="temp-react")
        agent = ProfileExtractAgent(self._llm, self._memory, self._tools)
        result = await agent.run(input_data.text, temp_session)
        return result.action.get("data", {}).get("profile", {})
