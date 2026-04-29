# Heya Studio Agent 架构改进方案 V2

> 目标：将 LLM 从"JSON 生成器"转变为"工具编排器"，构建多 Agent 流水线，实现从 6/10 到 9/10 的准确率跃升。
> 适用模型：千问 3.6 / GPT-4o / MiniMax-M2.7

---

## 1. 现状分析

### 1.1 当前架构

```
用户输入 ──► DesignAgent ──► 正则提取画像 ──► LLM 生成 JSON ──► 本地校验
                                                             │
                                                    Self-Reflect (事后)
                                                             │
                                                      用户确认 / 修改
```

**当前组件：**

| 层级 | 内容 | 状态 |
|------|------|------|
| Agent | DesignAgent (传统状态机 + ReAct 开关) | ✅ 基础框架 |
| Tool | 11 个 Tool (generate_config/validate/modify/query/search/apply_skill...) | ✅ 齐全但分散 |
| Skill | 6 个 YAML 风格定义 (sakura/cyberpunk/lavender/mint/minimal/merry-christmas) | ✅ 定义完整 |
| Memory | Session 内存 (profile + config + history) | ✅ 基本可用 |
| Graph | StateGraph 轻量实现 (LangGraph 启发) | ✅ 可用但未充分使用 |
| ReAct | ReActAgent Think→Act→Observe 循环 | ✅ 可用但默认关闭 |
| Validation | schema 校验 + Self-Reflection (LLM 自评) | ✅ 事后校验 |
| Human Loop | InterruptPoint (approve/reject/modify) | ✅ 已接入 |

### 1.2 根因分析：为什么 LLM 写 JSON 不准？

**问题 1：输出空间过大**
- BackendPageConfig 是一个嵌套 4 层的 JSON，包含 `theme`, `layout`, `components[]`, `components[].position`, `components[].props`
- 每个 component 有 10+ 个属性，5-8 个组件就是 50-80 个字段
- LLM 在 4k-8k token 的上下文里一次性输出，出错概率随复杂度指数增长

**问题 2：LLM 是"生成器"而非"编排器"**
- `generate_config` Tool 本质是 prompt + JSON Schema → LLM → 完整 JSON
- LLM 不知道哪些 component 可选、组件属性合法值是什么
- 没有 Step-by-Step 的反馈和修正机制

**问题 3：校验是事后纠错**
- `ValidateConfigTool` 检查 schema，但发现位置重叠时只能返回错误
- `Self-Reflection` 是 LLM 自我评价，但已经生成了再改成本很高
- 没有"过程中校验"——每选一个组件就检查是否匹配画像

**问题 4：没有工具编排**
- `query_templates`、`search_components`、`apply_skill` 这些 Tool 当前是"可选查询"
- 不是"必须按顺序调用"：Agent 不会说"先查模板→再查组件→再应用风格→最后组装"
- 每个 Tool 是独立原子操作，没有流水线意识

### 1.3 对标：Claude Code / Codex 怎么做的？

| 维度 | Claude Code | Heya Studio 当前 |
|------|------------|-----------------|
| **Context Gathering** | 先 read_file/grep/ls 读代码库，理解上下文 | 直接 LLM 生成，无前置调研 |
| **Planning** | 写 TODO.md 规划改哪些文件 | 无计划，直接生成完整 JSON |
| **Execution** | 逐步 edit_file，每次只改一个位置 | 一次性输出整个 JSON |
| **Verification** | 运行 test/lint，根据错误修复 | 事后校验，发现错误重试 |
| **Error Recovery** | 读 error log → 定位 → 修复 | 重生成整个 JSON |
| **Tool Orchestration** | Agent 自主决定用哪些 tool、什么顺序 | 单点调用 generate_config |

**核心启示：**
> LLM 的强大不在于"生成完整产物"，而在于"理解意图 + 决策 + 编排工具"。代码是代码写的，LLM 是导演。

---

## 2. 目标架构设计

### 2.1 多 Agent 角色定义

