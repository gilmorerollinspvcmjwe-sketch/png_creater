# Heya Studio 当前上下文

更新时间：2026-04-29

## 当前正在做什么

项目处在“AI 主链路收口”阶段。本轮已经把主生成路径切到 Planner → Builder → Validator：LLM 负责理解和规划，Builder 工具生成合法配置，Validator 做结构、语义和布局兜底。

## 当前状态

- 前端 `frontend` 可以通过类型检查和生产构建。
- Python 后端 `backend-python` 是当前主线，根目录脚本默认使用它。
- `backend/` Cloudflare Workers 后端暂时保留为实验/历史实现，不作为默认入口。
- 主 API `/api/agent/chat` 的生成工作流已不再提示或执行“LLM 直接生成完整配置”，而是走稳定链路。
- Python 后端为前端保存/加载补了本地内存版 Pages API，适合本地闭环演示，不代表正式云端持久化。

## 关键判断

- 产品方向是对的：二次元主页 + AI 对话生成 + 可视化编辑 + 分享导出，有明确差异化。
- 工程方向继续收口到 `backend-python`，不要同时维护两套后端主线。
- AI 架构坚持“Planner 理解规划、Builder 工具生成、Validator 校验兜底”，不要让 LLM 一次性直接产出复杂最终 JSON。

## 本轮完成

- `DesignAgent` V2 生成路径返回 plan、validation 和 `pipeline=planner_builder_validator`。
- FastAPI 主工作流 `_run_design_agent_with_workflow` 改为调用稳定生成链路，并展示 Planner / Builder / Validator 进度。
- 默认 Agent 初始化启用 V2 主链路。
- 新增回归测试，防止主路径退回“LLM 直接生成完整 JSON”。
- `ARCHITECTURE.md` 新增当前模块职责和主链路说明。

## 近期优先级

1. 继续打通“生成 → 修改 → 预览 → 导出/分享”的最小产品闭环。
2. 修改能力优先支持换主题、加组件、删组件、改文字。
3. 前端体验收口：突出 AI 输入框、画布和可理解的工作流状态。
4. 正式保存、上传、分享链接、账号系统延后到部署阶段。

## 最近验证结果

- 新增主链路测试：2 个通过。
- Python 后端全量测试：111 个通过，2 个 FastAPI 旧写法警告。
- `/api/agent/chat` smoke：HTTP 200，返回 `planner_builder_validator`，5 个组件，workflow 包含 Planner / Builder / Validator，且不再出现“调用 LLM 生成完整配置”。
- `npm run type-check`：通过。
- `npm run build:frontend`：通过。
- `npm run build:backend`：通过，111 个测试通过，2 个 FastAPI 旧写法警告。
- 已知问题：`npm --prefix frontend run lint` 仍因缺少 ESLint 配置不可用；TS Workers 后端 typecheck 仍不是当前主线。
