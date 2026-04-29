# Heya Studio - 二次元个人主页生成器

Heya Studio 是一个基于 AI Agent 的二次元个人主页生成平台，让用户可以通过自然语言对话来设计和生成个性化的主页。

## 项目结构

```
heya-studio/
├── backend-python/     # FastAPI 后端
│   ├── src/
│   │   ├── agents/     # AI Agent 系统
│   │   ├── tools/      # 工具系统
│   │   ├── models/     # 数据模型
│   │   ├── skills/     # Skill 加载器
│   │   ├── memory/     # 会话记忆
│   │   ├── llm/        # LLM 客户端
│   │   └── config/     # 配置管理
│   │   └── main.py     # FastAPI 入口
│   └── tests/
├── frontend/           # React + TypeScript 前端
│   ├── src/
│   │   ├── components/ # React 组件
│   │   ├── types/      # TypeScript 类型定义
│   │   ├── pages/      # 页面组件
│   │   └── hooks/      # React Hooks
│   └── public/
└── docs/               # 设计文档
    ├── agent-design.md
    └── product-gap-analysis.md
```

## 功能特性

### Phase 1 - 基础功能 ✅

- ✅ FastAPI 后端骨架 + Mock LLM
- ✅ Router / Design / Modify / ProfileExtract / Validation / Chat Agent
- ✅ Planner → Builder → Validator 稳定生成主链路
- ✅ 工具系统 + Skills 系统 + 记忆系统
- ✅ 工作过程展示（SSE 流式 + workflow 字段）
- ✅ Bug 修复（Pydantic v2 / 空指针 / 类型注解等）

### Phase 1 扩展 - 新增组件 ✅

#### 1. 谷子/周边展示组件 (Merchandise Card)

展示二次元谷子/周边收藏，支持：
- 手办、吧唧、立牌、色纸等多种谷子类型
- 稀有度标签（普通版/限定版/展会限定）
- 品相等级（全新未拆/品相完美/轻微划痕）
- 购买日期、价格、系列等元信息

**AI 触发方式**：用户说 "帮我加一个谷子展示" 即可自动生成组件

#### 2. Bangumi 追番导入 (Mock)

模拟 Bangumi API 数据导入功能：
- 20+ 部热门番剧 Mock 数据
- 支持评分、标签、追番状态
- 可按状态分组显示（在看/看完/暂停/想看/弃坑）

**API 端点**：
- `GET /api/bangumi/import/{username}` - 导入追番列表
- `GET /api/bangumi/recommendations` - 获取番剧推荐

#### 3. 访客留言板 (Guestbook)

支持访客留言互动：
- 留言卡片 + 主人回复功能
- 时间戳和头像展示
- 内存存储（Mock 模式）

**API 端点**：
- `POST /api/guestbook/{page_id}/message` - 添加留言
- `GET /api/guestbook/{page_id}/messages` - 获取留言列表
- `DELETE /api/guestbook/{page_id}/message/{message_id}` - 删除留言

#### 4. 追番列表组件 (Watchlist)

展示用户追番状态：
- 按状态分组（watching / completed / on_hold / plan_to_watch / dropped）
- 评分显示（1-10）
- 进度展示（已看集数/总集数）

**AI 触发方式**：用户说 "导入我的 Bangumi 追番" 即可自动填充数据

### Phase 2 - 更多静态组件 ✅

#### 1. 创作画廊组件 (Gallery)

展示创作作品：
- 支持 grid / masonry / carousel 三种布局
- 图片 hover 显示 caption + 日期 + 标签
- 响应式：移动端单列，桌面端 3-4 列

**AI 触发方式**：用户说 "展示我的创作画廊" 或 "添加作品展示"

#### 2. 成就徽章墙 (AchievementBadges)

展示漫展打卡、游戏成就、社群勋章：
- 徽章网格展示
- 稀有度颜色边框（common / rare / epic / legendary）
- hover 显示详情

**AI 触发方式**：用户说 "展示我的漫展徽章" 或 "添加成就墙"

#### 3. 纪念日日历 (MemorialCalendar)

展示重要纪念日：
- 推生日、出道纪念日、漫展日期等
- 倒计时天数显示
- 特殊日期高亮