```
                    ┌───────────────────────────────────────────────────────┐
                    │                    User Input                          │
                    └──────────────────────┬────────────────────────────────┘
                                           │
              ┌────────────────────────────┼────────────────────────────┐
              │                            │                            │
              ▼                            ▼                            ▼
    ┌─────────────────┐        ┌─────────────────┐          ┌─────────────────┐
    │  Planner Agent  │        │  Builder Agent  │          │ Validator Agent │
    │  (大脑/路由器)    │◄──────►│  (工具编排器)    │◄────────►│  (质量守门员)    │
    │                 │        │                 │          │                 │
    │ • 意图识别       │        │ • 查询模板/组件  │          │ • Schema 校验   │
    │ • 任务规划       │        │ • 应用风格      │          │ • 语义校验      │
    │ • 路由决策       │        │ • 组装配置      │          │ • 自动修复      │
    └─────────────────┘        │                 │          └─────────────────┘
              │                └─────────────────┘                   │
              │                         │                            │
              │                         ▼                            │
              │                ┌─────────────────┐                   │
              │                │   Config Dict   │                   │
              │                └─────────────────┘                   │
              │                         │                            │
              │                         ▼                            │
              │                ┌─────────────────┐                   │
              └───────────────►│   Human Review  │◄──────────────────┘
                               │  (人机交互中断)  │
                               └─────────────────┘
```

#### Planner Agent（意图识别 + 任务规划）

| 属性 | 描述 |
|------|------|
| **职责** | 理解用户意图，生成执行计划 |
| **输入** | 用户输入 + 当前 session state + history |
| **输出** | ExecutionPlan: `{intent, required_tools, expected_components, style_hint, estimated_steps}` |
| **模型要求** | 轻量快速，不需要深度生成（Qwen-3.6-Plus 或更快模型） |
| **关键决策** | 生成新页 / 修改现有页 / 查模板推荐 / 闲聊 |

**输出示例：**
```json
{
  "intent": "generate_new_page",
  "required_tools": ["query_templates", "search_components", "apply_skill", "assemble_config"],
  "expected_components": ["hero-section", "oshi-card", "attribute-wall", "quote"],
  "style_hint": "sakura-style",
  "estimated_steps": 5,
  "user_profile_suggestions": ["推: 阿尼亚", "MBTI: INFP"]
}
```

#### Builder Agent（工具编排 + 配置组装）

| 属性 | 描述 |
|------|------|
| **职责** | 按 Planner 的计划，逐步调用工具，组装 config |
| **输入** | ExecutionPlan + UserProfile + 可用工具列表 |
| **输出** | BackendPageConfig (dict) |
| **模型要求** | 需要较强的推理能力，但不用写完整 JSON |
| **核心工作** | LLM 做选择 + 代码做拼装 |

**Builder 的工作模式（关键改进）：**
```
Step 1: query_templates → LLM 决策选哪个模板
        ↓
Step 2: search_components("推し 可爱") → LLM 决策选哪些组件
        ↓  
Step 3: apply_skill("sakura-style") → LLM 决策用哪个风格
        ↓
Step 4: 代码逻辑拼装 Config（不是 LLM 写 JSON）
        - 模板 base config → copy
        - 组件按顺序插入 → 代码计算 position
        - 风格颜色覆盖 → 代码合并 dict
        - 个性化文案填充 → LLM 只写文案，不碰 JSON 结构
```

**为什么这样更准：**
- LLM 只做"选择题"（选哪个模板/组件/风格），不做"填空题"（写整个 JSON）
- 选择题的 token 输出短，出错概率低
- 代码做"填空题"（拼装 JSON），永远不会拼错键名、漏字段

#### Validator Agent（质量保证）

| 属性 | 描述 |
|------|------|
| **职责** | 多层校验，发现问题自动修复 |
| **输入** | Config dict + UserProfile + 执行日志 |
| **输出** | ValidationReport: `{passed, score, issues, auto_fixes_applied}` |
| **模型要求** | 需要深度理解语义（如"这个组件是否匹配用户画像"） |

**三层校验：**

| 层级 | 校验内容 | 工具 |
|------|---------|------|
| L1: Schema | JSON 结构、类型、必填字段 | Pydantic 模型 |
| L2: Semantic | 组件匹配画像、风格一致性、布局合理性 | LLM 评估 |
| L3: Business | 组件数量 4-8、无重叠、文案个性化 | 规则引擎 |

**自动修复策略：**
```
如果 L1 失败 → 代码自动修复（补缺失字段、修正类型）
如果 L2 失败 → 返回 Builder，告诉它"这个组件不匹配，换 xxx"
如果 L3 失败 → 代码自动调整（如组件>8个则删掉最低优先级）
```

