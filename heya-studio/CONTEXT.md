# Heya Studio 当前上下文

更新时间：2026-04-28

## 当前正在做什么

项目处在“方向校准 + 工程收口”阶段。核心产品方向是二次元个人主页生成器：用户通过 AI 对话生成个人主页，再在前端画布里预览、编辑、导出和分享。

## 当前状态

- 前端 `frontend` 可以通过类型检查和生产构建。
- Python 后端 `backend-python` 测试通过，当前是更稳定的 Agent 主线。
- TypeScript / Cloudflare Workers 后端 `backend` 类型检查未通过，暂时不适合作为主开发入口。
- 根目录脚本仍然指向 `backend`，与 README 和前端代理指向的 Python 后端不一致。
- 项目之前还没有独立提交记录，本次准备把项目代码纳入 Git，但不提交本地依赖、构建产物和密钥文件。

## 关键判断

- 产品方向是对的：二次元主页 + AI 对话生成 + 可视化编辑 + 分享导出，有明确差异化。
- 工程方向需要收口：优先统一到 `backend-python`，不要同时维护两套后端主线。
- AI 架构建议走“LLM 负责理解和规划，工具负责生成配置，校验器负责兜底”，不要让 LLM 一次性直接生成完整复杂 JSON。

## 近期优先级

1. 统一根目录启动脚本，让本地开发默认启动 `frontend` + `backend-python`。
2. 对齐前端调用和 Python 后端接口，暂时隐藏尚未接通的保存、上传等功能。
3. 加强 Git 忽略规则，避免提交 `.env`、`.dev.vars`、`node_modules`、`dist`、`.venv` 等本地文件。
4. 暂停继续堆新组件，先打通“对话生成 → 预览 → 修改 → 导出/分享”的完整闭环。

## 最近验证结果

- `npm --prefix frontend run type-check`：通过。
- `npm --prefix frontend run build`：通过。
- `backend-python/.venv/Scripts/python.exe -m pytest backend-python/tests -q`：106 个测试通过，2 个 FastAPI 旧写法警告。
- `npm --prefix backend run typecheck`：失败，主要是 TS 类型、Hono context 类型、工具 schema 类型不一致等问题。
- `npm --prefix frontend run lint`：失败，原因是缺少 ESLint 配置。

