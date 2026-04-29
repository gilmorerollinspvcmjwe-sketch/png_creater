# Phase 4 设计文档：LLM 驱动的布局策略与语义风格映射

> 目标：解决当前纯代码布局呆板、风格映射僵化的问题，充分发挥 LLM 的创意推理能力，同时保持代码层的精确性和可靠性。

---

## 1. 当前问题诊断

### 1.1 风格映射：硬编码 MBTI → 主题

```python
# src/agents/planner.py
MBTI_THEME_MAP = {
    "INFJ": "sakura",
    "INTJ": "cyberpunk",
    # ... 16 种硬编码
}
```

**问题**：
- 没有考虑用户自然语言描述中的风格倾向（"我喜欢安静的地方"）
- 同一个 MBTI 永远出同一个主题，缺乏个性化
- 无法处理"INFJ 但喜欢赛博朋克"这类反直觉组合

### 1.2 布局：纯代码网格，缺乏视觉层次

```python
# src/tools/auto_layout.py
for i, comp in enumerate(components):
    comp.x = (i % cols) * col_width
    comp.y = (i // cols) * row_height  # 等间距，很呆板
```

**问题**：
- 所有组件等间距排列，没有视觉焦点
- 不理解"推し要突出"、"引言要打破对齐"等设计意图
- 不处理负空间（留白）的节奏感
- 响应式只是等比例缩放，没有断点重排策略

### 1.3 语义校验：关键词匹配太弱

```python
# src/tools/check_semantic_match.py
# 当前：简单的关键词计数
profile_keywords = {"anime", "oshi", "quote"}
component_keywords = {"oshi-card", "quote", "hero-section"}
score = len(profile_keywords & component_keywords) / len(profile_keywords)
```

**问题**：
- 无法判断"用户说喜欢阿尼亚但没有 quote 组件"这类语义缺失
- 无法理解"太多组件了，页面太乱"这类整体评价

---

## 2. 改进方案

### 2.1 改进 A：LLM 驱动的语义风格映射（ThemeMatcher）

**核心思想**：让 LLM 做语义推理，而不是查表。

#### 输入

```json
{
  "user_input": "我是 INFP，喜欢安静的地方，想在主页放我喜欢的东西",
  "mbti": "INFP",
  "existing_preference": {
    "liked_themes": ["lavender"],
    "disliked_themes": ["cyberpunk"]
  }
}
```

#### LLM 推理过程

```
用户关键词：安静、INFP、喜欢的东西
MBTI 分析：INFP 倾向于内省、柔和、个性化
语义匹配：
  - lavender: "柔和紫色系，安静优雅" → 高度匹配
  - sakura: "粉色樱花，浪漫但略活泼" → 中等匹配
  - cyberpunk: "高对比霓虹，嘈杂前卫" → 不匹配（用户历史 dislike）
  - minimal: "极简黑白，安静但缺乏个性" → 部分匹配
输出：lavender (confidence: 0.92)
```

#### 输出

```json
{
  "theme_id": "lavender",
  "confidence": 0.92,
  "reason": "INFP 偏好内省柔和的风格，'安静' 关键词与 lavender 的优雅宁静高度匹配",
  "alternatives": [
    {"theme_id": "sakura", "confidence": 0.65, "reason": "浪漫风格也适合 INFP，但略活泼"}
  ]
}
```

#### 实现

- **新模块**：`src/tools/theme_matcher.py`
- **类**：`ThemeMatcherTool`
- **方法**：`match_theme(user_input, mbti, history) -> ThemeMatchResult`
- **缓存**：结果按 (user_input_hash + mbti) 缓存 1 小时，避免重复调用 LLM

#### 集成点

```python
# src/agents/planner.py
from src.tools.theme_matcher import ThemeMatcherTool

class PlannerAgent:
    async def plan(self, user_input, session):
        # 替代硬编码 MBTI_THEME_MAP
        matcher = ThemeMatcherTool()
        theme_result = await matcher.match_theme(
            user_input=user_input,
            mbti=session.get("mbti"),
            history=session.get_behavior_memory().get_preferences()
        )
        plan.theme_id = theme_result.theme_id
        plan.theme_confidence = theme_result.confidence
```

---

### 2.2 改进 B：LLM 输出的高阶布局策略（LayoutStrategy）

