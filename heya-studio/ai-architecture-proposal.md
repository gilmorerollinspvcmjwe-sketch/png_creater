# Heya Studio AI 架构升级方案

> 基于 Claude Code / OpenClaw 源码研究，为 Heya Studio AI 生成模块提供系统性升级方案
> 日期：2026-04-21
> 分析师：PM Agent

---

## 核心思想：不需要编排器

**本质就是：主 Agent 判断什么时候需要调用什么子 Agent，调完拿结果继续。**

Claude Code 的做法：
- 主 Agent 收到任务，觉得需要深入研究 → spawn 一个 Explore Agent
- 需要验证 → spawn 一个 Verification Agent
- **没有"编排器"在预先规划谁先谁后，就是主 Agent 按需调用**

OpenClaw 的做法：
- 主会话判断需要写代码 → spawn coder subagent
- 需要产品分析 → spawn pm subagent
- **没有编排引擎，就是主 Agent 的逻辑里加判断**

> ❌ 去掉：Flow 编排引擎、Agent 编排层、Coordinator 协调器、Agent 间消息总线
> ✅ 采用：Router Agent 做意图路由 + 各主 Agent 按需 spawn 子 Agent

---

## 1. 现状分析

### 1.1 当前架构概览

Heya Studio 的 AI 生成模块采用**单 ReAct Agent**架构：

```
用户输入 → ReAct Agent（单实例） → 8 个工具 → PageConfig JSON → 前端渲染
```

**核心文件：**
- `backend/src/agent/react-agent.ts` — ReAct 循环引擎，约 540 行
- `backend/src/agent/tools.ts` — 8 个工具实现，约 920 行
- `backend/src/agent/ai-proxy.ts` — 多模型代理，约 430 行

**当前工具集：**
| 工具名 | 功能 | 读写类型 |
|--------|------|----------|
| `query_templates` | 搜索模板 | 读 |
| `generate_config` | 生成页面配置 | 写 |
| `validate_config` | 验证配置 | 读 |
| `modify_config` | 修改配置 | 写 |
| `suggest_elements` | 推荐组件 | 读 |
| `ask_user` | 向用户提问 | 交互 |
| `render_preview` | 渲染预览 | 读 |
| `save_page_config` | 保存页面 | 写 |

**PageConfig 数据结构：**
```typescript
interface PageConfig {
  version: string;
  metadata: { title?; description?; author? };
  theme: { id; colors; fonts; effects? };
  layout: { type; width; padding? };
  components: ComponentConfig[];
}
```

**前端组件库：**
- anime/：`OshiCard`, `AttributeWall`, `FriendsList`, `MusicPlayer`, `QuoteTypewriter`, `StarBackground`, `HeroSection`, `MediaList`
- editor/：`CanvasRenderer`, `ComponentLibrary`, `DraggableComponent`, `PropertyPanel`, `Toolbar`

### 1.2 核心问题

| 问题 | 现状 | 影响 |
|------|------|------|
| **单 Agent 瓶颈** | 所有决策（设计+内容+验证）都在一个 ReAct 循环里 | 生成质量受限于单一 prompt，无法专业化分工 |
| **记忆缺失** | 每次会话从零开始，无法记住 MBTI/推/偏好 | 用户每次都要重复介绍自己 |
| **工具系统原始** | 8 个工具，无并发，无权限管理，无执行追踪 | 无法精细控制 API 消耗和功能权限 |
| **Skills 空白** | 无可插拔扩展机制，新风格包/组件包需改核心代码 | 难以快速迭代新设计风格 |
| **安全护栏缺失** | 无内容审核、无生成限制、无策略引擎 | 敏感词/版权问题无法拦截 |
| **可观测性缺失** | 无决策日志、无 metrics、无 token 追踪 | 无法优化迭代，线上问题难以定位 |

---

## 2. 与业界顶尖架构的差距

### 2.1 Claude Code 的多 Agent 模式（无编排器）

Claude Code 的多 Agent 协作体系，**本质上就是主 Agent 按需 spawn**：

```
主 Agent（Main）
  ├── 觉得需要深入研究代码 → spawn Explore Agent
  ├── 需要验证 → spawn Verification Agent
  ├── 需要规划 → spawn Plan Agent
  └── 需要隔离子任务 → fork subagent
```

关键模式：
- **Agent 白名单工具**：每个 Agent 只能调用授权的工具集（`tools: ['*']` 或指定工具列表）
- **fork subagent**：创建隔离子任务，继承父 Agent 的完整上下文
- **主 Agent 决定何时 spawn**：没有预先规划的编排器，就是 if/else 判断

