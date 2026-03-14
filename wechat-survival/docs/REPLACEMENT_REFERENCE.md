# 设计令牌替换对照表

## 色值替换对照表

### 主色
| 原值 | 替换为 | CSS 变量 | 场景 |
|------|--------|----------|------|
| `#07c160` | `text-primary` | `--color-primary` | 微信绿主色 |
| `#06ad56` | `text-primary-hover` | `--color-primary-hover` | 主色悬浮 |
| `#059a4c` | `text-primary-active` | `--color-primary-active` | 主色激活 |

### 辅助色
| 原值 | 替换为 | CSS 变量 | 场景 |
|------|--------|----------|------|
| `#95ec69` | `bg-bubble-user-bg` | `--bubble-user-bg` | 用户气泡 |
| `#ffffff` | `bg-white` | `--bubble-other-bg` | 白色背景 |
| `#1a1a1a` | `text-secondary` | `--color-secondary` | 标题文本 |
| `#fa9d3b` | `text-accent` | `--color-accent` | 强调色 |

### 中性色阶梯
| 原值 | 替换为 | CSS 变量 | 场景 |
|------|--------|----------|------|
| `#f7f7f7` | `bg-neutral-50` | `--neutral-50` | 最浅背景 |
| `#f2f2f2` | `bg-neutral-100` | `--neutral-100` | 次级背景 |
| `#e5e5e5` | `bg-neutral-200` | `--neutral-200` | 分割线/边框 |
| `#d4d4d4` | `bg-neutral-300` | `--neutral-300` | 禁用边框 |
| `#a3a3a3` | `text-neutral-400` | `--neutral-400` | 次要文本 |
| `#8c8c8c` | `text-neutral-500` | `--neutral-500` | 辅助文本 |
| `#666666` | `text-neutral-600` | `--neutral-600` | 常规文本 |
| `#404040` | `text-neutral-700` | `--neutral-700` | 重要文本 |
| `#262626` | `text-neutral-800` | `--neutral-800` | 标题 |
| `#1a1a1a` | `text-neutral-900` | `--neutral-900` | 最暗文本 |

### 功能色
| 原值 | 替换为 | CSS 变量 | 场景 |
|------|--------|----------|------|
| `#07c160` | `text-success` | `--color-success` | 成功 |
| `#fa9d3b` | `text-warning` | `--color-warning` | 警告 |
| `#fa5151` | `text-error` | `--color-error` | 错误 |
| `#1890ff` | `text-info` | `--color-info` | 信息 |

### 灰色映射（Tailwind）
| Tailwind 原类 | 替换为 | 说明 |
|--------------|--------|------|
| `text-gray-500` | `text-neutral-500` | 次要文本 |
| `text-gray-900` | `text-neutral-900` | 主要文本 |
| `text-gray-700` | `text-neutral-700` | 重要文本 |
| `text-gray-600` | `text-neutral-600` | 常规文本 |
| `text-gray-400` | `text-neutral-400` | 禁用文本 |
| `bg-gray-100` | `bg-neutral-100` | 浅灰背景 |
| `bg-gray-200` | `bg-neutral-200` | 次级背景 |
| `border-gray-300` | `border-neutral-300` | 边框 |

---

## 间距替换对照表

### 间距系统（8px 栅格）

| 原值 | 替换为 | CSS 变量 | Tailwind 类 |
|------|--------|----------|-------------|
| 4px | 4px | `--space-1` | `p-1`, `m-1`, `gap-1` |
| 8px | 8px | `--space-2` | `p-2`, `m-2`, `gap-2` |
| 12px | 12px | `--space-3` | `p-3`, `m-3`, `gap-3` |
| 16px | 16px | `--space-4` | `p-4`, `m-4`, `gap-4` |
| 20px | 20px | `--space-5` | `p-5`, `m-5`, `gap-5` |
| 24px | 24px | `--space-6` | `p-6`, `m-6`, `gap-6` |
| 32px | 32px | `--space-8` | `p-8`, `m-8`, `gap-8` |
| 40px | 40px | `--space-10` | `p-10`, `m-10`, `gap-10` |
| 48px | 48px | `--space-12` | `p-12`, `m-12`, `gap-12` |
| 64px | 64px | `--space-16` | `p-16`, `m-16`, `gap-16` |

### 常见错误修正

| ❌ 错误 | ✅ 正确 | 说明 |
|--------|--------|------|
| `gap-0.5` (2px) | `gap-1` (4px) | 最小间距 |
| `p-0.5` (2px) | `p-1` (4px) | 最小内边距 |
| `m-0.5` (2px) | `m-1` (4px) | 最小外边距 |
| `gap-[5px]` | `gap-1` (4px) | 接近值 |
| `p-[10px]` | `p-3` (12px) | 接近值 |
| `m-[15px]` | `m-4` (16px) | 接近值 |

---

## 圆角替换对照表