### 2.2 数据流图

```
┌──────────────┐
│  User Input  │
└──────┬───────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Planner Agent                                │
│  1. 意图识别: 生成新页? 修改? 查模板? 闲聊?                       │
│  2. 画像提取: 从输入提取推/MBTI/爱好                              │
│  3. 生成计划: ExecutionPlan {intent, tools, components, style}   │
└──────┬──────────────────────────────────────────────────────────┘
       │ ExecutionPlan
       ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Builder Agent                                │
│  循环: for step in plan:                                         │
│    Step 1: query_templates(style_hint) → 选择 base template      │
│    Step 2: search_components(expected_types) → 选择组件清单      │
│    Step 3: apply_skill(style_id) → 获取风格规则                  │
│    Step 4: assemble_config(template, components, skill) → 代码拼装│
│           - 模板基础结构                                          │
│           - 组件按位置插入（代码计算 x/y/w/h）                     │
│           - 风格颜色覆盖                                          │
│           - 个性化文案（LLM 生成，但只替换文案字段）                 │
└──────┬──────────────────────────────────────────────────────────┘
       │ Config Dict (draft)
       ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Validator Agent                                │
│  L1 Schema: pydantic validate → 结构正确?                        │
│  L2 Semantic: LLM 评估 → 组件匹配画像? 风格一致?                  │
│  L3 Business: 规则引擎 → 数量/布局/文案                         │
│  ────────────────────────────────────────                       │
│  如果通过: 进入 Human Review                                     │
│  如果失败: 返回 Builder，带修复指导                               │
│  如果可自动修复: 代码修复，不通知用户                              │
└──────┬──────────────────────────────────────────────────────────┘
       │ Config Dict (validated)
       ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Human Review (Interrupt)                       │
│  渲染预览 → 用户确认 / 修改 / 拒绝                                │
│  修改: 回到 Builder，instruction = 用户修改意见                    │
│  拒绝: 回到 Planner，重新生成计划                                  │
│  确认: 保存 Config，结束流程                                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. 工具链重构

### 3.1 现有 11 个 Tool 分类重组

| 类别 | Tool 名 | 当前问题 | 改进方向 |
|------|--------|---------|---------|
| **配置生成** | `generate_config` | LLM 直接写 JSON | **废弃**，拆分为 `assemble_config` |
| **配置校验** | `validate_config` | 仅 schema | 增强为 `validate_config` (三层校验) |
| **配置修改** | `modify_config` | LLM 解析指令修改 | 保留，接入 Builder 流水线 |
| **模板查询** | `query_templates` | 5 个 Demo | 扩展更多模板，增加推荐能力 |
| **组件查询** | `search_components` | 24 个组件 | 扩展组件库，增加语义搜索 |
| **追番导入** | `import_bangumi_watchlist` | 静态 JSON | 保留，增加 Bangumi API 对接 |
| **番剧推荐** | `get_anime_recommendations` | 简单标签匹配 | 保留，增强推荐算法 |
| **留言板** | `add/get/delete_guestbook_message` | 基础 CRUD | 保留 |
| **风格应用** | `apply_skill` | 应用 YAML 规则 | 保留，增强为 Skill Engine |

### 3.2 新增 Tool 列表

| 新增 Tool | 类型 | 职责 | LLM 参与程度 |
|-----------|------|------|-------------|
| `assemble_config` | 纯代码 | 接收模板+组件列表+风格规则，输出完整 Config JSON | **0%** — 纯代码拼装 |
| `suggest_components` | LLM 决策 | 根据画像推荐组件组合 | **100%** — 只输出组件类型列表 |
| `repair_component` | 混合 | 修复组件属性（如位置重叠、文案占位符） | **50%** — LLM 改文案，代码改结构 |
| `check_semantic_match` | LLM 评估 | 评估组件是否匹配用户画像 | **100%** — 输出 yes/no + 原因 |
| `auto_layout` | 纯代码 | 自动计算组件位置，避免重叠 | **0%** — 纯代码计算 |
| `generate_personalized_text` | LLM 生成 | 为组件生成个性化文案（不写 JSON） | **100%** — 只输出纯文本 |

### 3.3 职责边界：LLM 做什么 vs 代码做什么

```
┌─────────────────────────────────────────────────────────────────┐
│                    LLM 的职责（只做选择/决策）                    │
├─────────────────────────────────────────────────────────────────┤
│ • 选择模板: "用户喜欢樱花风，选模板 #1"                            │
│ • 选择组件: "INFP + 推阿尼亚 → hero-section + oshi-card + quote" │
│ • 选择风格: "用户说可爱 → sakura-style"                          │
│ • 生成文案: "这是阿尼亚的个人主页，欢迎来到我的二次元世界！"          │
│ • 评估质量: "组件匹配画像? 风格一致?"                              │
│ • 修复建议: "把 text 改成更符合 INFP 风格的文案"                    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    代码的职责（做拼装/计算）                        │
├─────────────────────────────────────────────────────────────────┤
│ • 拼装 JSON: 模板 base + 组件列表 → 完整 Config                   │
│ • 计算位置: 组件排列算法（grid/flex），避免重叠                    │
│ • 合并颜色: 风格 colors 覆盖模板 colors                           │
│ • Schema 校验: Pydantic 模型验证                                  │
│ • 自动修复: 补缺失字段、修正类型、调整数量                         │
│ • 布局优化: 响应式断点、移动端适配                                │
└─────────────────────────────────────────────────────────────────┘
```

### 3.4 Tool 调用顺序（Builder Agent 流水线）

```
┌─────────────────────────────────────────────────────────────────┐
│                        Builder 流水线                            │
├─────────────────────────────────────────────────────────────────┤
│  Round 1:                                                       │
│    Planner → "生成新页，推阿尼亚，INFP，樱花风"                   │
│    ├─► suggest_components(profile) → ["hero-section", "oshi-card", "quote"] │
│    └─► 决策: 需要 hero + oshi + quote + social-links              │
│                                                                 │
│  Round 2:                                                       │
│    ├─► query_templates(style="sakura") → 选择模板 "樱花推し模板"   │
│    └─► 决策: base = template_001                                  │
│                                                                 │
│  Round 3:                                                       │
│    ├─► search_components(query="推し") → 获取 oshi-card 定义      │
│    ├─► search_components(query="名言") → 获取 quote 定义           │
│    └─► 决策: components = [hero, oshi, quote, social]            │
│                                                                 │
│  Round 4:                                                       │
│    ├─► apply_skill("sakura-style") → 获取颜色/字体/组件规则        │
│    └─► 决策: colors = pink_palette, fonts = cjk_round            │
│                                                                 │
│  Round 5:                                                       │
│    ├─► generate_personalized_text(component="hero", profile)     │
│    │      → "欢迎来到阿尼亚的二次元世界！"                         │
│    ├─► generate_personalized_text(component="quote", profile)    │
│    │      → "Waku Waku！—— 阿尼亚·福杰"                         │
│    └─► 决策: texts = {hero: "xxx", quote: "yyy"}                 │
│                                                                 │
│  Round 6:                                                       │
│    ├─► assemble_config(                                          │
│    │      template=template_001,                                 │
│    │      components=[hero, oshi, quote, social],                │
│    │      skill=sakura_style_rules,                              │
│    │      texts={hero: "xxx", quote: "yyy"}                      │
│    │    ) → 完整 Config JSON (代码拼装)                          │
│    └─► auto_layout(config) → 计算位置，避免重叠                   │
│                                                                 │
│  Round 7:                                                       │
│    ├─► validate_config(config, profile) → 三层校验               │
│    └─► 如果失败 → repair_component(config, issues) → 自动修复     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. StateGraph 设计

