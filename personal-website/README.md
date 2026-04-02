# 老徐个人网站

> AI 产品经理个人网站 - 用 AI 重新定义产品工作方式

## 🚀 技术栈

- **框架**: React 18 + TypeScript
- **构建工具**: Vite 5
- **样式**: Tailwind CSS 3 + Framer Motion
- **路由**: React Router v6
- **状态管理**: Zustand
- **图表**: Recharts
- **图标**: Lucide React
- **代码高亮**: Prism.js
- **Markdown**: react-markdown + remark-gfm

## 🎨 设计风格

- **参考**: Linear、Vercel Dashboard、Raycast
- **主题**: 暗黑模式为主，工业级设计
- **动画**: Framer Motion 微交互
- **响应式**: 移动端优先

## 📦 安装

```bash
npm install
```

## 🔧 开发

```bash
npm run dev
```

## 🏗️ 构建

```bash
npm run build
```

## 📄 页面

| 页面 | 路由 | 描述 |
|------|------|------|
| 首页 | `/` | Hero + 统计 + 能力 + 项目 |
| 关于 | `/about` | 个人信息 + 时间轴 + 价值观 |
| 简历 | `/resume` | 工作经历 + 项目 + 教育 + 技能雷达 |
| AI 知识 | `/knowledge` | LLM + RAG + Agent 知识图谱 |
| AI 协同 | `/copilot` | 工作流 + 提效案例 |
| Vibe Coding | `/vibe-coding` | AI 编程工具展示 |
| 项目 | `/projects` | 项目列表 + 搜索筛选 |
| 项目详情 | `/projects/:id` | 单个项目详情 |
| 提示词 | `/prompts` | 提示词模板库 |
| 联系 | `/contact` | 联系表单 + 社交链接 |

## 🗂️ 目录结构

```
src/
├── components/          # 组件
│   ├── common/         # 通用组件
│   ├── home/           # 首页组件
│   ├── about/          # 关于页组件
│   ├── resume/         # 简历页组件
│   ├── knowledge/      # 知识页组件
│   ├── copilot/        # 协同页组件
│   ├── projects/       # 项目页组件
│   ├── prompts/        # 提示词页组件
│   └── contact/        # 联系页组件
├── pages/              # 页面
├── hooks/              # 自定义 Hooks
├── data/               # 静态数据 JSON
└── index.css           # 全局样式
```

## 🔗 部署

本项目配置了 Vercel 自动部署：

```bash
# 部署到 Vercel
vercel
```

## 📝 数据更新

所有数据在 `src/data/` 目录下的 JSON 文件中：

- `profile.json` - 个人信息
- `experience.json` - 工作经历
- `projects.json` - 项目数据
- `skills.json` - 技能数据
- `knowledge.json` - AI 知识体系
- `prompts.json` - 提示词模板
- `copilot.json` - AI 协同案例

## 🎯 特性

- ✅ 工业级 UI 设计
- ✅ 流畅的动画效果
- ✅ 完全响应式
- ✅ 暗黑模式
- ✅ 性能优化（代码分割、懒加载）
- ✅ SEO 友好
- ✅ 无障碍访问

## 📜 License

MIT

---

Made with ❤️ using AI (OpenClaw + Claude)