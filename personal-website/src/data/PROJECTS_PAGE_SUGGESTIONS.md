# 个人主页 Projects 页面改造建议

_基于 2026-04-01 项目扫描结果_

---

## 📊 当前状态分析

### 现有数据结构
当前 `projects.json` 已更新为新的分类结构：
- **5 个分类**：主业产品、提效工具、游戏项目、学习项目、OpenClaw 技能库
- **52 个项目**：覆盖工作、工具、游戏、学习、技能多个领域
- **元数据**：包含生成时间、项目总数、分类数等信息

### 现有字段
```json
{
  "id": "project-name",
  "name": "项目名称",
  "description": "一句话描述",
  "tech": ["React", "TypeScript"],
  "status": "进行中",
  "highlights": ["亮点 1", "亮点 2"],
  "link": "http://localhost:xxxx",
  "github": "workspace/..."
}
```

---

## 🎨 改造建议

### 1. 页面布局设计

#### 方案 A：分类标签页（推荐）
```
┌─────────────────────────────────────────────┐
│  Projects                                   │
├─────────────────────────────────────────────┤
│ [全部] [主业产品] [提效工具] [游戏] [学习] [技能] │
├─────────────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐ ┌─────────┐        │
│ │ 项目卡片 │ │ 项目卡片 │ │ 项目卡片 │   ...  │
│ └─────────┘ └─────────┘ └─────────┘        │
└─────────────────────────────────────────────┘
```

**优点**：
- 清晰的分类导航
- 用户可以快速定位感兴趣的类别
- 适合项目数量较多的情况

#### 方案 B：分区块展示
```
┌─────────────────────────────────────────────┐
│  Projects                                   │
├─────────────────────────────────────────────┤
│ 📌 主业产品 (7)                             │
│ ┌─────┐ ┌─────┐ ┌─────┐ ...               │
│ │     │ │     │ │     │                    │
│ └─────┘ └─────┘ └─────┘                    │
├─────────────────────────────────────────────┤
│ 🛠️ 提效工具 (11)                            │
│ ┌─────┐ ┌─────┐ ┌─────┐ ...               │
│ │     │ │     │ │     │                    │
│ └─────┘ └─────┘ └─────┘                    │
└─────────────────────────────────────────────┘
```

**优点**：
- 一屏展示所有分类概览
- 适合快速浏览
- 突出项目多样性

#### 方案 C：筛选 + 搜索
```
┌─────────────────────────────────────────────┐
│  Projects                                   │
├─────────────────────────────────────────────┤
│ 🔍 搜索项目...                              │
│ 筛选：[状态▼] [技术栈▼] [分类▼]            │
├─────────────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐ ┌─────────┐        │
│ │ 项目卡片 │ │ 项目卡片 │ │ 项目卡片 │   ...  │
│ └─────────┘ └─────────┘ └─────────┘        │
└─────────────────────────────────────────────┘
```

**优点**：
- 强大的筛选能力
- 适合技术招聘场景
- 可以按技术栈查找项目

---

### 2. 项目卡片设计

#### 基础卡片
```jsx
<ProjectCard>
  <ProjectHeader>
    <ProjectName>Excel Farm</ProjectName>
    <StatusBadge status="已完成">✅</StatusBadge>
  </ProjectHeader>
  
  <ProjectDescription>
    伪装成 Excel 的农场 RPG 游戏，包含种植、畜牧、
    员工管理、地下城探索
  </ProjectDescription>
  
  <TechStack>
    <TechTag>React 19</TechTag>
    <TechTag>TypeScript</TechTag>
    <TechTag>Framer Motion</TechTag>
  </TechStack>
  
  <ProjectHighlights>
    <Highlight>✨ 极致 Excel 伪装</Highlight>
    <Highlight>✨ 4 大游戏系统</Highlight>
    <Highlight>✨ 流畅动画</Highlight>
  </ProjectHighlights>
  
  <ProjectLinks>
    <LiveLink href="...">🔗 在线演示</LiveLink>
    <GithubLink href="...">📦 源码</GithubLink>
  </ProjectLinks>
</ProjectCard>
```

