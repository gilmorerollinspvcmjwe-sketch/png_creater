# PRD: Heya Studio Agent 架构升级 — 纯 LLM 驱动

> **版本**: v1.0  
> **日期**: 2026-04-22  
> **作者**: PM Agent (Subagent)  
> **状态**: 待评审  
> **项目**: Heya Studio Backend (`~/.openclaw/workspace/heya-studio/backend-python/src/`)

---

## 1. 现状分析

### 1.1 当前架构流程图

```
用户消息
  │
  ▼
┌─────────────────────────────────────────┐
│  RouterAgent (router/agent.py)          │
│  _quick_intent_check() ← 关键词匹配     │ ← 问题：总是命中规则分支
│  (LLM 路径几乎不执行)                     │
└─────────────┬───────────────────────────┘
              │
    ┌─────────┼─────────┐
    ▼         ▼         ▼
  Design   Modify     Chat
  Agent    Agent      Agent
    │        │         │
    ▼        ▼         ▼
  Generate  Modify    FAQ字典+
  ConfigTool ConfigTool 模式匹配
  (硬编码)  (if-else)  (无LLM)
```

**实际数据流**（用户说 "帮我生成一个 INFP 的樱花风主页"）：
```
用户消息 → RouterAgent._quick_intent_check() → 命中"生成"关键词 → NEW_PAGE
       → DesignAgent._handle_initial() → _extract_profile() → 正则提取 MBTI
       → _handle_generating() → GenerateConfigTool.execute() → 硬编码拼组件
       → 返回固定模板配置
```

**整条链路中 LLM 被调用的次数：0 次。**

### 1.2 各模块 LLM 使用率评估

| 模块 | 文件 | LLM 使用率 | 说明 |
|------|------|-----------|------|
| **RouterAgent** | `router/agent.py` L68-76 | **5%** | 有 LLM 调用路径（L73-76），但 `_quick_intent_check()`（L82-100）总是先命中规则分支，LLM 从不执行 |
| **DesignAgent** | `agents/design.py` (373行) | **3%** | `SYSTEM_PROMPT` 存在但仅作为字符串从未传入 LLM。`_extract_profile()`（L206-236）纯正则；`_handle_generating()` 调 `GenerateConfigTool`（硬编码拼组件）；`_handle_iterating()` 调 `ModifyConfigTool`（if-else） |
| **ModifyAgent** | `agents/modify.py` (151行) | **2%** | `SYSTEM_PROMPT` 从未使用。`_detect_targets()`（L87-106）是关键词→组件类型映射的硬编码。`ModifyConfigTool` 也是 if-else |
| **ChatAgent** | `agents/chat.py` (96行) | **0%** | `FAQ_RESPONSES` 字典 + `_generate_chat_response()`（L78-93）简单模式匹配。`SYSTEM_PROMPT` 未传入 LLM |
| **ProfileExtractAgent** | `agents/profile_extract.py` (135行) | **30%** | 唯一有实际 LLM 调用路径的 Agent（`call_llm` + `ExtractedProfile` schema）。但 catch 分支 fallback 到 `_extract_basic()` 纯正则 |
| **GenerateConfigTool** | `tools/config.py` L115-218 | **0%** | `execute()` 根据 profile dict 直接硬编码创建 hero/oshi/attribute/tag/quote 组件 |
| **ModifyConfigTool** | `tools/config.py` L254-301 | **0%** | `execute()` 是 if-else 关键词匹配（"换成"/"改风格"/"颜色"/"配色"） |
| **SkillLoader** | `skills/loader.py` (184行) | **0%** | `match_skill()`（L148-171）纯关键词+MBTI 分数匹配 |
| **BaseAgent.call_llm()** | `agents/base.py` L58-76 | **就绪** | 基础设施已完善，支持 schema 结构化输出，但上层 Agent 不调 |
| **DeepSeekClient** | `llm/deepseek.py` | **就绪** | OpenAI 兼容接口，已接入但未真正被调用 |
| **LLMClientManager** | `llm/client.py` L113-166 | **就绪** | 支持 primary/fallback/retry 机制 |
| **Session Memory** | `memory/session.py` (147行) | **100%** | 状态管理、消息存储正常运作 |

**整体 LLM 使用率：≈ 2-5%**（架构骨架完整，但肌肉都是假的）

### 1.3 核心问题清单

| # | 问题 | 严重度 | 影响 |
|---|------|--------|------|
| P0 | Router 关键词匹配短路 LLM 意图分类 | 致命 | 所有意图分类走规则，LLM 从不参与 |
| P0 | DesignAgent 页面生成是硬编码模板拼装 | 致命 | "AI 生成页面"是假话，实际是固定模板 |
| P0 | ModifyAgent 修改逻辑是 if-else 关键词匹配 | 致命 | 只能识别预设关键词，无法理解自然语言修改指令 |
| P1 | ChatAgent 闲聊是 FAQ 字典 + 模式匹配 | 高 | 无法真正对话，超出预设关键词就返回默认回复 |
| P1 | ProfileExtractAgent fallback 覆盖 LLM 结果 | 高 | LLM 提取被纯正则 fallback 覆盖 |
| P1 | GenerateConfigTool 组件拼装是硬编码 | 高 | 组件类型、布局、文案全部固定 |
| P2 | SkillLoader 风格匹配是关键词+MBTI 硬编码 | 中 | 新增风格需要改代码，无法通过 LLM 理解用户风格描述 |
| P2 | 缺少对话记忆和上下文学习 | 中 | 每次对话独立，不会记住用户偏好 |
| P3 | 缺少 LLM 输出验证和容错 | 低 | LLM 调用失败时行为不可控 |

---

## 2. 目标架构

### 2.1 纯 LLM 驱动的目标流程

```
用户消息
  │
  ▼
┌─────────────────────────────────────────────┐
│  RouterAgent                                 │
│  call_llm(IntentType schema)                 │
│  → 真正理解意图 + 提取上下文                  │
│  → 关键词匹配仅作为极速缓存（<50ms）          │
└──────────────┬──────────────────────────────┘
               │
    ┌──────────┼──────────┐
    ▼          ▼          ▼
  Design    Modify     Chat
  Agent     Agent      Agent
    │         │         │
    ▼         ▼         ▼
  LLM 生成   LLM 理解   LLM 对话
  配置 JSON  修改计划   自然语言
    │         │
    ▼         ▼
  Config    Config
  Generator Modifier
  (LLM驱动) (LLM驱动)
```