### 5 种预定义圆角

| 圆角值 | CSS 变量 | Tailwind 类 | 应用场景 |
|--------|----------|-------------|----------|
| 4px | `--radius-sm` | `rounded-sm` | 小按钮、标签 |
| 8px | `--radius-md` | `rounded-md` | 常规按钮、卡片 |
| 12px | `--radius-lg` | `rounded-lg` | 大卡片、气泡 |
| 16px | `--radius-xl` | `rounded-xl` | 超大卡片、容器 |
| 9999px | `--radius-full` | `rounded-full` | 圆形、头像 |

### 常见错误修正

| ❌ 错误 | ✅ 正确 | 说明 |
|--------|--------|------|
| `rounded-[6px]` | `rounded-sm` | 接近 4px |
| `rounded` (2px) | `rounded-sm` | 使用最小预定义值 |
| `rounded-2xl` (16px) | `rounded-xl` | 使用最大预定义值 |
| `rounded-3xl` (24px) | `rounded-xl` | 使用最大预定义值 |
| `rounded-[10px]` | `rounded-md` | 接近 8px |
| `rounded-[14px]` | `rounded-lg` | 接近 12px |

---

## 阴影替换对照表

### 3 个预定义阴影层级

| 层级 | CSS 变量 | Tailwind 类 | 使用场景 |
|------|----------|-------------|----------|
| 轻微 | `--shadow-sm` | `shadow-sm` | 按钮、气泡 |
| 中等 | `--shadow-md` | `shadow-md` | 卡片、菜单 |
| 强烈 | `--shadow-lg` | `shadow-lg` | 弹窗、Toast |

### 常见错误修正

| ❌ 错误 | ✅ 正确 | 说明 |
|--------|--------|------|
| `shadow` (2px) | `shadow-sm` | 使用最轻微 |
| `shadow-xl` (20px) | `shadow-lg` | 使用最强烈 |
| `shadow-2xl` (25px) | `shadow-lg` | 使用最强烈 |
| `shadow-[0_5px_10px_rgba(0,0,0,0.1)]` | `shadow-md` | 使用预定义 |

---

## 动效替换对照表

### 9 个预定义动效

| 动效名称 | 类名 | 描述 | 使用场景 |
|----------|------|------|----------|
| 淡入 | `animate-fade-in` | 透明度 0→1 | 内容加载 |
| 淡出 | `animate-fade-out` | 透明度 1→0 | 元素消失 |
| 从右滑入 | `animate-slide-in-right` | X: 100%→0 | 通知推送 |
| 从左滑入 | `animate-slide-in-left` | X: -100%→0 | 侧边栏 |
| 从上滑入 | `animate-slide-in-top` | Y: -100%→0 | 下拉菜单 |
| 从下滑入 | `animate-slide-in-bottom` | Y: 100%→0 | 底部面板 |
| 缩放进入 | `animate-scale-in` | Scale: 0.95→1 | 弹窗 |
| 旋转 | `animate-rotate` / `animate-spin` | Rotate: 0→360° | 加载器 |
| 脉冲 | `animate-pulse` | 透明度脉冲 | 加载状态 |

### 过渡时长

| 时长 | CSS 变量 | Tailwind 类 | 使用场景 |
|------|----------|-------------|----------|
| 0ms | `--duration-instant` | `duration-instant` | 立即变化 |
| 150ms | `--duration-fast` | `duration-fast` | 小元素 |
| 200ms | `--duration-normal` | `duration-normal` | 常规元素 |
| 300ms | `--duration-slow` | `duration-slow` | 大元素 |

---

## 交互状态类

### 按钮交互
```tsx
className="btn-interaction"
```
- hover: 亮度 +5%, 放大 2%
- active: 亮度 -5%, 缩小 2%
- disabled: 50% 透明度

### 卡片交互
```tsx
className="card-interaction"
```
- hover: 阴影 md, 上移 2px
- active: 阴影 sm, 归位

### 输入框交互
```tsx
className="input-interaction"
```
- focus: 主色边框 + 外发光
- disabled: 浅灰背景

### 列表项交互
```tsx
className="list-item-interaction"
```
- hover: 浅灰背景
- active: 稍深灰背景

### 链接交互
```tsx
className="link-interaction"
```
- hover: 主色悬浮 + 下划线
- active: 主色激活

### 可点击区域交互
```tsx
className="clickable-interaction"
```
- hover: 浅灰背景
- active: 稍深灰背景

---

## 快速查询

### 我要...

**修改颜色** → 查看「色值替换对照表」  
**修改间距** → 查看「间距替换对照表」  
**修改圆角** → 查看「圆角替换对照表」  
**修改阴影** → 查看「阴影替换对照表」  
**添加动画** → 查看「动效替换对照表」  
**添加交互** → 查看「交互状态类」

---

*本对照表由设计系统修复任务自动生成*  
*最后更新：2026-03-14*