### 4.1 状态节点定义

```python
class PageGenerationState(TypedDict):
    """StateGraph 共享状态"""
    session_id: str
    user_input: str
    profile: UserProfile                    # 用户画像
    plan: Optional[ExecutionPlan]           # Planner 输出
    selected_template: Optional[Template]   # 选中的模板
    selected_components: List[ComponentDef] # 选中的组件
    selected_skill: Optional[Skill]         # 选中的风格
    personalized_texts: Dict[str, str]      # 个性化文案
    config: Optional[BackendPageConfig]     # 当前配置
    validation_report: Optional[ValidationReport]  # 校验报告
    iteration_count: int                    # 迭代次数（防循环）
    max_iterations: int = 3                 # 最大迭代次数
    error: Optional[str]                    # 错误信息
```

### 4.2 状态机图

```
                    ┌─────────────┐
                    │   __start__  │
                    └──────┬──────┘
                           │
                           ▼
                    ┌─────────────┐
         ┌─────────│   collect   │◄────────┐
         │         │ 收集用户输入 │         │
         │         └──────┬──────┘         │
         │                │                │
         │                ▼                │ 用户修改意见
         │         ┌─────────────┐         │
         │         │    plan     │         │
         │         │ Planner决策 │         │
         │         └──────┬──────┘         │
         │                │                │
         │                ▼                │
         │         ┌─────────────┐         │
         │         │    build    │         │
         │         │ Builder组装 │         │
         │         └──────┬──────┘         │
         │                │                │
         │                ▼                │
         │         ┌─────────────┐         │
         │    ┌───►│   validate  │         │
         │    │    │ Validator校验│         │
         │    │    └──────┬──────┘         │
         │    │           │                │
         │    │     ┌─────┴─────┐          │
         │    │     │           │          │
         │    │     ▼           ▼          │
         │    │ ┌────────┐  ┌────────┐     │
         │    │ │ passed │  │ failed │     │
         │    │ └───┬────┘  └───┬────┘     │
         │    │     │           │          │
         │    │     ▼           ▼          │
         │    │ ┌────────┐  ┌────────┐     │
         │    │ │ review │  │ repair │─────┘
         │    │ │ 人工确认 │  │ 自动修复 │
         │    │ └───┬────┘  └────────┘
         │    │     │
         │    │     ▼
         │    │ ┌────────┐
         │    └─│  done  │
         │      │ 完成保存 │
         │      └────────┘
         │
         └────── 迭代计数器超限 ──► done (fallback)
```