**理想数据流**（同一句 "帮我生成一个 INFP 的樱花风主页"）：
```
用户消息 → RouterAgent.call_llm(IntentType) → LLM 返回 {intent: "new_page", confidence: 0.92, context: {mbti: "INFP", style: "樱花"}}
       → DesignAgent.call_llm(GenerationPlan) → LLM 返回 {theme: "sakura", components: [...], reasoning: "..."}
       → LLM 生成完整 BackendPageConfig JSON
       → ValidateConfigTool 校验
       → 返回智能生成的配置
```

### 2.2 各 Agent/Tool 与 LLM 交互方式

#### RouterAgent
```python
# 当前：_quick_intent_check() 关键词匹配 → 直接返回
# 改造：关键词匹配作为快速缓存（命中且 confidence > 0.95 才直接返回），否则走 LLM

messages = [
    {"role": "system", "content": SYSTEM_PROMPT},
    {"role": "user", "content": user_input},
    {"role": "user", "content": f"对话历史:\n{session.get_recent_messages(5)}"}
]
result = await self.call_llm(messages, IntentType)
```

#### DesignAgent — Profile 提取
```python
# 当前：_extract_profile() 纯正则
# 改造：调 ProfileExtractAgent 或直接 call_llm(ExtractedProfile)

messages = [
    {"role": "system", "content": PROFILE_EXTRACT_SYSTEM_PROMPT},
    {"role": "user", "content": f"从以下对话提取用户画像:\n{conversation_history}"}
]
result = await self.call_llm(messages, ExtractedProfile)
```

#### DesignAgent — 页面配置生成
```python
# 当前：GenerateConfigTool.execute() 硬编码拼组件
# 改造：LLM 生成配置 JSON，Tool 仅负责格式校验和渲染

messages = [
    {"role": "system", "content": CONFIG_GEN_SYSTEM_PROMPT},
    {"role": "user", "content": f"用户画像: {profile_json}\n风格: {theme}\n可用组件: {component_catalog}"}
]
# LLM 返回完整的 BackendPageConfig JSON 字符串
config_json = await self.call_llm(messages)
config = BackendPageConfig.model_validate(json.loads(config_json))
```

#### ModifyAgent
```python
# 当前：_detect_targets() 关键词匹配 + ModifyConfigTool if-else
# 改造：LLM 理解修改指令 → 返回修改计划 → 执行修改

messages = [
    {"role": "system", "content": MODIFY_SYSTEM_PROMPT},
    {"role": "user", "content": f"当前配置: {config_json}\n修改指令: {user_input}"}
]
result = await self.call_llm(messages, ModifyPlan)
# result.targets → 目标组件 ID 列表
# result.action → 修改动作描述
# 然后根据 plan 执行实际修改
```

#### ChatAgent
```python
# 当前：FAQ_RESPONSES 字典 + _generate_chat_response() 模式匹配
# 改造：真正调 LLM 对话

messages = [
    {"role": "system", "content": SYSTEM_PROMPT},
    *session.get_recent_messages(10),
    {"role": "user", "content": user_input}
]
response = await self.call_llm(messages)
```

#### SkillLoader
```python
# 当前：match_skill() 关键词分数匹配
# 改造：LLM 理解用户风格描述 → 推荐风格

messages = [
    {"role": "system", "content": "根据用户画像和描述推荐最合适的视觉风格"},
    {"role": "user", "content": f"用户画像: {profile}\n描述: {user_input}\n可选风格: {skill_catalog}"}
]
# LLM 返回推荐风格列表
```

### 2.3 System Prompt 设计原则

| 原则 | 说明 | 示例 |
|------|------|------|
| **角色明确** | 每个 Agent 有清晰的角色定义 | "你是 Heya Studio 的意图分析路由器" |
| **输出格式约束** | 使用 JSON Schema 强制输出格式 | `IntentType`, `ExtractedProfile` 等 Pydantic schema |
| **上下文注入** | 注入对话历史、用户画像、当前配置 | 在 prompt 中包含 `session.get_recent_messages(5)` |
| **可用资源清单** | 列出可用组件、风格、模板 | 动态注入 `component_catalog`、`skill_catalog` |
| **容错提示** | 告诉 LLM 不确定时怎么办 | "如果信息不足，返回空字段而非编造" |
| **风格统一** | 所有 prompt 使用一致的二次元友好语气 | "友好、活泼、可以使用 emoji (◕‿◕)" |
| **安全边界** | 明确禁止的行为 | "不要回答与产品无关的问题" |

---

## 3. 改造清单（按优先级）

### 3.1 P0 — 必须优先解决

| 改造项 | 当前实现 | 改造方案 | 复杂度 | 依赖 |
|--------|---------|---------|--------|------|
| **R1: Router LLM 化** | `router/agent.py` L68-100: `_quick_intent_check()` 总是命中，LLM 路径 L73-76 从不执行 | ① 关键词匹配改为**缓存层**：仅当匹配到极高置信度关键词（如明确说"生成页面"）时才直接返回 ② 其他情况走 `call_llm(messages, IntentType)` ③ 注入对话历史作为上下文 ④ LLM 失败时 fallback 到规则 | M | DeepSeek 可用 |
| **R2: GenerateConfig LLM 化** | `tools/config.py` L115-218: `GenerateConfigTool.execute()` 硬编码创建 hero/oshi/attribute/tag/quote 组件 | ① 新建 `GenerateConfigLLMTool`，调用 LLM 生成完整 `BackendPageConfig` JSON ② LLM prompt 包含用户画像、可用组件目录、主题色 ③ 保留原 `GenerateConfigTool` 作为 fallback ④ 输出必须通过 `ValidateConfigTool` 校验 | L | R1, 组件目录 |
| **R3: Chat LLM 化** | `agents/chat.py` L52-96: `FAQ_RESPONSES` + `_generate_chat_response()` 模式匹配 | ① FAQ 保留为快速回复（匹配到时直接返回） ② 未匹配时调 `call_llm(messages)` 生成自然对话 ③ 注入会话历史 ④ LLM 失败时 fallback 到当前模式匹配 | S | DeepSeek 可用 |

