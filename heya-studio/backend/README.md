# Heya Studio Backend

二次元个人主页配置平台后端服务 - 基于 Cloudflare Workers + Supabase

## 技术架构

- **运行环境**: Cloudflare Workers (边缘计算)
- **数据库**: Supabase PostgreSQL + pgvector
- **存储**: Supabase Storage
- **认证**: Supabase Auth (JWT)
- **AI**: 多模型代理 (MiniMax → DeepSeek → Claude → GPT-4o)

## 项目结构

```
backend/
├── src/
│   ├── index.ts           # Workers 入口 + API 路由
│   ├── agent/
│   │   ├── react-agent.ts # ReAct Agent 循环
│   │   ├── tools.ts       # 8 个工具实现
│   │   └── ai-proxy.ts    # 多模型切换代理
│   ├── db/
│   │   └── supabase.ts    # Supabase 客户端封装
│   ├── middleware/
│   │   └── auth.ts        # JWT 验证 + 限流
│   └── types/
│   │   └── index.ts       # TypeScript 类型定义
├── sql/
│   ├── 001_users.sql
│   ├── 002_pages.sql
│   ├── 003_templates.sql
│   ├── 004_assets.sql
│   └── 005_agent_sessions.sql
├── wrangler.toml
├── package.json
├── tsconfig.json
└── README.md
```

## API 端点

### Agent API

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/agent/chat` | Agent 对话入口（ReAct 循环） |
| POST | `/api/agent/modify` | 修改已有页面配置 |

### Templates API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/templates` | 模板列表 |
| GET | `/api/templates/search?q=` | 模板搜索（向量相似度） |
| GET | `/api/templates/:id` | 模板详情 |

### Pages API

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/pages` | 创建页面 |
| GET | `/api/pages/:id` | 获取页面（ID） |
| GET | `/api/pages/slug/:slug` | 获取页面（Slug） |
| PUT | `/api/pages/:id` | 更新页面 |
| DELETE | `/api/pages/:id` | 删除页面 |
| GET | `/api/pages` | 用户页面列表 |

### Assets API

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/upload` | 图片上传 |
| GET | `/api/assets` | 素材列表 |

### Preview

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/preview/:sessionId` | 获取预览配置 |

## 快速开始

### 1. 安装依赖

```bash
cd backend
npm install
```

### 2. 配置环境变量

复制 `.dev.vars.example` 为 `.dev.vars`，填入实际 API Key：

```bash
cp .dev.vars.example .dev.vars
```

### 3. 运行本地开发

```bash
npm run dev
```

服务将启动在 `http://localhost:8787`

### 4. Supabase 数据库设置

在 Supabase SQL Editor 中依次执行 `sql/` 目录下的 migration 文件：

1. `001_users.sql` - 用户表
2. `002_pages.sql` - 页面表
3. `003_templates.sql` - 模板表（含 pgvector）
4. `004_assets.sql` - 素材表
5. `005_agent_sessions.sql` - Agent 会话表

### 5. Supabase Storage 配置

创建 Storage Bucket：

- `assets` - 用户上传的图片素材
- `templates` - 模板预览图

## ReAct Agent 工具

Agent 使用 ReAct (Reasoning + Acting) 模式，包含 8 个工具：

| 工具 | 说明 |
|------|------|
| `query_templates` | 搜索匹配模板（向量相似度） |
| `generate_config` | 生成页面配置 JSON |
| `validate_config` | 验证配置结构 |
| `modify_config` | 修改已有配置 |
| `suggest_elements` | 推荐组件 |
| `ask_user` | 向用户追问信息 |
| `render_preview` | 渲染预览 |
| `save_page_config` | 保存页面 |

## AI 模型配置

支持多模型切换和自动 fallback：

1. **MiniMax** (主模型) - 中文友好，成本低
2. **DeepSeek** - 备用，性价比高
3. **Anthropic Claude** - 备用，高质量
4. **OpenAI GPT-4o** - 备用，能力强

在 `wrangler.toml` 或 `.dev.vars` 中配置 API Key。

## 部署

### Cloudflare Workers 部署

```bash
npm run deploy
```

### 配置 Secrets

```bash
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_ANON_KEY
wrangler secret put SUPABASE_SERVICE_KEY
wrangler secret put MINIMAX_API_KEY
wrangler secret put DEEPSEEK_API_KEY
wrangler secret put ANTHROPIC_API_KEY
wrangler secret put OPENAI_API_KEY
```

## 限流策略

- Agent API: 20 次/分钟
- 其他 API: 30 次/分钟

使用 Cloudflare KV 存储限流计数。

## 开发命令

```bash
# 本地开发
npm run dev

# 部署
npm run deploy

# 查看 Workers 日志
npm run tail

# 类型检查
npm run typecheck

# Lint
npm run lint
```

## 数据模型

### Page Config 结构

```json
{
  "version": "1.0",
  "metadata": {
    "title": "我的主页",
    "author": "用户名"
  },
  "theme": {
    "id": "sakura-pink",
    "colors": {
      "primary": "#F2A7B3",
      "secondary": "#FFEEF2",
      "accent": "#E8D4E8",
      "background": "#FFF5F8",
      "text": "#2A2A2A"
    },
    "fonts": {
      "primary": "Noto Sans SC"
    }
  },
  "layout": {
    "type": "single-column",
    "width": 680,
    "padding": { "top": 40, "right": 20, "bottom": 40, "left": 20 }
  },
  "components": [
    {
      "id": "text-abc123",
      "type": "text",
      "props": {
        "content": "欢迎来到我的主页",
        "style": "title"
      }
    },
    {
      "id": "oshi-card-def456",
      "type": "oshi-card",
      "props": {
        "name": "芙莉莲",
        "from": "葬送的芙莉莲"
      }
    }
  ]
}
```

## 联系方式

- 项目仓库: [heya-studio]
- 文档: PRD.md