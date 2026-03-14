# 迁移指南 🔄

从旧代码迁移到新设计系统的完整指南。

---

## 📋 目录

1. [迁移步骤](#迁移步骤)
2. [常见替换对照表](#常见替换对照表)
3. [检查清单](#检查清单)
4. [自动化检查](#自动化检查)
5. [常见问题](#常见问题)

---

## 迁移步骤

### Step 1: 准备工作

1. 确保已安装所有依赖
2. 备份当前代码
3. 阅读 [DESIGN_TOKENS.md](./DESIGN_TOKENS.md)

```bash
# 备份当前样式
cp src/index.css src/index.css.backup
```

### Step 2: 更新样式入口

将旧的 `src/index.css` 替换为新的设计系统：

```css
/* 新的 src/index.css */
@import "tailwindcss";
@import "./styles/tokens.css";
@import "./styles/interactions.css";
@import "./styles/animations.css";
```

### Step 3: 替换魔法数字

使用查找替换功能，批量替换硬编码值：

#### 3.1 替换色值

```
查找：#07c160
替换：var(--color-primary)

查找：#95ec69
替换：var(--bubble-user-bg)

查找：#ffffff
替换：var(--bubble-other-bg)
```

#### 3.2 替换间距

```
查找：8px
替换：var(--space-2)

查找：16px
替换：var(--space-4)

查找：24px
替换：var(--space-6)
```

#### 3.3 替换字号

```
查找：12px
替换：var(--text-xs)

查找：14px
替换：var(--text-sm)

查找：16px
替换：var(--text-base)
```

### Step 4: 添加交互状态

为所有可交互元素添加交互状态类：

```tsx
// 之前
<button className="bg-green-500 px-4 py-2 rounded">
  按钮
</button>

// 之后
<button className="btn-interaction bg-[var(--color-primary)] px-4 py-2 rounded-md">
  按钮
</button>
```

### Step 5: 添加动效

为页面切换、模态框等添加预定义动画：

```tsx
// 之前
<div className="opacity-0 transition-opacity">
  内容
</div>

// 之后
<div className="animate-fade-in">
  内容
</div>
```

### Step 6: 测试验证

1. 运行 `npm run dev` 确保无报错
2. 检查所有组件样式正确
3. 测试所有交互状态
4. 验证动画效果

---

## 常见替换对照表

### 色彩替换

| 旧值 | 新值 | 变量名 |
|------|------|--------|
| `#07c160` | `var(--color-primary)` | 主色 |
| `#06ad56` | `var(--color-primary-hover)` | 主色 Hover |
| `#059a4c` | `var(--color-primary-active)` | 主色 Active |
| `#95ec69` | `var(--bubble-user-bg)` | 用户气泡 |
| `#ffffff` | `var(--bubble-other-bg)` | 对方气泡 |
| `#e0e0e0` | `var(--bubble-border)` | 气泡边框 |
| `#f7f7f7` | `var(--neutral-50)` | 最浅背景 |
| `#f2f2f2` | `var(--neutral-100)` | 次级背景 |
| `#e5e5e5` | `var(--neutral-200)` | 分割线 |
| `#d4d4d4` | `var(--neutral-300)` | 禁用边框 |
| `#a3a3a3` | `var(--neutral-400)` | 次要文本 |
| `#8c8c8c` | `var(--neutral-500)` | 辅助文本 |
| `#666666` | `var(--neutral-600)` | 常规文本 |
| `#404040` | `var(--neutral-700)` | 重要文本 |
| `#262626` | `var(--neutral-800)` | 标题 |
| `#1a1a1a` | `var(--neutral-900)` | 最暗文本 |
| `#fa5151` | `var(--color-error)` | 错误色 |
| `#fa9d3b` | `var(--color-warning)` | 警告色 |
| `#1890ff` | `var(--color-info)` | 信息色 |

### 间距替换

| 旧值 | 新值 | 变量名 |
|------|------|--------|
| `4px` | `var(--space-1)` | 极小间距 |
| `8px` | `var(--space-2)` | 基础间距 |
| `12px` | `var(--space-3)` | 1.5x 基础 |
| `16px` | `var(--space-4)` | 2x 基础 |
| `20px` | `var(--space-5)` | 2.5x 基础 |
| `24px` | `var(--space-6)` | 3x 基础 |
| `32px` | `var(--space-8)` | 4x 基础 |
| `40px` | `var(--space-10)` | 5x 基础 |
| `48px` | `var(--space-12)` | 6x 基础 |
| `64px` | `var(--space-16)` | 8x 基础 |

### 字号替换

| 旧值 | 新值 | 变量名 |
|------|------|--------|
| `12px` | `var(--text-xs)` | 辅助信息 |
| `14px` | `var(--text-sm)` | 次要文本 |
| `16px` | `var(--text-base)` | 正文 |
| `20px` | `var(--text-lg)` | 小标题 |
| `24px` | `var(--text-xl)` | 页面标题 |
| `32px` | `var(--text-2xl)` | 大标题 |

### 圆角替换

| 旧值 | 新值 | 变量名 |
|------|------|--------|
| `4px` | `var(--radius-sm)` | 小圆角 |
| `8px` | `var(--radius-md)` | 中圆角 |
| `12px` | `var(--radius-lg)` | 大圆角 |
| `16px` | `var(--radius-xl)` | 超大圆角 |
| `9999px` | `var(--radius-full)` | 圆形 |

### 阴影替换

| 旧值 | 新值 | 变量名 |
|------|------|--------|
| `0 1px 2px rgba(0,0,0,0.05)` | `var(--shadow-sm)` | 轻微阴影 |
| `0 4px 6px -1px rgba(0,0,0,0.1)` | `var(--shadow-md)` | 中等阴影 |
| `0 10px 15px -3px rgba(0,0,0,0.1)` | `var(--shadow-lg)` | 大阴影 |

### 交互状态类

| 元素类型 | 添加类名 |
|----------|----------|
| 按钮 | `btn-interaction` |
| 卡片 | `card-interaction` |
| 输入框 | `input-interaction` |
| 列表项 | `list-item-interaction` |
| 链接 | `link-interaction` |
| 可点击区域 | `clickable-interaction` |

### 动画类

| 效果 | 类名 |
|------|------|
| 淡入 | `animate-fade-in` |
| 淡出 | `animate-fade-out` |
| 从右滑入 | `animate-slide-in-right` |
| 从左滑入 | `animate-slide-in-left` |
| 从底滑入 | `animate-slide-in-bottom` |
| 缩放进入 | `animate-scale-in` |
| Hover 抬升 | `animate-hover-lift` |
| 旋转加载 | `animate-spin` |
| 脉冲 | `animate-pulse` |

---

## 检查清单

### 代码质量检查

- [ ] 无魔法数字（色值、间距、字号、圆角、阴影）
- [ ] 所有色值使用 CSS 变量
- [ ] 所有间距符合 8px 栅格
- [ ] 所有圆角来自预定义值
- [ ] 所有阴影来自预定义值

### 交互状态检查

- [ ] 所有按钮有 hover/active/disabled 状态
- [ ] 所有卡片有 hover 效果
- [ ] 所有输入框有 focus/disabled 状态
- [ ] 所有列表项有 hover/active 状态
- [ ] 所有链接有 hover/active 状态

### 动效检查

- [ ] 页面切换使用预定义动画
- [ ] 模态框使用预定义动画
- [ ] Toast 使用预定义动画
- [ ] 加载状态使用预定义动画
- [ ] 无自定义@keyframes

### 组件检查

- [ ] 使用 Toast 组件进行提示
- [ ] 使用 Loading 组件显示加载
- [ ] 使用 EmptyState 组件处理空状态
- [ ] 使用 FormValidation 组件进行表单校验

---

## 自动化检查

### ESLint 规则（建议配置）

```javascript
// .eslintrc.js
module.exports = {
  rules: {
    // 禁止硬编码色值
    'no-restricted-syntax': [
      'error',
      {
        selector: 'Literal[value=/^#[0-9a-fA-F]{3,6}$/]',
        message: '使用 CSS 变量代替硬编码色值',
      },
    ],
  },
};
```

### CSS 检查脚本

```bash
# 检查是否有魔法数字
grep -r "#[0-9a-fA-F]\{3,6\}" src/ --include="*.css" --include="*.tsx"
grep -r "px" src/ --include="*.css" --include="*.tsx" | grep -v "var(--"
```

---

## 常见问题

### Q1: 有些特殊场景需要自定义色值怎么办？

**A**: 先在 `tokens.css` 中定义新变量，然后使用变量。

```css
/* tokens.css */
:root {
  --color-custom: #xxxxxx;
}
```

```tsx
// 组件中
<div style={{ color: 'var(--color-custom)' }} />
```

### Q2: 旧的动画效果如何迁移？

**A**: 尽量使用预定义动画。如果确实需要特殊效果，添加到 `animations.css`。

```css
/* animations.css */
@keyframes custom-animation {
  /* ... */
}

.animate-custom {
  animation: custom-animation 0.3s ease-in-out;
}
```

### Q3: 迁移后样式不对怎么办？

**A**: 检查以下几点：
1. 确认 `index.css` 正确导入所有样式文件
2. 确认 CSS 变量名拼写正确
3. 确认 Tailwind 配置正确
4. 清除缓存重启开发服务器

### Q4: 如何保证团队成员都遵守规范？

**A**: 
1. Code Review 时检查
2. 配置 ESLint 规则
3. 使用 CSS 变量自动补全插件
4. 定期运行检查脚本

---

## 回滚方案

如果迁移出现问题，可以快速回滚：

```bash
# 恢复旧样式
mv src/index.css.backup src/index.css

# 恢复组件
git checkout src/components/
```

---

## 更新记录

| 日期 | 版本 | 变更内容 |
|------|------|----------|
| 2026-03-14 | v1.0 | 初始版本 |

---

**最后更新**: 2026-03-14  
**维护者**: 微信生存游戏开发团队