### 3.2 P1 — 核心体验提升

| 改造项 | 当前实现 | 改造方案 | 复杂度 | 依赖 |
|--------|---------|---------|--------|------|
| **R4: ProfileExtract 完整启用** | `agents/profile_extract.py` L55-60: `try/except` 中 LLM 失败直接 fallback 到 `_extract_basic()` | ① 增加重试机制（最多 2 次） ② fallback 时记录日志和失败原因 ③ 合并 LLM 结果和正则结果（LLM 优先，正则补充） | S | R1 |
| **R5: DesignAgent Profile 提取 LLM 化** | `agents/design.py` L206-236: `_extract_profile()` 纯正则（MBTI regex、推 regex、style 关键词） | ① 改为调 `spawn_subagent(AgentType.PROFILE_EXTRACT)` 复用 ProfileExtractAgent ② 或直接内联 `call_llm(messages, ExtractedProfile)` ③ 正则仅作为最终兜底 | M | R4 |
| **R6: ModifyAgent LLM 化** | `agents/modify.py` L87-106: `_detect_targets()` 关键词→组件类型硬编码映射 | ① 新增 `_detect_targets_llm()` 方法，调 `call_llm(messages, ModifyTarget)` ② LLM 理解修改指令，返回目标组件 ID 列表 ③ 关键词匹配作为 fallback | M | R1 |
| **R7: ModifyConfigTool LLM 化** | `tools/config.py` L254-301: `ModifyConfigTool.execute()` if-else 关键词匹配 | ① LLM 解析修改指令 → 返回具体修改操作（改颜色/换组件/调位置） ② Tool 负责执行具体修改逻辑 ③ 支持自然语言修改如"把头像换成圆形的" | L | R6, R2 |
| **R8: SkillLoader LLM 推荐** | `skills/loader.py` L148-171: `match_skill()` 关键词分数匹配 | ① 新增 `match_skill_llm()` 方法，调 LLM 推荐风格 ② 注入所有可用风格描述 ③ 用户说"我想要温柔浪漫的感觉"也能匹配到 sakura | M | 技能目录完善 |

### 3.3 P2 — 体验优化

| 改造项 | 当前实现 | 改造方案 | 复杂度 | 依赖 |
|--------|---------|---------|--------|------|
| **R9: 多轮对话优化** | `agents/design.py` 状态机硬编码提问顺序 `INFO_PRIORITY`（L34-38） | ① LLM 根据已有画像动态决定下一步问什么 ② 不再固定顺序，而是"缺什么问什么" ③ 支持一次问多个相关信息 | M | R5 |
| **R10: 对话记忆** | `memory/session.py` 仅存储消息列表，无摘要/偏好学习 | ① 新增 `LongTermMemory` 存储用户偏好 ② 对话结束时摘要关键信息 ③ 下次会话加载偏好 | L | - |
| **R11: 流式输出** | `main.py` 有 SSE 端点但 workflow 事件是预定义的 | ① 设计 Agent 生成配置时流式返回 LLM token ② 前端显示 "正在思考..." 动画 | M | - |
| **R12: 配置生成 prompt 优化** | `GenerateConfigTool` 的组件列表/布局/文案全部硬编码 | ① 构建动态组件目录（从前端组件定义生成） ② LLM prompt 中包含组件描述和使用场景 ③ LLM 自主选择组件组合和布局 | M | R2 |

---

## 4. 分阶段实施计划

### Phase 1: 最小可行 LLM 化（1-2 周）

**目标**：让 Router 和 Chat 真正调用 LLM，实现最基础的 AI 对话体验。

#### 1.1 Router LLM 化（R1）
- 修改 `router/agent.py` 的 `run()` 方法
- 关键词匹配改为**快速缓存**：仅当置信度 > 0.95 且匹配到强意图词（"生成页面"、"修改头像"）才直接返回
- 其他情况调用 `call_llm(messages, IntentType)`
- 注入最近 5 条对话历史
- LLM 超时/fallback 时降级到规则匹配

**验收标准**：
- 输入 "帮我做一个 INFP 的主页" → LLM 返回 `new_page`
- 输入 "把头像换一下" → LLM 返回 `modify_page`
- 输入 "今天天气怎么样" → LLM 返回 `chat`
- LLM 不可用时自动 fallback 到规则

#### 1.2 Chat LLM 化（R3）
- 修改 `agents/chat.py` 的 `run()` 方法
- FAQ 匹配保留（快速响应）
- 未匹配 FAQ 时调 `call_llm(messages)` 生成自然回复
- 注入会话历史（最近 10 条消息）

**验收标准**：
- 输入非 FAQ 问题 → LLM 生成个性化回复
- 输入 "我想做一个主页" → LLM 引导用户描述需求
- 连续对话 → LLM 记住上下文

#### 1.3 ProfileExtract 启用（R4）
- 修复 `agents/profile_extract.py` 的 fallback 逻辑
- LLM 失败时重试 2 次
- 合并 LLM 结果和正则结果

**验收标准**：
- LLM 正常时：LLM 提取优先
- LLM 失败时：重试 → 仍失败 → 正则补充

### Phase 2: 核心生成 LLM 化（2-3 周）

**目标**：Design Agent 的 profile 提取和页面配置生成由 LLM 驱动。

#### 2.1 DesignAgent Profile 提取 LLM 化（R5）
- `agents/design.py` 的 `_extract_profile()` 改为调 `call_llm(messages, ExtractedProfile)`
- 或直接调 `spawn_subagent(AgentType.PROFILE_EXTRACT)`

#### 2.2 页面配置 LLM 生成（R2 + R12）
- 新建 `tools/config_llm.py` → `GenerateConfigLLMTool`
- LLM prompt 设计：
  ```
  你是 Heya Studio 的页面配置生成器。
  
  用户画像：{profile_json}
  主题风格：{theme_name}
  可用组件目录：{component_catalog_json}
  
  请生成完整的 BackendPageConfig JSON，包含：
  - 合适的主题配色
  - 4-8 个精心选择的组件
  - 合理的布局位置
  - 个性化的文案（根据用户画像生成）
  ```
- 输出通过 `ValidateConfigTool` 校验
- 校验失败时 LLM 重试修复

#### 2.3 多轮对话优化（R9）
- DesignAgent 的 `_handle_collecting()` 改为 LLM 动态提问
- 不再固定 `INFO_PRIORITY` 顺序

