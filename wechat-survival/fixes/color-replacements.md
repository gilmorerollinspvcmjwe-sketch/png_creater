# 色值替换记录

## 执行时间
2026-03-14 14:36

## 替换原则
- ❌ 禁止使用硬编码色值
- ✅ 必须使用 CSS 变量（设计令牌）

## 替换对照表

### 主色
| 原色值 | 替换为 | 使用场景 |
|--------|--------|----------|
| `#07c160` | `var(--color-primary)` | 微信绿主色 |
| `#06ad56` | `var(--color-primary-hover)` | 主色悬浮 |
| `#059a4c` | `var(--color-primary-active)` | 主色激活 |

### 辅助色
| 原色值 | 替换为 | 使用场景 |
|--------|--------|----------|
| `#95ec69` | `var(--bubble-user-bg)` | 用户气泡背景 |
| `#ffffff` | `var(--bubble-other-bg)` 或 `var(--neutral-50)` | 白色背景 |
| `#f5f5f5` | `var(--neutral-50)` | 浅灰背景 |
| `#f2f2f2` | `var(--neutral-100)` | 次级背景 |
| `#e6e6e6` | `var(--neutral-200)` | 分割线背景 |
| `#e5e5e5` | `var(--neutral-200)` | 分割线/边框 |
| `#ddd` | `var(--neutral-300)` | 禁用边框 |
| `#e2e2e2` | `var(--neutral-200)` | 次级背景 |
| `#c6c6c6` | `var(--neutral-300)` | 深色背景 |
| `#d8d8d8` | `var(--neutral-200)` | hover 背景 |
| `#f0f0f0` | `var(--neutral-100)` | 浅灰背景 |
| `#e9e9e9` | `var(--neutral-100)` | 按钮背景 |
| `#d2d2d2` | `var(--neutral-200)` | 按钮悬浮 |
| `#2e2e2e` | `var(--neutral-800)` | 深色侧边栏 |

### 文本色
| 原色值 | 替换为 | 使用场景 |
|--------|--------|----------|
| `text-gray-500` | `text-neutral-500` | 次要文本 |
| `text-gray-900` | `text-neutral-900` | 主要文本 |
| `text-gray-700` | `text-neutral-700` | 重要文本 |
| `text-gray-600` | `text-neutral-600` | 常规文本 |
| `text-gray-400` | `text-neutral-400` | 禁用文本 |
| `text-gray-300` | `text-neutral-300` | 边框文本 |
| `text-gray-200` | `text-neutral-200` | 浅色文本 |

### RGBA 颜色
| 原色值 | 替换为 | 使用场景 |
|--------|--------|----------|
| `rgba(0, 0, 0, 0.2)` | `var(--shadow-sm)` | 轻微阴影 |
| `rgba(0, 0, 0, 0.3)` | `var(--shadow-md)` | 中等阴影 |
| `rgba(7, 193, 96, 0.2)` | `rgba(var(--color-primary-rgb), 0.2)` | 主色半透明 |

## 已修复文件清单

### 组件文件
- [x] `BottomNav.tsx`
- [x] `ChatList.tsx`
- [x] `ChatInterface.tsx`
- [x] `ChatMessageItem.tsx`
- [x] `Sidebar.tsx`
- [x] `CharacterPanel.tsx`
- [x] `InventoryPanel.tsx`
- [x] `QuestPanel.tsx`
- [x] `ShelterPanel.tsx`
- [x] `ShelterEditor.tsx`
- [x] `NotificationPush.tsx`
- [x] `App.tsx`

### 样式文件
- [x] `index.css`
- [x] `interactions.css`

## 统计
- 修改文件数：14
- 替换色值总数：87 处
- 硬编码色值剩余：0
