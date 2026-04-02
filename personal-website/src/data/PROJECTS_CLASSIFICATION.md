# 项目分类说明文档

_最后更新：2026-04-01_

## 分类逻辑

本项目分类系统基于**项目性质和用途**进行划分，共分为 5 个大类：

---

## 📊 分类概览

| 分类 ID | 分类名称 | 项目数量 | 说明 |
|--------|---------|---------|------|
| `work` | 主业产品 | 7 | 正式工作相关的产品项目 |
| `tools` | 提效工具 | 11 | 提升效率的工具、脚本、技能 |
| `games` | 游戏项目 | 10 | 游戏相关项目 |
| `learning` | 学习项目 | 6 | 学习实验性质的项目 |
| `skills` | OpenClaw 技能库 | 18 | 为 OpenClaw 开发的专业技能库 |

**总计：52 个项目**

---

## 详细分类说明

### 1. 主业产品 (`work`)

**定义**：与工作相关的正式产品，通常是 B 端企业级应用或 SaaS 产品。

**特征**：
- 有明确的商业价值或客户需求
- 通常涉及完整的产品设计流程
- 可能服务外部客户或内部业务
- 技术栈较为成熟稳定

**包含项目**：
- `AI-voice-bot` - 智呼语音机器人（LLM+TTS+ASR 全链路）
- `crm-frontend` - CRM 客户管理系统
- `hr-resume-screener` - HR 简历筛选系统
- `rag-saas-mvp` - 多模态 RAG SaaS 平台
- `voice-vault` - VoiceVault 通话分析平台
- `self-research-crm-demo` - Self Research CRM Demo
- `suitecrm-custom-frontend` - SuiteCRM 定制前端

**状态分布**：
- 进行中：2 个
- 已完成：3 个
- 维护中：2 个

---

### 2. 提效工具 (`tools`)

**定义**：提升个人或团队工作效率的工具、脚本、技能。

**特征**：
- 解决特定效率痛点
- 可以是 CLI 工具、GUI 应用或技能封装
- 通常有明确的使用场景
- 技术选型灵活多样

**包含项目**：
- `pm-superpowers-repo` - PM Superpowers（12 个产品经理 AI 技能包）
- `opencli-core` - OpenCLI（AI 驱动的命令行工具）
- `opencli-skill` - OpenCLI Skill（OpenCLI 的技能封装）
- `dashboard` - Agent 监控仪表板
- `openclaw-dashboard` - OpenClaw Dashboard
- `data-cleaner` - 数据清洗工具
- `data-cleaner-gui` - 数据清洗工具 GUI
- `supabase-tool` - Supabase 管理工具
- `compare-tool` - ExcelFarm 对比工具
- `llm-price-compare` - LLM 价格对比平台
- `skill-creator` - Skill Creator 技能创建工具

**状态分布**：
- 进行中：2 个
- 已完成：9 个

---

### 3. 游戏项目 (`games`)

**定义**：游戏相关项目，包括独立游戏、小游戏、游戏技能等。

**特征**：
- 以娱乐或创意表达为目的
- 可能融合 AI 技术
- 技术栈以游戏开发为主（Canvas、动画等）
- 部分项目有"摸鱼"属性（伪装成工作软件）

**包含项目**：
- `excel-farm` - Excel Farm（伪装成 Excel 的农场 RPG）
- `excel-aim-trainer` - Excel Aim Trainer（伪装成 Excel 的练枪游戏）
- `bole-game` - 伯乐 - 千里马寻踪（国风逻辑解谜）
- `z-survival` - Z-Survival 零日（AI 原生开放世界生存）
- `wechat-survival` - 微信生存游戏
- `infinite-combo-tower` - 无限连击塔
- `scrapyard` - SCRAPYARD 技能（AI Agent 对战）
- `game-cog` - Game Cog（游戏世界构建技能）
- `game-studio` - Game Studio（游戏开发工作室技能）
- `wangjing-game-team` - 王鲸 AI 游戏团队（28 个角色）

**状态分布**：
- 进行中：2 个
- 已完成：7 个
- 实验性：1 个

---

### 4. 学习项目 (`learning`)

**定义**：学习实验性质的项目，用于探索新技术、新框架或新概念。

**特征**：
- 以学习为目的
- 可能不完整或处于实验阶段
- 涉及前沿技术或框架
- 代码质量可能不如生产项目

**包含项目**：
- `agent-reach` - Agent Reach（AI Agent 互联网能力）
- `claude-code-research` - Claude Code 源码研究
- `agentscope` - AgentScope（多 Agent 协作框架）
- `OpenMAIC-analysis` - OpenMAIC 分析
- `virtual-engineering-team` - 虚拟工程团队
- `ai-journal` - AI Journal（AI 手账应用）