### Phase 3: 修改与优化 LLM 化（2-3 周）

**目标**：Modify Agent 和风格推荐完全 LLM 驱动。

#### 3.1 ModifyAgent LLM 化（R6 + R7）
- `_detect_targets()` 改为 LLM 理解修改指令
- `ModifyConfigTool` 改为 LLM 解析修改计划
- 支持自然语言修改："把推し卡放大一点，背景换成粉色"

#### 3.2 SkillLoader LLM 推荐（R8）
- `match_skill()` 新增 LLM 路径
- 用户描述风格偏好 → LLM 推荐匹配的风格包

### Phase 4: 高级能力（3-4 周）

**目标**：记忆系统、流式输出、多轮对话优化。

#### 4.1 对话记忆（R10）
- 新增 `LongTermMemory` 模块
- 用户偏好持久化
- 跨会话记忆

#### 4.2 流式输出（R11）
- LLM 生成配置时流式返回 token
- 前端显示实时生成状态

#### 4.3 自我评估
- 生成配置后 LLM 自我评估合理性
- 低质量结果自动重新生成

---

## 5. 风险与注意事项

### 5.1 LLM 延迟问题
- **问题**：DeepSeek API 调用通常 1-3 秒，多次调用累积延迟明显
- **应对方案**：
  - Router 层保留关键词快速缓存（<50ms），高频场景直接返回
  - 非关键路径（如闲聊）可以异步返回，先返回占位回复
  - 考虑缓存常见意图的 LLM 结果
  - 前端增加加载动画和进度提示（已有 SSE workflow 支持）
  - **目标延迟**：首次回复 < 2s，完整生成 < 8s

### 5.2 成本控制
- **问题**：LLM 调用产生 API 费用
- **应对方案**：
  - Router 关键词缓存减少不必要的 LLM 调用
  - ProfileExtract 增加 confidence 阈值，低置信度才调 LLM
  - 生成配置时 prompt 尽量精简（组件目录用缩写）
  - 设置每日调用上限（config 层控制）
  - **预估成本**：单次完整生成约 2-4 次 LLM 调用，约 2000-5000 tokens

### 5.3 Prompt 注入安全
- **问题**：用户可能在输入中注入恶意指令
- **应对方案**：
  - 已有 `guardrails/` 模块，需在 LLM 调用前后都使用
  - System Prompt 中明确禁止行为
  - LLM 输出需通过 schema 验证（Pydantic）
  - 关键操作（如删除、修改配置）需用户确认
  - 对用户输入做基本清洗（过滤控制字符、超长文本截断）

### 5.4 LLM 输出不稳定容错
- **问题**：LLM 可能返回格式错误、不合理或空的输出
- **应对方案**：
  - 所有结构化输出使用 Pydantic schema 验证
  - 校验失败时自动重试（最多 2 次）
  - 重试仍失败时降级到规则/fallback
  - 组件配置生成后必须通过 `ValidateConfigTool`
  - 记录所有 LLM 调用日志用于调试

### 5.5 兼容性
- **问题**：改造过程中不能破坏现有功能
- **应对方案**：
  - 所有 LLM 路径都有非 LLM fallback
  - 新增功能通过 feature flag 控制（`config.llm.use_llm_router`）
  - 逐步替换，不一次性重写
  - 保留原有硬编码工具作为 fallback

---

## 6. 成功标准

### 6.1 改造完成标准

| 标准 | 定义 | 验证方式 |
|------|------|---------|
| **Router LLM 化** | 意图分类走 LLM 路径比例 > 80% | 日志统计：LLM 调用次数 / 总请求数 |
| **Chat LLM 化** | 非 FAQ 对话由 LLM 生成 | 测试用例验证 |
| **Profile 提取 LLM 化** | 画像提取走 LLM 路径比例 > 70% | 日志统计 |
| **配置生成 LLM 化** | 页面配置由 LLM 生成（非硬编码拼组件） | 生成结果多样性测试 |
| **修改 LLM 化** | 自然语言修改指令能被理解并执行 | 测试 10+ 种自然语言修改指令 |
| **Fallback 覆盖** | 所有 LLM 路径有非 LLM fallback | 代码审查 |
| **延迟达标** | 首次回复 < 2s，完整生成 < 8s | 性能测试 |

### 6.2 验收测试用例

#### Router
| 用例 | 输入 | 期望输出 |
|------|------|---------|
| T1 | "帮我生成一个 INFP 的主页" | intent=new_page, extracted_context={mbti: "INFP"} |
| T2 | "把头像换成圆形的" | intent=modify_page |
| T3 | "你好呀" | intent=chat |
| T4 | "我想做一个主页，推是初音未来" | intent=new_page, extracted_context={oshi: [{name: "初音未来"}]} |
| T5 | [DeepSeek 不可用时] "帮我生成主页" | fallback 到规则，intent=new_page |

#### Chat
| 用例 | 输入 | 期望输出 |
|------|------|---------|
| T6 | "Heya Studio 是什么？" | FAQ 快速回复（不走 LLM） |
| T7 | "我今天心情不好" | LLM 生成 empathetic 回复 |
| T8 | "我推是五条悟" | LLM 表现出兴趣，引导到主页生成 |

#### Design
| 用例 | 输入 | 期望输出 |
|------|------|---------|
| T9 | "生成一个 INTJ 赛博朋克风的主页" | LLM 生成 night 主题 + 适合 INTJ 的组件组合 |
| T10 | "我的 MBTI 是 ENFP，喜欢画画和音乐" | LLM 提取 mbti + hobbies，生成对应组件 |
| T11 | 生成后说 "不太好看，换个风格" | 进入 ITERATING 状态 |

#### Modify
| 用例 | 输入 | 期望输出 |
|------|------|---------|
| T12 | "把推し卡放大一点" | LLM 识别目标为 oshi-card，执行尺寸修改 |
| T13 | "背景换成粉色" | LLM 识别为背景色修改，切换到 sakura 主题色 |
| T14 | "全部换成圆角" | LLM 识别为批量修改，应用到所有组件 |
| T15 | "撤销" | 回退到上一个版本 |