### 4.3 节点实现

#### collect 节点

```python
async def collect_node(state: PageGenerationState) -> PageGenerationState:
    """收集用户输入，更新画像。"""
    # 从 user_input 提取/更新 profile
    profile = extract_profile(state["user_input"], state.get("profile"))
    state["profile"] = profile
    return state
```

#### plan 节点

```python
async def plan_node(state: PageGenerationState) -> PageGenerationState:
    """Planner Agent: 生成执行计划。"""
    planner = PlannerAgent()
    plan = await planner.run(
        user_input=state["user_input"],
        profile=state["profile"],
    )
    state["plan"] = plan
    return state
```

#### build 节点

```python
async def build_node(state: PageGenerationState) -> PageGenerationState:
    """Builder Agent: 按 plan 逐步调用工具组装 config。"""
    builder = BuilderAgent()
    config = await builder.run(
        plan=state["plan"],
        profile=state["profile"],
    )
    state["config"] = config
    state["iteration_count"] += 1
    return state
```

#### validate 节点

```python
async def validate_node(state: PageGenerationState) -> PageGenerationState:
    """Validator Agent: 三层校验。"""
    validator = ValidatorAgent()
    report = await validator.validate(
        config=state["config"],
        profile=state["profile"],
    )
    state["validation_report"] = report
    return state
```

#### repair 节点

```python
async def repair_node(state: PageGenerationState) -> PageGenerationState:
    """自动修复或返回修改意见。"""
    report = state["validation_report"]
    
    # L1 Schema 错误 → 代码自动修复
    if report.has_schema_issues:
        state["config"] = auto_fix_schema(state["config"], report.issues)
    
    # L2/L3 错误 → 生成修复指令，回到 build
    if report.has_semantic_issues or report.has_business_issues:
        repair_instruction = generate_repair_prompt(report)
        state["user_input"] = repair_instruction  # 用修复指令替换输入
        # 回到 build 节点重新组装
    
    return state
```

### 4.4 条件边逻辑