**核心思想**：LLM 决定"怎么摆"（布局策略），代码决定"具体摆哪里"（坐标计算）。

#### 布局策略类型（LLM 输出）

```python
class LayoutStrategy(BaseModel):
    """高阶布局策略，由 LLM 根据用户意图生成。"""

    type: Literal[
        "hero-first",      # 首屏大图，其他内容在下
        "gallery-grid",    # 等宽网格排列
        "asymmetric",      # 不对称布局，创造视觉张力
        "centerpiece",     # 一个核心组件居中突出
        "magazine",        # 杂志式多栏布局
        "timeline",        # 时间线/纵向流式
        "minimal-list",    # 极简列表，大量留白
    ]

    # 视觉焦点
    primary_component: Optional[str] = None  # 哪个组件类型是 C 位

    # 空间节奏
    spacing: Literal["tight", "normal", "loose"] = "normal"
    symmetry: Literal["symmetric", "asymmetric", "dynamic"] = "symmetric"

    # 对齐策略
    alignment: Literal["center", "left", "staggered"] = "center"

    # 响应式断点策略
    responsive_behavior: Literal[
        "scale",           # 等比例缩放
        "reflow-columns",  # 列数变化（3列→2列→1列）
        "hide-secondary",  # 小屏隐藏次要组件
        "stack",           # 全部堆叠
    ] = "reflow-columns"

    # 理由
    reason: str = ""  # LLM 解释为什么选这个策略
```

#### LLM 推理示例

```
用户输入："我是阿尼亚的粉丝，想把阿尼亚放在最显眼的位置，下面放我的爱好"

LLM 分析：
  - "最显眼的位置" → 需要一个视觉中心
  - "阿尼亚" → 推し角色，应该突出
  - "下面放爱好" → 主次分明，纵向流式

输出策略：
{
  "type": "centerpiece",
  "primary_component": "oshi-card",
  "spacing": "normal",
  "symmetry": "symmetric",
  "alignment": "center",
  "responsive_behavior": "reflow-columns",
  "reason": "用户明确希望突出推し角色，centerpiece 策略将 oshi-card 居中放大，其他内容围绕排列"
}
```

#### 代码执行：策略 → 精确坐标

```python
# src/tools/auto_layout.py（改进后）
class AutoLayoutTool:
    def execute(self, input: AutoLayoutInput):
        strategy = input.layout_strategy  # LLM 输出的策略
        components = input.components

        if strategy.type == "centerpiece":
            return self._layout_centerpiece(components, strategy)
        elif strategy.type == "asymmetric":
            return self._layout_asymmetric(components, strategy)
        elif strategy.type == "gallery-grid":
            return self._layout_gallery_grid(components, strategy)
        # ...

    def _layout_centerpiece(self, components, strategy):
        """ centerpiece 策略：核心组件居中放大，其他环绕 """
        primary = find_component(components, strategy.primary_component)
        others = [c for c in components if c.id != primary.id]

        # 核心组件：居中，占 60% 宽度
        primary.x = CANVAS_WIDTH // 2 - primary.width // 2
        primary.y = HEADER_HEIGHT + 40
        primary.width = int(CANVAS_WIDTH * 0.6)
        primary.height = int(CANVAS_HEIGHT * 0.5)

        # 其他组件：下方分栏
        available_width = CANVAS_WIDTH - 2 * MARGIN
        col_width = available_width // len(others)
        for i, comp in enumerate(others):
            comp.x = MARGIN + i * col_width + (col_width - comp.width) // 2
            comp.y = primary.y + primary.height + 60  # 留白 60px

        return LayoutResult(components=components, strategy_applied="centerpiece")

    def _layout_asymmetric(self, components, strategy):
        """ asymmetric 策略：打破对称，创造视觉张力 """
        # 黄金分割比例定位
        phi = 1.618
        # 第一个组件偏左上
        components[0].x = MARGIN
        components[0].y = HEADER_HEIGHT + 20
        # 第二个组件偏右下，形成对角线张力
        components[1].x = CANVAS_WIDTH - components[1].width - MARGIN
        components[1].y = components[0].y + int(components[0].height / phi)
        # ...
```

#### 新增模块

- **`src/models/layout.py`** — `LayoutStrategy`, `LayoutResult` 类型定义
- **`src/tools/layout_strategy.py`** — `LayoutStrategyTool`（LLM 输出策略）
- **修改 `src/tools/auto_layout.py`** — 根据策略执行精确布局