#### Profile Extract
| 用例 | 输入 | 期望输出 |
|------|------|---------|
| T16 | "我的推是初音未来，MBTI 是 INFP" | ExtractedProfile{oshi: [{name: "初音未来"}], mbti: "INFP"} |
| T17 | "我喜欢画画、听音乐、看动漫" | ExtractedProfile{hobbies: ["画画", "听音乐", "看动漫"]} |

#### 容错
| 用例 | 场景 | 期望行为 |
|------|------|---------|
| T18 | DeepSeek API 超时 | fallback 到规则匹配，不中断用户流程 |
| T19 | LLM 返回格式错误的 JSON | 重试 2 次，仍失败则 fallback |
| T20 | 用户输入超长（>2000 字） | 截断 + 正常处理 |

### 6.3 量化指标

| 指标 | 当前值 | 目标值 |
|------|--------|--------|
| LLM 调用覆盖率 | ~2-5% | > 70% |
| 意图分类准确率 | ~60%（规则） | > 90%（LLM） |
| 画像提取字段数 | ~2（正则仅提取 MBTI/推） | > 5（LLM 提取多维度） |
| 生成页面多样性 | 1 种模板 | > 5 种风格组合 |
| 修改指令支持 | ~5 种关键词 | 自然语言（不限） |
| 首次响应延迟 | < 100ms（规则） | < 2s（含 LLM） |
| 完整生成延迟 | < 500ms（规则） | < 8s（含 LLM） |

---

## 附录

### A. 涉及文件清单

| 文件 | 行数 | 改动类型 |
|------|------|---------|
| `router/agent.py` | 139 | 修改（R1） |
| `agents/design.py` | 373 | 修改（R5, R9） |
| `agents/modify.py` | 151 | 修改（R6） |
| `agents/chat.py` | 96 | 修改（R3） |
| `agents/profile_extract.py` | 135 | 修改（R4） |
| `agents/base.py` | ~80 | 不变（基础设施已就绪） |
| `tools/config.py` | 395 | 修改（R7）+ 新增 `config_llm.py`（R2） |
| `skills/loader.py` | 184 | 修改（R8） |
| `llm/schemas.py` | 86 | 扩展（新增更多 Pydantic schema） |
| `llm/deepseek.py` | 新建 | 不变（基础设施已就绪） |
| `llm/client.py` | ~200 | 不变（基础设施已就绪） |
| `memory/session.py` | 147 | 扩展（R10） |
| `main.py` | ~500 | 微调（workflow 事件优化） |

### B. 新增文件

| 文件 | 说明 |
|------|------|
| `tools/config_llm.py` | LLM 驱动的配置生成工具 |
| `memory/long_term.py` | 长期记忆模块（R10） |
| `guards/llm_guard.py` | LLM 输出护栏（输入清洗 + 输出验证） |
| `prompts/` | 所有 System Prompt 集中管理目录 |
| `tests/llm_integration/` | LLM 集成测试用例 |

### C. 关键代码位置参考

- **Router 关键词短路**：`router/agent.py` L68 — `_quick_intent_check()` 在 `run()` 开头被调用，永远先于 LLM 路径执行
- **DesignAgent 正则提取**：`agents/design.py` L206-236 — `_extract_profile()` 纯正则，无任何 LLM 调用
- **DesignAgent 硬编码生成**：`agents/design.py` L143-190 — `_handle_generating()` 调 `GenerateConfigTool`
- **GenerateConfigTool 硬编码**：`tools/config.py` L115-218 — 按 profile 字段直接创建固定组件
- **ModifyConfigTool if-else**：`tools/config.py` L254-301 — 关键词匹配修改类型
- **ChatAgent FAQ 字典**：`agents/chat.py` L40-48 — 硬编码回复
- **ProfileExtract fallback 覆盖**：`agents/profile_extract.py` L55-60 — catch 中直接 fallback

---

## 7. 架构对比审查 — 对标主流 Agent 框架

> 本节由架构审查补充，对比 Heya Studio 与 2025-2026 年主流 Agent 框架的模式差异。

### 7.1 参考框架

| 框架 | 核心理念 | 代表作 | 适合场景 |
|------|---------|--------|----------|
| **LangGraph** | 图状态机 + 节点执行 + 循环推理 | LangChain 生态 | 复杂多步推理工作流 |
| **CrewAI** | 角色分工 + 任务委派 + 层级管理 | 多 Agent 协作 | 多角色团队协作 |
| **AutoGen** | 多 Agent 对话 + 代码执行 | 微软 | 需要代码执行的场景 |
| **OpenAI Agents SDK** | Handoff + Tool 调用 + Guardian | OpenAI 官方 | 生产级 Agent 部署 |
| **Anthropic Tool Use** | ReAct 循环 + 工具调用 + 结构化输出 | Claude 最佳实践 | 需要高精度工具调用的场景 |

### 7.2 ✅ Heya 已经对齐的部分

**1. 多 Agent 路由（对齐 OpenAI Handoff / CrewAI Hierarchical）**

```
RouterAgent → 意图分类 → 分发到 DesignAgent / ModifyAgent / ChatAgent
```

这正是 OpenAI Agents SDK 的 **Handoff Pattern** 和 CrewAI 的 **Hierarchical Process**。Router 充当 orchestrator/supervisor 角色，将任务分发给专业 Agent。

**2. 工具注册 + 结构化输出（对齐 Anthropic Tool Use / OpenAI Function Calling）**

```python
BaseTool[InputT, OutputT] → Pydantic schema 校验输入输出
```

工具用 Pydantic 定义 schema，LLM 输出通过结构化校验——这是 Anthropic 和 OpenAI 都推荐的最佳实践。Heya 的 `BaseTool` 抽象类设计已经对齐了这个模式。

**3. 状态机工作流（对齐 LangGraph 的 State Graph）**

```
INITIAL → COLLECTING → CONFIRMING → GENERATING → PREVIEW → ITERATING → DONE
```

LangGraph 的核心就是状态图 + 节点转移。Heya 的 DesignAgent 状态机是简化版 LangGraph，概念对齐。

**4. 人类确认点（Human-in-the-loop）**

`CONFIRMING` 状态要求用户确认画像后再进入生成——符合所有框架推荐的 HITL 模式。

**5. SSE 流式输出**

Workflow 事件流 → 前端实时进度，对齐 LangGraph 的 streaming 和 Anthropic 的 token 流。