```python
def decide_after_collect(state: PageGenerationState) -> str:
    """收集后决策：信息足够？→ plan / 继续收集"""
    if has_enough_info(state["profile"]):
        return "plan"
    return "collect"  # 继续问用户

def decide_after_plan(state: PageGenerationState) -> str:
    """计划后决策：直接生成？/ 需要更多画像？"""
    plan = state["plan"]
    if plan.intent == "generate_new_page":
        return "build"
    elif plan.intent == "modify_existing":
        return "build"  # Builder 处理修改
    elif plan.intent == "chat":
        return "__end__"  # 闲聊，不生成
    return "collect"

def decide_after_validate(state: PageGenerationState) -> str:
    """校验后决策：通过？/ 修复？/ 超限放弃？"""
    report = state["validation_report"]
    
    if report.passed:
        return "review"
    
    # 迭代超限，fallback
    if state["iteration_count"] >= state["max_iterations"]:
        state["error"] = f"迭代 {state['iteration_count']} 次仍未通过校验"
        return "done"  # fallback
    
    # 可以自动修复
    if report.can_auto_fix:
        return "repair"
    
    # 需要人工介入
    return "review"

def decide_after_review(state: PageGenerationState) -> str:
    """人工确认后决策"""
    # 由 Human Review 的回调函数决定
    # approve → done
    # reject → build (重试)
    # modify → collect (收集修改意见)
    pass
```

### 4.5 错误处理与重试策略

| 错误类型 | 处理策略 | 重试次数 |
|---------|---------|---------|
| Schema 错误 | 代码自动修复 | 3 次 |
| 组件不匹配 | LLM 重新选择组件 | 2 次 |
| 位置重叠 | auto_layout 重新计算 | 1 次 |
| LLM 调用失败 | 指数退避重试 | 3 次 |
| 迭代超限 | fallback 到默认模板 | 1 次 |

---

## 5. 实施计划

### 5.1 Phase 1：MVP（2-3 周）— 解决 LLM 写 JSON 的痛点

**目标：用最小改动实现"LLM 选组件，代码拼 JSON"**

| 优先级 | 任务 | 工作量 | 说明 |
|--------|------|--------|------|
| P0 | 新建 `assemble_config` Tool | 2d | 纯代码拼装 JSON，接收 template + components + skill |
| P0 | 改造 `BuilderAgent` | 3d | 用 ReAct 模式：LLM 选组件 → 代码拼装 → 校验 |
| P0 | 保留 `DesignAgent` 兼容 | 1d | 默认走新流水线，保留旧模式开关 |
| P1 | 新建 `suggest_components` Tool | 2d | LLM 根据画像推荐组件组合 |
| P1 | 改造 `generate_config` | 1d | 改为调用 assemble_config，不再直接 LLM 写 JSON |
| P1 | 增强 `validate_config` | 2d | 加入 L3 Business 规则校验 |
| P2 | 接入 StateGraph | 3d | 用现有 StateGraph 实现 collect→plan→build→validate 流程 |
| P2 | 单元测试覆盖 | 2d | assemble_config 和 validate 的测试 |

**Phase 1 完成后预期效果：**
- JSON 结构正确率: 6/10 → **8.5/10**
- 内容匹配度: 5/10 → **7/10**
- 向后兼容: ✅ DesignAgent 仍可用旧模式

### 5.2 Phase 2：完善（3-4 周）— 多 Agent 分工 + 完整流水线

| 优先级 | 任务 | 工作量 | 说明 |
|--------|------|--------|------|
| P0 | 拆分 `PlannerAgent` | 3d | 独立 Agent，负责意图识别和任务规划 |
| P0 | 拆分 `ValidatorAgent` | 3d | 独立 Agent，三层校验 + 自动修复 |
| P1 | 新建 `auto_layout` Tool | 2d | 自动计算组件位置，避免重叠 |
| P1 | 新建 `repair_component` Tool | 2d | 自动修复组件属性问题 |
| P1 | 新建 `check_semantic_match` Tool | 2d | LLM 评估组件匹配度 |
| P2 | 增强 `apply_skill` | 2d | Skill Engine 支持组件级规则注入 |
| P2 | Human Review 接入 StateGraph | 2d | InterruptPoint 作为 Graph 节点 |
| P2 | 性能优化 | 2d | LLM 调用合并（Batch），减少延迟 |
| P3 | 集成测试 | 2d | 端到端测试覆盖完整流水线 |

**Phase 2 完成后预期效果：**
- JSON 结构正确率: 8.5/10 → **9/10**
- 内容匹配度: 7/10 → **8.5/10**
- 自动修复率: 0% → **60%**

### 5.3 Phase 3：增强（4-6 周）— 智能推荐 + 用户行为学习