**AI 触发方式**：用户说 "添加我的纪念日" 或 "展示重要日期"

#### 4. CP 展示卡 (CPCard)

展示角色 CP 关系：
- 双角色并排展示
- 关系标签（CP/夫妻/羁绊/挚友）
- hover 心形动画效果

**AI 触发方式**：用户说 "展示我的 CP" 或 "添加角色配对卡"

#### 5. 书影音高级卡片 (MediaCard)

仿 Bangumi 风格的精美卡片：
- 评分星星（0-10）
- 标签 + 一句话简评
- 类型图标（番剧/电影/游戏/书籍/音乐）

**AI 触发方式**：用户说 "推荐我喜欢的番剧" 或 "添加书影音卡片"

#### 6. 应援记录 (SupportRecord)

时间线样式展示应援记录：
- 漫展打卡、线下活动等
- 时间线节点 + 照片
- 地点 + 备注

**AI 触发方式**：用户说 "展示我的漫展记录" 或 "添加应援时间线"

### Phase 3 - 分享体验增强 ✅

#### 1. PNG 导出

导出页面为高清 PNG 图片：
- **完整页面**：导出整个画布为长图
- **选中区域**：只导出选中的组件
- 支持 1x/2x/3x 分辨率

#### 2. GIF 动态导出

保留页面动画效果：
- 支持 3-10 秒时长
- 支持 10/15/20/30 FPS 帧率
- 支持 50% 缩放（减小文件体积）
- 自动检测页面是否有动画（无动画时降级为 PNG）

#### 3. 分享海报生成

自动生成带水印的分享图：
- 自定义标题 + 副标题
- 核心组件预览
- 底部 "由 Heya Studio 生成" 水印
- 日期时间戳

#### 4. GIF 动态导出（保留动画效果）

导出页面为 GIF 动图，保留 CSS 动画效果：
- **时长可调**：1-10 秒（默认 3 秒）
- **帧率可调**：10/15/20/30 FPS
  - 10 FPS：较小文件，适合简单动画
  - 15 FPS：推荐，平衡流畅度与文件大小
  - 20 FPS：流畅动画，文件较大
  - 30 FPS：高帧率，文件最大
- **尺寸可调**：原始尺寸 / 50% 缩放
- **文件大小提示**：预估超过 10MB 时警告
- **自动降级**：页面无动画时自动导出为 PNG
- **动画检测**：自动检测粒子效果、呼吸光晕、打字机等 CSS 动画

**触发方式**：点击工具栏 "导出" 按钮，选择对应导出模式

## 技术栈

### 后端
- Python 3.10+
- FastAPI
- Pydantic v2
- Mock LLM（支持切换真实 LLM）

### 前端
- TypeScript
- React 18
- TailwindCSS
- Lucide Icons
- html2canvas（PNG 导出）
- gif.js（GIF 动态导出）

## 快速开始

### 推荐启动方式（当前主线）

当前开发主线是 `frontend` + `backend-python`。根目录脚本已经默认启动 Python FastAPI 后端，前端开发服务器会把 `/api/*` 代理到 `http://localhost:8000`。

首次安装：

```bash
npm install
cd backend-python
python -m venv .venv
.venv/Scripts/python.exe -m pip install -e ".[dev]"
```

日常启动：

```bash
npm run dev
```

启动后：

- 前端：`http://localhost:5173`
- 后端：`http://localhost:8000`

### 单独启动后端

```bash
backend-python/.venv/Scripts/python.exe -m uvicorn src.main:app --app-dir backend-python --reload --port 8000
```

### 单独启动前端

```bash
cd frontend
npm install
npm run dev
```

### 常用验证命令

```bash
npm run type-check
npm run build:frontend
npm run build:backend
```

> 说明：`backend/` 里的 Cloudflare Workers 后端暂时保留为实验/历史方向；当前主开发入口以 `backend-python/` 为准。

### Mock 模式测试

所有功能均支持 Mock 模式运行，无需真实 API：
- Bangumi 数据为模拟的热门番剧
- 留言板数据存储在内存中
- LLM 为 Mock 模式，返回预设响应

## API 文档

前后端接口状态详见 `docs/api-contract.md`。当前主路径接口以 `backend-python` 为准，AI 生成走 Planner → Builder → Validator，保存/加载使用本地内存版 Pages API 支撑演示闭环。