### 7.3 ❌ 缺失的关键模式

**1. ReAct 循环（所有框架的核心）**

```text
主流框架的标准循环：
Reason → Act → Observe → Reason → Act → ...（直到完成）

Heya 的现状：
固定状态机转移（硬编码下一步），没有 LLM 推理循环
```

影响：DesignAgent 生成页面时，不是"先分析需求→选择组件→生成布局→自校验"，而是直接走固定流程。**没有 LLM 做 reasoning。**

**2. 动态规划（对标 LangGraph 的 Plan-and-Execute / Anthropic 的 Planning Pattern）**

```
主流框架：
LLM 收到任务 → 生成执行计划 → 按步骤执行 → 每步观察结果 → 动态调整

Heya 的现状：
Router 分类意图 → 目标 Agent 按预定义状态机执行
```

Router 只做了一次分类，之后整个流程是硬编码的。LLM 不决定"下一步做什么"。

**3. 多步骤工具链（对标 LangGraph 的 ToolNode / CrewAI 的 Task Chain）**

```
主流框架中，Agent 可以：
- 一次推理后调用多个工具
- 工具结果反馈给 LLM 继续推理
- LLM 根据工具输出决定下一步

Heya 的现状：
每个 Agent 在自己的方法里直接调用 Tool
工具返回后不再经过 LLM 二次推理
```

例如 GenerateConfigTool 返回配置后，没有 LLM 再评估"这个配置合理吗？需要调整吗？"

**4. Self-Reflection / 自校验（对标 LangGraph 的 Reflection Node / Anthropic 的 Self-Correction）**

```
主流框架：
LLM 生成结果 → LLM 自我评估 → 不合格则重写

Heya：
ValidateConfigTool 是纯代码规则校验，不是 LLM 自我评估
校验失败没有 retry 机制
```

**5. 长期记忆（对标 AutoGen 的 Memory / LangGraph 的 Checkpointer）**

```
主流框架：短期记忆（当前会话）+ 长期记忆（跨会话用户画像、偏好学习）

Heya：只有 session 级别的内存，重启就丢
```

没有用户偏好持久化、历史交互摘要、画像学习。

**6. Agent 间通信总线（对标 AutoGen 的 GroupChat / CrewAI 的 Collaboration）**

```
Heya 的 Agent 之间不直接通信，全部通过 Router 中转

更现代的做法：Agent 可以互相请求子任务
（如 DesignAgent 调 ProfileExtractAgent），而不是全部回到 Router 重新路由
```

### 7.4 对标评分

| 模式 | LangGraph | CrewAI | Anthropic | Heya 现状 | 匹配度 |
|------|-----------|--------|-----------|-----------|--------|
| 多 Agent 路由 | ✅ Supervisor | ✅ Hierarchical | ✅ Handoff | ✅ RouterAgent | **80%** |
| ReAct 循环 | ✅ Core | ⚠️ Task loop | ✅ Core | ❌ 固定流程 | **20%** |
| 动态规划 | ✅ Plan node | ✅ Task planning | ✅ Planning | ❌ 硬编码状态机 | **10%** |
| 工具调用 + 结构化输出 | ✅ ToolNode | ✅ Tools | ✅ Function calling | ✅ BaseTool + Pydantic | **85%** |
| Self-Reflection | ✅ Reflection | ⚠️ Review | ✅ Self-correct | ❌ 无 | **5%** |
| 人类确认点 | ✅ HITL | ⚠️ User input | ✅ User approval | ✅ CONFIRMING 状态 | **70%** |
| 长期记忆 | ✅ Checkpointer | ⚠️ Memory | ⚠️ External | ❌ 仅 session | **10%** |
| 流式输出 | ✅ Streaming | ❌ | ✅ Token stream | ✅ SSE workflow | **60%** |

**总体评估：Heya Studio 有一个不错的 Agent 骨架（多 Agent 路由 + 工具注册 + 状态机），但缺少现代 Agent 框架的核心——ReAct 循环、动态规划、自我反思。架构有 70% 的理念对齐，但核心的 "智能决策" 部分还缺失。**

---

## 8. 开源项目代码复用分析

### 8.1 能否直接 copy 代码？

**结论：不能直接 copy 代码，但可以 copy 架构模式和 prompt 模板。**

| 能 copy | 不能 copy |
|---------|----------|
| 架构模式（StateGraph、ReAct、Handoff） | LangGraph/CrewAI 框架本身——太重，强依赖 langchain-core |
| Prompt 模板和 System Prompt 写法 | LangGraph 的 StateGraph 实现——耦合了 RunnableConfig、Pregel |
| 工具调用模式（ToolNode → LLM → ToolNode） | 引入框架会增加 10+ 依赖包，破坏现有轻量架构 |
| Pydantic schema 设计风格 | 每个框架的实现方式不同，硬搬会产生接口冲突 |
| Anthropic cookbook 中的 Tool Use 示例 | LangGraph 的 Checkpointer/Store 抽象层 |

### 8.2 各开源项目的可借鉴清单

#### LangGraph（最值得借鉴）

| 可借鉴内容 | 直接 copy？ | 说明 |
|-----------|------------|------|
| StateGraph 概念 | 概念参考，手写实现 | 核心思想很简单：state dict + node functions + conditional edges |
| ReAct Agent 模式 | 概念参考，手写实现 | 本质是一个 while 循环：LLM 推理 → 调用工具 → 观察结果 → 重复 |
| ToolNode 模式 | 概念参考 | 工具执行节点，输入是工具调用列表，输出是工具结果列表 |
| Human-in-the-loop | 概念参考 | 在特定节点中断，等待用户输入后继续 |
| ConditionalEdge | 概念参考 | 根据 LLM 输出决定下一个节点 |
| 完整 StateGraph 代码 | ❌ 不要 | 约 2000 行，耦合 langchain-core，引入代价太大 |

#### Anthropic Tool Use Best Practices

| 可借鉴内容 | 直接 copy？ | 说明 |
|-----------|------------|------|
| Tool Use prompt 模板 | ✅ 可以 | 结构化 prompt 模式可以直接借鉴 |
| System Prompt 写法 | ✅ 可以 | "角色描述 → 可用工具列表 → 输出格式" 的模板写法 |
| 错误处理模式 | ✅ 可以 | 工具调用失败时把错误信息反馈给 LLM 重试 |
| 代码 | ❌ 不适用 | Anthropic 文档是概念指导，没有可执行的 Python 代码 |