**Heya Studio 差距：**
- 只有单一 ReAct Agent，所有职责混杂
- 无 Agent spawn 机制
- 无任务分解与并行执行能力

### 2.2 OpenClaw 的 subagent 模式

OpenClaw 的做法更直接：

```
主会话 (main agent)
  ├── 需要写代码 → spawn coder subagent（执行完拿结果）
  ├── 需要产品分析 → spawn pm subagent（执行完拿结果）
  └── 需要画图 → spawn image generation tool
```

关键模式：
- **按需 spawn**：主 Agent 判断需要什么，就 spawn 什么
- **结果返回主 Agent**：子 Agent 执行完，结果返回给主 Agent 继续处理
- **无编排引擎**：就是主 Agent 逻辑里多了几个 if/switch 判断

### 2.3 记忆系统

**Claude Code 的四层记忆体系：**

| 记忆类型 | 内容 | 生命周期 |
|----------|------|----------|
| **User Memory** | 用户画像、偏好、角色 | 长期，跨会话 |
| **Feedback Memory** | 用户纠正、确认的正确做法 | 长期，带 decay |
| **Project Memory** | 项目上下文、进行中的工作 | 中期，cleanup |
| **Session Memory** | 对话摘要、关键事件 | 短期，会话内 |

关键设计：
- **frontmatter 格式**：`MEMORY.md` 使用 frontmatter 标记记忆类型
- **生命周期管理**：记忆有 age、decay 机制，定期 cleanup
- **记忆触发条件**：每个记忆类型有明确的 `<when_to_save>` 和 `<how_to_use>` 指导

**Heya Studio 差距：**
- 完全无记忆系统
- 用户每次都要重新介绍 oshi、MBTI、偏好
- 无法积累用户反馈（"不要粉色"类纠正无法保留）

### 2.4 工具编排

**Claude Code 的工具服务层：**

```
工具请求
  ↓
toolHooks.ts (权限钩子: canUseTool)
  ↓
工具执行（并发/串行由调用方决定）
  ↓
工具执行追踪 (token 估算 + metrics)
```

关键模式：
- **并发控制**：读操作（如 grep、file read）可并发，写操作（如 file write）串行
- **权限钩子**：`canUseTool(context)` 返回 boolean，控制工具可用性
- **Token 估算**：每次工具调用前估算 token 消耗，日志记录

**Heya Studio 差距：**
- 工具串行执行，无并发
- 无权限管理（所有工具对所有用户开放）
- 无执行追踪（无法知道单次生成的 API 消耗）

### 2.5 Skills 系统

**Claude Code 的可插拔 Skills 架构：**

```
skills/
  bundled/          # 内置 Skills
    verify.ts       # 验证 Skill
    remember.ts     # 记忆 Skill
    batch.ts        # 批量处理
    ...
  SKILL.md          # Skill 定义文件（触发条件、执行流程、约束）
```

每个 Skill 有独立的 `SKILL.md`，定义：
- **触发条件**：何时激活该 Skill
- **执行流程**：具体的执行步骤
- **约束**：边界条件、限制
- **输出格式**：Skill 的标准输出

**Heya Studio 差距：**
- 无 Skills 概念，所有能力硬编码在 Agent prompt 里
- 新增风格包/组件包需要改 `react-agent.ts`

### 2.6 安全护栏

**Claude Code 的 Policy Limits 服务：**

```
API 获取组织级策略限制
    ↓
ETag 缓存 + 后台轮询
    ↓
策略应用到工具层（canUseTool 钩子）
    ↓
fail-open（API 失败不影响功能）
```

覆盖范围：
- **调用频率限制**：基于用户等级
- **上下文窗口管理**：Token 预算控制
- **文件路径安全**：权限校验
- **功能可用性**：按订阅等级控制功能

**Heya Studio 差距：**
- 无内容安全审核（敏感词、版权）
- 无生成数量限制（组件数量、图片数量）
- 无 Token 预算控制

### 2.7 可观测性

**Claude Code 的 Analytics 服务：**

- **事件日志**：`logEvent(event, metadata)` 记录所有关键事件
- **Token 追踪**：`tokenEstimation.ts` 每次调用估算
- **指标面板**：成功率、平均迭代次数、用户满意度

**Heya Studio 差距：**
- 无任何日志/指标
- 无法量化生成成功率

---

## 3. 升级方案设计

