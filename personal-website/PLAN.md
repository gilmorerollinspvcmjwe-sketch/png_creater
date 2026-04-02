# 老徐个人网站项目规划

> 项目：AI 产品经理个人网站  
> 目标用户：老徐（AI 语音机器人产品经理）  
> 创建日期：2026-04-01  
> 技术栈：Vite + React + Tailwind CSS + Framer Motion

---

## 一、项目概述

### 1.1 核心定位

> **"我不是在展示简历，我是在展示 AI 时代的产品思维和工作方式。"**

本网站定位为一个「AI 产品」本身：
- 用 AI 工具搭建
- 展示 AI 能力
- 体现 AI 协同工作流

### 1.2 三大差异化锚点

| 差异化维度 | 传统简历 | 本网站 |
|-----------|---------|--------|
| **内容形式** | 静态文字描述 | 可交互的产品演示、技术架构图、动态工作流 |
| **能力证明** | "熟悉 AI" | **实际开发了 AI 应用** + AI 辅助开发本身 |
| **可信度** | 自述 | 可点击体验、可下载源码、可观看演示 |

### 1.3 目标访客

| 访客类型 | 关注重点 | 核心页面 |
|---------|---------|---------|
| **HR** | 快速了解背景、匹配度 | Home → Resume → Contact |
| **技术面试官** | 验证 AI 理解深度 | AI Knowledge → Projects → Vibe Coding |
| **产品总监** | 产品思维、项目成果 | Projects → AI Copilot → Resume |

---

## 二、技术架构

### 2.1 技术栈确认

```
┌─────────────────────────────────────────────────────────┐
│                    前端技术栈                            │
├─────────────────────────────────────────────────────────┤
│ 框架      : React 18+                                   │
│ 构建工具  : Vite 5.x                                    │
│ 样式方案  : Tailwind CSS 3.x                            │
│ 动画库    : Framer Motion                               │
│ 路由      : React Router v6                             │
│ 状态管理  : Zustand (轻量级)                            │
│ 图表      : Recharts / 雷达图用 Chart.js                │
│ 图标      : Lucide React / Heroicons                    │
│ 代码高亮  : Prism.js / Shiki                            │
│ Markdown : react-markdown + remark-gfm                  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                    数据层                                │
├─────────────────────────────────────────────────────────┤
│ 静态数据  : JSON 文件 (无需后端)                         │
│ 图片资源  : /public/assets/                              │
│ 表单处理  : Formspree / EmailJS                          │
│ 访问统计  : Vercel Analytics / Google Analytics          │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                    部署方案                              │
├─────────────────────────────────────────────────────────┤
│ 托管平台  : Vercel                                       │
│ 域名      : 待定 (推荐 .com 或 .dev)                     │
│ CDN       : Vercel 内置全球 CDN                         │
│ SSL       : Vercel 自动配置                              │
│ 预览部署  : 每个分支自动生成预览链接                     │
└─────────────────────────────────────────────────────────┘
```

### 2.2 技术选型理由

| 技术 | 选型理由 |
|------|---------|
| **Vite** | 极速 HMR，开发体验好；与现有项目技术栈一致 |
| **React** | 组件化开发，生态成熟，面试官认可度高 |
| **Tailwind** | 快速开发，原子化 CSS，响应式友好 |
| **Framer Motion** | 流畅动画，增强用户体验，体现前端能力 |
| **Zustand** | 轻量状态管理，无需复杂配置 |
| **JSON 数据** | 无后端成本，易于维护，静态部署友好 |

---

## 三、项目目录结构