#### 集成点

```python
# src/agents/builder.py
from src.tools.layout_strategy import LayoutStrategyTool

class BuilderAgent:
    async def run_build_pipeline(self, session, user_input):
        # 步骤 6.5：新增布局策略决策
        strategy_tool = LayoutStrategyTool()
        layout_strategy = await strategy_tool.generate_strategy(
            user_input=user_input,
            component_types=[c.type for c in components],
            theme_id=theme_id
        )
        session.workflow_steps.append(WorkflowStep(
            type="layout_strategy",
            message=f"布局策略：{layout_strategy.type} - {layout_strategy.reason}"
        ))

        # 步骤 7：auto_layout 接收策略参数
        layout_result = await auto_layout_tool.execute(AutoLayoutInput(
            components=components,
            layout_strategy=layout_strategy,  # 新增参数
            theme_id=theme_id
        ))
```

---

### 2.3 改进 C：LLM 辅助的语义校验增强

**核心思想**：让 LLM 做"这个配置看起来合理吗"的整体判断，补充规则校验的盲区。

#### 当前校验覆盖

| 层级 | 当前 | 改进后 |
|------|------|--------|
| L1 Schema | Pydantic 字段校验 | ✅ 保持 |
| L2 Semantic | 关键词匹配（弱）| **LLM 语义判断（强）** |
| L3 Business | 数量/重叠/占位符 | ✅ 保持 |

#### LLM 语义校验输入

```json
{
  "user_input": "我是阿尼亚的粉丝，想在主页放我喜欢的东西",
  "generated_config": {
    "theme": "cyberpunk",
    "components": [
      {"type": "hero-section", "props": {"title": "Welcome"}},
      {"type": "gallery", "props": {"images": [...]}}
    ]
  },
  "user_profile": {
    "mbti": "INFP",
    "oshi": "阿尼亚",
    "liked_themes": ["sakura", "lavender"]
  }
}
```

#### LLM 判断输出

```json
{
  "score": 45,
  "passed": false,
  "issues": [
    {
      "severity": "high",
      "category": "theme_mismatch",
      "message": "用户明确喜欢柔和风格（历史偏好 sakura/lavender），但配置了 cyberpunk，风格冲突",
      "suggestion": "建议切换主题到 sakura 或 lavender"
    },
    {
      "severity": "high",
      "category": "missing_component",
      "message": "用户是阿尼亚粉丝（推し：阿尼亚），但配置中没有 oshi-card 或 quote 组件来展示推し",
      "suggestion": "建议添加 oshi-card 组件，并使用阿尼亚相关内容"
    },
    {
      "severity": "medium",
      "category": "content_mismatch",
      "message": "hero-section 的标题是通用的 'Welcome'，没有体现用户个性化",
      "suggestion": "建议根据用户推し生成个性化标题，如 '阿尼亚の世界'"
    }
  ],
  "good_aspects": [
    "包含 hero-section，有首屏视觉焦点",
    "gallery 组件适合展示喜欢的内容"
  ]
}
```

#### 实现

- **新模块**：`src/tools/semantic_validator.py`
- **类**：`LLMSemanticValidator`
- **方法**：`validate(config, user_input, profile) -> SemanticValidationResult`
- **集成**：在 ValidatorAgent 的 L2 层调用，替代纯规则匹配

#### 与自动修复联动

```python
# src/agents/validator.py
async def validate(self, config, session):
    # L1: Schema（代码）
    l1 = self._check_schema(config)

    # L2: Semantic（LLM）
    l2 = await self.llm_validator.validate(
        config=config,
        user_input=session.user_input,
        profile=session.profile
    )

    # L3: Business（代码）
    l3 = self._check_business_rules(config)

    # 综合评分
    overall = l1.score * 0.3 + l2.score * 0.4 + l3.score * 0.3

    # LLM 发现的问题可以指导自动修复
    if l2.issues:
        for issue in l2.issues:
            if issue.category == "theme_mismatch":
                repair_actions.append(RepairAction(
                    type="CHANGE_THEME",
                    target_theme=infer_theme_from_profile(session.profile)
                ))
            elif issue.category == "missing_component":
                repair_actions.append(RepairAction(
                    type="ADD_COMPONENT",
                    component_type=infer_component_from_issue(issue)
                ))
```