#### OpenAI Agents SDK

| 可借鉴内容 | 直接 copy？ | 说明 |
|-----------|------------|------|
| Handoff 模式 | 概念参考 | Agent 之间交接的 pattern |
| Guardrails | 概念参考，手写实现 | 输入/输出安全检查 |
| 代码 | ❌ 不要 | 依赖 openai SDK，与 Heya 的 FastAPI + DeepSeek 架构不兼容 |

#### CrewAI

| 可借鉴内容 | 直接 copy？ | 说明 |
|-----------|------------|------|
| 角色-任务-执行模型 | 概念参考 | Agent(role, goal, backstory) + Task(description, expected_output) |
| Hierarchical Process | 概念参考 | Manager Agent 分配任务给 Worker Agents |
| 代码 | ❌ 不要 | 依赖 langchain，太重 |

### 8.3 推荐策略：轻量自实现

**用 200-300 行 Python 实现一个轻量版 LangGraph + ReAct 模式**，参考它们的设计理念但不引入任何外部依赖。

```python
# 示例：轻量版 StateGraph（约 50 行核心）
class StateGraph:
    def __init__(self, state_schema: type):
        self.schema = state_schema
        self.nodes: dict[str, Callable] = {}
        self.edges: dict[str, str | Callable] = {}
        self.conditional_edges: dict[str, Callable[[dict], str]] = {}
    
    def add_node(self, name: str, func: Callable):
        self.nodes[name] = func
    
    def add_edge(self, from_node: str, to_node: str):
        self.edges[from_node] = to_node
    
    def add_conditional_edge(self, from_node: str, condition: Callable[[dict], str]):
        self.conditional_edges[from_node] = condition
    
    async def run(self, initial_state: dict) -> dict:
        state = initial_state
        current = "__start__"
        while current != "__end__":
            if current in self.nodes:
                state = await self.nodes[current](state)
            if current in self.conditional_edges:
                current = self.conditional_edges[current](state)
            elif current in self.edges:
                current = self.edges[current]
            else:
                current = "__end__"
        return state
```

**核心原则**：
1. **概念对齐，代码不抄** — 学习 LangGraph 的 StateGraph、ReAct、Plan-and-Execute 等设计模式
2. **零外部依赖** — 只用 Python 标准库 + Pydantic（已有）+ httpx（已有）
3. **渐进式替换** — 先加 LLM 调用路径，再逐步替换状态机为图工作流
4. **Prompt 模板化** — 把 System Prompt 抽到 `prompts/` 目录，像管理代码一样管理 prompt

---

## 9. Phase 0：架构升级（优先于所有 LLM 化改造）

> 在进入 Phase 1-4 之前，先搭建好先进的 Agent 架构基础。
> 预计耗时：2-3 天

### 9.1 引入 ReAct 循环到 DesignAgent

**当前问题**：DesignAgent 是固定状态机，没有 LLM 推理循环。

**目标架构**：

```
┌─────────────────────────────────────────────┐
│              DesignAgent ReAct Loop          │
│                                              │
│  ┌─────────┐    ┌──────────┐    ┌─────────┐ │
│  │ Think   │───→│ Act      │───→│ Observe │ │
│  │ (LLM)   │    │ (Tool)   │    │ (Update)│ │
│  └─────────┘    └──────────┘    └─────────┘ │
│       ↑                                     │
│       │         直到 done 或 max_steps      │
│       └─────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

**Think 节点**：LLM 分析当前状态，决定下一步动作
- 信息不足 → 决定提问
- 信息充足 → 决定生成页面
- 已有草案 → 决定修改

**Act 节点**：执行 Think 节点决定的动作
- 调用 ProfileExtractAgent 提取画像
- 调用 GenerateConfigTool 生成配置
- 调用 SkillLoader 匹配风格

**Observe 节点**：收集工具结果，更新状态

**实现文件**：新增 `src/agents/react_loop.py`（~150 行）

### 9.2 固定状态机改为图工作流

**当前**：DesignAgent 用 `if-elif` 状态机硬编码流程

**目标**：用轻量版 StateGraph 定义节点和条件边

```python
from .react_loop import StateGraph

design_graph = StateGraph(DesignState)

# 节点
design_graph.add_node("collect_info", collect_info_node)
design_graph.add_node("confirm_profile", confirm_profile_node)
design_graph.add_node("generate_config", generate_config_node)
design_graph.add_node("validate", validate_node)
design_graph.add_node("self_reflect", self_reflect_node)  # 新增

# 条件边（LLM 决定下一步）
design_graph.add_conditional_edge("collect_info", decide_next_step)
design_graph.add_conditional_edge("confirm_profile", confirm_router)
design_graph.add_conditional_edge("generate_config", lambda s: "validate")
design_graph.add_conditional_edge("validate", lambda s: "self_reflect" if s.valid else "generate_config")
design_graph.add_conditional_edge("self_reflect", lambda s: "validate" if s.needs_rewrite else "__end__")
```

**关键变化**：不再硬编码 "收集→确认→生成"，而是 LLM 动态决定下一步。如果用户一次性提供了足够信息（"我是 INTJ，推是绫波丽，喜欢赛博风"），可以直接跳过收集阶段进入生成。

**实现文件**：重构 `agents/design.py`（从 373 行精简到 ~200 行）

### 9.3 增加 Self-Reflection 节点

**作用**：生成配置后，LLM 评估合理性，低分则自动重写。

```python
class SelfReflection(BaseModel):
    score: float  # 0-10
    issues: list[str]
    needs_rewrite: bool
    rewrite_suggestions: list[str]

async def self_reflect_node(state: DesignState) -> DesignState:
    messages = [
        {"role": "system", "content": SELF_REFLECT_PROMPT},
        {"role": "user", "content": f"用户画像: {state.profile}\n生成的配置: {state.config_json}"}
    ]
    reflection = await state.agent.call_llm(messages, SelfReflection)
    state.needs_rewrite = reflection.needs_rewrite and state.retry_count < 2
    state.retry_count += 1
    if state.needs_rewrite:
        # 将修改建议注入到下一次生成的 prompt 中
        state.rewrite_guidance = reflection.rewrite_suggestions
    return state