```
personal-website/
├── public/
│   ├── favicon.ico
│   ├── og-image.png                    # 社交分享图
│   └── assets/
│       ├── images/
│       │   ├── avatar.jpg              # 个人头像
│       │   ├── projects/               # 项目截图
│       │   │   ├── ai-voice-bot.png
│       │   │   ├── voice-vault.png
│       │   │   ├── rag-saas.png
│       │   │   └── ...
│       │   └── diagrams/               # 技术架构图
│       │       ├── rag-architecture.svg
│       │       ├── agent-patterns.svg
│       │       └── ...
│       └── fonts/                      # 自定义字体（可选）
│
├── src/
│   ├── main.jsx                        # 入口文件
│   ├── App.jsx                         # 根组件
│   ├── index.css                       # 全局样式
│   │
│   ├── components/
│   │   ├── common/                     # 通用组件
│   │   │   ├── Button.jsx
│   │   │   ├── Card.jsx
│   │   │   ├── Badge.jsx
│   │   │   ├── Tag.jsx
│   │   │   ├── Section.jsx
│   │   │   ├── AnimatedSection.jsx
│   │   │   └── Navbar.jsx
│   │   │   └── Footer.jsx
│   │   │
│   │   ├── home/                      # 首页组件
│   │   │   ├── HeroSection.jsx
│   │   │   ├── StatsSection.jsx
│   │   │   ├── HighlightsSection.jsx
│   │   │   └── FeaturedProjects.jsx
│   │   │
│   │   ├── about/                     # About 页面组件
│   │   │   ├── ProfileCard.jsx
│   │   │   ├── Timeline.jsx
│   │   │   └── ValueProposition.jsx
│   │   │
│   │   ├── resume/                    # Resume 页面组件
│   │   │   ├── WorkExperience.jsx
│   │   │   ├── ProjectCards.jsx
│   │   │   ├── Education.jsx
│   │   │   └── SkillsRadar.jsx
│   │   │
│   │   ├── knowledge/                 # AI Knowledge 组件
│   │   │   ├── ConceptCard.jsx
│   │   │   ├── DiagramViewer.jsx
│   │   │   ├── LLMExplainer.jsx
│   │   │   ├── RAGArchitecture.jsx
│   │   │   └── AgentPatterns.jsx
│   │   │
│   │   ├── copilot/                   # AI Copilot 组件
│   │   │   ├── WorkflowDiagram.jsx
│   │   │   ├── CaseStudy.jsx
│   │   │   └── EfficiencyStats.jsx
│   │   │
│   │   ├── projects/                  # Projects 组件
│   │   │   ├── ProjectGrid.jsx
│   │   │   ├── ProjectCard.jsx
│   │   │   ├── ProjectDetail.jsx
│   │   │   └── TechStackBadges.jsx
│   │   │
│   │   ├── prompts/                   # Prompts 组件
│   │   │   ├── PromptCard.jsx
│   │   │   └── CodeBlock.jsx
│   │   │
│   │   └── contact/                   # Contact 组件
│   │       ├── ContactForm.jsx
│   │       └── SocialLinks.jsx
│   │
│   ├── pages/
│   │   ├── Home.jsx
│   │   ├── About.jsx
│   │   ├── Resume.jsx
│   │   ├── AIKnowledge.jsx
│   │   ├── AICopilot.jsx
│   │   ├── VibeCoding.jsx
│   │   ├── Projects.jsx
│   │   ├── ProjectDetail.jsx
│   │   ├── Prompts.jsx
│   │   └── Contact.jsx
│   │
│   ├── hooks/                         # 自定义 Hooks
│   │   ├── useScrollAnimation.js
│   │   ├── useTypewriter.js
│   │   └── useCountUp.js
│   │
│   ├── data/                          # 静态数据
│   │   ├── profile.json               # 个人信息
│   │   ├── projects.json              # 项目数据
│   │   ├── experience.json           # 工作经历
│   │   ├── skills.json                # 技能数据
│   │   ├── knowledge.json             # AI 知识体系
│   │   ├── prompts.json               # 提示词模板
│   │   └── copilot.json               # AI Copilot 案例数据
│   │
│   ├── utils/                         # 工具函数
│   │   ├── animations.js              # 动画配置
│   │   ├── helpers.js                 # 辅助函数
│   │   └── constants.js               # 常量定义
│   │
│   └── styles/                        # 样式文件
│       └── animations.css
│
├── index.html
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── package.json
├── README.md
└── PLAN.md                           # 本规划文档
```

---

## 四、页面清单与路由设计

### 4.1 路由结构

```javascript
// 路由配置
const routes = [
  { path: '/',           element: <Home />,         title: '首页' },
  { path: '/about',      element: <About />,        title: '关于我' },
  { path: '/resume',     element: <Resume />,       title: '简历' },
  { path: '/knowledge',  element: <AIKnowledge />,  title: 'AI 知识体系' },
  { path: '/copilot',    element: <AICopilot />,    title: 'AI 协同办公' },
  { path: '/vibe-coding',element: <VibeCoding />,   title: 'Vibe Coding' },
  { path: '/projects',   element: <Projects />,    title: '项目作品' },
  { path: '/projects/:id',element: <ProjectDetail />, title: '项目详情' },
  { path: '/prompts',    element: <Prompts />,      title: '提示词库' },
  { path: '/contact',    element: <Contact />,      title: '联系方式' },
];
```