---

## 3. 系统架构变化

### 改进前（Phase 3）

```
Planner（规则）→ Builder（LLM选组件+代码拼JSON）→ Validator（规则校验）→ Repair（代码修复）
                                              ↓
                                         auto_layout（代码网格）
```

### 改进后（Phase 4）

```
Planner（规则 + LLM语义风格映射）
         ↓
Builder（LLM选组件 → LLM输出布局策略 → 代码按策略精确布局 → 代码拼JSON）
         ↓
Validator（Schema代码 + 语义LLM + Business代码）
         ↓
Repair（代码修复 + LLM问题指导）
```

---

## 4. 接口设计

### 4.1 ThemeMatcher

```python
# src/models/theme.py（新增）
class ThemeMatchResult(BaseModel):
    theme_id: str
    confidence: float  # 0-1
    reason: str
    alternatives: List[ThemeAlternative] = []

class ThemeAlternative(BaseModel):
    theme_id: str
    confidence: float
    reason: str

# src/tools/theme_matcher.py
class ThemeMatcherInput(BaseModel):
    user_input: str
    mbti: Optional[str] = None
    history: Optional[UserPreferenceHistory] = None

class ThemeMatcherTool(BaseTool):
    name = "match_theme"
    input_model = ThemeMatcherInput

    async def execute(self, input: ThemeMatcherInput) -> ThemeMatchResult:
        # 1. 查缓存
        cache_key = hash(f"{input.user_input}:{input.mbti}")
        if cached := self._cache.get(cache_key):
            return cached

        # 2. LLM 语义推理
        themes = self.theme_registry.list_themes()
        prompt = self._build_prompt(input, themes)
        response = await self.llm.chat(messages=[...])

        # 3. 解析 + 缓存
        result = self._parse_response(response)
        self._cache.set(cache_key, result, ttl=3600)
        return result
```

### 4.2 LayoutStrategy

```python
# src/models/layout.py（新增）
class LayoutStrategy(BaseModel):
    type: str
    primary_component: Optional[str] = None
    spacing: str = "normal"
    symmetry: str = "symmetric"
    alignment: str = "center"
    responsive_behavior: str = "reflow-columns"
    reason: str = ""

class LayoutResult(BaseModel):
    components: List[Component]
    strategy_applied: str
    warnings: List[str] = []

# src/tools/layout_strategy.py
class LayoutStrategyInput(BaseModel):
    user_input: str
    component_types: List[str]
    theme_id: str

class LayoutStrategyTool(BaseTool):
    name = "generate_layout_strategy"
    input_model = LayoutStrategyInput
    output_model = LayoutStrategy

    async def execute(self, input: LayoutStrategyInput) -> LayoutStrategy:
        prompt = self._build_prompt(input)
        response = await self.llm.chat(messages=[...])
        return LayoutStrategy.model_validate_json(response)

# src/tools/auto_layout.py（修改）
class AutoLayoutInput(BaseModel):
    components: List[Component]
    layout_strategy: Optional[LayoutStrategy] = None  # 新增
    theme_id: Optional[str] = None
    canvas_width: int = 800
    canvas_height: int = 600
```

### 4.3 SemanticValidator

```python
# src/models/validation.py（新增）
class SemanticIssue(BaseModel):
    severity: Literal["low", "medium", "high"]
    category: str
    message: str
    suggestion: str

class SemanticValidationResult(BaseModel):
    score: float  # 0-100
    passed: bool
    issues: List[SemanticIssue]
    good_aspects: List[str]

# src/tools/semantic_validator.py
class SemanticValidatorInput(BaseModel):
    config: PageConfig
    user_input: str
    profile: Optional[UserProfile] = None

class LLMSemanticValidator(BaseTool):
    name = "semantic_validation"
    input_model = SemanticValidatorInput
    output_model = SemanticValidationResult

    async def execute(self, input: SemanticValidatorInput) -> SemanticValidationResult:
        prompt = self._build_prompt(input)
        response = await self.llm.chat(messages=[...])
        return SemanticValidationResult.model_validate_json(response)
```

---

## 5. 实现计划

### 5.1 文件清单

#### 新增文件

