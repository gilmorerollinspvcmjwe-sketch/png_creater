# 阴影统一记录

## 执行时间
2026-03-14 14:46

## 统一原则
- ❌ 禁止使用自定义阴影
- ✅ 只保留 3 个预定义阴影层级
- ✅ 所有阴影必须来自设计令牌

## 阴影对照表

| 阴影级别 | CSS 变量 | 使用场景 |
|----------|----------|----------|
| --shadow-sm | 0 1px 2px 0 rgba(0,0,0,0.05) | 轻微悬浮、按钮 hover |
| --shadow-md | 0 4px 6px -1px rgba(0,0,0,0.1) | 卡片悬浮、下拉菜单 |
| --shadow-lg | 0 10px 15px -3px rgba(0,0,0,0.1) | 弹窗、模态框、Toast |

## 已统一项

### BottomNav.tsx
- ✅ 底部导航 - 无边影（边框分隔）

### ChatList.tsx
- ✅ 消息卡片 - 无边影（边框分隔）
- ✅ 联系人卡片 - 无边影（边框分隔）

### ChatInterface.tsx
- ✅ 快捷按钮 - 无边影
- ✅ 发送按钮 - 无边影

### ChatMessageItem.tsx
- ✅ 消息气泡 - `shadow-sm` (轻微悬浮)

### CharacterPanel.tsx
- ✅ 角色卡片 - `shadow-sm`
- ✅ 状态卡片 - `shadow-sm`
- ✅ 属性卡片 - `shadow-sm`

### InventoryPanel.tsx
- ✅ 物品卡片 - hover 时 `shadow-md`

### QuestPanel.tsx
- ✅ 任务卡片 - hover 时 `shadow-md` (通过 card-interaction)

### ShelterPanel.tsx
- ✅ 避难所卡片 - `shadow-sm`
- ✅ 设施卡片 - `shadow-sm`
- ✅ 资源卡片 - `shadow-sm`

### ShelterEditor.tsx
- ✅ 预览容器 - 边框（虚线）
- ✅ 设施卡片 - `shadow-sm`
- ✅ 资源徽章 - `shadow-sm`

### NotificationPush.tsx
- ✅ 通知卡片 - `shadow-lg` (弹窗级别)

### Sidebar.tsx
- ✅ 侧边栏 - 无边影（背景色分隔）

### App.tsx
- ✅ 主容器 - 无边影

## 使用场景规范

### --shadow-sm (轻微悬浮)
**适用场景：**
- 按钮 hover 状态
- 轻微抬升效果
- 聊天气泡
- 内嵌卡片

**代码示例：**
```tsx
<div className="shadow-sm">内容</div>
```

### --shadow-md (卡片悬浮)
**适用场景：**
- 卡片 hover 状态
- 下拉菜单
- 悬浮面板
- 交互元素

**代码示例：**
```tsx
<div className="shadow-md">内容</div>
// 或使用交互类
<div className="card-interaction">内容</div>
```

### --shadow-lg (弹窗/模态框)
**适用场景：**
- 弹窗 (Modal)
- 模态框 (Dialog)
- Toast 通知
- 悬浮提示 (Tooltip)

**代码示例：**
```tsx
<div className="shadow-lg">内容</div>
```

## 阴影层级决策树

```
需要阴影吗？
├─ 否 → 不使用阴影
└─ 是 → 选择层级：
   ├─ 轻微悬浮感？ → shadow-sm
   ├─ 卡片/菜单悬浮？ → shadow-md
   └─ 弹窗/模态框？ → shadow-lg
```

## 统计
- 修改文件数：12
- 统一阴影数：18 处
- 自定义阴影剩余：0

## 验证方法

### 视觉验证
1. 打开浏览器开发者工具
2. 检查所有元素的 box-shadow
3. 确认所有值都符合 3 个预定义层级

### 代码验证
```bash
# 搜索自定义阴影
grep -r "box-shadow.*0.*[2-9]px" src/
grep -r "shadow-\[" src/
```

## 与交互状态配合

### 卡片交互 (card-interaction)
```css
默认：shadow-sm
hover: shadow-md + translateY(-2px)
active: shadow-sm + translateY(0)
```

### 按钮交互 (btn-interaction)
```css
默认：shadow-sm (可选)
hover: brightness(1.05) + scale(1.02)
active: brightness(0.95) + scale(0.98)
```

## 注意事项
- 不要使用 `shadow` (2px) - 已移除
- 不要使用 `shadow-xl` (20px) - 使用 `shadow-lg`
- 不要使用 `shadow-2xl` (25px) - 使用 `shadow-lg`
- 内嵌元素优先使用边框而非阴影
- 移动端谨慎使用阴影（性能考虑）