### 3.1 多 Agent 协作架构（简化版：无编排器）

**设计原则：主 Agent 按需 spawn 子 Agent，不预先编排。**

```
用户输入 → Router Agent（判断意图，路由到专业 Agent）
              │
              ├── 新页面生成 → Design Agent（主 Agent）
              │     ├── 觉得需要更多用户信息 → spawn ProfileExtract Agent
              │     ├── 需要查组件/模板 → spawn ComponentSearch Agent（只读，可并发）
              │     ├── 生成配置 → LLM call（minimax / qwen3.6）
              │     └── 需要验证 → spawn Validation Agent
              │
              ├── 修改页面 → Modify Agent
              │     ├── 接收用户框选组件 + 自然语言指令
              │     └── 调用 modify_config 工具
              │
              └── 闲聊/问答 → Chat Agent
```

**关键：没有编排器，只有 Router Agent 做意图路由 + 各主 Agent 按需 spawn 子 Agent。**

#### Router Agent（入口，只做路由判断）

```typescript
// src/agent/router.ts

/**
 * Router Agent 职责：
 * 1. 分析用户意图
 * 2. 决定路由到哪个主 Agent
 * 3. 提取初步上下文
 * 
 * 不做：
 * - 不执行具体任务
 * - 不等待子 Agent 结果
 * - 不编排任务流程
 */

interface RouterResult {
  targetAgent: 'design' | 'modify' | 'chat';
  extractedContext: {
    mbti?: string;
    oshi?: Array<{ name: string; from?: string }>;
    stylePreference?: string;
  };
  suggestedSkills: string[];  // 触发的 Skill
}

async function route(userInput: string, history: ConversationEntry[]): Promise<RouterResult> {
  const response = await aiProxy.call('router', {
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history,
      { role: 'user', content: userInput }
    ]
  });
  return JSON.parse(response);
}
```

#### Design Agent（主 Agent，按需 spawn）

```typescript
// src/agent/design-agent.ts

/**
 * Design Agent 是"主 Agent"：
 * - 接收路由结果，开始执行设计任务
 * - 执行过程中，按需 spawn 子 Agent
 * - 收集子 Agent 结果，继续执行
 * - 最后返回 PageConfig
 */

async function designAgent(input: DesignAgentInput): Promise<DesignAgentOutput> {
  // 1. 读取记忆（可能 spawn Memory Agent）
  const memory = await readMemory(input.userId);
  
  // 2. 如果需要更多用户信息，spawn ProfileExtract Agent
  if (!memory.userProfile?.mbti) {
    const extracted = await spawnAgent('profile-extract', {
      conversation: input.conversationHistory
    });
    // 合并提取的信息
    Object.assign(memory.userProfile, extracted.profile);
  }
  
  // 3. 查询组件/模板（只读，可并发 spawn）
  const [templates, componentSuggestions] = await Promise.all([
    spawnAgent('component-search', { 
      keywords: memory.userProfile.stylePreference 
    }),  // 只读 agent，可以并行
    spawnAgent('component-suggest', {
      profile: memory.userProfile
    })   // 只读 agent，可以并行
  ]);
  
  // 4. 生成配置（主 LLM call）
  const config = await generateConfigWithLLM({
    profile: memory.userProfile,
    templates,
    suggestions: componentSuggestions,
    skills: input.activatedSkills
  });
  
  // 5. 需要验证？spawn Validation Agent
  if (config.hasExternalResources) {
    const validation = await spawnAgent('validation', {
      config,
      checkTypes: ['copyright', 'sensitive']
    });
    if (!validation.passed) {
      // 处理验证失败
      config.warnings = validation.warnings;
    }
  }
  
  // 6. 返回结果给 Router Agent（或直接返回给用户）
  return { config, reasoning };
}
```

#### Agent 类型定义（参考 Claude Code builtInAgents.ts）

