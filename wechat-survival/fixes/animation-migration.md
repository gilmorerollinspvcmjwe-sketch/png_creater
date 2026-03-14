# 动效迁移记录

## 执行时间
2026-03-14 14:47

## 迁移原则
- ❌ 禁止使用自定义动画
- ✅ 只使用 9 个预定义动效
- ✅ 所有动效必须来自设计令牌

## 预定义动效清单

| 动效名称 | 类名 | 描述 | 使用场景 |
|----------|------|------|----------|
| 淡入 | animate-fade-in | 从透明到不透明 | 内容加载、元素出现 |
| 淡出 | animate-fade-out | 从不透明到透明 | 元素消失、关闭 |
| 从右滑入 | animate-slide-in-right | 从右侧滑入 | 通知推送、侧边栏 |
| 从左滑入 | animate-slide-in-left | 从左侧滑入 | 侧边栏、面板 |
| 从上滑入 | animate-slide-in-top | 从上方滑入 | 下拉菜单、提示 |
| 从下滑入 | animate-slide-in-bottom | 从下方滑入 | 底部面板、Toast |
| 缩放进入 | animate-scale-in | 从小到大缩放 | 弹窗、模态框 |
| 旋转 | animate-rotate | 持续旋转 | 加载指示器 |
| 脉冲 | animate-pulse | 明暗脉冲 | 加载状态、提示 |

## 已迁移项

### NotificationPush.tsx
- ✅ 通知推送动画 - 使用 `animate-slide-in-right`
- ❌ 移除自定义 `@keyframes slide-in-right`

### ShelterEditor.tsx
- ✅ 设施指示器 - 使用 `animate-pulse`

### 所有组件
- ✅ 过渡动画 - 使用 `transition-all` + `--duration-normal`

## 动效时长规范

### 标准时长
| 时长名称 | 值 | 使用场景 |
|----------|-----|----------|
| instant | 0ms | 立即变化 |
| fast | 150ms | 小元素、按钮 |
| normal | 200ms | 常规元素、卡片 |
| slow | 300ms | 大元素、面板 |

### 过渡曲线
| 曲线名称 | 值 | 使用场景 |
|----------|-----|----------|
| ease-in-out | cubic-bezier(0.4, 0, 0.2, 1) | 常规过渡 |
| ease-out | cubic-bezier(0, 0, 0.2, 1) | 进入动画 |
| ease-in | cubic-bezier(0.4, 0, 1, 1) | 离开动画 |

## 动效决策树

```
需要动画吗？
├─ 否 → 不使用动画
└─ 是 → 选择类型：
   ├─ 元素出现/消失？
   │  ├─ 淡入淡出 → animate-fade-in / animate-fade-out
   │  └─ 滑入滑出 → animate-slide-in-* / animate-slide-out-*
   ├─ 元素放大/缩小？ → animate-scale-in
   ├─ 持续旋转？ → animate-rotate (spin)
   ├─ 呼吸效果？ → animate-pulse
   └─ 悬停效果？ → 使用交互状态 (hover-lift)
```

## 使用场景规范

### 页面/面板加载
```tsx
// 主内容淡入
<div className="animate-fade-in">
  内容
</div>
```

### 通知推送
```tsx
// 从右侧滑入
<div className="animate-slide-in-right">
  通知内容
</div>
```

### 侧边栏
```tsx
// 从左/右侧滑入
<div className="animate-slide-in-left">
  侧边栏内容
</div>
```

### 弹窗/模态框
```tsx
// 缩放进入
<div className="animate-scale-in">
  弹窗内容
</div>
```

### 加载状态
```tsx
// 旋转加载器
<div className="animate-spin">
  <LoaderIcon />
</div>

// 脉冲加载
<div className="animate-pulse">
  加载内容
</div>
```

### 悬停效果
```tsx
// 使用预定义的 hover-lift
<div className="animate-hover-lift">
  卡片内容
</div>
```

## 过渡效果规范

### 按钮过渡
```tsx
<button className="transition-all duration-normal ease-in-out btn-interaction">
  按钮
</button>
```

### 卡片过渡
```tsx
<div className="transition-all duration-normal ease-in-out card-interaction">
  卡片内容
</div>
```

### 输入框过渡
```tsx
<input className="transition-all duration-normal ease-in-out input-interaction" />
```

### 列表项过渡
```tsx
<div className="transition-colors duration-fast ease-in-out list-item-interaction">
  列表项
</div>
```

## 统计
- 修改文件数：2
- 迁移动画数：3 处
- 自定义动画剩余：0

## 验证方法

### 视觉验证
1. 启动开发服务器：`npm run dev`
2. 触发所有动画场景
3. 确认动画流畅自然
4. 确认时长适中（不慢不急）

### 代码验证
```bash
# 搜索自定义动画
grep -r "@keyframes" src/
grep -r "animation:.*[^a]animate-" src/
```

## 动画性能优化

### 使用 transform 和 opacity
✅ 推荐：
```css
transform: translateX(100%);
opacity: 0;
```

❌ 避免：
```css
margin-left: 100%;
width: 0;
```

### 使用 will-change
对于复杂动画，可以添加：
```css
will-change: transform, opacity;
```

### 避免同时触发多个动画
- 不要在同一元素上叠加多个动画
- 使用动画队列或延迟

## 无障碍考虑

### 减少动画偏好
对于 `prefers-reduced-motion` 用户：
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

## 注意事项
- 动画时长不要超过 500ms（除非特殊需求）
- 不要使用闪烁或快速变化的动画
- 确保动画有明确的开始和结束
- 重要内容不要完全依赖动画传达信息
