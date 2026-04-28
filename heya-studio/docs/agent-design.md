# Heya Studio AI Agent 开发设计文档

> 版本：v1.0
> 日期：2026-04-21
> 状态：待开发

---

## 目录

1. [整体架构](#1-整体架构)
2. [模块设计](#2-模块设计)
3. [工具系统设计](#3-工具系统设计)
4. [Skills 系统设计](#4-skills-系统设计)
5. [记忆系统设计](#5-记忆系统设计)
6. [安全护栏](#6-安全护栏)
7. [LLM 客户端设计](#7-llm-客户端设计)
8. [多轮对话状态机](#8-多轮对话状态机)
9. [项目结构](#9-项目结构)
10. [API 设计](#10-api-设计)
11. [特殊场景处理](#11-特殊场景处理)

---

## 1. 整体架构

### 1.1 核心设计原则

**不需要编排器，不需要 LangGraph/AutoGen 等框架。** 本质就是：

> 一个主 Agent 判断什么时候需要调用什么子 Agent，调完拿结果继续。

参考 Claude Code 和 OpenClaw 的实际模式：Router 做意图路由 + 主 Agent 按需 spawn 子 Agent。

### 1.2 架构图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              用户输入                                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Router Agent                                       │
│  职责：意图分类 + 路由                                                        │
│  输出：target_agent + extracted_context                                      │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
          ┌─────────────────────────┼─────────────────────────┐
          │                         │                         │
          ▼                         ▼                         ▼
  ┌───────────────┐        ┌───────────────┐        ┌───────────────┐
  │ Design Agent  │        │ Modify Agent  │        │  Chat Agent   │
  │   (主 Agent)   │        │   (主 Agent)   │        │   (独立)      │
  └───────────────┘        └───────────────┘        └───────────────┘
          │                         │
          │ spawn                   │
          │                         │
    ┌─────┴─────┐                   │
    │           │                   │
    ▼           ▼                   │
┌──────────┐ ┌──────────┐          │
│ProfileEx │ │Component │          │
│tract Agt │ │Search Agt│          │
└──────────┘ └──────────┘          │
    │           │                   │
    └─────┬─────┘                   │
          │                         │
          ▼                         │
    ┌──────────┐                    │
    │Validation│                    │
    │  Agent   │                    │
    └──────────┘                    │
          │                         │
          └────────────┬────────────┘
                       │
                       ▼
              ┌───────────────┐
              │  PageConfig   │
              │    JSON       │
              └───────────────┘
```

### 1.3 数据流

```
用户输入
    │
    ▼
Router Agent（意图分析）
    │
    ├── [新页面] ──► Design Agent
    │                    │
    │                    ├─► ProfileExtract Agent（如需更多信息）
    │                    │
    │                    ├─► ComponentSearch Agent（查询模板/组件）
    │                    │
    │                    ├─► LLM Call（生成配置）
    │                    │
    │                    └─► Validation Agent（校验配置）
    │
    ├── [修改页面] ──► Modify Agent
    │                      │
    │                      └─► LLM Call（修改配置）
    │
    └── [闲聊] ──► Chat Agent
                       │
                       └─► LLM Call（生成回复）
```

### 1.4 核心模块清单

| 模块 | 类型 | 职责 | 调用者 |
|------|------|------|--------|
| Router Agent | 主 Agent | 意图路由 | API 入口 |
| Design Agent | 主 Agent | 页面生成 | Router |
| Modify Agent | 主 Agent | 页面修改 | Router |
| Chat Agent | 独立 Agent | 闲聊问答 | Router |
| ProfileExtract Agent | 子 Agent | 提取用户画像 | Design Agent |
| ComponentSearch Agent | 子 Agent | 搜索组件/模板 | Design Agent |
| Validation Agent | 子 Agent | 校验配置 | Design Agent |

---

## 2. 模块设计

### 2.1 Router Agent

#### 模块职责

- 分析用户意图：新页面生成 / 修改页面 / 闲聊
- 提取初步上下文（MBTI、oshi、风格偏好等）
- 决定路由到哪个主 Agent

#### 核心类/函数签名

```python
# src/router/agent.py

from pydantic import BaseModel
from enum import Enum
from typing import Optional, List

class IntentType(str, Enum):
    NEW_PAGE = "new_page"       # 新页面生成
    MODIFY_PAGE = "modify_page" # 修改页面
    CHAT = "chat"               # 闲聊/问答

class ExtractedContext(BaseModel):
    mbti: Optional[str] = None
    oshi: Optional[List[dict]] = None  # [{"name": "xxx", "from": "xxx"}]
    style_preference: Optional[str] = None
    page_id: Optional[str] = None      # 修改页面时，目标页面ID
    selected_component: Optional[str] = None  # 框选的组件ID

class RouterResult(BaseModel):
    intent: IntentType
    context: ExtractedContext
    confidence: float  # 路由置信度 0-1
    suggested_skills: List[str] = []  # 触发的 Skill

class RouterAgent:
    def __init__(self, llm_client: "LLMClient"):
        self.llm = llm_client
    
    async def route(
        self,
        user_input: str,
        conversation_history: List[dict],
        user_profile: Optional[dict] = None
    ) -> RouterResult:
        """
        路由决策入口
        
        Args:
            user_input: 用户当前输入
            conversation_history: 对话历史
            user_profile: 用户画像（已存储的）
        
        Returns:
            RouterResult: 路由结果
        """
        pass
```

#### 关键数据结构

```python
# src/models/message.py

from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class Message(BaseModel):
    role: str  # "user" | "assistant" | "system"
    content: str
    timestamp: datetime = datetime.now()
    metadata: Optional[dict] = None  # 可选元数据（如组件ID、意图标签等）

class ConversationHistory(BaseModel):
    session_id: str
    messages: List[Message]
    created_at: datetime
    updated_at: datetime
```

#### 模块间调用关系

```
API (/api/chat) → RouterAgent.route() → {
    "new_page": DesignAgent.run(),
    "modify_page": ModifyAgent.run(),
    "chat": ChatAgent.run()
}
```

#### 意图判断规则

```python
# 简单规则 + LLM 混合判断
ROUTING_RULES = {
    "modify_keywords": ["改", "换", "变", "修改", "换成", "把...改成"],
    "new_page_keywords": ["生成", "创建", "做一个", "帮我做", "想要"],
    "chat_keywords": ["你好", "怎么样", "是什么", "为什么", "怎么"],
}

def quick_intent_check(user_input: str) -> Optional[IntentType]:
    """快速规则检查，避免不必要的 LLM 调用"""
    for kw in ROUTING_RULES["modify_keywords"]:
        if kw in user_input:
            return IntentType.MODIFY_PAGE
    for kw in ROUTING_RULES["new_page_keywords"]:
        if kw in user_input:
            return IntentType.NEW_PAGE
    return None  # 需要调用 LLM 判断
```

---

### 2.2 Design Agent（核心）

#### 模块职责

- 多轮对话状态管理
- 收集用户信息，生成 PageConfig
- 按需 spawn 子 Agent（ProfileExtract, ComponentSearch, Validation）
- 处理特殊场景（信息不足、用户改变主意、不满意等）

#### 核心类/函数签名

```python
# src/agents/design.py

from enum import Enum
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class ConversationState(str, Enum):
    INITIAL = "initial"           # 初始状态
    COLLECTING = "collecting"     # 收集信息中
    CONFIRMING = "confirming"     # 确认画像
    GENERATING = "generating"     # 生成配置
    PREVIEW = "preview"           # 展示预览
    ITERATING = "iterating"       # 迭代修改
    DONE = "done"                 # 完成

class DesignContext(BaseModel):
    session_id: str
    user_id: str
    state: ConversationState = ConversationState.INITIAL
    collected_info: Dict[str, Any] = {}  # 已收集的信息
    pending_questions: List[str] = []    # 待问的问题
    page_config: Optional[dict] = None   # 当前生成的配置
    version_history: List[dict] = []     # 历史版本（用于回退）

class DesignAgent:
    def __init__(
        self,
        llm_client: "LLMClient",
        memory_store: "MemoryStore",
        tool_registry: "ToolRegistry"
    ):
        self.llm = llm_client
        self.memory = memory_store
        self.tools = tool_registry
    
    async def run(
        self,
        user_input: str,
        context: DesignContext,
        user_profile: Optional[dict] = None
    ) -> dict:
        """
        Design Agent 主循环
        
        Returns:
            {
                "state": ConversationState,
                "response": str,  # 回复用户的内容
                "page_config": Optional[dict],  # 生成的配置（如有）
                "need_more_info": bool,  # 是否需要更多信息
                "questions": List[str],  # 待问的问题
            }
        """
        pass
    
    async def _collect_info(self, context: DesignContext) -> dict:
        """收集信息阶段"""
        pass
    
    async def _generate_config(self, context: DesignContext) -> dict:
        """生成配置阶段"""
        pass
    
    async def _handle_iteration(self, context: DesignContext) -> dict:
        """迭代修改阶段"""
        pass
    
    async def spawn_profile_extract(self, conversation: List[dict]) -> dict:
        """spawn ProfileExtract Agent"""
        pass
    
    async def spawn_component_search(self, keywords: List[str]) -> List[dict]:
        """spawn ComponentSearch Agent"""
        pass
    
    async def spawn_validation(self, config: dict) -> dict:
        """spawn Validation Agent"""
        pass
```

#### 对话阶段转换

```
┌─────────┐    用户输入包含信息     ┌────────────┐
│ INITIAL │ ───────────────────► │ COLLECTING │
└─────────┘                      └────────────┘
     │                                  │
     │ 用户直接说"生成"                  │ 信息足够
     │                                  │
     ▼                                  ▼
┌───────────┐                    ┌────────────┐
│ CONFIRMING│ ◄───────────────── │ 生成配置   │
└───────────┘   用户确认/修改     └────────────┘
     │                                  │
     │ 用户确认                         │ 生成完成
     ▼                                  ▼
┌───────────┐                    ┌───────────┐
│GENERATING │ ─────────────────► │  PREVIEW   │
└───────────┘                    └───────────┘
                                      │
                          ┌───────────┴───────────┐
                          │                       │
                          ▼                       ▼
                    ┌───────────┐           ┌─────────┐
                    │ ITERATING │           │  DONE   │
                    └───────────┘           └─────────┘
                          │
                          │ 用户满意
                          ▼
                    ┌─────────┐
                    │  DONE   │
                    └─────────┘
```

#### 工具调用时机

| 阶段 | 可能调用的工具 |
|------|----------------|
| COLLECTING | `extract_profile`, `ask_user` |
| CONFIRMING | `get_user_profile`, `render_preview` |
| GENERATING | `query_templates`, `search_components`, `recommend_colors`, `recommend_layout`, `generate_config` |
| PREVIEW | `render_preview`, `validate_config` |
| ITERATING | `modify_config`, `validate_config` |
| DONE | `save_page` |

---

### 2.3 ProfileExtract Agent

#### 模块职责

- 从用户对话中提取结构化画像
- 增量提取：每次只补充新信息，不覆盖已有信息
- 用 Pydantic schema 约束输出

#### 核心类/函数签名

```python
# src/agents/profile_extract.py

from pydantic import BaseModel, Field
from typing import Optional, List

class Oshi(BaseModel):
    name: str = Field(..., description="推的名字")
    from_work: Optional[str] = Field(None, description="来源作品")
    description: Optional[str] = Field(None, description="描述")

class Personality(BaseModel):
    mbti: Optional[str] = Field(None, description="MBTI 类型")
    blood_type: Optional[str] = Field(None, description="血型")
    zodiac: Optional[str] = Field(None, description="星座")

class Interests(BaseModel):
    hobbies: List[str] = Field(default_factory=list, description="爱好列表")
    music: List[str] = Field(default_factory=list, description="喜欢的音乐")
    anime: List[str] = Field(default_factory=list, description="喜欢的动漫")

class StylePreference(BaseModel):
    styles: List[str] = Field(default_factory=list, description="风格偏好，如 ['sakura', 'cyberpunk']")
    colors: List[str] = Field(default_factory=list, description="颜色偏好")
    effects: List[str] = Field(default_factory=list, description="特效偏好")

class SocialLink(BaseModel):
    platform: str = Field(..., description="平台名称")
    username: Optional[str] = Field(None, description="用户名")
    url: Optional[str] = Field(None, description="链接")

class UserProfile(BaseModel):
    oshi: List[Oshi] = Field(default_factory=list)
    personality: Personality = Field(default_factory=Personality)
    interests: Interests = Field(default_factory=Interests)
    style_preference: StylePreference = Field(default_factory=StylePreference)
    social_links: List[SocialLink] = Field(default_factory=list)

class ProfileExtractAgent:
    def __init__(self, llm_client: "LLMClient"):
        self.llm = llm_client
    
    async def extract(
        self,
        conversation: List[dict],
        existing_profile: Optional[UserProfile] = None
    ) -> UserProfile:
        """
        从对话中提取用户画像
        
        Args:
            conversation: 对话历史
            existing_profile: 已有的画像（增量提取）
        
        Returns:
            UserProfile: 提取/更新后的画像
        """
        pass
```

#### 增量提取逻辑

```python
async def extract(self, conversation: List[dict], existing_profile: Optional[UserProfile] = None) -> UserProfile:
    """增量提取：只提取新信息，合并到已有画像"""
    
    prompt = f"""
    你是一个用户画像提取专家。
    
    已有画像：
    {existing_profile.model_dump_json(indent=2) if existing_profile else "无"}
    
    最新对话：
    {self._format_conversation(conversation)}
    
    请从对话中提取新的用户信息，输出 JSON 格式的 UserProfile。
    注意：只提取对话中明确提到的信息，不要推断。
    """
    
    result = await self.llm.chat(
        messages=[{"role": "user", "content": prompt}],
        schema=UserProfile  # Pydantic schema 约束输出
    )
    
    # 合并到已有画像
    if existing_profile:
        return self._merge_profiles(existing_profile, result)
    return result

def _merge_profiles(self, old: UserProfile, new: UserProfile) -> UserProfile:
    """合并画像：新信息覆盖旧信息，列表追加"""
    merged = old.model_copy(deep=True)
    
    # 列表字段追加去重
    merged.oshi = list({o.name: o for o in old.oshi + new.oshi}.values())
    merged.interests.hobbies = list(set(old.interests.hobbies + new.interests.hobbies))
    
    # 标量字段覆盖
    if new.personality.mbti:
        merged.personality.mbti = new.personality.mbti
    
    return merged
```

---

### 2.4 ComponentSearch Agent

#### 模块职责

- 查询可用模板和组件
- 支持模糊匹配、分类过滤
- 返回 Top-K 推荐

#### 核心类/函数签名

```python
# src/agents/component_search.py

from pydantic import BaseModel
from typing import List, Optional

class ComponentFilter(BaseModel):
    category: Optional[str] = None  # "anime", "editor", "effect"
    tags: Optional[List[str]] = None
    style: Optional[str] = None  # "sakura", "cyberpunk"

class Component(BaseModel):
    id: str
    name: str
    category: str
    tags: List[str]
    description: str
    preview_url: Optional[str] = None
    config_template: dict  # 组件配置模板

class SearchResult(BaseModel):
    components: List[Component]
    total: int
    query: str

class ComponentSearchAgent:
    def __init__(self, db_client: "SupabaseClient"):
        self.db = db_client
    
    async def search(
        self,
        query: str,
        filters: Optional[ComponentFilter] = None,
        top_k: int = 10
    ) -> SearchResult:
        """
        搜索组件
        
        Args:
            query: 搜索关键词
            filters: 过滤条件
            top_k: 返回数量
        
        Returns:
            SearchResult: 搜索结果
        """
        pass
    
    async def get_template(self, template_id: str) -> dict:
        """获取模板详情"""
        pass
    
    async def recommend(
        self,
        user_profile: dict,
        top_k: int = 5
    ) -> List[Component]:
        """
        基于用户画像推荐组件
        
        Args:
            user_profile: 用户画像
            top_k: 返回数量
        
        Returns:
            List[Component]: 推荐组件列表
        """
        pass
```

#### 搜索策略

```python
async def search(self, query: str, filters: Optional[ComponentFilter] = None, top_k: int = 10) -> SearchResult:
    """多策略搜索"""
    
    # 策略 1：全文搜索（名称、描述）
    fulltext_results = await self._fulltext_search(query, top_k)
    
    # 策略 2：标签匹配
    tag_results = await self._tag_search(query, top_k)
    
    # 策略 3：向量相似度（如有嵌入模型）
    vector_results = await self._vector_search(query, top_k)
    
    # 合并去重，按相关性排序
    merged = self._merge_results([fulltext_results, tag_results, vector_results])
    
    # 应用过滤器
    if filters:
        merged = self._apply_filters(merged, filters)
    
    return SearchResult(
        components=merged[:top_k],
        total=len(merged),
        query=query
    )
```

---

### 2.5 Validation Agent

#### 模块职责

- 校验 PageConfig JSON 结构完整性
- 检查配色合法性、组件兼容性
- 性能检查（组件数量、图片数量限制）

#### 核心类/函数签名

```python
# src/agents/validation.py

from pydantic import BaseModel
from typing import List, Optional
from enum import Enum

class ValidationSeverity(str, Enum):
    ERROR = "error"      # 必须修复
    WARNING = "warning"  # 建议修复
    INFO = "info"        # 提示信息

class ValidationIssue(BaseModel):
    severity: ValidationSeverity
    code: str            # 错误代码
    message: str         # 错误信息
    field: Optional[str] = None  # 问题字段路径
    suggestion: Optional[str] = None  # 修复建议

class ValidationResult(BaseModel):
    passed: bool
    issues: List[ValidationIssue]
    score: float  # 0-100 配置质量分数

class ValidationAgent:
    def __init__(self, limits: "GenerationLimits"):
        self.limits = limits
    
    async def validate(
        self,
        config: dict,
        check_types: List[str] = ["structure", "compatibility", "performance"]
    ) -> ValidationResult:
        """
        校验配置
        
        Args:
            config: PageConfig JSON
            check_types: 检查类型列表
        
        Returns:
            ValidationResult: 校验结果
        """
        pass
    
    async def validate_structure(self, config: dict) -> List[ValidationIssue]:
        """校验结构完整性"""
        pass
    
    async def validate_compatibility(self, config: dict) -> List[ValidationIssue]:
        """校验组件兼容性"""
        pass
    
    async def validate_performance(self, config: dict) -> List[ValidationIssue]:
        """校验性能限制"""
        pass
```

#### 校验规则

```python
# src/guardrails/limits.py

from pydantic import BaseModel

class GenerationLimits(BaseModel):
    max_components: int = 12
    max_images: int = 8
    max_text_length: int = 5000
    max_config_size_kb: int = 100

# 校验实现
async def validate_performance(self, config: dict) -> List[ValidationIssue]:
    issues = []
    
    # 组件数量
    components = config.get("components", [])
    if len(components) > self.limits.max_components:
        issues.append(ValidationIssue(
            severity=ValidationSeverity.ERROR,
            code="COMPONENT_LIMIT_EXCEEDED",
            message=f"组件数量 {len(components)} 超过限制 {self.limits.max_components}",
            field="components",
            suggestion="减少不必要的组件"
        ))
    
    # 图片数量
    image_count = self._count_images(config)
    if image_count > self.limits.max_images:
        issues.append(ValidationIssue(
            severity=ValidationSeverity.WARNING,
            code="IMAGE_LIMIT_EXCEEDED",
            message=f"图片数量 {image_count} 超过建议值 {self.limits.max_images}",
            suggestion="考虑使用更少的图片以提升加载速度"
        ))
    
    return issues
```

---

### 2.6 Modify Agent

#### 模块职责

- 处理"框选 + 自然语言"修改场景
- 接收 selected_component_id + 修改指令
- 定位目标组件，应用修改规则
- 支持批量修改、历史回退

#### 核心类/函数签名

```python
# src/agents/modify.py

from pydantic import BaseModel
from typing import Optional, List

class ModifyRequest(BaseModel):
    page_id: str
    selected_component_ids: Optional[List[str]] = None  # 框选的组件ID列表
    instruction: str  # 自然语言修改指令
    context: Optional[dict] = None  # 当前页面配置

class ModifyResult(BaseModel):
    success: bool
    modified_config: dict
    changes: List[dict]  # 变更列表
    needs_confirmation: bool  # 是否需要用户确认
    ambiguity: Optional[str] = None  # 模糊指令的澄清问题

class ModifyAgent:
    def __init__(
        self,
        llm_client: "LLMClient",
        memory_store: "MemoryStore"
    ):
        self.llm = llm_client
        self.memory = memory_store
    
    async def run(self, request: ModifyRequest) -> ModifyResult:
        """
        执行修改
        
        Args:
            request: 修改请求
        
        Returns:
            ModifyResult: 修改结果
        """
        pass
    
    async def _detect_target(self, request: ModifyRequest) -> List[str]:
        """检测目标组件（处理未框选情况）"""
        pass
    
    async def _apply_batch_modify(self, config: dict, instruction: str) -> dict:
        """批量修改（如"全部换成赛博朋克风"）"""
        pass
    
    async def _rollback(self, page_id: str, version: int) -> dict:
        """回退到历史版本"""
        pass
```

#### 特殊场景处理

```python
async def run(self, request: ModifyRequest) -> ModifyResult:
    """主逻辑：处理各种修改场景"""
    
    # 场景 1：用户说"换一下"但没框选
    if not request.selected_component_ids:
        targets = await self._detect_target(request)
        if not targets:
            return ModifyResult(
                success=False,
                modified_config=request.context,
                needs_confirmation=True,
                ambiguity="您想修改哪个组件？请点击选择或描述具体内容。"
            )
        request.selected_component_ids = targets
    
    # 场景 2：批量修改（"全部换成..."）
    if self._is_batch_instruction(request.instruction):
        return await self._apply_batch_modify(request.context, request.instruction)
    
    # 场景 3：撤回（"撤" / "回退"）
    if self._is_rollback_request(request.instruction):
        return await self._rollback(request.page_id, version=-1)
    
    # 正常修改流程
    modified = await self._apply_single_modify(request)
    return modified

def _is_batch_instruction(self, instruction: str) -> bool:
    """判断是否为批量修改指令"""
    batch_keywords = ["全部", "所有", "整个", "都"]
    return any(kw in instruction for kw in batch_keywords)

def _is_rollback_request(self, instruction: str) -> bool:
    """判断是否为撤回请求"""
    rollback_keywords = ["撤", "回退", "撤销", "恢复", "undo"]
    return any(kw in instruction for kw in rollback_keywords)
```

---

### 2.7 Chat Agent

#### 模块职责

- 处理闲聊、FAQ
- 不触发页面生成流程
- 保持友好、二次元风格的回复

#### 核心类/函数签名

```python
# src/agents/chat.py

from pydantic import BaseModel
from typing import Optional, List

class ChatResponse(BaseModel):
    message: str
    suggestions: Optional[List[str]] = None  # 建议用户可以问的问题

class ChatAgent:
    def __init__(self, llm_client: "LLMClient"):
        self.llm = llm_client
    
    async def run(
        self,
        user_input: str,
        conversation_history: List[dict],
        user_profile: Optional[dict] = None
    ) -> ChatResponse:
        """
        生成闲聊回复
        
        Args:
            user_input: 用户输入
            conversation_history: 对话历史
            user_profile: 用户画像
        
        Returns:
            ChatResponse: 回复内容
        """
        pass
```

#### 系统提示词

```python
CHAT_SYSTEM_PROMPT = """
你是 Heya Studio 的 AI 助手，一个活泼可爱的二次元角色。

你的职责：
- 和用户友好聊天，回答关于 Heya Studio 的问题
- 引导用户描述自己想要的主页风格
- 如果用户想生成页面，告诉他们可以描述自己的推、MBTI、爱好等

风格：
- 使用可爱的语气，可以加一些二次元表情符号 (◕‿◕)
- 不要过于正式，保持轻松愉快
- 如果用户提到推/爱好，可以适当表现出兴趣

限制：
- 不要主动生成页面配置
- 不要回答与产品无关的问题
- 如果用户想生成页面，引导他们说"帮我生成一个主页"
"""
```

---

## 3. 工具系统设计

### 3.1 工具基类

```python
# src/tools/base.py

from abc import ABC, abstractmethod
from pydantic import BaseModel
from typing import Generic, TypeVar, Optional
from enum import Enum

class ToolType(str, Enum):
    READ = "read"        # 只读，可并发
    WRITE = "write"      # 写入，串行
    LLM = "llm"          # LLM 调用
    LOCAL = "local"      # 本地计算
    INTERACTION = "interaction"  # 用户交互

class ToolPermission(str, Enum):
    PUBLIC = "public"    # 所有用户
    AUTHENTICATED = "authenticated"  # 登录用户
    PRO = "pro"          # Pro 用户
    ADMIN = "admin"      # 管理员

InputT = TypeVar("InputT", bound=BaseModel)
OutputT = TypeVar("OutputT", bound=BaseModel)

class BaseTool(ABC, Generic[InputT, OutputT]):
    name: str
    description: str
    tool_type: ToolType
    permission: ToolPermission = ToolPermission.AUTHENTICATED
    
    @abstractmethod
    async def execute(self, input_data: InputT) -> OutputT:
        """执行工具"""
        pass
    
    @abstractmethod
    def get_input_schema(self) -> type[InputT]:
        """获取输入 Schema"""
        pass
    
    @abstractmethod
    def get_output_schema(self) -> type[OutputT]:
        """获取输出 Schema"""
        pass
```

### 3.2 工具注册表

```python
# src/tools/registry.py

from typing import Dict, List, Type
from .base import BaseTool, ToolType, ToolPermission

class ToolRegistry:
    def __init__(self):
        self._tools: Dict[str, BaseTool] = {}
    
    def register(self, tool: BaseTool):
        """注册工具"""
        self._tools[tool.name] = tool
    
    def get(self, name: str) -> BaseTool:
        """获取工具"""
        return self._tools.get(name)
    
    def list_tools(self, tool_type: ToolType = None) -> List[BaseTool]:
        """列出工具"""
        tools = list(self._tools.values())
        if tool_type:
            tools = [t for t in tools if t.tool_type == tool_type]
        return tools
    
    def check_permission(self, tool_name: str, user_tier: str) -> bool:
        """检查权限"""
        tool = self._tools.get(tool_name)
        if not tool:
            return False
        
        if tool.permission == ToolPermission.PUBLIC:
            return True
        if tool.permission == ToolPermission.AUTHENTICATED:
            return user_tier in ["free", "pro", "enterprise"]
        if tool.permission == ToolPermission.PRO:
            return user_tier in ["pro", "enterprise"]
        if tool.permission == ToolPermission.ADMIN:
            return user_tier == "admin"
        
        return False
```

### 3.3 工具清单

#### 只读工具（可并发）

```python
# src/tools/templates.py

from .base import BaseTool, ToolType
from pydantic import BaseModel
from typing import List, Optional

class QueryTemplatesInput(BaseModel):
    query: str
    style: Optional[str] = None
    limit: int = 5

class Template(BaseModel):
    id: str
    name: str
    description: str
    preview_url: str
    config: dict

class QueryTemplatesOutput(BaseModel):
    templates: List[Template]
    total: int

class QueryTemplatesTool(BaseTool[QueryTemplatesInput, QueryTemplatesOutput]):
    name = "query_templates"
    description = "搜索页面模板"
    tool_type = ToolType.READ
    
    async def execute(self, input_data: QueryTemplatesInput) -> QueryTemplatesOutput:
        # 实现搜索逻辑
        pass
    
    def get_input_schema(self) -> type[QueryTemplatesInput]:
        return QueryTemplatesInput
    
    def get_output_schema(self) -> type[QueryTemplatesOutput]:
        return QueryTemplatesOutput
```

#### LLM 工具

```python
# src/tools/llm_tools.py

class GenerateConfigInput(BaseModel):
    user_profile: dict
    template_id: Optional[str] = None
    style: Optional[str] = None
    constraints: Optional[dict] = None

class GenerateConfigOutput(BaseModel):
    config: dict
    reasoning: str  # 生成理由
    tokens_used: int

class GenerateConfigTool(BaseTool[GenerateConfigInput, GenerateConfigOutput]):
    name = "generate_config"
    description = "生成页面配置"
    tool_type = ToolType.LLM
    
    async def execute(self, input_data: GenerateConfigInput) -> GenerateConfigOutput:
        # 调用 LLM 生成配置
        pass
```

#### 写入工具（串行）

```python
# src/tools/page.py

class SavePageInput(BaseModel):
    user_id: str
    config: dict
    title: Optional[str] = None

class SavePageOutput(BaseModel):
    page_id: str
    success: bool

class SavePageTool(BaseTool[SavePageInput, SavePageOutput]):
    name = "save_page"
    description = "保存页面配置"
    tool_type = ToolType.WRITE
    
    async def execute(self, input_data: SavePageInput) -> SavePageOutput:
        # 保存到数据库
        pass
```

### 3.4 完整工具列表

| 工具名 | 类型 | 权限 | 输入 Schema | 输出 Schema | 说明 |
|--------|------|------|-------------|-------------|------|
| `query_templates` | READ | PUBLIC | `{query, style?, limit?}` | `{templates[], total}` | 搜索模板 |
| `search_components` | READ | PUBLIC | `{query, category?, tags?}` | `{components[], total}` | 搜索组件 |
| `get_component_detail` | READ | PUBLIC | `{component_id}` | `{component}` | 获取组件详情 |
| `recommend_colors` | READ | AUTHENTICATED | `{style, mbti?}` | `{palettes[]}` | 推荐配色 |
| `recommend_layout` | READ | AUTHENTICATED | `{components_count, style?}` | `{layout}` | 推荐布局 |
| `get_user_profile` | READ | AUTHENTICATED | `{user_id, fields?}` | `{profile}` | 获取用户画像 |
| `get_history_context` | READ | AUTHENTICATED | `{session_id, limit?}` | `{messages[]}` | 获取对话历史 |
| `extract_profile` | LLM | AUTHENTICATED | `{conversation}` | `{profile}` | 提取画像 |
| `generate_config` | LLM | AUTHENTICATED | `{profile, template?, style?}` | `{config, reasoning}` | 生成配置 |
| `modify_config` | LLM | AUTHENTICATED | `{config, instruction, targets?}` | `{config, changes[]}` | 修改配置 |
| `validate_config` | LOCAL | AUTHENTICATED | `{config}` | `{passed, issues[]}` | 校验配置 |
| `render_preview` | LOCAL | AUTHENTICATED | `{config}` | `{preview_data}` | 渲染预览 |
| `save_page` | WRITE | AUTHENTICATED | `{user_id, config, title?}` | `{page_id}` | 保存页面 |
| `load_page` | READ | AUTHENTICATED | `{page_id}` | `{config}` | 加载页面 |
| `list_user_pages` | READ | AUTHENTICATED | `{user_id, limit?}` | `{pages[]}` | 列出页面 |
| `delete_page` | WRITE | AUTHENTICATED | `{page_id}` | `{success}` | 删除页面 |
| `generate_copy` | LLM | AUTHENTICATED | `{context, tone?}` | `{copy}` | 生成文案 |
| `suggest_elements` | LLM | AUTHENTICATED | `{profile, style?}` | `{suggestions[]}` | 推荐组件 |
| `apply_skill` | LOCAL | AUTHENTICATED | `{skill_id, config}` | `{config}` | 应用 Skill |
| `check_copyright` | LOCAL | PRO | `{content, type?}` | `{issues[]}` | 版权检查 |
| `get_skill_catalog` | READ | PUBLIC | `{style?}` | `{skills[]}` | 获取 Skill 列表 |
| `ask_user` | INTERACTION | AUTHENTICATED | `{question, options?}` | `{answer}` | 向用户提问 |

---

## 4. Skills 系统设计

### 4.1 Skill 定义格式

```yaml
# src/skills/sakura.yaml

id: sakura-style
name: 樱花萌系风格包
version: 1.0.0
description: 温柔浪漫的樱花粉色系，适合二次元萌系爱好者

# 触发条件
triggers:
  keywords:
    - 樱花
    - 粉色
    - 萌系
    - 甜甜的
    - 可爱
  mbti:
    - INFP
    - ENFP
    - ISFJ
    - ESFJ
  default_priority: 10  # 无明确风格时的推荐优先级

# 配色规则
colors:
  primary: "#F2A7B3"    # 樱花粉
  secondary: "#FFEEF2"  # 浅粉
  accent: "#E8D4E8"     # 淡紫
  background: "#FFF5F8" # 背景粉
  text: "#2A2A2A"       # 文字色

# 字体搭配
fonts:
  heading: "Noto Sans SC"
  body: "Noto Sans SC"
  accent: "ZCOOL XiaoWei"  # 装饰字体

# 组件偏好
components:
  recommended:
    - OshiCard
    - AttributeWall
    - StarBackground
  avoid:
    - CyberpunkFrame
    - GlitchText
  order:  # 组件排列优先级
    - HeroSection
    - OshiCard
    - AttributeWall
    - MusicPlayer

# 特效推荐
effects:
  - type: particles
    config:
      shape: sakura
      count: 30
      speed: slow
  - type: background
    config:
      gradient: linear-gradient(135deg, #FFF5F8 0%, #F2A7B3 100%)

# 约束条件
constraints:
  min_components: 3
  max_components: 8
  background_must_be_light: true
  avoid_dark_colors: true

# 生成 Prompt 注入
prompt_suffix: |
  请使用温柔的粉色系配色，营造浪漫梦幻的氛围。
  背景建议使用渐变或飘落的花瓣特效。
  字体使用圆润的风格，避免过于硬朗的字体。
```

### 4.2 Skill 加载器

```python
# src/skills/loader.py

import yaml
from pathlib import Path
from typing import Dict, List, Optional
from pydantic import BaseModel

class Skill(BaseModel):
    id: str
    name: str
    version: str
    description: str
    triggers: dict
    colors: dict
    fonts: dict
    components: dict
    effects: List[dict]
    constraints: dict
    prompt_suffix: str

class SkillLoader:
    def __init__(self, skills_dir: str = "src/skills"):
        self.skills_dir = Path(skills_dir)
        self.skills: Dict[str, Skill] = {}
        self.catalog: List[dict] = []
    
    def load_all(self):
        """加载所有 Skills"""
        for skill_file in self.skills_dir.glob("*.yaml"):
            skill = self._load_skill(skill_file)
            self.skills[skill.id] = skill
            self.catalog.append({
                "id": skill.id,
                "name": skill.name,
                "description": skill.description
            })
    
    def _load_skill(self, file_path: Path) -> Skill:
        """加载单个 Skill"""
        with open(file_path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)
        return Skill(**data)
    
    def match_skill(self, user_input: str, user_profile: dict) -> Optional[Skill]:
        """
        根据用户输入和画像匹配 Skill
        
        Args:
            user_input: 用户输入
            user_profile: 用户画像
        
        Returns:
            Skill: 匹配的 Skill，无匹配返回 None
        """
        best_match = None
        best_score = 0
        
        for skill in self.skills.values():
            score = self._calculate_match_score(skill, user_input, user_profile)
            if score > best_score:
                best_score = score
                best_match = skill
        
        return best_match if best_score > 0 else None
    
    def _calculate_match_score(self, skill: Skill, user_input: str, user_profile: dict) -> float:
        """计算匹配分数"""
        score = 0.0
        
        # 关键词匹配
        for keyword in skill.triggers.get("keywords", []):
            if keyword in user_input.lower():
                score += 1.0
        
        # MBTI 匹配
        user_mbti = user_profile.get("personality", {}).get("mbti", "")
        if user_mbti in skill.triggers.get("mbti", []):
            score += 0.5
        
        return score
    
    def get_catalog(self) -> List[dict]:
        """获取 Skill 目录"""
        return self.catalog
```

### 4.3 Skill 应用方式

```python
# src/tools/skills.py

class ApplySkillInput(BaseModel):
    skill_id: str
    config: dict

class ApplySkillOutput(BaseModel):
    config: dict  # 应用 Skill 后的配置

class ApplySkillTool(BaseTool[ApplySkillInput, ApplySkillOutput]):
    name = "apply_skill"
    description = "应用 Skill 规则到配置"
    tool_type = ToolType.LOCAL
    
    def __init__(self, skill_loader: SkillLoader):
        self.loader = skill_loader
    
    async def execute(self, input_data: ApplySkillInput) -> ApplySkillOutput:
        skill = self.loader.skills.get(input_data.skill_id)
        if not skill:
            raise ValueError(f"Skill not found: {input_data.skill_id}")
        
        config = input_data.config.copy()
        
        # 应用配色
        if "theme" not in config:
            config["theme"] = {}
        config["theme"]["colors"] = skill.colors
        
        # 应用字体
        config["theme"]["fonts"] = skill.fonts
        
        # 应用特效
        if skill.effects:
            config["effects"] = skill.effects
        
        # 检查约束
        self._apply_constraints(config, skill.constraints)
        
        return ApplySkillOutput(config=config)
    
    def _apply_constraints(self, config: dict, constraints: dict):
        """应用约束条件"""
        components = config.get("components", [])
        
        # 组件数量限制
        min_c = constraints.get("min_components", 0)
        max_c = constraints.get("max_components", 999)
        if len(components) > max_c:
            config["components"] = components[:max_c]
```

---

## 5. 记忆系统设计

### 5.1 记忆层次

```
┌─────────────────────────────────────────────────────────────────────┐
│                        短期记忆 (Working Memory)                     │
│  存储：内存                                                            │
│  生命周期：单次请求                                                    │
│  内容：当前对话轮次的工作数据                                           │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        会话记忆 (Session Memory)                    │
│  存储：Redis                                                          │
│  TTL：24 小时                                                         │
│  内容：对话摘要、已提取的用户信息、当前页面配置                          │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        用户记忆 (User Memory)                        │
│  存储：Supabase (user_profiles 表)                                   │
│  生命周期：永久                                                        │
│  内容：MBTI、推、兴趣爱好、风格偏好                                     │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        反馈记忆 (Feedback Memory)                    │
│  存储：Supabase (user_feedback 表)                                   │
│  生命周期：永久（带 decay）                                            │
│  内容：用户纠正记录                                                    │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.2 数据库表结构

```sql
-- 用户画像表
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL UNIQUE,
    
    -- 基本信息
    mbti VARCHAR(10),
    blood_type VARCHAR(5),
    zodiac VARCHAR(20),
    
    -- 推
    oshi JSONB DEFAULT '[]'::jsonb,
    -- 格式: [{"name": "xxx", "from_work": "xxx", "description": "xxx"}]
    
    -- 兴趣爱好
    hobbies TEXT[] DEFAULT '{}',
    favorite_music TEXT[] DEFAULT '{}',
    favorite_anime TEXT[] DEFAULT '{}',
    
    -- 风格偏好
    style_preferences TEXT[] DEFAULT '{}',
    color_preferences TEXT[] DEFAULT '{}',
    
    -- 社交链接
    social_links JSONB DEFAULT '[]'::jsonb,
    -- 格式: [{"platform": "xxx", "username": "xxx", "url": "xxx"}]
    
    -- 元数据
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 用户反馈表
CREATE TABLE user_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    
    feedback_type VARCHAR(20) NOT NULL,
    -- 'correction' | 'confirmation' | 'preference'
    
    keywords TEXT[] NOT NULL,
    -- 关键词索引，用于快速检索
    -- 如 ['粉色', '不要', '风格']
    
    content TEXT NOT NULL,
    -- 反馈内容
    -- 如 "不要用粉色，太少女了"
    
    context JSONB,
    -- 反馈时的上下文（当时的配置）
    
    -- Decay 机制
    relevance_score FLOAT DEFAULT 1.0,
    -- 相关性分数，随时间衰减
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 页面历史表
CREATE TABLE page_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id UUID NOT NULL,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    
    page_config JSONB NOT NULL,
    version INTEGER NOT NULL,
    
    -- 变更说明
    change_summary TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_user_feedback_user_id ON user_feedback(user_id);
CREATE INDEX idx_user_feedback_keywords ON user_feedback USING GIN(keywords);
CREATE INDEX idx_page_history_page_id ON page_history(page_id);
CREATE INDEX idx_page_history_user_id ON page_history(user_id);
```

### 5.3 读写接口

```python
# src/memory/user.py

from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime

class UserProfile(BaseModel):
    user_id: str
    mbti: Optional[str] = None
    blood_type: Optional[str] = None
    zodiac: Optional[str] = None
    oshi: List[dict] = []
    hobbies: List[str] = []
    favorite_music: List[str] = []
    favorite_anime: List[str] = []
    style_preferences: List[str] = []
    color_preferences: List[str] = []
    social_links: List[dict] = []
    created_at: datetime
    updated_at: datetime

class UserMemoryStore:
    def __init__(self, db_client: "SupabaseClient"):
        self.db = db_client
    
    async def get_profile(self, user_id: str) -> Optional[UserProfile]:
        """获取用户画像"""
        result = await self.db.table("user_profiles").select("*").eq("user_id", user_id).execute()
        if result.data:
            return UserProfile(**result.data[0])
        return None
    
    async def update_profile(self, user_id: str, updates: dict) -> UserProfile:
        """更新用户画像（增量更新）"""
        updates["updated_at"] = datetime.now().isoformat()
        result = await self.db.table("user_profiles").update(updates).eq("user_id", user_id).execute()
        return UserProfile(**result.data[0])
    
    async def create_profile(self, user_id: str, initial_data: dict = None) -> UserProfile:
        """创建用户画像"""
        data = {"user_id": user_id}
        if initial_data:
            data.update(initial_data)
        result = await self.db.table("user_profiles").insert(data).execute()
        return UserProfile(**result.data[0])
```

```python
# src/memory/session.py

import json
from typing import Optional, List
from datetime import datetime, timedelta

class SessionMemory:
    def __init__(self, redis_client: "RedisClient", ttl: int = 86400):
        self.redis = redis_client
        self.ttl = ttl  # 24 小时
    
    def _key(self, session_id: str) -> str:
        return f"session:{session_id}:memory"
    
    async def get(self, session_id: str) -> Optional[dict]:
        """获取会话记忆"""
        data = await self.redis.get(self._key(session_id))
        if data:
            return json.loads(data)
        return None
    
    async def set(self, session_id: str, memory: dict):
        """设置会话记忆"""
        await self.redis.setex(
            self._key(session_id),
            self.ttl,
            json.dumps(memory, ensure_ascii=False)
        )
    
    async def append_message(self, session_id: str, role: str, content: str):
        """追加消息到会话历史"""
        memory = await self.get(session_id) or {"messages": []}
        memory["messages"].append({
            "role": role,
            "content": content,
            "timestamp": datetime.now().isoformat()
        })
        await self.set(session_id, memory)
    
    async def update_extracted_profile(self, session_id: str, profile: dict):
        """更新已提取的用户信息"""
        memory = await self.get(session_id) or {"messages": [], "extracted_profile": {}}
        memory["extracted_profile"] = profile
        await self.set(session_id, memory)
```

```python
# src/memory/feedback.py

from typing import List
from datetime import datetime

class FeedbackMemory:
    def __init__(self, db_client: "SupabaseClient"):
        self.db = db_client
    
    async def save_feedback(
        self,
        user_id: str,
        feedback_type: str,
        content: str,
        keywords: List[str],
        context: dict = None
    ):
        """保存用户反馈"""
        await self.db.table("user_feedback").insert({
            "user_id": user_id,
            "feedback_type": feedback_type,
            "content": content,
            "keywords": keywords,
            "context": context,
            "created_at": datetime.now().isoformat()
        }).execute()
    
    async def search_feedback(self, user_id: str, keywords: List[str], limit: int = 5) -> List[dict]:
        """搜索相关反馈"""
        # 使用关键词索引搜索
        result = await self.db.table("user_feedback").select("*").eq("user_id", user_id).contains("keywords", keywords).limit(limit).execute()
        return result.data
    
    async def get_all_feedback(self, user_id: str) -> List[dict]:
        """获取用户所有反馈"""
        result = await self.db.table("user_feedback").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
        return result.data
```

---

## 6. 安全护栏

### 6.1 生成限制

```python
# src/guardrails/limits.py

from pydantic import BaseModel
from typing import Dict

class UserTier(str, Enum):
    FREE = "free"
    PRO = "pro"
    ENTERPRISE = "enterprise"

class GenerationLimits(BaseModel):
    max_components: int = 12
    max_images: int = 8
    max_text_length: int = 5000
    max_config_size_kb: int = 100
    max_iterations: int = 10

TIER_LIMITS: Dict[UserTier, GenerationLimits] = {
    UserTier.FREE: GenerationLimits(
        max_components=8,
        max_images=5,
        max_text_length=3000,
        max_config_size_kb=50,
        max_iterations=5
    ),
    UserTier.PRO: GenerationLimits(
        max_components=20,
        max_images=20,
        max_text_length=10000,
        max_config_size_kb=200,
        max_iterations=15
    ),
    UserTier.ENTERPRISE: GenerationLimits(
        max_components=100,
        max_images=100,
        max_text_length=50000,
        max_config_size_kb=1000,
        max_iterations=50
    )
}

def get_limits(user_tier: UserTier) -> GenerationLimits:
    return TIER_LIMITS[user_tier]
```

### 6.2 内容安全

```python
# src/guardrails/content_filter.py

from typing import List, Tuple
from enum import Enum

class ContentType(str, Enum):
    SENSITIVE = "sensitive"
    TRADEMARK = "trademark"
    SPAM = "spam"

class ModerationResult(BaseModel):
    passed: bool
    violations: List[dict]
    
class ContentFilter:
    # 敏感词列表（实际项目应从配置文件或数据库加载）
    SENSITIVE_WORDS = [
        # 政治敏感词
        # 色情暴力词
        # 违规内容词
    ]
    
    # 商标关键词（需要警告但不一定拦截）
    TRADEMARK_KEYWORDS = [
        "原神", "崩坏", "舰娘", "Fate", "EVA", "巨人", "进击的巨人",
        "鬼灭之刃", "咒术回战", "海贼王", "火影忍者"
    ]
    
    async def moderate(self, content: str) -> ModerationResult:
        """
        内容审核
        
        Returns:
            ModerationResult: 审核结果
        """
        violations = []
        
        # 敏感词检查
        for word in self.SENSITIVE_WORDS:
            if word in content:
                violations.append({
                    "type": ContentType.SENSITIVE,
                    "keyword": word,
                    "severity": "high",
                    "action": "block"
                })
        
        # 商标检查
        for keyword in self.TRADEMARK_KEYWORDS:
            if keyword in content:
                violations.append({
                    "type": ContentType.TRADEMARK,
                    "keyword": keyword,
                    "severity": "medium",
                    "action": "warn"
                })
        
        # 是否通过：high severity 的违规不通过
        passed = not any(v["severity"] == "high" for v in violations)
        
        return ModerationResult(passed=passed, violations=violations)
```

### 6.3 权限控制

```python
# src/guardrails/permissions.py

from typing import List
from .limits import get_limits, UserTier

def check_permission(
    user_id: str,
    resource: str,
    action: str,
    user_tier: UserTier
) -> bool:
    """
    检查权限
    
    Args:
        user_id: 用户ID
        resource: 资源类型 (page, component, template)
        action: 操作类型 (read, write, delete)
        user_tier: 用户等级
    
    Returns:
        bool: 是否有权限
    """
    # 用户只能操作自己的页面
    if resource == "page" and action in ["write", "delete"]:
        # 实际实现中会检查 page 的 owner_id == user_id
        return True
    
    return True

def check_page_ownership(user_id: str, page_id: str, db_client) -> bool:
    """检查页面所有权"""
    result = db_client.table("pages").select("user_id").eq("id", page_id).execute()
    if result.data:
        return result.data[0]["user_id"] == user_id
    return False
```

### 6.4 速率限制

```python
# src/guardrails/rate_limiter.py

from typing import Dict
from datetime import datetime, timedelta
import redis

class RateLimiter:
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
    
    async def check_rate_limit(
        self,
        user_id: str,
        action: str,
        max_requests: int,
        window_seconds: int = 60
    ) -> bool:
        """
        检查速率限制
        
        Args:
            user_id: 用户ID
            action: 操作类型
            max_requests: 窗口期内最大请求数
            window_seconds: 窗口期（秒）
        
        Returns:
            bool: 是否允许请求
        """
        key = f"rate_limit:{user_id}:{action}"
        
        # 获取当前计数
        current = await self.redis.get(key)
        if current is None:
            await self.redis.setex(key, window_seconds, 1)
            return True
        
        if int(current) >= max_requests:
            return False
        
        await self.redis.incr(key)
        return True
    
    async def get_remaining_requests(
        self,
        user_id: str,
        action: str,
        max_requests: int
    ) -> int:
        """获取剩余请求数"""
        key = f"rate_limit:{user_id}:{action}"
        current = await self.redis.get(key)
        if current is None:
            return max_requests
        return max(0, max_requests - int(current))

# 速率限制配置
RATE_LIMITS = {
    "generate": {"max_requests": 10, "window_seconds": 60},  # 每分钟 10 次生成
    "chat": {"max_requests": 30, "window_seconds": 60},       # 每分钟 30 次对话
    "modify": {"max_requests": 20, "window_seconds": 60},     # 每分钟 20 次修改
}
```

---

## 7. LLM 客户端设计

### 7.1 统一接口

```python
# src/llm/client.py

from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any, Type
from pydantic import BaseModel
from enum import Enum

class ModelProvider(str, Enum):
    MINIMAX = "minimax"
    QWEN = "qwen"

class Message(BaseModel):
    role: str  # "system" | "user" | "assistant"
    content: str

class LLMResponse(BaseModel):
    content: str
    model: str
    input_tokens: int
    output_tokens: int
    finish_reason: str

class LLMClient(ABC):
    """LLM 统一客户端接口"""
    
    @abstractmethod
    async def chat(
        self,
        messages: List[Message],
        schema: Optional[Type[BaseModel]] = None,
        temperature: float = 0.7,
        max_tokens: int = 4096
    ) -> LLMResponse:
        """
        调用 LLM
        
        Args:
            messages: 消息列表
            schema: Pydantic schema，用于结构化输出
            temperature: 温度参数
            max_tokens: 最大 token 数
        
        Returns:
            LLMResponse: LLM 响应
        """
        pass
    
    @abstractmethod
    async def chat_with_schema(
        self,
        messages: List[Message],
        schema: Type[BaseModel],
        temperature: float = 0.7
    ) -> BaseModel:
        """
        结构化输出（强制按 schema 返回）
        """
        pass
```

### 7.2 MiniMax 适配器

```python
# src/llm/minimax.py

import httpx
from typing import List, Optional, Type
from .client import LLMClient, LLMResponse, Message
from pydantic import BaseModel
import json

class MiniMaxClient(LLMClient):
    def __init__(
        self,
        api_key: str,
        model: str = "abab6.5s-chat",
        base_url: str = "https://api.minimax.chat/v1"
    ):
        self.api_key = api_key
        self.model = model
        self.base_url = base_url
        self.client = httpx.AsyncClient(timeout=60.0)
    
    async def chat(
        self,
        messages: List[Message],
        schema: Optional[Type[BaseModel]] = None,
        temperature: float = 0.7,
        max_tokens: int = 4096
    ) -> LLMResponse:
        """调用 MiniMax API"""
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": self.model,
            "messages": [{"role": m.role, "content": m.content} for m in messages],
            "temperature": temperature,
            "max_tokens": max_tokens
        }
        
        # 结构化输出
        if schema:
            payload["response_format"] = {
                "type": "json_object",
                "schema": schema.model_json_schema()
            }
        
        response = await self.client.post(
            f"{self.base_url}/chat/completions",
            headers=headers,
            json=payload
        )
        
        response.raise_for_status()
        data = response.json()
        
        return LLMResponse(
            content=data["choices"][0]["message"]["content"],
            model=data["model"],
            input_tokens=data.get("usage", {}).get("prompt_tokens", 0),
            output_tokens=data.get("usage", {}).get("completion_tokens", 0),
            finish_reason=data["choices"][0].get("finish_reason", "stop")
        )
    
    async def chat_with_schema(
        self,
        messages: List[Message],
        schema: Type[BaseModel],
        temperature: float = 0.7
    ) -> BaseModel:
        """结构化输出"""
        response = await self.chat(messages, schema=schema, temperature=temperature)
        data = json.loads(response.content)
        return schema(**data)
```

### 7.3 Qwen 适配器

```python
# src/llm/qwen.py

import httpx
from typing import List, Optional, Type
from .client import LLMClient, LLMResponse, Message
from pydantic import BaseModel
import json

class QwenClient(LLMClient):
    def __init__(
        self,
        api_key: str,
        model: str = "qwen-plus",
        base_url: str = "https://dashscope.aliyuncs.com/api/v1"
    ):
        self.api_key = api_key
        self.model = model
        self.base_url = base_url
        self.client = httpx.AsyncClient(timeout=60.0)
    
    async def chat(
        self,
        messages: List[Message],
        schema: Optional[Type[BaseModel]] = None,
        temperature: float = 0.7,
        max_tokens: int = 4096
    ) -> LLMResponse:
        """调用 Qwen API"""
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": self.model,
            "input": {
                "messages": [{"role": m.role, "content": m.content} for m in messages]
            },
            "parameters": {
                "temperature": temperature,
                "max_tokens": max_tokens,
                "result_format": "message"
            }
        }
        
        # 结构化输出
        if schema:
            payload["parameters"]["result_format"] = "json"
            # 添加 schema 提示
            schema_prompt = f"\n\n请严格按照以下 JSON Schema 格式输出：\n{json.dumps(schema.model_json_schema(), ensure_ascii=False, indent=2)}"
            payload["input"]["messages"][-1]["content"] += schema_prompt
        
        response = await self.client.post(
            f"{self.base_url}/services/aigc/text-generation/generation",
            headers=headers,
            json=payload
        )
        
        response.raise_for_status()
        data = response.json()
        
        return LLMResponse(
            content=data["output"]["choices"][0]["message"]["content"],
            model=data["model"],
            input_tokens=data.get("usage", {}).get("input_tokens", 0),
            output_tokens=data.get("usage", {}).get("output_tokens", 0),
            finish_reason=data["output"]["choices"][0].get("finish_reason", "stop")
        )
    
    async def chat_with_schema(
        self,
        messages: List[Message],
        schema: Type[BaseModel],
        temperature: float = 0.7
    ) -> BaseModel:
        """结构化输出"""
        response = await self.chat(messages, schema=schema, temperature=temperature)
        data = json.loads(response.content)
        return schema(**data)
```

### 7.4 模型切换与错误处理

```python
# src/llm/client.py (续)

class LLMClientManager:
    """LLM 客户端管理器，支持主备切换"""
    
    def __init__(
        self,
        primary: LLMClient,
        fallback: Optional[LLMClient] = None,
        max_retries: int = 3,
        retry_delay: float = 1.0
    ):
        self.primary = primary
        self.fallback = fallback
        self.max_retries = max_retries
        self.retry_delay = retry_delay
    
    async def chat(
        self,
        messages: List[Message],
        schema: Optional[Type[BaseModel]] = None,
        temperature: float = 0.7,
        max_tokens: int = 4096
    ) -> LLMResponse:
        """调用 LLM，支持重试和降级"""
        
        last_error = None
        
        # 尝试主模型
        for attempt in range(self.max_retries):
            try:
                return await self.primary.chat(
                    messages, schema, temperature, max_tokens
                )
            except Exception as e:
                last_error = e
                if attempt < self.max_retries - 1:
                    await asyncio.sleep(self.retry_delay * (attempt + 1))
        
        # 主模型失败，尝试备选模型
        if self.fallback:
            try:
                return await self.fallback.chat(
                    messages, schema, temperature, max_tokens
                )
            except Exception as e:
                last_error = e
        
        raise LLMError(f"LLM call failed after retries: {last_error}")

class LLMError(Exception):
    """LLM 调用错误"""
    pass
```

### 7.5 Token 计数与成本追踪

```python
# src/llm/token_tracking.py

from typing import Dict
from datetime import datetime
import tiktoken

class TokenTracker:
    """Token 使用追踪"""
    
    def __init__(self, db_client):
        self.db = db_client
        # 简单估算器（实际可用 tiktoken）
        self.encoder = tiktoken.get_encoding("cl100k_base")
    
    def estimate_tokens(self, text: str) -> int:
        """估算 token 数"""
        return len(self.encoder.encode(text))
    
    async def record_usage(
        self,
        user_id: str,
        model: str,
        input_tokens: int,
        output_tokens: int
    ):
        """记录 token 使用"""
        today = datetime.now().date().isoformat()
        
        # 累加到日统计
        await self.db.table("token_usage").upsert({
            "user_id": user_id,
            "date": today,
            "model": model,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "request_count": 1
        }, on_conflict="user_id,date,model").execute()
    
    async def get_daily_usage(self, user_id: str) -> Dict[str, int]:
        """获取今日使用量"""
        today = datetime.now().date().isoformat()
        result = await self.db.table("token_usage").select("*").eq("user_id", user_id).eq("date", today).execute()
        
        total_input = sum(r["input_tokens"] for r in result.data)
        total_output = sum(r["output_tokens"] for r in result.data)
        
        return {
            "input_tokens": total_input,
            "output_tokens": total_output,
            "total_tokens": total_input + total_output
        }
```

---

## 8. 多轮对话状态机

### 8.1 状态定义

```python
# src/agents/states.py

from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel

class ConversationState(str, Enum):
    INITIAL = "initial"           # 初始状态，等待用户输入
    COLLECTING = "collecting"     # 收集用户信息中
    CONFIRMING = "confirming"     # 确认用户画像
    GENERATING = "generating"     # 生成配置中
    PREVIEW = "preview"           # 展示预览，等待反馈
    ITERATING = "iterating"       # 迭代修改中
    DONE = "done"                 # 完成

class StateTransition(BaseModel):
    from_state: ConversationState
    to_state: ConversationState
    trigger: str  # 触发条件描述
    action: str   # 动作描述

STATE_TRANSITIONS = [
    # INITIAL
    StateTransition(
        from_state=ConversationState.INITIAL,
        to_state=ConversationState.COLLECTING,
        trigger="用户表达生成意图",
        action="开始收集信息"
    ),
    StateTransition(
        from_state=ConversationState.INITIAL,
        to_state=ConversationState.GENERATING,
        trigger="用户直接说'生成'且信息足够",
        action="跳过收集，直接生成"
    ),
    
    # COLLECTING
    StateTransition(
        from_state=ConversationState.COLLECTING,
        to_state=ConversationState.CONFIRMING,
        trigger="收集到足够信息",
        action="确认用户画像"
    ),
    StateTransition(
        from_state=ConversationState.COLLECTING,
        to_state=ConversationState.GENERATING,
        trigger="用户说'跳过'或'直接生成'",
        action="使用默认值生成"
    ),
    
    # CONFIRMING
    StateTransition(
        from_state=ConversationState.CONFIRMING,
        to_state=ConversationState.GENERATING,
        trigger="用户确认",
        action="开始生成配置"
    ),
    StateTransition(
        from_state=ConversationState.CONFIRMING,
        to_state=ConversationState.COLLECTING,
        trigger="用户修改信息",
        action="返回收集更多信息"
    ),
    
    # GENERATING
    StateTransition(
        from_state=ConversationState.GENERATING,
        to_state=ConversationState.PREVIEW,
        trigger="生成成功",
        action="展示预览"
    ),
    StateTransition(
        from_state=ConversationState.GENERATING,
        to_state=ConversationState.COLLECTING,
        trigger="生成失败（信息不足）",
        action="返回收集更多信息"
    ),
    
    # PREVIEW
    StateTransition(
        from_state=ConversationState.PREVIEW,
        to_state=ConversationState.ITERATING,
        trigger="用户要求修改",
        action="进入迭代修改"
    ),
    StateTransition(
        from_state=ConversationState.PREVIEW,
        to_state=ConversationState.DONE,
        trigger="用户满意",
        action="保存并完成"
    ),
    
    # ITERATING
    StateTransition(
        from_state=ConversationState.ITERATING,
        to_state=ConversationState.PREVIEW,
        trigger="修改完成",
        action="展示新预览"
    ),
    StateTransition(
        from_state=ConversationState.ITERATING,
        to_state=ConversationState.DONE,
        trigger="用户满意",
        action="保存并完成"
    ),
    
    # DONE
    StateTransition(
        from_state=ConversationState.DONE,
        to_state=ConversationState.INITIAL,
        trigger="用户开始新对话",
        action="重置状态"
    ),
]
```

### 8.2 状态机实现

```python
# src/agents/state_machine.py

from typing import Optional, Dict, Any
from .states import ConversationState, STATE_TRANSITIONS

class StateMachine:
    """对话状态机"""
    
    def __init__(self):
        self.current_state = ConversationState.INITIAL
        self.state_history = [ConversationState.INITIAL]
    
    def get_state(self) -> ConversationState:
        """获取当前状态"""
        return self.current_state
    
    def set_state(self, new_state: ConversationState):
        """设置状态"""
        self.current_state = new_state
        self.state_history.append(new_state)
    
    def can_transition_to(self, target_state: ConversationState) -> bool:
        """检查是否可以转移到目标状态"""
        for transition in STATE_TRANSITIONS:
            if (transition.from_state == self.current_state and 
                transition.to_state == target_state):
                return True
        return False
    
    def get_valid_transitions(self) -> list:
        """获取当前状态的所有有效转移"""
        return [
            t for t in STATE_TRANSITIONS 
            if t.from_state == self.current_state
        ]
    
    def rollback(self, steps: int = 1) -> bool:
        """回退状态"""
        if len(self.state_history) <= steps:
            return False
        
        for _ in range(steps):
            self.state_history.pop()
        
        self.current_state = self.state_history[-1]
        return True
    
    def reset(self):
        """重置状态机"""
        self.current_state = ConversationState.INITIAL
        self.state_history = [ConversationState.INITIAL]
```

### 8.3 每个状态的行为

```python
# src/agents/design.py (状态处理)

class DesignAgent:
    # ... 其他代码
    
    async def _handle_state(self, context: DesignContext, user_input: str) -> dict:
        """根据当前状态处理用户输入"""
        
        state = context.state
        
        if state == ConversationState.INITIAL:
            return await self._handle_initial(context, user_input)
        
        elif state == ConversationState.COLLECTING:
            return await self._handle_collecting(context, user_input)
        
        elif state == ConversationState.CONFIRMING:
            return await self._handle_confirming(context, user_input)
        
        elif state == ConversationState.GENERATING:
            return await self._handle_generating(context, user_input)
        
        elif state == ConversationState.PREVIEW:
            return await self._handle_preview(context, user_input)
        
        elif state == ConversationState.ITERATING:
            return await self._handle_iterating(context, user_input)
        
        elif state == ConversationState.DONE:
            return await self._handle_done(context, user_input)
    
    async def _handle_initial(self, context: DesignContext, user_input: str) -> dict:
        """初始状态处理"""
        
        # 检查是否为生成意图
        if self._is_generation_intent(user_input):
            # 检查信息是否足够
            if self._has_enough_info(context.collected_info):
                context.state = ConversationState.GENERATING
                return await self._handle_generating(context, user_input)
            else:
                context.state = ConversationState.COLLECTING
                return await self._handle_collecting(context, user_input)
        
        # 非生成意图，返回初始回复
        return {
            "state": ConversationState.INITIAL,
            "response": "你好！我是 Heya Studio 的 AI 助手。我可以帮你生成一个漂亮的二次元风格主页。告诉我你的 MBTI、喜欢的推（偶像/角色）、爱好，我来为你设计独一无二的主页吧！",
            "need_more_info": True
        }
    
    async def _handle_collecting(self, context: DesignContext, user_input: str) -> dict:
        """收集信息状态处理"""
        
        # 提取信息
        extracted = await self.spawn_profile_extract([
            {"role": "user", "content": user_input}
        ])
        
        # 合并到已收集信息
        context.collected_info = self._merge_info(context.collected_info, extracted)
        
        # 检查是否跳过
        if "跳过" in user_input or "直接生成" in user_input:
            context.state = ConversationState.GENERATING
            return await self._handle_generating(context, user_input)
        
        # 检查信息是否足够
        missing = self._get_missing_info(context.collected_info)
        
        if not missing:
            # 信息足够，进入确认
            context.state = ConversationState.CONFIRMING
            return await self._handle_confirming(context, user_input)
        
        # 继续收集
        return {
            "state": ConversationState.COLLECTING,
            "response": self._generate_follow_up_question(missing),
            "need_more_info": True,
            "questions": missing
        }
    
    async def _handle_confirming(self, context: DesignContext, user_input: str) -> dict:
        """确认状态处理"""
        
        # 检查用户确认
        if self._is_confirmation(user_input):
            context.state = ConversationState.GENERATING
            return await self._handle_generating(context, user_input)
        
        # 检查用户修改
        if self._is_modification(user_input):
            context.state = ConversationState.COLLECTING
            return await self._handle_collecting(context, user_input)
        
        # 默认：展示确认信息
        return {
            "state": ConversationState.CONFIRMING,
            "response": self._generate_confirmation_message(context.collected_info),
            "need_more_info": False
        }
```

### 8.4 超时处理

```python
# src/agents/design.py (超时处理)

class DesignAgent:
    # ... 其他代码
    
    SESSION_TIMEOUT = 3600  # 1 小时
    
    async def check_timeout(self, context: DesignContext) -> bool:
        """检查会话是否超时"""
        last_activity = context.get("last_activity")
        if not last_activity:
            return False
        
        elapsed = datetime.now() - last_activity
        return elapsed.total_seconds() > self.SESSION_TIMEOUT
    
    async def handle_timeout(self, context: DesignContext) -> dict:
        """处理超时"""
        return {
            "state": ConversationState.INITIAL,
            "response": "会话已超时。如果需要继续，请重新开始。",
            "need_more_info": True,
            "timeout": True
        }
```

---

## 9. 项目结构

```
heya-studio-backend/
├── src/
│   ├── __init__.py
│   ├── main.py                     # FastAPI 入口
│   ├── config.py                   # 配置管理
│   │
│   ├── router/
│   │   ├── __init__.py
│   │   └── agent.py                # Router Agent
│   │
│   ├── agents/
│   │   ├── __init__.py
│   │   ├── base.py                 # Agent 基类
│   │   ├── states.py               # 状态定义
│   │   ├── state_machine.py        # 状态机
│   │   ├── design.py               # Design Agent
│   │   ├── modify.py               # Modify Agent
│   │   ├── profile_extract.py      # ProfileExtract Agent
│   │   ├── component_search.py     # ComponentSearch Agent
│   │   ├── validation.py           # Validation Agent
│   │   └── chat.py                 # Chat Agent
│   │
│   ├── tools/
│   │   ├── __init__.py
│   │   ├── base.py                 # Tool 基类
│   │   ├── registry.py             # 工具注册表
│   │   ├── templates.py            # 模板工具
│   │   ├── components.py           # 组件工具
│   │   ├── config.py               # 配置工具
│   │   ├── page.py                 # 页面 CRUD
│   │   ├── llm_tools.py            # LLM 调用工具
│   │   ├── skills.py               # Skill 工具
│   │   └── user.py                 # 用户画像工具
│   │
│   ├── skills/
│   │   ├── __init__.py
│   │   ├── loader.py               # Skill 加载器
│   │   ├── catalog.json            # Skill 目录
│   │   ├── sakura.yaml             # 樱花风 Skill
│   │   ├── cyberpunk.yaml          # 赛博朋克 Skill
│   │   ├── magical-girl.yaml       # 魔法少女 Skill
│   │   ├── minimalist.yaml         # 极简 Skill
│   │   └── rock.yaml               # 摇滚 Skill
│   │
│   ├── memory/
│   │   ├── __init__.py
│   │   ├── session.py              # 会话记忆（Redis）
│   │   ├── user.py                 # 用户记忆（Supabase）
│   │   └── feedback.py             # 反馈记忆（Supabase）
│   │
│   ├── llm/
│   │   ├── __init__.py
│   │   ├── client.py               # LLM 统一客户端
│   │   ├── minimax.py              # MiniMax 适配器
│   │   ├── qwen.py                 # Qwen 适配器
│   │   ├── schemas.py              # 输出 Schema 定义
│   │   └── token_tracking.py       # Token 追踪
│   │
│   ├── guardrails/
│   │   ├── __init__.py
│   │   ├── content_filter.py       # 内容过滤
│   │   ├── rate_limiter.py         # 速率限制
│   │   ├── limits.py               # 生成限制
│   │   └── permissions.py          # 权限控制
│   │
│   ├── models/
│   │   ├── __init__.py
│   │   ├── page.py                 # Page 数据模型
│   │   ├── profile.py              # UserProfile 数据模型
│   │   ├── message.py              # 消息模型
│   │   └── tool.py                 # 工具模型
│   │
│   ├── db/
│   │   ├── __init__.py
│   │   ├── supabase.py             # Supabase 客户端
│   │   └── redis.py               # Redis 客户端
│   │
│   └── api/
│       ├── __init__.py
│       ├── chat.py                 # 对话 API
│       ├── pages.py                # 页面 CRUD API
│       ├── skills.py               # Skills API
│       └── templates.py            # 模板 API
│
├── tests/
│   ├── __init__.py
│   ├── test_router.py
│   ├── test_design_agent.py
│   ├── test_modify_agent.py
│   ├── test_tools.py
│   └── test_llm_client.py
│
├── .env.example
├── pyproject.toml
├── requirements.txt
└── README.md
```

---

## 10. API 设计

### 10.1 REST API 端点

```python
# src/api/chat.py

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List

router = APIRouter(prefix="/api/chat", tags=["chat"])

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    context: Optional[dict] = None

class ChatResponse(BaseModel):
    response: str
    session_id: str
    state: str
    page_config: Optional[dict] = None
    need_more_info: bool = False
    questions: Optional[List[str]] = None

@router.post("", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    user_id: str = Depends(get_current_user_id)
):
    """
    对话入口
    
    - 如果 session_id 不存在，创建新会话
    - 分析用户意图，路由到对应 Agent
    - 返回 Agent 响应
    """
    pass
```

```python
# src/api/pages.py

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List

router = APIRouter(prefix="/api/pages", tags=["pages"])

class Page(BaseModel):
    id: str
    user_id: str
    title: Optional[str]
    config: dict
    created_at: str
    updated_at: str

class CreatePageRequest(BaseModel):
    title: Optional[str] = None
    config: dict

class UpdatePageRequest(BaseModel):
    title: Optional[str] = None
    config: Optional[dict] = None

@router.get("", response_model=List[Page])
async def list_pages(
    user_id: str = Depends(get_current_user_id),
    limit: int = 20,
    offset: int = 0
):
    """列出用户页面"""
    pass

@router.get("/{page_id}", response_model=Page)
async def get_page(
    page_id: str,
    user_id: str = Depends(get_current_user_id)
):
    """获取页面详情"""
    pass

@router.post("", response_model=Page)
async def create_page(
    request: CreatePageRequest,
    user_id: str = Depends(get_current_user_id)
):
    """创建页面"""
    pass

@router.put("/{page_id}", response_model=Page)
async def update_page(
    page_id: str,
    request: UpdatePageRequest,
    user_id: str = Depends(get_current_user_id)
):
    """更新页面"""
    pass

@router.delete("/{page_id}")
async def delete_page(
    page_id: str,
    user_id: str = Depends(get_current_user_id)
):
    """删除页面"""
    pass
```

```python
# src/api/skills.py

from fastapi import APIRouter
from pydantic import BaseModel
from typing import List

router = APIRouter(prefix="/api/skills", tags=["skills"])

class SkillInfo(BaseModel):
    id: str
    name: str
    description: str
    preview_url: Optional[str] = None

@router.get("", response_model=List[SkillInfo])
async def list_skills():
    """获取 Skill 列表"""
    pass

@router.get("/{skill_id}", response_model=SkillInfo)
async def get_skill(skill_id: str):
    """获取 Skill 详情"""
    pass
```

```python
# src/api/templates.py

from fastapi import APIRouter, Query
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter(prefix="/api/templates", tags=["templates"])

class Template(BaseModel):
    id: str
    name: str
    description: str
    preview_url: str
    style: str

@router.get("", response_model=List[Template])
async def list_templates(
    style: Optional[str] = Query(None),
    limit: int = Query(10)
):
    """获取模板列表"""
    pass

@router.get("/{template_id}", response_model=Template)
async def get_template(template_id: str):
    """获取模板详情"""
    pass
```

### 10.2 完整 API 列表

| 方法 | 端点 | 说明 |
|------|------|------|
| POST | `/api/chat` | 对话入口 |
| GET | `/api/pages` | 列出用户页面 |
| GET | `/api/pages/{id}` | 获取页面详情 |
| POST | `/api/pages` | 创建页面 |
| PUT | `/api/pages/{id}` | 更新页面 |
| DELETE | `/api/pages/{id}` | 删除页面 |
| GET | `/api/skills` | 获取 Skill 列表 |
| GET | `/api/skills/{id}` | 获取 Skill 详情 |
| GET | `/api/templates` | 获取模板列表 |
| GET | `/api/templates/{id}` | 获取模板详情 |
| POST | `/api/modify` | 修改页面（框选+指令） |

---

## 11. 特殊场景处理

### 11.1 用户信息不足

**问题**：用户刚开始对话，信息不够生成页面。

**策略**：优雅追问，一次只问 1-2 个问题，不要审问式。

```python
# src/agents/design.py

class DesignAgent:
    # 信息优先级
    INFO_PRIORITY = [
        ("oshi", "你最喜欢的推是谁呀？"),
        ("mbti", "你的 MBTI 是什么？"),
        ("hobbies", "平时喜欢做什么呢？"),
        ("style", "喜欢什么风格？比如粉色樱花风、赛博朋克风？"),
    ]
    
    async def _generate_follow_up_question(self, missing_info: List[str]) -> str:
        """生成追问，一次最多问 2 个问题"""
        
        # 按优先级排序
        prioritized = sorted(
            missing_info,
            key=lambda x: next((i for i, (k, _) in enumerate(self.INFO_PRIORITY) if k == x), 999)
        )
        
        # 一次最多问 2 个
        to_ask = prioritized[:2]
        
        # 生成自然的问题
        questions = []
        for info_type in to_ask:
            for key, question in self.INFO_PRIORITY:
                if key == info_type:
                    questions.append(question)
                    break
        
        if len(questions) == 1:
            return questions[0]
        else:
            return "顺便问一下，" + questions[1]
    
    def _get_missing_info(self, collected_info: dict) -> List[str]:
        """获取缺失的关键信息"""
        missing = []
        
        # 推是必须的
        if not collected_info.get("oshi"):
            missing.append("oshi")
        
        # MBTI 或风格至少有一个
        if not collected_info.get("mbti") and not collected_info.get("style"):
            missing.append("mbti")
        
        return missing
```

### 11.2 用户改变主意

**问题**：用户在收集信息过程中说"算了，换个风格"。

**策略**：不丢弃已收集的信息，只更新变化的部分。

```python
# src/agents/design.py

class DesignAgent:
    CHANGE_KEYWORDS = ["算了", "换", "改", "不要", "换个"]
    
    async def _handle_change_of_mind(self, context: DesignContext, user_input: str) -> dict:
        """处理用户改变主意"""
        
        # 识别变化的部分
        if "风格" in user_input or "风格" in user_input:
            # 提取新风格
            new_style = await self._extract_style(user_input)
            context.collected_info["style"] = new_style
            
            return {
                "state": context.state,
                "response": f"好的，换成 {new_style} 风格！其他信息我还记得：你的推是 {context.collected_info.get('oshi', '？')}，对吧？",
                "need_more_info": False
            }
        
        # 其他变化...
        return None
```

### 11.3 用户跳过

**问题**：用户说"不知道"或"跳过"，不想回答某些问题。

**策略**：使用默认值或基于已有信息推断。

```python
# src/agents/design.py

class DesignAgent:
    SKIP_KEYWORDS = ["跳过", "不知道", "无所谓", "随便", "不确定"]
    
    DEFAULT_VALUES = {
        "mbti": "INFP",  # 最常见的二次元 MBTI
        "style": "sakura",  # 默认樱花风
        "hobbies": ["看动漫", "听音乐"],
    }
    
    async def _handle_skip(self, context: DesignContext, missing_info: str) -> dict:
        """处理用户跳过"""
        
        # 使用默认值
        default_value = self.DEFAULT_VALUES.get(missing_info)
        
        # 或基于已有信息推断
        if missing_info == "style" and context.collected_info.get("mbti"):
            default_value = self._infer_style_from_mbti(context.collected_info["mbti"])
        
        context.collected_info[missing_info] = default_value
        
        return {
            "state": context.state,
            "response": f"没关系，我帮你选一个适合的：{default_value}。继续吧！",
            "need_more_info": False
        }
    
    def _infer_style_from_mbti(self, mbti: str) -> str:
        """根据 MBTI 推断风格"""
        mbti_style_map = {
            "INFP": "sakura",
            "ENFP": "magical-girl",
            "INTJ": "cyberpunk",
            "ENTP": "cyberpunk",
            "ISFJ": "sakura",
            # ... 其他映射
        }
        return mbti_style_map.get(mbti, "sakura")
```

### 11.4 生成后不满意

**问题**：用户说"不好看"或"不喜欢"。

**策略**：引导用户给出具体修改意见，不要盲目重新生成。

```python
# src/agents/design.py

class DesignAgent:
    async def _handle_dissatisfaction(self, context: DesignContext, user_input: str) -> dict:
        """处理用户不满意"""
        
        # 尝试理解不满意的点
        dissatisfaction = await self._extract_dissatisfaction(user_input)
        
        if dissatisfaction:
            # 有具体原因
            return {
                "state": ConversationState.ITERATING,
                "response": f"明白了，{dissatisfaction}。我来调整一下，请稍等...",
                "action": "modify",
                "modification": dissatisfaction
            }
        else:
            # 没有具体原因，引导提问
            return {
                "state": ConversationState.PREVIEW,
                "response": "抱歉没达到你的期望。能告诉我具体哪里不满意吗？比如颜色、布局、或者整体风格？这样我可以针对性地调整。",
                "need_more_info": True,
                "questions": [
                    "颜色不喜欢？",
                    "布局需要调整？",
                    "风格不对？",
                    "组件太多了？"
                ]
            }
    
    async def _extract_dissatisfaction(self, user_input: str) -> Optional[str]:
        """提取不满意的具体原因"""
        
        # 关键词匹配
        if "颜色" in user_input or "配色" in user_input:
            return "配色问题"
        if "布局" in user_input or "排版" in user_input:
            return "布局问题"
        if "风格" in user_input:
            return "风格问题"
        if "太多" in user_input:
            return "组件太多"
        
        # LLM 提取
        extraction = await self.llm.chat_with_schema(
            messages=[{"role": "user", "content": f"用户说：{user_input}\n请提取用户不满意的具体原因。"}],
            schema=DissatisfactionExtraction
        )
        
        return extraction.reason if extraction.reason else None
```

### 11.5 模糊修改指令

**问题**：用户说"把这个换一下"但没框选。

**策略**：尝试从上下文推断，如果推断不出则询问。

```python
# src/agents/modify.py

class ModifyAgent:
    async def _detect_target(self, request: ModifyRequest) -> List[str]:
        """检测目标组件（处理未框选情况）"""
        
        # 如果有框选，直接返回
        if request.selected_component_ids:
            return request.selected_component_ids
        
        # 尝试从指令中推断
        instruction = request.instruction
        
        # 关键词推断
        if "背景" in instruction:
            # 查找背景组件
            return self._find_components_by_type(request.context, "background")
        
        if "头像" in instruction or "照片" in instruction:
            return self._find_components_by_type(request.context, "avatar")
        
        if "文字" in instruction or "文案" in instruction:
            return self._find_components_by_type(request.context, "text")
        
        # 无法推断，返回空
        return []
    
    async def run(self, request: ModifyRequest) -> ModifyResult:
        """主逻辑"""
        
        # 检测目标
        targets = await self._detect_target(request)
        
        if not targets:
            return ModifyResult(
                success=False,
                modified_config=request.context,
                needs_confirmation=True,
                ambiguity="您想修改哪个组件？请点击选择或描述具体内容。"
            )
        
        # 应用修改
        modified = await self._apply_modify(request.context, targets, request.instruction)
        
        return ModifyResult(
            success=True,
            modified_config=modified,
            changes=[{"target": t, "action": request.instruction} for t in targets]
        )
```

### 11.6 批量修改

**问题**：用户说"全部换成赛博朋克风"。

**策略**：识别批量修改意图，应用到所有相关组件。

```python
# src/agents/modify.py

class ModifyAgent:
    BATCH_KEYWORDS = ["全部", "所有", "整个", "都"]
    
    def _is_batch_instruction(self, instruction: str) -> bool:
        """判断是否为批量修改指令"""
        return any(kw in instruction for kw in self.BATCH_KEYWORDS)
    
    async def _apply_batch_modify(self, config: dict, instruction: str) -> ModifyResult:
        """批量修改"""
        
        # 提取风格
        style = await self._extract_style(instruction)
        
        # 应用到所有组件
        changes = []
        
        # 修改主题配色
        if "theme" not in config:
            config["theme"] = {}
        
        style_config = self._get_style_config(style)
        config["theme"]["colors"] = style_config["colors"]
        config["theme"]["fonts"] = style_config["fonts"]
        
        changes.append({"target": "theme", "action": f"应用{style}风格配色"})
        
        # 修改所有组件的风格相关属性
        for component in config.get("components", []):
            if component.get("type") in style_config["component_styles"]:
                component.update(style_config["component_styles"][component["type"]])
                changes.append({"target": component["id"], "action": f"应用{style}风格"})
        
        return ModifyResult(
            success=True,
            modified_config=config,
            changes=changes
        )
```

### 11.7 撤回/撤销

**问题**：用户说"撤回到上一步"或"恢复上一个版本"。

**策略**：维护版本历史，支持回退。

```python
# src/agents/modify.py

class ModifyAgent:
    ROLLBACK_KEYWORDS = ["撤", "回退", "撤销", "恢复", "undo"]
    
    def _is_rollback_request(self, instruction: str) -> bool:
        """判断是否为撤回请求"""
        return any(kw in instruction for kw in self.ROLLBACK_KEYWORDS)
    
    async def _rollback(self, page_id: str, version: int = -1) -> ModifyResult:
        """
        回退到历史版本
        
        Args:
            page_id: 页面ID
            version: 版本号，-1 表示上一个版本
        """
        
        # 获取版本历史
        history = await self.memory.get_page_history(page_id)
        
        if len(history) < abs(version):
            return ModifyResult(
                success=False,
                modified_config={},
                changes=[],
                needs_confirmation=False
            )
        
        # 获取目标版本
        target_version = history[version]
        
        return ModifyResult(
            success=True,
            modified_config=target_version["page_config"],
            changes=[{
                "target": "all",
                "action": f"回退到版本 {target_version['version']}"
            }]
        )
```

### 11.8 并发请求

**问题**：同一用户短时间内发多次请求。

**策略**：使用锁机制，同一会话串行处理。

```python
# src/api/chat.py

import asyncio
from functools import wraps

# 会话锁
session_locks: Dict[str, asyncio.Lock] = {}

async def get_session_lock(session_id: str) -> asyncio.Lock:
    """获取会话锁"""
    if session_id not in session_locks:
        session_locks[session_id] = asyncio.Lock()
    return session_locks[session_id]

@router.post("", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    user_id: str = Depends(get_current_user_id)
):
    """对话入口（带并发控制）"""
    
    session_id = request.session_id or generate_session_id()
    
    # 获取会话锁
    lock = await get_session_lock(session_id)
    
    # 尝试获取锁，超时则返回忙碌状态
    try:
        await asyncio.wait_for(lock.acquire(), timeout=5.0)
    except asyncio.TimeoutError:
        raise HTTPException(
            status_code=429,
            detail="正在处理上一个请求，请稍后再试"
        )
    
    try:
        # 处理请求
        response = await process_chat_request(request, user_id, session_id)
        return response
    finally:
        lock.release()
```

### 11.9 LLM 调用失败

**问题**：超时、API 报错。

**策略**：重试 + 降级到备选模型。

```python
# src/llm/client.py

class LLMClientManager:
    async def chat_with_retry(
        self,
        messages: List[Message],
        schema: Optional[Type[BaseModel]] = None,
        max_retries: int = 3,
        timeout: float = 30.0
    ) -> LLMResponse:
        """带重试的 LLM 调用"""
        
        last_error = None
        
        for attempt in range(max_retries):
            try:
                # 尝试主模型
                response = await asyncio.wait_for(
                    self.primary.chat(messages, schema),
                    timeout=timeout
                )
                return response
            
            except asyncio.TimeoutError:
                last_error = TimeoutError("LLM call timed out")
                if attempt < max_retries - 1:
                    await asyncio.sleep(1.0 * (attempt + 1))
            
            except Exception as e:
                last_error = e
                if attempt < max_retries - 1:
                    await asyncio.sleep(1.0 * (attempt + 1))
        
        # 主模型失败，尝试备选
        if self.fallback:
            try:
                return await asyncio.wait_for(
                    self.fallback.chat(messages, schema),
                    timeout=timeout
                )
            except Exception as e:
                last_error = e
        
        # 全部失败
        raise LLMError(f"LLM call failed: {last_error}")
```

### 11.10 超长对话

**问题**：对话历史过长导致 context window 不足。

**策略**：对话摘要 + 滑动窗口。

```python
# src/memory/session.py

class SessionMemory:
    MAX_CONTEXT_LENGTH = 4000  # token
    SUMMARY_THRESHOLD = 3000   # 触发摘要的阈值
    
    async def compress_if_needed(self, session_id: str, llm_client: LLMClient):
        """必要时压缩对话历史"""
        
        memory = await self.get(session_id)
        if not memory:
            return
        
        messages = memory.get("messages", [])
        
        # 估算 token 数
        total_tokens = self._estimate_tokens(messages)
        
        if total_tokens > self.SUMMARY_THRESHOLD:
            # 生成摘要
            summary = await self._generate_summary(messages[:-10], llm_client)
            
            # 保留最后 10 条消息
            compressed = {
                "summary": summary,
                "messages": messages[-10:],
                "extracted_profile": memory.get("extracted_profile", {})
            }
            
            await self.set(session_id, compressed)
    
    async def _generate_summary(self, messages: List[dict], llm: LLMClient) -> str:
        """生成对话摘要"""
        
        prompt = f"""
        请总结以下对话的关键信息：
        
        {self._format_messages(messages)}
        
        摘要格式：
        - 用户画像：...
        - 已确定的风格偏好：...
        - 重要决策：...
        - 当前状态：...
        """
        
        response = await llm.chat([{"role": "user", "content": prompt}])
        return response.content
    
    def _estimate_tokens(self, messages: List[dict]) -> int:
        """估算 token 数"""
        total = 0
        for msg in messages:
            total += len(msg.get("content", "")) // 4  # 粗略估算：4 字符 ≈ 1 token
        return total
```

---

## 附录

### A. PageConfig 数据结构

```python
# src/models/page.py

from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class ThemeColors(BaseModel):
    primary: str
    secondary: str
    accent: str
    background: str
    text: str

class ThemeFonts(BaseModel):
    heading: str
    body: str
    accent: Optional[str] = None

class Theme(BaseModel):
    id: str
    colors: ThemeColors
    fonts: ThemeFonts
    effects: Optional[List[Dict[str, Any]]] = None

class Layout(BaseModel):
    type: str  # "single-column" | "masonry" | "grid"
    width: str  # "narrow" | "medium" | "wide"
    padding: str  # "small" | "medium" | "large"

class ComponentConfig(BaseModel):
    id: str
    type: str  # "OshiCard" | "AttributeWall" | "MusicPlayer" | ...
    props: Dict[str, Any]
    position: Dict[str, int]  # {x, y, width, height}

class PageMetadata(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    author: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class PageConfig(BaseModel):
    version: str = "1.0"
    metadata: PageMetadata = PageMetadata()
    theme: Theme
    layout: Layout
    components: List[ComponentConfig] = []
```

### B. 用户画像数据结构

```python
# src/models/profile.py

from pydantic import BaseModel
from typing import List, Optional

class Oshi(BaseModel):
    name: str
    from_work: Optional[str] = None
    description: Optional[str] = None

class Personality(BaseModel):
    mbti: Optional[str] = None
    blood_type: Optional[str] = None
    zodiac: Optional[str] = None

class Interests(BaseModel):
    hobbies: List[str] = []
    music: List[str] = []
    anime: List[str] = []

class StylePreference(BaseModel):
    styles: List[str] = []
    colors: List[str] = []
    effects: List[str] = []

class SocialLink(BaseModel):
    platform: str
    username: Optional[str] = None
    url: Optional[str] = None

class UserProfile(BaseModel):
    oshi: List[Oshi] = []
    personality: Personality = Personality()
    interests: Interests = Interests()
    style_preference: StylePreference = StylePreference()
    social_links: List[SocialLink] = []
```

### C. 错误码定义

| 错误码 | 说明 |
|--------|------|
| `E001` | LLM 调用失败 |
| `E002` | Token 预算超限 |
| `E003` | 速率限制 |
| `E004` | 权限不足 |
| `E005` | 资源不存在 |
| `E006` | 配置校验失败 |
| `E007` | 内容审核不通过 |
| `E008` | 会话超时 |
| `E009` | 页面数量超限 |
| `E010` | 组件数量超限 |

---

**文档结束**

> 本文档为 Heya Studio AI Agent 的详细设计文档，可直接用于开发实施。
> 
> 核心设计原则：**不用编排框架，纯 Python 手搓，if 判断就能解决的事别上框架。**