```typescript
// src/agent/types.ts

export type AgentType = 
  | 'router' 
  | 'design' 
  | 'modify' 
  | 'chat'
  | 'profile-extract'    // 子 Agent：提取用户画像
  | 'component-search'   // 子 Agent：搜索组件/模板（只读）
  | 'component-suggest' // 子 Agent：推荐组件（只读）
  | 'validation';       // 子 Agent：验证配置

export interface AgentDefinition {
  type: AgentType;
  name: string;
  description: string;
  whenToUse: string;  // 何时使用这个 Agent
  tools: ToolName[];  // 白名单工具
  systemPrompt: string;
  maxIterations: number;
  timeoutMs: number;
}

// Agent 定义文件（类似 Claude Code 的 builtInAgents.ts）
export const AGENT_DEFINITIONS: AgentDefinition[] = [
  {
    type: 'router',
    name: 'Router Agent',
    description: '入口路由器，分析意图并分发到专业 Agent',
    whenToUse: '用户输入的第一层处理，决定路由到哪个主 Agent',
    tools: ['analyze_intent'],
    systemPrompt: '你是一个意图分析路由器...',
    maxIterations: 1,
    timeoutMs: 5000,
  },
  {
    type: 'design',
    name: 'Design Agent',
    description: '主设计 Agent，负责页面生成',
    whenToUse: '用户请求生成新页面时',
    tools: ['*'],  // 全部工具
    systemPrompt: '你是一个专业页面设计师...',
    maxIterations: 8,
    timeoutMs: 30000,
  },
  {
    type: 'profile-extract',
    name: 'ProfileExtract Agent',
    description: '子 Agent，从对话中提取用户画像',
    whenToUse: 'Design Agent 需要更多用户信息时',
    tools: [],  // 纯 LLM，不需要工具
    systemPrompt: '你是一个用户画像提取专家...',
    maxIterations: 1,
    timeoutMs: 3000,
  },
  {
    type: 'component-search',
    name: 'ComponentSearch Agent',
    description: '子 Agent，搜索组件库和模板（只读）',
    whenToUse: 'Design Agent 需要查询组件/模板时',
    tools: ['query_templates', 'suggest_elements'],
    systemPrompt: '你是一个组件库搜索助手...',
    maxIterations: 2,
    timeoutMs: 5000,
  },
  {
    type: 'validation',
    name: 'Validation Agent',
    description: '子 Agent，验证配置合规性',
    whenToUse: 'Design Agent 生成配置后需要验证时',
    tools: ['validate_config', 'content_moderation'],
    systemPrompt: '你是一个配置验证专家...',
    maxIterations: 2,
    timeoutMs: 5000,
  },
  // ... 其他 Agent 定义
];
```

**不需要的组件（已删除）：**
- ❌ 独立的编排服务
- ❌ Agent 间消息总线
- ❌ 复杂的上下文传递协议
- ❌ 预先规划的任务流程

**需要的组件：**
- ✅ Agent 定义文件（类似 builtInAgents.ts）
- ✅ spawn 子 Agent 的工具/函数
- ✅ 子 Agent 结果返回机制

### 3.2 记忆系统设计（四层记忆，保持不变）

```
┌─────────────────────────────────────────────┐
│  User Memory (Supabase users 表扩展)         │
│  - MBTI、推、兴趣、风格偏好                   │
│  - 长期记忆，无 decay                         │
└─────────────────────────────────────────────┘
┌─────────────────────────────────────────────┐
│  Feedback Memory (Supabase feedback 表)     │
│  - 用户纠正："不要粉色"、"要赛博风"             │
│  - 带关键词索引，支持快速检索                   │
└─────────────────────────────────────────────┘
┌─────────────────────────────────────────────┐
│  Project Memory (Supabase pages 表 + KV)    │
│  - 进行中的页面设计、历史版本                   │
│  - 当前会话的项目上下文                        │
└─────────────────────────────────────────────┘
┌─────────────────────────────────────────────┐
│  Session Memory (Cloudflare KV 短期)        │
│  - 对话摘要、已提取的用户信息                   │
│  - 会话结束清理                               │
└─────────────────────────────────────────────┘
```

**Supabase 表结构：**

```sql
-- 用户画像表
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  mbti TEXT,
  blood_type TEXT,
  zodiac TEXT,
  oshi JSONB,  -- [{ name, from, description? }]
  hobbies TEXT[],
  style_preference TEXT[],  -- ['sakura', 'cyberpunk', ...]
  color_preference TEXT[],
  language TEXT DEFAULT 'zh',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 用户反馈表
CREATE TABLE user_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  feedback_type TEXT NOT NULL,  -- 'correction' | 'confirmation' | 'preference'
  keywords TEXT[] NOT NULL,  -- ['粉色', '不要', '风格']
  content TEXT NOT NULL,
  context TEXT,  -- 当时的设计上下文
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 页面历史表
CREATE TABLE page_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  page_id UUID REFERENCES pages(id) NOT NULL,
  page_config JSONB NOT NULL,
  version INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_feedback_user_id ON user_feedback(user_id);
CREATE INDEX idx_feedback_keywords ON user_feedback USING GIN(keywords);
CREATE INDEX idx_page_history_user_id ON page_history(user_id);
```