#### 增强卡片（带截图）
```jsx
<ProjectCard>
  <ProjectScreenshot>
    <img src="/screenshots/excel-farm.png" />
    <QuickActions>
      <ActionButton>🖼️ 查看大图</ActionButton>
      <ActionButton>🎬 演示视频</ActionButton>
    </QuickActions>
  </ProjectScreenshot>
  
  {/* ... 其他内容同上 ... */}
</ProjectCard>
```

---

### 3. 新增字段建议

为支持更丰富的展示，建议在 `projects.json` 中增加以下字段：

```json
{
  "id": "excel-farm",
  "name": "Excel Farm",
  "description": "一句话描述",
  "fullDescription": "完整描述（可选，用于详情页）",
  "tech": ["React 19", "TypeScript"],
  "status": "已完成",
  "highlights": ["亮点 1", "亮点 2"],
  "link": "http://localhost:5173",
  "github": "workspace/excel-farm",
  
  // 新增字段
  "icon": "🎮",                    // 项目图标/emoji
  "coverImage": "/covers/excel-farm.png",  // 封面图
  "screenshots": [                // 截图列表
    "/screenshots/excel-farm-1.png",
    "/screenshots/excel-farm-2.png"
  ],
  "videoDemo": "/demos/excel-farm.mp4",  // 演示视频（可选）
  "featured": true,               // 是否推荐展示
  "period": "2025.10 - 至今",     // 时间段
  "metrics": {                    // 量化指标
    "users": "1000+",
    "performance": "95 分"
  },
  "tags": ["游戏", "创意产品"],    // 标签（用于筛选）
  "category": "games"             // 所属分类（冗余，便于查询）
}
```

---

### 4. 交互功能建议

#### 4.1 项目详情弹窗/页面
点击项目卡片后展示详细信息：
- 完整项目描述
- 技术架构说明
- 功能特性列表
- 截图/视频画廊
- 项目指标数据
- 相关链接

#### 4.2 技术栈筛选
```jsx
<TechFilter>
  <TechChip selected>React</TechChip>
  <TechChip>TypeScript</TechChip>
  <TechChip>Python</TechChip>
  <TechChip>Node.js</TechChip>
  <TechChip>Vite</TechChip>
  {/* ... */}
</TechFilter>
```

#### 4.3 状态筛选
```jsx
<StatusFilter>
  <StatusChip selected>全部</StatusChip>
  <StatusChip>🟢 进行中</StatusChip>
  <StatusChip>✅ 已完成</StatusChip>
  <StatusChip>🔧 维护中</StatusChip>
</StatusFilter>
```

#### 4.4 排序功能
- 按时间排序（最新/最旧）
- 按名称排序（A-Z）
- 按技术栈数量排序
- 按推荐程度排序

---

### 5. 视觉设计建议

#### 5.1 分类配色
为每个分类定义主题色，增强视觉识别：

```css
:root {
  --category-work-color: #3b82f6;      /* 蓝色 - 主业产品 */
  --category-tools-color: #10b981;     /* 绿色 - 提效工具 */
  --category-games-color: #f59e0b;     /* 橙色 - 游戏项目 */
  --category-learning-color: #8b5cf6;  /* 紫色 - 学习项目 */
  --category-skills-color: #ec4899;    /* 粉色 - 技能库 */
}
```

#### 5.2 状态徽章
```css
.status-进行中 { background: #dbeafe; color: #1d4ed8; }
.status-已完成 { background: #dcfce7; color: #166534; }
.status-维护中 { background: #fef3c7; color: #92400e; }
.status-实验中 { background: #f3e8ff; color: #7e22ce; }
```

#### 5.3 响应式设计
- 桌面端：3-4 列网格
- 平板端：2 列网格
- 移动端：1 列，卡片堆叠

---

### 6. 性能优化建议