| 优先级 | 任务 | 工作量 | 说明 |
|--------|------|--------|------|
| P1 | 用户行为记忆 | 3d | 记录用户选择偏好，下次推荐 |
| P1 | 模板市场 | 5d | 支持用户上传模板，社区共享 |
| P2 | A/B 测试框架 | 3d | 不同组件组合的效果对比 |
| P2 | 智能文案生成 | 4d | 根据推的 IP 自动查询角色台词/名言 |
| P2 | 图片生成集成 | 5d | 根据风格自动生成头像/背景图 |
| P3 | 用户反馈闭环 | 3d | 用户修改 → 学习 → 下次推荐更准确 |
| P3 | 性能监控 | 2d | 准确率、延迟、用户满意度埋点 |

**Phase 3 完成后预期效果：**
- 用户满意度: 目标 NPS > 50
- 生成一次通过率: 目标 > 80%
- 平均交互轮数: 目标 < 3 轮

---

## 6. 风险与回退

### 6.1 风险清单

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|---------|
| 新架构延迟更高（多轮 Tool 调用） | 高 | 用户体验变差 | Phase 1 保留旧模式开关；并行调用 Tool；Batch LLM 请求 |
| LLM 选择组件不准 | 中 | 内容匹配度下降 | 增加 `suggest_components` 的示例学习；保留人工调整入口 |
| 代码拼装逻辑复杂 | 中 | Bug 增多 | 强单元测试；assemble_config 用纯函数；状态不可变 |
| 旧用户不习惯新流程 | 低 | 用户流失 | A/B 测试；渐进式 rollout；保留旧模式可选 |
| Skill YAML 规则与代码冲突 | 低 | 风格渲染异常 | Skill Engine 增加冲突检测；规则优先级定义 |

### 6.2 向后兼容策略

```python
class DesignAgent:
    def __init__(self, use_v2: bool = False):
        self.use_v2 = use_v2  # 默认 False，渐进启用
        if use_v2:
            self.pipeline = PageGenerationPipeline()  # 新架构
        else:
            self.pipeline = LegacyDesignPipeline()    # 旧架构
    
    async def run(self, user_input, session, context):
        return await self.pipeline.run(user_input, session, context)
```

**渐进式启用：**
1. Week 1-2: 内部测试，只有 `use_v2=True` 才走新流程
2. Week 3-4: 5% 用户灰度，监控准确率
3. Week 5-6: 50% 用户
4. Week 7+: 全量，旧模式作为 fallback

### 6.3 灰度发布方案

```
Feature Flag: enable_v2_pipeline
├── 白名单用户: 提前体验
├── 5% 随机: A/B 测试对照组
├── 50% 随机: 验证稳定性
└── 100%: 全量发布
```

**监控指标：**
- 生成成功率（新 vs 旧）
- 平均延迟（新 vs 旧）
- 用户确认率（新 vs 旧）
- 错误日志数量

---

## 7. 成功指标

### 7.1 技术指标

| 指标 | 当前 | Phase 1 目标 | Phase 2 目标 | Phase 3 目标 |
|------|------|-------------|-------------|-------------|
| JSON 结构正确率 | 6/10 | 8.5/10 | **9/10** | 9/10 |
| 内容匹配画像度 | 5/10 | 7/10 | **8.5/10** | 9/10 |
| 组件位置合理性 | 6/10 | 8/10 | **9/10** | 9/10 |
| 文案个性化率 | 4/10 | 6/10 | **8/10** | 9/10 |
| 一次生成通过率 | 30% | 55% | **70%** | 80%+ |
| 平均交互轮数 | 4-5 轮 | 3-4 轮 | **<3 轮** | <2 轮 |
| 平均延迟 | 3s | 4s | **3.5s** | 3s |

### 7.2 业务指标

| 指标 | 当前 | 目标 |
|------|------|------|
| 用户完成生成率 | 40% | **70%** |
| 用户确认率（不修改直接通过） | 20% | **50%** |
| 用户满意度 (NPS) | - | **>50** |
| 重复生成次数 | 2.5 次 | **<1.5 次** |

### 7.3 工程指标

| 指标 | 当前 | 目标 |
|------|------|------|
| 代码测试覆盖率 | 30% | **>70%** |
| Agent 可扩展性 | 低 | **高**（新增 Tool 只需注册，不改核心） |
| 调试可观测性 | 低 | **高**（每步日志 + Trace） |
| 错误自动修复率 | 0% | **>60%** |

---

## 8. 附录

### 8.1 关键代码示例：assemble_config