**Session Memory（Cloudflare KV）：**

```typescript
// KV key 格式：session:{sessionId}:memory
// TTL: 24 小时
interface SessionMemory {
  sessionId: string;
  extractedProfile: {
    mbti?: string;
    oshi?: Array<{ name: string; from?: string }>;
    stylePreference?: string;
  };
  conversationSummary: string;
  recentCorrections: string[];  // 最近 N 条纠正
  designContext: PageConfig | null;
}
```

### 3.3 工具系统升级

**工具并发编排（简化版，按需调用）：**

```typescript
// src/agent/tools/orchestrator.ts

// 不需要独立的编排引擎
// 由主 Agent 决定：哪些可以并行，哪些必须串行

/**
 * 并行执行读操作（只读 Agent 内部调用）
 */
async function parallelReads(tools: ToolCall[]): Promise<ToolResult[]> {
  const reads = tools.filter(t => READ_TOOLS.includes(t.name));
  return Promise.all(reads.map(t => executeTool(t)));
}

/**
 * 串行执行写操作
 */
async function sequentialWrites(tools: ToolCall[]): Promise<ToolResult[]> {
  const writes = tools.filter(t => WRITE_TOOLS.includes(t.name));
  const results: ToolResult[] = [];
  for (const write of writes) {
    const result = await executeTool(write);
    results.push(result);
    if (!result.success) break;  // 失败停止
  }
  return results;
}
```

**工具权限管理：**

```typescript
// src/agent/tools/permissions.ts

type UserTier = 'free' | 'pro' | 'enterprise';

const TIER_LIMITS: Record<UserTier, ToolLimits> = {
  free: {
    maxComponents: 8,
    maxImages: 5,
    maxTokenBudget: 8000,
    availableTools: ['query_templates', 'generate_config', 'validate_config', 
                     'ask_user', 'render_preview', 'save_page_config'],
  },
  pro: {
    maxComponents: 20,
    maxImages: 20,
    maxTokenBudget: 20000,
    availableTools: ['*'],
  },
  enterprise: {
    maxComponents: 100,
    maxImages: 100,
    maxTokenBudget: 100000,
    availableTools: ['*'],
  }
};

/**
 * 权限检查钩子（类似 Claude Code 的 canUseTool）
 */
function canUseTool(toolName: ToolName, userTier: UserTier): boolean {
  const limits = TIER_LIMITS[userTier];
  if (limits.availableTools.includes('*')) return true;
  return limits.availableTools.includes(toolName);
}

/**
 * 生成限制检查
 */
function checkGenerationLimits(
  config: PageConfig, 
  userTier: UserTier
): { allowed: boolean; reason?: string } {
  const limits = TIER_LIMITS[userTier];
  
  if (config.components.length > limits.maxComponents) {
    return { 
      allowed: false, 
      reason: `组件数量超过限制（${limits.maxComponents}），请减少组件或升级到 Pro` 
    };
  }
  
  return { allowed: true };
}
```

**工具执行追踪：**

```typescript
// src/agent/tools/tracking.ts

interface ToolExecutionRecord {
  toolName: ToolName;
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
  timestamp: number;
  success: boolean;
  error?: string;
}

// 记录到 Supabase（异步，不阻塞主流程）
async function recordToolExecution(
  userId: string, 
  sessionId: string, 
  record: ToolExecutionRecord
) {
  await supabase.from('tool_executions').insert({
    user_id: userId,
    session_id: sessionId,
    tool_name: record.toolName,
    input_tokens: record.inputTokens,
    output_tokens: record.outputTokens,
    duration_ms: record.durationMs,
    success: record.success,
    error: record.error,
  });
}
```

### 3.4 Skills 插件系统（保持不变，这是核心壁垒）

**Skills 目录结构：**

```
backend/src/skills/
  bundled/                  # 内置 Skills
    sakura-style/           # 樱花萌系风格包
      SKILL.md
      prompts.ts
      components.ts
    cyberpunk-style/        # 赛博朋克风格包
      SKILL.md
    magical-girl/           # 魔法少女风
      SKILL.md
    minimalist/             # 极简风
      SKILL.md
    musician-pack/          # 音乐人组件包
      SKILL.md
  skills.ts                 # Skills 注册表
  loader.ts                 # 动态加载器
```

**SKILL.md 定义格式：**