### AI 生成主链路

当前生成主页不是让 LLM 直接写完整 JSON，而是：

1. Planner 理解用户意图、主题和组件方向。
2. Builder 调用本地工具生成合法页面配置。
3. Validator 校验结构、语义和布局，必要时进入修复。

这样既保留 AI 的理解能力，又避免复杂 JSON 随机出错。

### Agent Chat

```http
POST /api/agent/chat
Content-Type: application/json

{
  "message": "帮我生成一个樱花风的主页",
  "sessionId": "optional-session-id",
  "context": {
    "existingConfig": {...}
  }
}
```

### SSE 流式响应

```http
POST /api/agent/chat/stream
Content-Type: application/json

# 返回 SSE 事件流
event: workflow
data: {"type": "status", "message": "正在分析需求..."}

event: done
data: {"sessionId": "...", "response": "...", "currentConfig": {...}}
```

### Bangumi 导入

```http
GET /api/bangumi/import/my_username?limit=20

# 返回
{
  "username": "my_username",
  "items": [...],
  "total": 20,
  "source": "bangumi"
}
```

### 留言板操作

```http
# 添加留言
POST /api/guestbook/page_123/message
{
  "author": "访客小明",
  "content": "主页好可爱！",
  "avatar": "https://...",
  "isOwnerReply": false
}

# 获取留言
GET /api/guestbook/page_123/messages?limit=50

# 删除留言
DELETE /api/guestbook/page_123/message/msg_001
```

## 组件类型

当前支持的组件类型：

| 组件 | 类型 ID | 描述 |
|------|---------|------|
| 头部组件 | `hero-section` | 头像+名称+签名+属性 |
| 推し展示卡 | `oshi-card` | 展示推的角色 |
| 属性墙 | `attribute-wall` | MBTI/星座/血型等 |
| 标签组 | `tag-group` | 爱好标签展示 |
| 社交链接 | `social-links` | 社交平台链接 |
| 音乐播放器 | `music-player` | BGM 展示 |
| 友人帐 | `friends-list` | 朋友链接列表 |
| 特色引言 | `quote` | 座右铭/引言 |
| 书影音清单 | `media-list` | 推荐/收藏列表 |
| 谷子展示卡 | `merchandise-card` | 周边/谷子收藏 |
| 访客留言板 | `guestbook` | 留言互动 |
| 追番列表 | `watchlist` | Bangumi 追番状态 |
| 创作画廊 | `gallery` | 作品展示 |
| 成就徽章墙 | `achievement-badges` | 漫展/游戏成就 |
| 纪念日日历 | `memorial-calendar` | 重要日期 |
| CP 展示卡 | `cp-card` | 角色配对 |
| 书影音高级卡片 | `media-card` | 精美评分卡片 |
| 应援记录 | `support-record` | 漫展时间线 |

## 主题风格

支持的主题风格：

- `sakura` - 樱花风（粉色系）
- `lavender` - 薰衣草风（紫色系）
- `mint` - 薄荷风（绿色系）
- `cream` - 奶油风（黄色系）
- `night` - 夜空风（深蓝系）
- `pixel` - 像素风（复古游戏）
- `mono` - 极简风（黑白）
- `millennial` - 千禧风（粉蓝渐变）

## 开发指南

### 添加新组件

1. **后端**：在 `src/models/page.py` 中添加 `ComponentType` 枚举
2. **后端**：在 `src/tools/components.py` 中添加 Mock 数据
3. **前端**：在 `src/types/index.ts` 中添加类型定义
4. **前端**：创建对应的 React 组件
5. **前端**：在 `DraggableComponent.tsx` 中添加渲染逻辑

### 添加新工具

1. 在 `src/tools/` 中创建新的工具文件
2. 继承 `BaseTool` 类
3. 在 `src/tools/__init__.py` 中注册
4. 在 `src/main.py` 中添加 API 端点（如需要）

### Agent 扩展

Agent 系统支持扩展：
- Router Agent - 意图路由
- Design Agent - 新页面生成
- Modify Agent - 页面修改
- ProfileExtract Agent - 信息提取
- Validation Agent - 配置校验
- Chat Agent - 闲聊对话

## 许可证

MIT License