```python
# assemble_config.py - 纯代码拼装，LLM 不参与

def assemble_config(
    template: Template,
    components: List[SelectedComponent],
    skill: Skill,
    personalized_texts: Dict[str, str],
    profile: UserProfile,
) -> BackendPageConfig:
    """
    纯代码拼装 Config，不调用 LLM。
    
    Args:
        template: 选中的模板（基础结构）
        components: LLM 选择的组件列表
        skill: 应用的风格规则
        personalized_texts: LLM 生成的个性化文案
        profile: 用户画像（用于填充占位符）
    
    Returns:
        完整的 BackendPageConfig
    """
    # 1. 复制模板基础结构
    config = template.base_config.copy()
    
    # 2. 应用风格颜色
    config["theme"]["colors"].update(skill.colors)
    config["theme"]["fonts"].update(skill.fonts)
    
    # 3. 按顺序插入组件
    for idx, comp in enumerate(components):
        component_def = get_component_definition(comp.type)
        
        # 3.1 基础属性
        component = {
            "id": f"{comp.type}-{idx}",
            "type": comp.type,
            "position": {},  # 由 auto_layout 计算
            "props": component_def.default_props.copy(),
        }
        
        # 3.2 应用 Skill 的组件级规则
        if comp.type in skill.component_rules:
            rules = skill.component_rules[comp.type]
            component["props"].update(rules)
        
        # 3.3 填充个性化文案
        if comp.type in personalized_texts:
            component["props"]["text"] = personalized_texts[comp.type]
        
        # 3.4 填充用户画像占位符
        fill_profile_placeholders(component["props"], profile)
        
        config["components"].append(component)
    
    # 4. 自动计算布局
    config = auto_layout(config)
    
    # 5. Schema 校验（保证不出错）
    return BackendPageConfig.model_validate(config)
```

### 8.2 关键代码示例：BuilderAgent ReAct 循环

```python
# builder_agent.py - LLM 做选择，代码做拼装

class BuilderAgent:
    """Builder Agent: LLM 编排工具，代码拼装 JSON。"""
    
    async def run(self, plan: ExecutionPlan, profile: UserProfile) -> Dict:
        """按 plan 逐步调用工具。"""
        
        # Step 1: 查询模板
        templates = await query_templates(style=plan.style_hint)
        selected_template = await self._llm_choose_template(
            templates=templates,
            profile=profile,
            plan=plan,
        )
        
        # Step 2: 查询组件
        components = []
        for comp_type in plan.expected_components:
            results = await search_components(query=comp_type)
            chosen = await self._llm_choose_component(
                candidates=results,
                profile=profile,
            )
            components.append(chosen)
        
        # Step 3: 应用风格
        skill = await apply_skill(plan.style_hint)
        
        # Step 4: 生成个性化文案（LLM 只写文案）
        texts = {}
        for comp in components:
            text = await generate_personalized_text(
                component_type=comp.type,
                profile=profile,
            )
            texts[comp.type] = text
        
        # Step 5: 代码拼装（LLM 不参与）
        config = assemble_config(
            template=selected_template,
            components=components,
            skill=skill,
            personalized_texts=texts,
            profile=profile,
        )
        
        return config
    
    async def _llm_choose_template(self, templates, profile, plan):
        """LLM 选择模板（选择题，不是写 JSON）。"""
        prompt = f"""
        用户画像: {profile}
        计划: {plan}
        
        可选模板:
        {format_templates(templates)}
        
        请选择一个最适合的模板，只返回模板 ID。
        """
        response = await self.llm.chat(prompt)
        return find_template_by_id(response.strip())
```

### 8.3 术语表

| 术语 | 说明 |
|------|------|
| **Tool** | 原子能力单元（如查询模板、搜索组件） |
| **Skill** | YAML 定义的风格规则（颜色、字体、组件约束） |
| **Agent** | 自主决策的 LLM 驱动实体（Planner/Builder/Validator） |
| **StateGraph** | 状态机，定义 Agent 的执行流程和状态转移 |
| **ReAct** | Think→Act→Observe 循环模式 |
| **BackendPageConfig** | 前端渲染用的配置 JSON Schema |
| **InterruptPoint** | 人机交互中断点，等待用户确认 |

---

*文档版本: v1.0*
*创建日期: 2026-04-24*
*作者: PM Agent (MiniMax-M2.7) + 主会话补全*