```markdown
# Skill: sakura-style (樱花萌系风格包)

## 触发条件
- 用户提到：樱花、粉色、萌系、甜甜的、可爱
- 用户 MBTI 为：INFP, ENFP, ISFJ, ESFJ
- 无明确风格偏好时的默认推荐

## 执行流程
1. 读取风格配置（配色、字体、特效）
2. 注入 Design Agent 的 system prompt
3. 从组件库选择推荐组件（OshiCard 优先）
4. 生成樱花特效配置（飘落花瓣动画）

## 约束
- 配色必须包含 #F2A7B3（樱花粉）作为主色
- 字体优先使用 Noto Sans SC
- 背景禁止使用深色（保持浅色系）
- 组件数量建议 4-8 个

## 组件映射
| 用户场景 | 推荐组件 | 优先级 |
|----------|----------|--------|
| 有推 | OshiCard + AttributeWall | P0 |
| 有音乐 | MusicPlayer | P1 |
| 想社交 | FriendsList | P2 |

## 配色方案
{
  primary: "#F2A7B3",
  secondary: "#FFEEF2",
  accent: "#E8D4E8",
  background: "#FFF5F8",
  text: "#2A2A2A"
}
```

### 3.5 安全护栏（三层安全，保持不变）

```
用户输入 → Input Guard (内容审核) → Agent 执行 → Output Guard (配置审核)
              ↓                        ↓                    ↓
         敏感词过滤              Token 预算控制         版权检查
         意图审核                频率限制              组件安全
```

**Input Guard（用户输入审核）：**

```typescript
// src/agent/guardrails/inputGuard.ts

const SENSITIVE_WORDS = [
  // 政治敏感词（略）
  // 违规内容词（略）
];

const TRADEMARK_KEYWORDS = [
  '原神', '崩坏', '舰娘', 'Fate', 'EVA', '巨人',
];

interface ModerationResult {
  passed: boolean;
  violations: Array<{
    type: 'sensitive' | 'trademark' | 'spam';
    keyword: string;
    severity: 'low' | 'medium' | 'high';
  }>;
}

function moderateInput(input: string): ModerationResult {
  const violations = [];
  
  for (const word of SENSITIVE_WORDS) {
    if (input.includes(word)) {
      violations.push({ type: 'sensitive', keyword: word, severity: 'high' });
    }
  }
  
  for (const keyword of TRADEMARK_KEYWORDS) {
    if (input.includes(keyword)) {
      violations.push({ type: 'trademark', keyword, severity: 'medium' });
    }
  }
  
  return {
    passed: violations.filter(v => v.severity === 'high').length === 0,
    violations,
  };
}
```

### 3.6 可观测性

**日志体系：**

```
用户请求
  ↓
RequestContext { requestId, userId, sessionId, timestamp }
  ↓
Agent Decision Log (每次 spawn 子 Agent)
  ↓
Tool Execution Log (每次工具调用)
  ↓
Response Log (最终结果)
  ↓
存储到 Supabase (异步)
```

**核心日志表：**

```sql
-- Agent 决策日志（记录 spawn 事件）
CREATE TABLE agent_decision_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  agent_type TEXT NOT NULL,  -- 'router', 'design', 'profile-extract', etc.
  parent_agent TEXT,          -- spawn 它的父 Agent
  iteration INTEGER NOT NULL,
  tokens_used INTEGER,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 生成指标
CREATE TABLE generation_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  success BOOLEAN NOT NULL,
  iterations INTEGER NOT NULL,
  total_tokens INTEGER,
  generation_time_ms INTEGER,
  components_count INTEGER,
  satisfaction_score INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Token 消耗追踪
CREATE TABLE token_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  date DATE NOT NULL,
  model TEXT NOT NULL,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  request_count INTEGER DEFAULT 0,
  cost_usd DECIMAL(10, 6),
  UNIQUE(user_id, date, model)
);
```

**关键 Metrics Dashboard：**

| 指标 | 定义 | 告警阈值 |
|------|------|----------|
| 生成成功率 | success=true / total | < 90% |
| 平均迭代次数 | avg(iterations) | > 6 |
| Token 消耗 | sum(input+output) / 请求数 | > 15000 |
| 用户满意度 | avg(satisfaction_score) | < 3.5 |
| 平均生成时间 | avg(generation_time_ms) | > 30000ms |

---

## 4. 技术实现细节

### 4.1 spawn 子 Agent 机制