### 4.2 页面详情

| 页面 | 路由 | 核心模块 | 目标访客 |
|------|------|---------|---------|
| **Home** | `/` | Hero、核心能力、数据统计、精选项目 | 所有访客 |
| **About** | `/about` | 个人信息、职业时间轴、价值观、社交链接 | HR/面试官 |
| **Resume** | `/resume` | 工作经历（Tab1）、项目经历（Tab2）、教育（Tab3）、技能雷达（Tab4）| HR/技术面试官 |
| **AI Knowledge** | `/knowledge` | LLM图解、RAG架构、Agent模式、行业趋势 | 技术面试官 |
| **AI Copilot** | `/copilot` | 工作流、多Agent协作、提效案例 | 产品总监 |
| **Vibe Coding** | `/vibe-coding` | 工具能力、实战案例、代码演示 | 技术面试官 |
| **Projects** | `/projects` | 项目卡片网格、筛选、搜索 | 产品总监/技术面试官 |
| **Project Detail** | `/projects/:id` | 项目详情、技术架构、决策点、源码链接 | 深度了解 |
| **Prompts** | `/prompts` | 模板分类、代码展示、复制功能 | 面试官 |
| **Contact** | `/contact` | 联系表单、社交链接、预约入口 | 所有访客 |

---

## 五、核心组件清单

### 5.1 通用组件

| 组件名 | 用途 | Props |
|--------|------|-------|
| `Button` | 统一按钮样式 | `variant`, `size`, `children`, `onClick` |
| `Card` | 卡片容器 | `className`, `children`, `hover` |
| `Badge` | 技术标签 | `text`, `color`, `icon` |
| `Tag` | 小标签 | `text`, `type` |
| `Section` | 页面区块 | `title`, `subtitle`, `children` |
| `AnimatedSection` | 滚动动画容器 | `animation`, `delay`, `children` |
| `Navbar` | 导航栏 | - |
| `Footer` | 页脚 | - |

### 5.2 业务组件

| 组件名 | 所属页面 | 用途 |
|--------|---------|------|
| `HeroSection` | Home | 首页英雄区（打字机效果） |
| `StatsSection` | Home | 数据统计滚动动画 |
| `HighlightsSection` | Home | 核心能力亮点卡片 |
| `FeaturedProjects` | Home | 精选项目展示 |
| `ProfileCard` | About | 个人信息卡片 |
| `Timeline` | About/Resume | 时间轴组件 |
| `ValueProposition` | About | 价值观展示 |
| `WorkExperience` | Resume | 工作经历列表 |
| `ProjectCards` | Resume | 项目卡片网格 |
| `SkillsRadar` | Resume | 技能雷达图 |
| `ConceptCard` | Knowledge | AI概念卡片 |
| `DiagramViewer` | Knowledge | 架构图查看器 |
| `WorkflowDiagram` | Copilot | 工作流图 |
| `CaseStudy` | Copilot | 提效案例卡片 |
| `ProjectGrid` | Projects | 项目网格布局 |
| `ProjectCard` | Projects | 单个项目卡片 |
| `TechStackBadges` | Projects | 技术栈标签组 |
| `PromptCard` | Prompts | 提示词模板卡片 |
| `CodeBlock` | Prompts | 代码块（支持复制） |
| `ContactForm` | Contact | 联系表单 |
| `SocialLinks` | Contact | 社交链接 |

### 5.3 自定义 Hooks

| Hook | 用途 |
|------|------|
| `useScrollAnimation` | 滚动触发动画 |
| `useTypewriter` | 打字机效果 |
| `useCountUp` | 数字滚动动画 |
| `useInView` | 元素可见性检测 |

---

## 六、数据模型设计

### 6.1 个人信息 (profile.json)