```

**这是提升生成质量最便宜的方式**——多一次 LLM 调用（约 ¥0.002），避免用户不满意需要人工调整。

### 9.4 Prompt 集中管理

**当前**：所有 System Prompt 散落在各 Agent 文件中

**目标**：统一放到 `src/prompts/` 目录，每个 prompt 一个文件或一个常量

```
src/prompts/
├── __init__.py          # 导出所有 prompt
├── router.py            # RouterAgent 的 System Prompt
├── chat.py              # ChatAgent 的 System Prompt
├── design.py            # DesignAgent 相关 prompt
├── profile_extract.py   # ProfileExtractAgent 的 System Prompt
├── style_match.py       # 风格推荐的 System Prompt
├── config_generate.py   # 页面配置生成的 System Prompt
├── config_modify.py     # 配置修改的 System Prompt
├── self_reflect.py      # 自我反思的 System Prompt
└── templates/           # 可复用的 prompt 片段
    ├── component_catalog.txt
    ├── style_catalog.txt
    └── output_format.txt
```

**好处**：
- 像管理代码一样管理 prompt（Git 版本控制、PR review）
- 支持 A/B 测试（prompts/v1/、prompts/v2/）
- 不改动代码逻辑就能优化 prompt

### 9.5 轻量版基础设施清单

| 组件 | 预计代码量 | 参考来源 | 依赖外部库？ |
|------|-----------|---------|-------------|
| StateGraph | ~50 行 | LangGraph 概念 | 否 |
| ReAct Loop | ~100 行 | LangGraph + Anthropic | 否 |
| ToolNode | ~30 行 | LangGraph ToolNode 概念 | 否 |
| ConditionalEdge | ~10 行 | LangGraph 概念 | 否 |
| SelfReflection | ~40 行 | Anthropic 模式 | 否 |
| Prompt 管理 | ~30 行 | 通用做法 | 否 |
| **合计** | **~260 行** | | **0 个新依赖** |

---

## 10. 更新后的实施计划（含 Phase 0）

### 总体时间线

```
Phase 0 (3天)     Phase 1 (1周)      Phase 2 (2周)      Phase 3 (2周)      Phase 4 (2周)
│                  │                   │                   │                   │
▼                  ▼                   ▼                   ▼                   ▼
架构基础搭建    最小可行LLM化       核心生成LLM化       修改优化LLM化       高级能力
- ReAct循环      - Router LLM        - Profile提取LLM    - ModifyAgent LLM   - 长期记忆
- StateGraph     - ChatAgent LLM     - 配置生成LLM        - 风格推荐LLM       - 流式生成
- SelfReflect    - ProfileExtract    - 动态规划           - 自然语言修改      - 自我学习
- Prompt集中     - 快速缓存层        - 多轮对话优化       - 批量修改          - 跨会话画像
- ~260行新代码   - ~200行改动         - ~400行改动         - ~300行改动         - ~300行改动
```

### 详细阶段

#### Phase 0: 架构基础搭建（3 天）

| 任务 | 文件 | 代码量 | 说明 |
|------|------|--------|------|
| 实现轻量 StateGraph | `agents/graph.py` | ~50 行 | 状态图核心 |
| 实现 ReAct Loop | `agents/react_loop.py` | ~100 行 | 推理-行动-观察循环 |
| 实现 Self-Reflection | `agents/self_reflect.py` | ~40 行 | 生成后自我评估 |
| Prompt 集中管理 | `prompts/` 目录 | ~30 行 + 多个 .txt | 所有 System Prompt |
| 更新 DesignAgent | `agents/design.py` | 重构 ~200 行 | 从状态机改为图工作流 |

**验收标准**：
- DesignAgent 能通过图工作流运行，支持动态路径选择
- Self-Reflection 能在生成后评估配置质量
- 所有 System Prompt 从代码中剥离到 prompts/ 目录

#### Phase 1: 最小可行 LLM 化（1 周）

| 任务 | 说明 |
|------|------|
| Router LLM 化 | 意图分类走 LLM，保留关键词快速缓存 |
| ChatAgent LLM 化 | FAQ 保留快速回复，未匹配时走 LLM 对话 |
| ProfileExtract 启用 | LLM 路径优先，正则兜底 |

#### Phase 2: 核心生成 LLM 化（2 周）

| 任务 | 说明 |
|------|------|
| Profile 提取 LLM 化 | DesignAgent 通过 ProfileExtractAgent 提取画像 |
| 页面配置 LLM 生成 | LLM 根据画像和风格动态生成配置（非硬编码拼组件） |
| 动态规划 | DesignAgent 不再固定收集→确认→生成，而是 LLM 动态决定 |
| 多轮对话优化 | 动态提问（缺什么问什么） |

#### Phase 3: 修改与优化 LLM 化（2 周）

| 任务 | 说明 |
|------|------|
| ModifyAgent LLM 化 | LLM 理解修改指令，识别目标组件和执行动作 |
| 风格推荐 LLM 化 | LLM 根据用户画像和描述推荐风格 |
| 自然语言修改 | 支持 "把推し卡放大一点，背景换成粉色" |

#### Phase 4: 高级能力（2 周）

| 任务 | 说明 |
|------|------|
| 长期记忆 | 用户偏好持久化，跨会话画像学习 |
| 流式生成 | LLM 生成配置时流式返回 token |
| 自我学习 | 多轮交互后自动更新用户画像 |

---

## 11. 架构升级后的成功标准（补充）

| 指标 | 当前值 | Phase 0 后 | Phase 2 后 | 最终目标 |
|------|--------|-----------|-----------|----------|
| 架构模式匹配度 | ~30% | ~70% | ~85% | > 90% |
| 动态路径选择 | 0% | 100% | 100% | 100% |
| Self-Reflection | 无 | 有 | 有 + 自动修复 | 有 + 多轮修复 |
| Prompt 版本管理 | 散落在代码 | 集中管理 | 支持 A/B 测试 | 自动化评估 |
| ReAct 循环 | 无 | DesignAgent | 全部 Agent | 全部 Agent + 子任务 |

---

*文档版本 v2.0 — 架构审查 + Phase 0 + 开源复用分析 已追加*
*下一步：评审 Phase 0 实施优先级，开始搭建 ReAct 循环和 StateGraph*