```typescript
// src/agent/spawn.ts

/**
 * spawnAgent - 模仿 Claude Code 的 subagent 模式
 * 主 Agent 调用 spawnAgent，传入子 Agent 类型和输入，
 * 获取子 Agent 结果后继续执行
 */

interface SpawnOptions {
  type: AgentType;
  input: unknown;
  context: AgentContext;  // 继承父 Agent 的 context
}

async function spawnAgent<TInput, TOutput>(
  options: SpawnOptions
): Promise<TOutput> {
  const definition = AGENT_DEFINITIONS.find(a => a.type === options.type);
  if (!definition) {
    throw new Error(`Unknown agent type: ${options.type}`);
  }
  
  // 构建子 Agent 的 prompt
  const messages = buildAgentMessages(definition, options.input);
  
  // 记录决策日志
  const startTime = Date.now();
  await logAgentDecision({
    session_id: options.context.sessionId,
    user_id: options.context.userId,
    agent_type: options.type,
    parent_agent: options.context.currentAgent,
    iteration: 0,
  });
  
  // 调用 LLM
  const result = await aiProxy.call(options.type, {
    messages,
    maxTokens: getModelMaxTokens(options.type),
  });
  
  // 记录完成
  await logAgentDecision({
    // ... 记录完成时间和 token 消耗
  });
  
  return JSON.parse(result);
}
```

### 4.2 工具 Schema（扩展版）

在现有 8 个工具基础上，新增以下工具：

```typescript
// src/agent/tools/extended.ts

// 1. 意图分析工具（Router Agent 使用）
const AnalyzeIntentSchema = z.object({
  userInput: z.string(),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })),
});

// 2. 组件推荐工具（只读 Agent 使用）
const RecommendComponentsSchema = z.object({
  userProfile: z.object({
    mbti: z.string().optional(),
    oshi: z.array(z.object({
      name: z.string(),
      from: z.string().optional(),
    })).optional(),
    hobbies: z.array(z.string()).optional(),
    stylePreference: z.string().optional(),
  }),
});

// 3. 内容审核工具（Validation Agent 使用）
const ContentModerationSchema = z.object({
  config: z.any(),
  checkTypes: z.array(z.enum([
    'sensitive_words', 
    'copyright', 
    'image_sources',
    'component_limits'
  ])).default(['sensitive_words', 'copyright']),
});

// 4. 用户画像读写工具
const ReadUserProfileSchema = z.object({
  fields: z.array(z.enum([
    'mbti', 'oshi', 'hobbies', 
    'style_preference', 'color_preference'
  ])).optional(),
});

const WriteUserProfileSchema = z.object({
  updates: z.record(z.any()),
});

const SearchFeedbackSchema = z.object({
  keywords: z.array(z.string()),
  limit: z.number().default(5),
});
```

**工具分类（读写类型）：**

```typescript
// src/agent/tools/registry.ts

export const READ_TOOLS: ToolName[] = [
  'query_templates',
  'validate_config',
  'suggest_elements',
  'render_preview',
  'analyze_intent',
  'recommend_components',
  'read_user_profile',
  'search_feedback',
  'content_moderation',
];

export const WRITE_TOOLS: ToolName[] = [
  'generate_config',
  'modify_config',
  'save_page_config',
  'write_user_profile',
  'write_feedback',
];
```

---

## 5. 实施路线图

### Phase 1 (MVP, 2周)

**目标：** 扩充基础工具 + 接入双模型 + 3-5 个风格 Skill

**交付物：**
- [ ] 工具扩充到 15-20 个
- [ ] Design Agent 接入 minimax + qwen3.6 双模型
- [ ] 3-5 个内置 Skill：樱花风、赛博朋克、魔法少女、极简、摇滚
- [ ] 基础 Skills 加载器

**技术改动：**
- 扩展 `tools.ts` → 新增 7-12 个工具
- 修改 `ai-proxy.ts` → 支持双模型路由
- 新增 `skills/bundled/` 目录 + SKILL.md 文件

**验收标准：**
- 说"想要樱花风"能触发 sakura-style Skill
- minimax 生成失败时自动切换到 qwen3.6

---

### Phase 2 (2周)

**目标：** Router Agent + 记忆系统 + 纯对话生成

**交付物：**
- [ ] Router Agent 实现（意图分析 + 路由）
- [ ] ProfileExtract Agent（子 Agent，按需 spawn）
- [ ] 四层记忆系统（Supabase 表 + KV）
- [ ] 纯对话生成取代当前 ReAct 单 Agent