```json
{
  "name": "老徐",
  "title": "AI 语音机器人产品经理",
  "tagline": "用 AI 重新定义产品工作方式",
  "avatar": "/assets/images/avatar.jpg",
  "location": "中国",
  "email": "your.email@example.com",
  "phone": "+86 xxx xxxx xxxx",
  "social": {
    "github": "https://github.com/yourusername",
    "linkedin": "https://linkedin.com/in/yourusername",
    "blog": "https://yourblog.com"
  },
  "bio": {
    "short": "3 行简短自我介绍...",
    "full": "详细自我介绍..."
  },
  "stats": {
    "projects": 8,
    "codeLines": 50000,
    "efficiencyGain": "300%"
  },
  "coreSkills": ["LLM", "TTS", "ASR", "RAG", "Agent"],
  "values": [
    "用 AI 提升效率，不是替代思考",
    "产品思维 + 技术理解的跨界能力",
    "从 0 到 1 的完整产品落地经验"
  ]
}
```

### 6.2 工作经历 (experience.json)

```json
{
  "work": [
    {
      "id": "exp-1",
      "company": "某科技公司",
      "role": "AI 产品经理",
      "period": "2023.06 - 至今",
      "location": "北京",
      "highlights": [
        "主导 AI 语音机器人 0→1 产品设计",
        "覆盖 10万+ 用户，日均 5万+ 分钟通话",
        "搭建 LLM/TTS/ASR 三大模块配置平台"
      ],
      "team": 15,
      "tech": ["LLM", "TTS", "ASR", "RAG"]
    }
  ],
  "education": [
    {
      "school": "某大学",
      "major": "计算机科学与技术",
      "degree": "本科",
      "period": "2015 - 2019"
    }
  ]
}
```

### 6.3 项目数据 (projects.json)

```json
{
  "projects": [
    {
      "id": "ai-voice-bot",
      "name": "智呼语音机器人",
      "shortDesc": "LLM + TTS + ASR 全链路配置平台",
      "fullDesc": "详细描述...",
      "role": "产品经理 / 架构设计",
      "status": "production",
      "highlight": true,
      "tech": ["React", "TypeScript", "Gemini API", "TTS", "ASR"],
      "tags": ["LLM", "语音AI", "RAG"],
      "metrics": {
        "users": "10万+",
        "dailyCalls": "5万+分钟"
      },
      "features": [
        "可视化语音流程配置",
        "多模型对比测试",
        "实时通话监控"
      ],
      "decisions": [
        "选择 Gemini 作为主模型，平衡成本与效果",
        "ASR 采用实时流式识别，降低延迟",
        "RAG 知识库按场景隔离，提高召回精度"
      ],
      "screenshots": ["/assets/images/projects/ai-voice-bot.png"],
      "github": "https://github.com/xxx/ai-voice-bot",
      "demo": "https://demo.example.com"
    }
  ]
}
```

### 6.4 技能数据 (skills.json)

```json
{
  "categories": [
    {
      "name": "产品设计",
      "level": 95,
      "skills": ["需求分析", "产品规划", "用户研究", "数据驱动"]
    },
    {
      "name": "AI 技术",
      "level": 85,
      "skills": ["LLM", "RAG", "Prompt Engineering", "Agent 设计"]
    },
    {
      "name": "数据分析",
      "level": 80,
      "skills": ["SQL", "Python", "指标体系", "A/B 测试"]
    },
    {
      "name": "项目管理",
      "level": 90,
      "skills": ["敏捷开发", "OKR", "跨部门协作"]
    },
    {
      "name": "工具使用",
      "level": 95,
      "skills": ["OpenClaw", "Cursor", "Figma", "Notion"]
    },
    {
      "name": "沟通协作",
      "level": 90,
      "skills": ["技术方案评审", "需求宣讲", "跨团队协作"]
    }
  ],
  "tools": [
    { "name": "OpenClaw", "proficiency": 5, "category": "AI Coding" },
    { "name": "Cursor", "proficiency": 4, "category": "AI Coding" },
    { "name": "Gemini", "proficiency": 4, "category": "LLM" },
    { "name": "Claude", "proficiency": 4, "category": "LLM" }
  ]
}
```

### 6.5 AI 知识体系 (knowledge.json)

```json
{
  "sections": [
    {
      "id": "llm-basics",
      "title": "LLM 基础概念",
      "icon": "Brain",
      "concepts": [
        {
          "name": "Transformer",
          "definition": "基于自注意力机制的神经网络架构",
          "diagram": "/assets/images/diagrams/transformer.svg",
          "application": "GPT、Claude 等 LLM 的基础架构",
          "interviewQuestion": "Transformer 相比 RNN 的优势是什么？"
        }
      ]
    },
    {
      "id": "rag",
      "title": "RAG 技术架构",
      "icon": "Database",
      "concepts": [...]
    },
    {
      "id": "agent",
      "title": "Agent 设计模式",
      "icon": "Bot",
      "concepts": [...]
    }
  ]
}
```

