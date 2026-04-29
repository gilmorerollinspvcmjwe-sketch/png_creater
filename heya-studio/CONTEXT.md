# Heya Studio 当前上下文

更新时间：2026-04-29

## 当前正在做什么

项目处在“主线收口执行”阶段。当前正在执行 `stabilize-local-mainline` 任务包：统一本地开发入口、对齐前后端核心 API、隐藏或 mock 未接通能力，并跑通验证。

## 当前状态

- 前端 `frontend` 可以通过类型检查和生产构建。
- Python 后端 `backend-python` 测试通过，当前是更稳定的 Agent 主线。
- TypeScript / Cloudflare Workers 后端 `backend` 类型检查未通过，暂时不适合作为主开发入口。
- 根目录脚本已调整为默认使用 `backend-python`；`backend/` Cloudflare Workers 后端暂时保留为实验/历史实现。
- 前端代理和 README 都以 `http://localhost:8000` 的 Python FastAPI 后端为准。
- 已新增 `docs/api-contract.md` 记录前后端接口状态。
- Python 后端为前端保存/加载补了本地内存版 Pages API，适合本地闭环演示，不代表正式云端持久化。

## 关键判断

- 产品方向是对的：二次元主页 + AI 对话生成 + 可视化编辑 + 分享导出，有明确差异化。
- 工程方向需要收口：优先统一到 `backend-python`，不要同时维护两套后端主线。
- AI 架构建议走“LLM 负责理解和规划，工具负责生成配置，校验器负责兜底”，不要让 LLM 一次性直接生成完整复杂 JSON。

## AI 架构方向补充

不建议把核心生成链路做成“纯 LLM 直接生成完整 JSON”。原因是主页配置 JSON 层级深、字段多、组件属性复杂，LLM 一次性输出完整结构时容易出现字段缺失、类型不对、组件不合法、布局坐标不合理等问题，后续修复成本高，也难以稳定复现。

更稳的方向是把 LLM 放在“理解和规划”层：

1. **LLM 理解用户意图**：识别用户想要新建、修改、闲聊，提取 MBTI、推、风格、组件偏好等信息。
2. **LLM 输出高层计划**：决定主题方向、组件组合、内容重点、布局策略，而不是直接写完整最终 JSON。
3. **工具生成配置**：由本地工具根据组件 schema、主题表、布局规则生成合法配置。
4. **校验器兜底**：用 schema 校验、语义校验、布局校验和自修复流程保证配置能被前端稳定渲染。
5. **必要时再让 LLM 参与修正**：LLM 根据校验错误给出修改计划，仍由工具执行具体改动。

这个方向能兼顾创造力和稳定性：LLM 负责“想清楚做什么”，工具负责“稳定地做出来”。

## 近期优先级

1. 跑完本轮验证：前端类型检查、前端构建、Python 后端测试、根目录后端验证脚本。
2. 下一轮进入 AI 主链路收口：把生成路径稳定为 Planner → Builder → Validator。
3. 暂停继续堆新组件，先打通“对话生成 → 预览 → 修改 → 导出/分享”的完整闭环。
4. 正式保存、上传、分享链接、账号系统延后到部署阶段，不在当前主路径里展开。

## 最近验证结果

- `npm --prefix frontend run type-check`：通过。
- `npm --prefix frontend run build`：通过。
- `backend-python/.venv/Scripts/python.exe -m pytest backend-python/tests -q`：106 个测试通过，2 个 FastAPI 旧写法警告。
- `npm run type-check`：通过。
- `npm run build:frontend`：通过。
- `npm run build:backend`：通过，109 个测试通过，2 个 FastAPI 旧写法警告。
- Python API smoke：`/api/templates`、`/api/templates/search`、`/api/pages` 创建/列表/更新、`/api/feedback` 通过。
- `npm --prefix backend run typecheck`：失败，主要是 TS 类型、Hono context 类型、工具 schema 类型不一致等问题。
- `npm --prefix frontend run lint`：失败，原因是缺少 ESLint 配置。
