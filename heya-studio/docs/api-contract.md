# Heya Studio 前后端 API 契约

更新时间：2026-04-29

## 当前主线

当前本地开发主线是：

- 前端：`frontend`，Vite，默认端口 `5173`
- 后端：`backend-python`，FastAPI，默认端口 `8000`
- 前端代理：`frontend/vite.config.ts` 将 `/api/*` 转发到 `http://localhost:8000`

`backend/` Cloudflare Workers 后端暂时保留为实验/历史实现，不作为默认本地入口。

## 核心闭环接口

这些接口属于当前 MVP 主路径，前端可以直接调用：

| 接口 | 状态 | 用途 |
| --- | --- | --- |
| `POST /api/agent/chat` | 已接通 | 普通 AI 对话生成/修改 |
| `POST /api/agent/chat/stream` | 已接通 | SSE 工作流进度 + 最终生成结果 |
| `GET /api/templates` | 已接通 | 模板列表 |
| `GET /api/templates/search` | 已接通 | 模板搜索 |
| `GET /api/templates/demos` | 已接通 | 内置 demo 列表 |
| `GET /api/templates/demos/{demo_id}` | 已接通 | 内置 demo 详情 |
| `POST /api/feedback` | 已接通 | 用户反馈 |
| `GET /api/feedback/{session_id}` | 已接通 | 会话反馈列表 |
| `DELETE /api/feedback/{session_id}` | 已接通 | 清除会话反馈 |
| `GET /api/interrupt/{session_id}` | 已接通 | 查询待确认中断 |
| `POST /api/interrupt/{session_id}/confirm` | 已接通 | 确认/拒绝中断 |
| `GET /api/interrupt/history/{session_id}` | 已接通 | 中断历史 |

## 本地保存接口

这些接口用于让前端“保存/加载”按钮不再打到缺失接口。当前实现是 Python 后端内存存储，适合本地闭环演示，不代表正式云端持久化。

| 接口 | 状态 | 用途 |
| --- | --- | --- |
| `POST /api/pages` | 本地 mock 已接通 | 创建页面 |
| `GET /api/pages` | 本地 mock 已接通 | 列出页面 |
| `GET /api/pages/{page_id}` | 本地 mock 已接通 | 获取页面 |
| `PUT /api/pages/{page_id}` | 本地 mock 已接通 | 更新页面 |
| `DELETE /api/pages/{page_id}` | 本地 mock 已接通 | 删除页面 |

限制：服务重启后内存页面会丢失。正式保存、分享链接、素材上传放到后续部署阶段处理。

## 暂不作为主路径的接口

| 能力 | 当前处理 |
| --- | --- |
| 文件上传 `/api/upload` | 前端服务层保留方法，但当前主界面不触发；后续接真实素材库时再接通 |
| TS Workers 后端接口 | 暂不作为主线，除非决定 Workers 是线上主后端 |
| 账号系统 / Supabase 持久化 | 延后到部署和真实分享阶段 |

## 约定

1. 新增前端调用前，先确认 Python 后端有对应接口或明确隐藏入口。
2. 主路径接口不能静默 404；未完成能力要给用户可理解提示。
3. AI 生成接口返回的 `currentConfig` 必须能被前端转换并渲染。
4. 页面配置生成不依赖 LLM 直接输出完整最终 JSON，而是走“LLM 规划 + 工具生成 + 校验器兜底”。