| 文件 | 说明 | 依赖 |
|------|------|------|
| `src/models/theme.py` | ThemeMatchResult, ThemeAlternative | Pydantic |
| `src/models/layout.py` | LayoutStrategy, LayoutResult | Pydantic |
| `src/models/validation.py` | SemanticIssue, SemanticValidationResult | Pydantic |
| `src/tools/theme_matcher.py` | ThemeMatcherTool | BaseTool, LLM |
| `src/tools/layout_strategy.py` | LayoutStrategyTool | BaseTool, LLM |
| `src/tools/semantic_validator.py` | LLMSemanticValidator | BaseTool, LLM |

#### 修改文件

| 文件 | 改动 | 说明 |
|------|------|------|
| `src/agents/planner.py` | 替换 MBTI_THEME_MAP | 使用 ThemeMatcherTool |
| `src/agents/builder.py` | 步骤 6.5 新增 | 调用 LayoutStrategyTool |
| `src/agents/validator.py` | L2 层增强 | 调用 LLMSemanticValidator |
| `src/tools/auto_layout.py` | 接受 strategy 参数 | 根据策略类型路由到不同布局算法 |
| `src/tools/base.py` | 注册新工具 | +3 个新工具 |
| `tests/test_theme_matcher.py` | 新增测试 | |
| `tests/test_layout_strategy.py` | 新增测试 | |
| `tests/test_semantic_validator.py` | 新增测试 | |
| `tests/test_auto_layout_v2.py` | 新增测试 | 策略驱动布局测试 |

### 5.2 实现顺序

```
第 1 步：模型定义（theme.py, layout.py, validation.py）
    ↓
第 2 步：ThemeMatcherTool（独立模块 + 测试）
    ↓
第 3 步：LayoutStrategyTool（独立模块 + 测试）
    ↓
第 4 步：修改 auto_layout.py（接收 strategy，实现策略算法）
    ↓
第 5 步：LLMSemanticValidator（独立模块 + 测试）
    ↓
第 6 步：集成到 Agent（planner → builder → validator）
    ↓
第 7 步：端到端测试 + 回归测试
```

---

## 6. 测试策略

### 6.1 单元测试

| 模块 | 测试要点 |
|------|----------|
| ThemeMatcherTool | 缓存命中/未命中、MBTI + 自然语言组合、历史偏好影响 |
| LayoutStrategyTool | 不同用户意图输出不同策略、JSON 格式正确 |
| LLMSemanticValidator | 主题不匹配检测、组件缺失检测、分数合理性 |
| auto_layout（策略）| centerpiece 核心居中、asymmetric 黄金分割、gallery-grid 等宽 |

### 6.2 集成测试

- Planner → ThemeMatcher → Builder → LayoutStrategy → auto_layout 端到端
- Validator → LLMSemanticValidator → Repair 联动
- 缓存机制验证（同一输入第二次不走 LLM）

### 6.3 回归测试

- 所有 Phase 1-3 的 106 个测试必须继续通过
- V1 模式（DesignAgent use_v2=False）不受影响

---

## 7. 性能考虑

| 问题 | 方案 |
|------|------|
| LLM 调用增加（3 次 → 6 次）| 缓存（ThemeMatcher 1h、LayoutStrategy 30min） |
| 延迟增加 | 异步并行（ThemeMatcher 和 suggest_components 可并行） |
| Token 消耗 | 精简 prompt，只传必要上下文 |

### 优化后的调用链路

```
Planner: suggest_components + match_theme(并行) → 1 次 LLM 调用
Builder: layout_strategy → 1 次 LLM 调用
Validator: semantic_validation → 1 次 LLM 调用
Total: 3 次 LLM 调用（有缓存时可能 1-2 次）
```

---

## 8. 风险评估

| 风险 | 缓解措施 |
|------|----------|
| LLM 输出非法策略类型 | Pydantic validation + fallback 到 "gallery-grid" |
| LLM 语义校验过严导致频繁修复 | 调整阈值（score ≥ 60 通过，而非 80） |
| LLM 调用失败导致整体失败 | 所有 LLM 步骤有代码 fallback |
| 缓存过期后风格突变 | 缓存 TTL 1h，用户输入不变则体验一致 |

---

*设计完成时间：2026-04-24*
*预期实现时间：2-3 小时*
*预期新增代码：~800 行（含测试 ~1200 行）*