#### 6.1 图片优化
- 使用 WebP 格式
- 实现懒加载（`loading="lazy"`）
- 提供 srcset 多分辨率

#### 6.2 数据加载
- 分页加载（每页 12 个项目）
- 虚拟滚动（项目数量多时）
- 预加载下一页数据

#### 6.3 缓存策略
- 静态数据使用 SWR 或 React Query 缓存
- 设置合理的 staleTime

---

### 7. SEO 优化建议

#### 7.1 结构化数据
```json
{
  "@context": "https://schema.org",
  "@type": "Portfolio",
  "name": "老徐的项目作品集",
  "description": "52 个项目，覆盖主业产品、提效工具、游戏项目、学习项目和 OpenClaw 技能库",
  "creativeWork": [
    {
      "@type": "SoftwareApplication",
      "name": "Excel Farm",
      "description": "伪装成 Excel 的农场 RPG 游戏",
      "programmingLanguage": ["React", "TypeScript"],
      "applicationCategory": "Game"
    }
    // ...
  ]
}
```

#### 7.2 Meta 标签
```html
<meta name="description" content="老徐的项目作品集 - 52 个项目，包括 AI Voice Agent、PM Superpowers、Excel Farm 等">
<meta name="keywords" content="产品经理，AI 产品，React，TypeScript, 游戏开发，OpenClaw">
```

---

### 8. 实施优先级

#### 🚀 第一阶段（MVP）
1. 更新数据源为新的 `projects.json`
2. 实现分类标签页导航
3. 基础项目卡片展示
4. 响应式布局

#### ⚡ 第二阶段（增强）
1. 项目详情弹窗
2. 技术栈筛选
3. 状态筛选
4. 搜索功能

#### 🎨 第三阶段（美化）
1. 项目截图/封面图
2. 分类配色系统
3. 动画效果
4. 演示视频集成

#### 📈 第四阶段（优化）
1. SEO 优化
2. 性能优化
3. 数据分析（Google Analytics）
4. A/B 测试

---

### 9. 示例代码结构

```
personal-website/src/
├── components/
│   └── Projects/
│       ├── ProjectsPage.tsx          # 主页面
│       ├── CategoryTabs.tsx          # 分类标签
│       ├── ProjectCard.tsx           # 项目卡片
│       ├── ProjectGrid.tsx           # 项目网格
│       ├── ProjectFilter.tsx         # 筛选器
│       ├── ProjectSearch.tsx         # 搜索框
│       ├── ProjectDetail.tsx         # 项目详情
│       ├── TechStack.tsx             # 技术栈标签
│       └── StatusBadge.tsx           # 状态徽章
├── data/
│   └── projects.json                 # 项目数据
├── hooks/
│   └── useProjects.ts                # 项目数据钩子
└── pages/
    └── projects.tsx                  # 路由页面
```

---

### 10. 数据同步建议

#### 自动更新脚本
创建脚本定期扫描工作空间并更新 `projects.json`：

```javascript
// scripts/update-projects.js
// 1. 扫描 workspace 目录
// 2. 读取 package.json / README.md
// 3. 提取项目信息
// 4. 更新 projects.json
// 5. 生成分类报告
```

#### Git Hook
在提交时自动检查项目数据一致性。

---

## 📝 总结

本次项目分类整理共识别出 **52 个项目**，分为 **5 个类别**。

**核心建议**：
1. 采用**分类标签页**布局，清晰展示各类项目
2. 增加**截图/封面图**支持，提升视觉吸引力
3. 实现**筛选和搜索**功能，便于技术招聘场景
4. 添加**项目详情页**，展示完整信息
5. 建立**自动更新机制**，保持数据最新

**下一步行动**：
1. 评估当前 Projects 页面代码
2. 确定采用哪种布局方案
3. 补充缺失的项目截图
4. 实现筛选和搜索功能
5. 添加 SEO 优化

---

**生成者**：OpenClaw Subagent (Coder-项目分类整理)
**生成时间**：2026-04-01 21:30 GMT+8