### 6.6 提示词模板 (prompts.json)

```json
{
  "categories": [
    {
      "id": "prd",
      "name": "PRD 写作",
      "templates": [
        {
          "id": "prd-feature",
          "name": "功能需求 PRD 模板",
          "scenario": "新功能需求文档撰写",
          "prompt": "## 角色\n你是一位资深产品经理...\n\n## 任务\n...",
          "usage": "适用于新功能从 0 到 1 的需求文档撰写"
        }
      ]
    }
  ]
}
```

### 6.7 AI Copilot 案例 (copilot.json)

```json
{
  "workflow": {
    "morning": ["检查邮件", "日报生成", "任务排序"],
    "afternoon": ["需求分析", "文档撰写", "代码审查"],
    "evening": ["总结复盘", "计划调整"]
  },
  "cases": [
    {
      "id": "case-1",
      "title": "月度报告自动化",
      "pain": "手动整理数据，耗时 3 小时",
      "solution": "OpenClaw 自动抓取 + 分析 + 生成报告",
      "result": "30 分钟完成，质量更高",
      "improvement": "6倍提效",
      "reusable": true
    }
  ]
}
```

---

## 七、开发阶段划分

### 7.1 阶段概览

```
┌─────────────────────────────────────────────────────────────────┐
│  Phase 1: MVP (2-3周)                                            │
│  目标: 上线可用的展示网站，替代传统简历                              │
│  ───────────────────────────────────────────────────────────────│
│  ✓ 基础框架搭建        ✓ 首页 + About      ✓ Resume 基础版        │
│  ✓ Projects 列表       ✓ Contact           ✓ 移动端适配           │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Phase 2: 丰富内容 (2-3周)                                       │
│  目标: 补充 AI 知识体系和提效案例                                   │
│  ───────────────────────────────────────────────────────────────│
│  ✓ AI Knowledge 页面   ✓ AI Copilot 页面    ✓ Vibe Coding 页面   │
│  ✓ Prompts 模板库      ✓ 全部项目详情页                           │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Phase 3: 打磨迭代 (持续)                                        │
│  目标: 优化体验，增加流量，持续更新                                 │
│  ───────────────────────────────────────────────────────────────│
│  ✓ 动画效果增强        ✓ SEO 优化           ✓ 流量分析            │
│  ✓ 博客模块(可选)      ✓ 多语言版本(可选)                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 八、详细任务清单

### Phase 1: MVP（预计 2-3 周）

#### Week 1: 基础搭建 + 核心页面

| 任务 | 预估时间 | 优先级 | 依赖 |
|------|---------|--------|------|
| 初始化 Vite + React 项目 | 2h | P0 | - |
| 配置 Tailwind CSS | 1h | P0 | - |
| 配置 Framer Motion | 1h | P0 | - |
| 创建目录结构 | 1h | P0 | - |
| 创建通用组件 (Button, Card, Badge 等) | 4h | P0 | - |
| 创建 Navbar 组件 | 2h | P0 | - |
| 创建 Footer 组件 | 1h | P0 | - |
| 配置 React Router | 1h | P0 | - |
| **首页 (Home)** | **16h** | **P0** | |
| - HeroSection 组件 | 4h | P0 | 通用组件 |
| - StatsSection 组件 | 3h | P0 | useCountUp |
| - HighlightsSection 组件 | 4h | P0 | 通用组件 |
| - FeaturedProjects 组件 | 4h | P0 | ProjectCard |
| - 打字机效果 Hook | 1h | P0 | - |

#### Week 2: About + Resume + Projects

| 任务 | 预估时间 | 优先级 | 依赖 |
|------|---------|--------|------|
| **About 页面** | **8h** | **P0** | |
| - ProfileCard 组件 | 2h | P0 | - |
| - Timeline 组件 | 3h | P0 | - |
| - ValueProposition 组件 | 2h | P0 | - |
| - 社交链接 | 1h | P0 | - |
| **Resume 页面** | **12h** | **P0** | |
| - Tab 切换逻辑 | 2h | P0 | - |
| - WorkExperience 组件 | 3h | P0 | Timeline |
| - ProjectCards 组件 | 3h | P0 | Card |
| - Education 组件 | 2h | P0 | - |
| - SkillsRadar 组件 | 2h | P0 | Chart.js |
| **Projects 页面** | **8h** | **P0** | |
| - ProjectGrid 组件 | 2h | P0 | - |
| - ProjectCard 组件 | 2h | P0 | Badge |
| - 筛选/搜索功能 | 4h | P1 | - |

#### Week 3: Contact + 项目详情 + 部署

| 任务 | 预估时间 | 优先级 | 依赖 |
|------|---------|--------|------|
| **Contact 页面** | **4h** | **P1** | |
| - ContactForm 组件 | 2h | P1 | - |
| - SocialLinks 组件 | 1h | P1 | - |
| - 表单集成 (Formspree) | 1h | P1 | - |
| **ProjectDetail 页面** | **6h** | **P0** | |
| - 项目详情布局 | 3h | P0 | - |
| - 技术架构图展示 | 2h | P1 | DiagramViewer |
| - GitHub/Demo 链接 | 1h | P0 | - |
| **数据文件** | **8h** | **P0** | |
| - profile.json | 1h | P0 | - |
| - experience.json | 2h | P0 | - |
| - projects.json | 3h | P0 | - |
| - skills.json | 1h | P0 | - |
| - 图片资源整理 | 1h | P0 | - |
| **部署** | **4h** | **P0** | |
| - 域名购买 | 1h | P0 | - |
| - Vercel 配置 | 1h | P0 | - |
| - DNS 解析 | 1h | P0 | - |
| - 测试上线 | 1h | P0 | - |
| **移动端适配** | **8h** | **P1** | |
| - 响应式布局检查 | 4h | P1 | - |
| - 移动端导航优化 | 2h | P1 | - |
| - 触摸交互优化 | 2h | P1 | - |

### Phase 2: 丰富内容（预计 2-3 周）

#### Week 4-5: AI 知识体系 + AI Copilot

| 任务 | 预估时间 | 优先级 | 依赖 |
|------|---------|--------|------|
| **AI Knowledge 页面** | **20h** | **P0** | |
| - 页面布局设计 | 2h | P0 | - |
| - ConceptCard 组件 | 4h | P0 | - |
| - DiagramViewer 组件 | 4h | P0 | - |
| - LLM 基础概念内容 | 4h | P0 | - |
| - RAG 架构图解内容 | 3h | P0 | - |
| - Agent 设计模式内容 | 3h | P1 | - |
| **AI Copilot 页面** | **12h** | **P0** | |
| - WorkflowDiagram 组件 | 4h | P0 | - |
| - CaseStudy 组件 | 4h | P0 | - |
| - EfficiencyStats 组件 | 2h | P0 | - |
| - 案例内容撰写 | 2h | P0 | - |

#### Week 6: Vibe Coding + Prompts + 项目详情完善

| 任务 | 预估时间 | 优先级 | 依赖 |
|------|---------|--------|------|
| **Vibe Coding 页面** | **8h** | **P1** | |
| - 工具卡片展示 | 4h | P1 | - |
| - 代码片段演示 | 4h | P1 | Prism.js |
| **Prompts 页面** | **8h** | **P1** | |
| - PromptCard 组件 | 3h | P1 | - |
| - CodeBlock 组件 | 3h | P1 | - |
| - prompts.json 数据 | 2h | P1 | - |
| **项目详情完善** | **12h** | **P1** | |
| - 剩余项目详情页 | 8h | P1 | - |
| - 技术架构图补充 | 4h | P1 | - |

### Phase 3: 打磨迭代（持续）

| 任务 | 预估时间 | 优先级 | 说明 |
|------|---------|--------|------|
| 动画效果优化 | 8h | P2 | Framer Motion 细节打磨 |
| SEO 优化 | 4h | P1 | meta 标签、sitemap、og:image |
| 流量分析集成 | 2h | P1 | Vercel Analytics / GA |
| 性能优化 | 4h | P2 | 图片压缩、代码分割、懒加载 |
| 博客模块（可选）| 20h | P3 | 文章列表、详情、Markdown 渲染 |
| 多语言版本（可选）| 16h | P3 | i18n 配置、内容翻译 |

---

## 九、实施路线图

### 9.1 甘特图

```
Week   1   2   3   4   5   6   7   8
─────────────────────────────────────
Phase1 ███ ███ ███ ░░░ ░░░ ░░░ ░░░ ░░░
       ↑ 基础搭建 + 核心页面
       
