# 设计令牌文档 🎨

微信生存游戏的设计原子系统核心文档。所有 UI 开发必须严格遵循此规范。

---

## 📋 目录

1. [色彩系统](#1-色彩系统)
2. [字体系统](#2-字体系统)
3. [间距系统](#3-间距系统)
4. [圆角系统](#4-圆角系统)
5. [阴影系统](#5-阴影系统)
6. [使用规范](#使用规范)
7. [禁止事项](#禁止事项)
8. [示例代码](#示例代码)

---

## 1. 色彩系统

### 1.1 主色

| 变量名 | 值 | 用途 |
|--------|-----|------|
| `--color-primary` | `#07c160` | 主按钮、链接、强调元素 |
| `--color-primary-hover` | `#06ad56` | Hover 状态 |
| `--color-primary-active` | `#059a4c` | Active/点击状态 |

### 1.2 辅助色

| 变量名 | 值 | 用途 |
|--------|-----|------|
| `--color-secondary` | `#1a1a1a` | 标题、重要文本 |
| `--color-accent` | `#fa9d3b` | 警告、强调标记 |

### 1.3 中性色阶梯

| 变量名 | 值 | 用途 |
|--------|-----|------|
| `--neutral-50` | `#f7f7f7` | 最浅背景 |
| `--neutral-100` | `#f2f2f2` | 次级背景 |
| `--neutral-200` | `#e5e5e5` | 分割线、边框 |
| `--neutral-300` | `#d4d4d4` | 禁用边框 |
| `--neutral-400` | `#a3a3a3` | 次要文本 |
| `--neutral-500` | `#8c8c8c` | 辅助文本 |
| `--neutral-600` | `#666666` | 常规文本 |
| `--neutral-700` | `#404040` | 重要文本 |
| `--neutral-800` | `#262626` | 标题 |
| `--neutral-900` | `#1a1a1a` | 最暗文本 |

### 1.4 功能色

| 变量名 | 值 | 用途 |
|--------|-----|------|
| `--color-success` | `#07c160` | 成功状态 |
| `--color-warning` | `#fa9d3b` | 警告状态 |
| `--color-error` | `#fa5151` | 错误状态 |
| `--color-info` | `#1890ff` | 信息提示 |

### 1.5 聊天气泡色

| 变量名 | 值 | 用途 |
|--------|-----|------|
| `--bubble-user-bg` | `#95ec69` | 用户气泡背景 |
| `--bubble-other-bg` | `#ffffff` | 对方气泡背景 |
| `--bubble-border` | `#e0e0e0` | 气泡边框 |

---

## 2. 字体系统

### 2.1 字号层级

| 变量名 | 值 | 用途 |
|--------|-----|------|
| `--text-xs` | `12px` | 辅助信息、时间戳 |
| `--text-sm` | `14px` | 次要文本、描述 |
| `--text-base` | `16px` | 正文、聊天内容 |
| `--text-lg` | `20px` | 小标题、重要信息 |
| `--text-xl` | `24px` | 页面标题 |
| `--text-2xl` | `32px` | 大标题 |

### 2.2 行高

| 变量名 | 值 | 用途 |
|--------|-----|------|
| `--leading-xs` | `1.2` | 紧凑文本 |
| `--leading-sm` | `1.4` | 次要文本 |
| `--leading-base` | `1.5` | 正文 |
| `--leading-lg` | `1.6` | 标题 |

### 2.3 字重

| 变量名 | 值 | 用途 |
|--------|-----|------|
| `--font-normal` | `400` | 常规文本 |
| `--font-medium` | `500` | 中等字重 |
| `--font-semibold` | `600` | 半粗体 |
| `--font-bold` | `700` | 粗体 |

### 2.4 字体族

| 变量名 | 值 |
|--------|-----|
| `--font-sans` | `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, ...` |
| `--font-mono` | `"SF Mono", Monaco, "Cascadia Code", monospace` |

---

## 3. 间距系统

**原则**: 严格遵循 8px 栅格

| 变量名 | 值 | 倍数 | 用途 |
|--------|-----|------|------|
| `--space-1` | `4px` | 0.5x | 极小间距 |
| `--space-2` | `8px` | 1x | 基础间距 |
| `--space-3` | `12px` | 1.5x | 1.5 倍基础 |
| `--space-4` | `16px` | 2x | 2 倍基础 |
| `--space-5` | `20px` | 2.5x | 2.5 倍基础 |
| `--space-6` | `24px` | 3x | 3 倍基础 |
| `--space-8` | `32px` | 4x | 4 倍基础 |
| `--space-10` | `40px` | 5x | 5 倍基础 |
| `--space-12` | `48px` | 6x | 6 倍基础 |
| `--space-16` | `64px` | 8x | 8 倍基础 |

---

## 4. 圆角系统

| 变量名 | 值 | 用途 |
|--------|-----|------|
| `--radius-sm` | `4px` | 小按钮、标签 |
| `--radius-md` | `8px` | 卡片、气泡 |
| `--radius-lg` | `12px` | 大卡片、弹窗 |
| `--radius-xl` | `16px` | 超大卡片 |
| `--radius-full` | `9999px` | 圆形 |

---

## 5. 阴影系统

| 变量名 | 值 | 用途 |
|--------|-----|------|
| `--shadow-sm` | `0 1px 2px 0 rgba(0,0,0,0.05)` | 轻微悬浮 |
| `--shadow-md` | `0 4px 6px -1px rgba(0,0,0,0.1)` | 卡片悬浮 |
| `--shadow-lg` | `0 10px 15px -3px rgba(0,0,0,0.1)` | 弹窗/模态框 |

---

## 使用规范

### ✅ 正确做法

```css
/* 使用 CSS 变量 */
.button {
  background-color: var(--color-primary);
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-md);
  font-size: var(--text-base);
  color: var(--neutral-50);
}
```

```tsx
// React 组件中使用
<div className="bg-[var(--color-primary)] p-2 rounded-md">
  <span className="text-[var(--text-sm)] text-[var(--neutral-600)]">
    文本内容
  </span>
</div>
```

### ❌ 错误做法

```css
/* 禁止：魔法数字 */
.button {
  background-color: #07c160;  /* ❌ 直接使用色值 */
  padding: 8px 16px;          /* ❌ 硬编码间距 */
  border-radius: 8px;         /* ❌ 硬编码圆角 */
  font-size: 16px;            /* ❌ 硬编码字号 */
}
```

---

## 禁止事项

### 🚫 绝对禁止

1. **禁止使用魔法数字**
   - 所有色值必须来自 `--color-*` 或 `--neutral-*`
   - 所有间距必须来自 `--space-*`
   - 所有字号必须来自 `--text-*`
   - 所有圆角必须来自 `--radius-*`
   - 所有阴影必须来自 `--shadow-*`

2. **禁止自定义色值**
   - 不要在代码中直接写 `#07c160`、`rgb(7, 193, 96)` 等
   - 如需新颜色，先在 `tokens.css` 中定义变量

3. **禁止违反 8px 栅格**
   - 间距只能是 `4, 8, 12, 16, 20, 24, 32, 40, 48, 64`
   - 不要使用 `5px`、`13px`、`17px` 等非标准值

4. **禁止自定义动画**
   - 所有动画必须来自 `animations.css`
   - 不要创建新的 `@keyframes`

---

## 示例代码

### 按钮组件

```tsx
const Button = ({ children, variant = 'primary' }) => {
  const baseStyles = `
    btn-interaction
    px-4 py-2
    rounded-md
    text-base
    font-medium
  `;
  
  const variantStyles = variant === 'primary'
    ? 'bg-[var(--color-primary)] text-white'
    : 'bg-[var(--neutral-100)] text-[var(--neutral-700)]';
  
  return (
    <button className={`${baseStyles} ${variantStyles}`}>
      {children}
    </button>
  );
};
```

### 卡片组件

```tsx
const Card = ({ children }) => (
  <div className="
    card-interaction
    bg-white
    p-4
    rounded-lg
    shadow-sm
  ">
    {children}
  </div>
);
```

### 输入框组件

```tsx
const Input = ({ label, error }) => (
  <div className="flex flex-col gap-2">
    {label && (
      <label className="text-sm font-medium text-[var(--neutral-700)]">
        {label}
      </label>
    )}
    <input
      className="
        input-interaction
        px-3 py-2
        border border-[var(--neutral-200)]
        rounded-md
        text-base
      "
    />
    {error && (
      <span className="text-xs text-[var(--color-error)]">
        {error}
      </span>
    )}
  </div>
);
```

### 列表项组件

```tsx
const ListItem = ({ title, subtitle, onClick }) => (
  <div
    className="
      list-item-interaction
      flex items-center gap-4
      p-4
      cursor-pointer
    "
    onClick={onClick}
  >
    <div className="flex-1">
      <h3 className="text-base font-medium text-[var(--neutral-800)]">
        {title}
      </h3>
      {subtitle && (
        <p className="text-sm text-[var(--neutral-500)] mt-1">
          {subtitle}
        </p>
      )}
    </div>
  </div>
);
```

---

## 更新记录

| 日期 | 版本 | 变更内容 |
|------|------|----------|
| 2026-03-14 | v1.0 | 初始版本 |

---

**最后更新**: 2026-03-14  
**维护者**: 微信生存游戏开发团队