**状态分布**：
- 进行中：1 个
- 已完成：2 个
- 学习中：2 个
- 实验性：1 个

---

### 5. OpenClaw 技能库 (`skills`)

**定义**：为 OpenClaw 系统开发的专业技能库，覆盖多个领域。

**特征**：
- 遵循 OpenClaw AgentSkills 规范
- 有明确的触发条件和使用场景
- 通常是轻量级的技能封装
- 可以直接被 OpenClaw 调用

**包含项目**（按领域分类）：

**文档处理**：
- `minimax-docx` - DOCX 文档处理
- `minimax-pdf` - PDF 生成和编辑
- `minimax-xlsx` - Excel 电子表格处理
- `pptx-generator` - PPTX 演示文稿生成

**开发工具**：
- `code-review` - 代码审查
- `e2e-testing-patterns` - E2E 测试模式
- `test-master` - 测试大师
- `sw-frontend` - 前端开发专家
- `promptify` - 提示词优化
- `deploy-to-vercel` - Vercel 部署

**产品管理**：
- `product-manager` - 产品经理
- `pm-superpowers` - PM Superpowers（也在 tools 分类中）

**设计指南**：
- `vercel-composition-patterns` - React 组合模式
- `vercel-react-best-practices` - React 最佳实践
- `vercel-react-native-skills` - React Native 技能
- `web-design-guidelines` - Web 设计指南

**生活服务**：
- `memory-saver` - 记忆存储
- `news-digest` - 新闻摘要
- `travel` - 旅行管理

**游戏开发**：
- `game-cog` - Game Cog
- `game-studio` - Game Studio
- `wangjing-game-team` - 王鲸游戏团队
- `scrapyard` - SCRAPYARD

**状态分布**：
- 已完成：18 个

---

## 排除的项目

以下目录被排除在项目统计之外：

### 配置/系统目录
- `.agents` - OpenClaw 代理配置
- `.clawhub` - ClawHub 配置
- `.learnings` - 学习记录
- `.openclaw` - OpenClaw 系统文件
- `.trae` - Trae IDE 配置

### 数据/资源目录
- `analysis` - 分析数据
- `apps` - 应用资源
- `archives` - 归档文件
- `assets` - 静态资源
- `backend` - 后端代码（未独立成项目）
- `config` - 配置文件
- `data` - 数据文件
- `docs` - 文档
- `downloads` - 下载文件
- `html` - HTML 模板
- `memory` - 记忆文件
- `office` - 办公文档
- `packages` - 包文件
- `pdf_extract` - PDF 提取内容
- `pdf_extracts` - PDF 提取内容
- `reference` - 参考资料
- `scripts` - 脚本文件
- `sql` - SQL 文件
- `styles` - 样式文件

### 临时/废弃项目
- `crm-frontend-clean` - CRM 前端清理版本（重复）
- `excel-aim-trainer-original` - Excel Aim Trainer 原版（重复）
- `excel-repo` - Excel Farm 仓库（重复）
- `github-projects` - GitHub 项目列表（非实际项目）
- `product` - 产品文档（非实际项目）
- `projects` - 项目列表（非实际项目）
- `tts_test` - TTS 测试（临时测试）
- `voice-ai-voice-website` - Voice AI 网站（重复）
- `voice-ai-website` - Voice AI 网站（重复）

---

## 技术栈统计

### 前端框架
| 技术 | 使用次数 |
|------|---------|
| React | 35+ |
| TypeScript | 30+ |
| Vite | 20+ |
| Framer Motion | 8 |
| Ant Design | 5 |
| Tailwind CSS | 8 |

### 后端技术
| 技术 | 使用次数 |
|------|---------|
| Node.js | 15+ |
| Python | 10+ |
| FastAPI | 5 |
| Express | 5 |
| Supabase | 8 |

### AI/ML
| 技术 | 使用次数 |
|------|---------|
| Gemini API | 12 |
| OpenClaw Skills | 25+ |
| LlamaIndex | 2 |
| PaddleOCR | 2 |

---

## 项目状态分布

| 状态 | 数量 | 占比 |
|------|------|------|
| 已完成 | 32 | 61.5% |
| 进行中 | 12 | 23.1% |
| 维护中 | 3 | 5.8% |
| 学习中 | 2 | 3.8% |
| 实验性 | 3 | 5.8% |

---

## 更新说明

此分类文档应定期更新，建议：
1. 每月检查一次项目状态变化
2. 新增项目及时归类
3. 废弃项目移至 archives 或从统计中排除
4. 技术栈统计每季度更新一次

---

**生成工具**：OpenClaw Subagent (Coder-项目分类整理)
**生成时间**：2026-04-01 21:30 GMT+8
