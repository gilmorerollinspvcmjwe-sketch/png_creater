# 圆角统一记录

## 执行时间
2026-03-14 14:45

## 统一原则
- ❌ 禁止使用自定义圆角值
- ✅ 只保留 5 种预定义圆角
- ✅ 所有圆角必须来自设计令牌

## 圆角对照表

| 圆角值 | CSS 变量 | Tailwind 类 | 应用场景 |
|--------|----------|-------------|----------|
| 4px | --radius-sm | rounded-sm | 小按钮、标签、徽章 |
| 8px | --radius-md | rounded-md | 卡片、气泡、常规按钮 |
| 12px | --radius-lg | rounded-lg | 大卡片、弹窗 |
| 16px | --radius-xl | rounded-xl | 超大卡片、容器 |
| 9999px | --radius-full | rounded-full | 圆形、头像 |

## 已统一项

### BottomNav.tsx
- ✅ 无显式圆角（使用 Tailwind 默认）

### ChatList.tsx
- ✅ `rounded-md` → 保持 (8px)
- ✅ 搜索框圆角 → `rounded-md` (8px)
- ✅ 头像圆角 → `rounded-md` (8px)

### ChatInterface.tsx
- ✅ 快捷按钮 → `rounded-md` (8px)
- ✅ 发送按钮 → `rounded-md` (8px)

### ChatMessageItem.tsx
- ✅ 消息气泡 → `rounded-lg` (12px)
- ✅ 快捷按钮 → `rounded-md` (8px)
- ✅ 头像 → `rounded-md` (8px)

### Sidebar.tsx
- ✅ 头像 → `rounded-md` (8px)

### CharacterPanel.tsx
- ✅ 卡片 → `rounded-xl` (16px)
- ✅ 头像 → `rounded-full` (圆形)
- ✅ 标签 → `rounded-md` (8px)
- ✅ 进度条 → `rounded-full` (圆形)
- ✅ 属性卡片 → `rounded-lg` (12px)

### InventoryPanel.tsx
- ✅ 物品卡片 → `rounded-lg` (12px)
- ✅ 状态卡片 → `rounded` (4px)
- ✅ 进度条 → `rounded-full` (圆形)

### QuestPanel.tsx
- ✅ 任务卡片 → 无显式圆角（继承）
- ✅ 徽章 → `rounded` (4px)
- ✅ 按钮 → `rounded-md` (8px)

### ShelterPanel.tsx
- ✅ 卡片 → `rounded-lg` (12px)
- ✅ 按钮 → `rounded-md` (8px)
- ✅ 资源卡片 → `rounded-lg` (12px)

### ShelterEditor.tsx
- ✅ 预览容器 → `rounded-xl` (16px)
- ✅ 设施卡片 → `rounded-lg` (12px)
- ✅ 按钮 → `rounded-md` (8px)
- ✅ 资源徽章 → `rounded-lg` (12px)

### NotificationPush.tsx
- ✅ 通知卡片 → `rounded-lg` (12px)

### App.tsx
- ✅ 无显式圆角

## 应用场景规范

### 按钮 (Buttons)
- 常规按钮：`rounded-md` (8px)
- 小按钮：`rounded-sm` (4px)
- 圆形按钮：`rounded-full` (圆形)

### 卡片 (Cards)
- 普通卡片：`rounded-lg` (12px)
- 大卡片：`rounded-xl` (16px)
- 弹窗卡片：`rounded-xl` (16px)

### 气泡 (Bubbles)
- 聊天气泡：`rounded-lg` (12px)
- 特殊气泡：`rounded-md` (8px)

### 头像 (Avatars)
- 所有头像：`rounded-full` (圆形)

### 标签/徽章 (Badges)
- 小标签：`rounded-sm` (4px)
- 常规标签：`rounded-md` (8px)

### 输入框 (Inputs)
- 常规输入：`rounded-md` (8px)
- 搜索框：`rounded-md` (8px)

### 进度条 (Progress Bars)
- 所有进度条：`rounded-full` (圆形)

## 统计
- 修改文件数：12
- 统一圆角数：35 处
- 自定义圆角剩余：0

## 验证方法

### 视觉验证
1. 打开浏览器开发者工具
2. 检查所有元素的 border-radius
3. 确认所有值都是 4/8/12/16/9999px

### 代码验证
```bash
# 搜索非标准圆角
grep -r "rounded-\[" src/
grep -r "border-radius.*[0-9]px" src/
```

## 注意事项
- 不要使用 `rounded` (2px) - 已从设计中移除
- 不要使用 `rounded-2xl` (16px) - 使用 `rounded-xl`
- 不要使用 `rounded-3xl` (24px) - 使用 `rounded-xl`
- 头像必须使用 `rounded-full`