**技术改动：**
- 新增 `backend/src/agent/router.ts`
- 新增 `backend/src/agent/design-agent.ts`
- 新增 `backend/src/db/memory-storage.ts`
- 新增 `backend/src/agent/spawn.ts`
- Supabase 表：`user_profiles`, `user_feedback`

**验收标准：**
- 用户第二次访问时，Agent 能记住 MBTI/推/偏好
- 用户说"不要粉色"后，后续生成不再使用粉色

---

### Phase 3 (2周)

**目标：** 框选 + 自然语言修改（Modify Agent）

**交付物：**
- [ ] Modify Agent（主 Agent，处理修改请求）
- [ ] 框选 + 自然语言修改交互
- [ ] 去掉对拖拽编辑器的依赖，藏到"高级模式"

**技术改动：**
- 新增 `backend/src/agent/modify-agent.ts`
- 前端：框选组件 → 发送自然语言指令 → Modify Agent 处理

**验收标准：**
- 用户框选组件 + 说"把这个背景改成粉色" → 组件背景变粉色
- 不需要拖拽编辑器的简单修改场景，通过对话完成

---

### Phase 4 (2周)

**目标：** 工具并发 + 可观测性 + 更多 Skills

**交付物：**
- [ ] 工具并发编排（只读并行，写操作串行）
- [ ] 可观测性面板（决策日志、指标、token 消耗）
- [ ] 更多 Skills 扩展（音乐人包、画师包）

**技术改动：**
- 新增 `backend/src/agent/tools/orchestrator.ts`
- 新增 `frontend/src/pages/Analytics.tsx`
- 新增 `skills/bundled/musician-pack/`, `artist-pack/`

**验收标准：**
- 工具调用有完整的 token/duration 日志
- 可查看每日/每周生成指标
- 能看到子 Agent spawn 的决策链

---

## 6. 风险评估

### 已移除的风险
- ~~多 Agent 编排复杂度~~ → 不需要编排器，主 Agent 按需 spawn
- ~~消息总线可靠性~~ → 不需要消息总线，子 Agent 结果直接返回
- ~~编排服务运维~~ → 不需要独立的编排服务

### 新增/保留的风险

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| **Router Agent 路由准确率** | 中 | 高 | Phase 2 加入人工标注的测试集；定期优化 prompt |
| **子 Agent 调用链路延迟** | 中 | 中 | Cloudflare Workers 30s 限制；子 Agent timeout 设置 5-10s；超时降级 |
| **外部 LLM API 稳定性** | 中 | 高 | 双模型兜底（minimax ↔ qwen3.6）；fail-open 策略 |
| **外部 LLM API 成本** | 中 | 中 | Token 估算 + 日志；免费用户额度控制 |
| **记忆存储成本增加** | 低 | 低 | Session Memory 用 KV TTL 自动过期；Feedback Memory 按关键词索引 |
| **版权检查误杀** | 中 | 中 | 版权检查只 WARN 不 BLOCK；提供申诉机制 |
| **Skills 加载增加冷启动** | 低 | 中 | Skills 按需懒加载 |

### 关键设计决策

1. **Agent spawn 模式选择：**
   - **采用：** 主 Agent 内直接 spawn 子 Agent（类似 OpenClaw 的 sessions_spawn）
   - **优点：** 无额外基础设施，按需调用，延迟低
   - **Cloudflare Workers 兼容性：** 子 Agent 在同一请求内执行，无状态限制

2. **记忆存储策略：**
   - User/Feedback Memory → Supabase（结构化查询）
   - Session Memory → Cloudflare KV（短期，高性能）
   - 不推荐：所有记忆都存 Supabase（延迟高）

3. **Phase 1 优先级：**
   - 工具扩充最简单，产出明确
   - 双模型接入提高生成稳定性
   - Skills 系统是核心差异点

---

## 7. 对比：简化前 vs 简化后

| 项目 | 简化前（已废弃） | 简化后（采用） |
|------|------------------|----------------|
| **多 Agent 架构** | Coordinator Agent + 消息总线 | Router Agent + 按需 spawn |
| **任务编排** | 独立编排引擎，预先规划流程 | 主 Agent 按需调用，无预规划 |
| **Agent 通信** | Agent 间消息传递协议 | 子 Agent 结果直接返回主 Agent |
| **复杂度** | 高（需要编排服务、消息队列） | 低（纯 LLM 调用逻辑） |
| **参考来源** | 理论架构设计 | Claude Code + OpenClaw 实际代码 |

---

*报告结束*