Phase2 ░░░ ░░░ ░░░ ███ ███ ███ ░░░ ░░░
       ↑ AI Knowledge + Copilot + Prompts
       
Phase3 ░░░ ░░░ ░░░ ░░░ ░░░ ░░░ ███ ███
       ↑ 打磨迭代 + 持续优化
```

### 9.2 里程碑

| 里程碑 | 时间 | 交付物 |
|--------|------|--------|
| **M1: MVP 上线** | Week 3 | 可访问的网站，包含 Home/About/Resume/Projects/Contact |
| **M2: 内容完善** | Week 6 | AI Knowledge、Copilot、Prompts 全部上线 |
| **M3: 正式发布** | Week 8 | SEO 优化完成，性能优化完成，正式推广 |

---

## 十、技术实现要点

### 10.1 动画设计

```javascript
// 动画配置示例 (utils/animations.js)
export const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
};

export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  transition: { duration: 0.3 }
};
```

### 10.2 响应式断点

```javascript
// Tailwind 配置
module.exports = {
  theme: {
    screens: {
      'sm': '640px',   // 手机横屏
      'md': '768px',   // 平板
      'lg': '1024px',  // 笔记本
      'xl': '1280px',  // 桌面
      '2xl': '1536px', // 大屏
    }
  }
}
```

### 10.3 性能优化策略

| 策略 | 实现方式 |
|------|---------|
| **图片优化** | WebP 格式、懒加载、响应式图片 |
| **代码分割** | React.lazy + Suspense 路由级分割 |
| **字体优化** | 字体子集化、font-display: swap |
| **缓存策略** | 静态资源 Cache-Control |
| **预加载** | 关键资源 preload |

---

## 十一、待办事项清单

### 立即开始 (Week 1)

- [ ] 创建项目目录结构
- [ ] 初始化 Vite + React 项目
- [ ] 配置 Tailwind CSS + Framer Motion
- [ ] 创建通用组件库
- [ ] 实现 Navbar + Footer
- [ ] 完成首页 HeroSection
- [ ] 完成首页 StatsSection
- [ ] 完成首页 HighlightsSection

### Phase 1 核心 (Week 2-3)

- [ ] 完成 About 页面
- [ ] 完成 Resume 页面（4 个 Tab）
- [ ] 完成 Projects 列表页
- [ ] 完成 ProjectDetail 页面
- [ ] 完成 Contact 页面
- [ ] 准备所有数据 JSON 文件
- [ ] 购买域名
- [ ] Vercel 部署配置
- [ ] 移动端适配测试

### Phase 2 扩展 (Week 4-6)

- [ ] 完成 AI Knowledge 页面
- [ ] 完成 AI Copilot 页面
- [ ] 完成 Vibe Coding 页面
- [ ] 完成 Prompts 页面
- [ ] 完善所有项目详情页
- [ ] 补充技术架构图

### Phase 3 打磨 (Week 7+)

- [ ] 动画效果优化
- [ ] SEO 优化（meta、sitemap、og:image）
- [ ] 性能优化（图片、代码分割、懒加载）
- [ ] 流量分析集成
- [ ] 博客模块（可选）
- [ ] 多语言版本（可选）

---

## 十二、风险与应对

| 风险 | 影响 | 应对策略 |
|------|------|---------|
| 时间延误 | 上线推迟 | 优先完成 MVP，确保核心功能可用 |
| 内容不足 | 页面空洞 | 提前准备素材，分批填充 |
| 技术难点 | 开发阻塞 | 预留 buffer 时间，可简化复杂功能 |
| 域名问题 | 访问异常 | 提前购买，确认 DNS 配置 |

---

## 十三、后续迭代方向

1. **博客模块**：添加技术博客，分享 AI 产品思考
2. **多语言版本**：英文版简历，覆盖外资/海外岗位
3. **暗黑模式**：支持深色主题切换
4. **更多交互**：在线 Demo、代码 Playground
5. **内容持续更新**：新增项目、更新案例、补充知识图谱

---

_规划文档 v1.0 | 创建于 2026-04-01_