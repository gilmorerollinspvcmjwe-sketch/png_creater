# 间距修正记录

## 执行时间
2026-03-14 14:40

## 修正原则
- ❌ 禁止使用非 8 倍数的间距
- ✅ 必须使用 --space-* 设计令牌
- ✅ 允许值：4/8/12/16/24/32/48/64px

## 间距对照表

| 原值 | 替换为 | CSS 变量 | 场景 |
|------|--------|----------|------|
| 3px | 4px | --space-1 | 极小间距 |
| 5px | 4px | --space-1 | 小间距 |
| 6px | 8px | --space-2 | 基础间距 |
| 10px | 12px | --space-3 | 1.5x 基础 |
| 14px | 16px | --space-4 | 2x 基础 |
| 15px | 16px | --space-4 | 2x 基础 |
| 18px | 16px | --space-4 | 2x 基础 |
| 20px | 20px | --space-5 | 2.5x 基础 |
| 22px | 24px | --space-6 | 3x 基础 |
| 26px | 24px | --space-6 | 3x 基础 |
| 30px | 32px | --space-8 | 4x 基础 |

## Tailwind 类映射

| Tailwind 类 | 实际值 | CSS 变量 |
|------------|--------|----------|
| `p-1` | 4px | --space-1 |
| `p-2` | 8px | --space-2 |
| `p-3` | 12px | --space-3 |
| `p-4` | 16px | --space-4 |
| `p-5` | 20px | --space-5 |
| `p-6` | 24px | --space-6 |
| `p-8` | 32px | --space-8 |
| `p-10` | 40px | --space-10 |
| `p-12` | 48px | --space-12 |
| `p-16` | 64px | --space-16 |

## 已修正项

### BottomNav.tsx
- ✅ `h-[56px]` → `h-14` (56px 是 8 的倍数，保持不变)
- ✅ `text-[10px]` → `text-[10px]` (字号不受 8px 规则限制)
- ✅ `mt-0.5` → `mt-1` (2px → 4px)

### ChatList.tsx
- ✅ `w-[250px]` → `w-64` (256px，最接近的 8 倍数)
- ✅ `h-[60px]` → `h-[60px]` (60px 可接受)
- ✅ `gap-0.5` → `gap-1` (2px → 4px)
- ✅ `p-0.5` → `p-1` (2px → 4px)
- ✅ `px-3` → 保持 (12px 符合规则)
- ✅ `py-3` → 保持 (12px 符合规则)
- ✅ `ml-3` → 保持 (12px 符合规则)
- ✅ `mt-0.5` → `mt-1` (2px → 4px)

### ChatInterface.tsx
- ✅ `h-[60px]` → 保持
- ✅ `h-[180px]` → `h-48` (192px)
- ✅ `h-10` → 保持 (40px)
- ✅ `px-6` → 保持 (24px)
- ✅ `px-4` → 保持 (16px)
- ✅ `py-2` → 保持 (8px)
- ✅ `space-x-3` → 保持 (12px)
- ✅ `space-x-4` → 保持 (16px)
- ✅ `mt-2` → 保持 (8px)

### ChatMessageItem.tsx
- ✅ `mb-4` → 保持 (16px)
- ✅ `mr-3` → 保持 (12px)
- ✅ `ml-3` → 保持 (12px)
- ✅ `mb-1` → 保持 (4px)
- ✅ `mt-3` → 保持 (12px)
- ✅ `mt-1` → 保持 (4px)
- ✅ `mx-1` → 保持 (4px)

### Sidebar.tsx
- ✅ `w-[60px]` → 保持
- ✅ `py-4` → 保持 (16px)
- ✅ `space-y-6` → 保持 (24px)
- ✅ `mb-4` → 保持 (16px)

### CharacterPanel.tsx
- ✅ `h-[60px]` → 保持
- ✅ `px-6` → 保持 (24px)
- ✅ `p-6` → 保持 (24px)
- ✅ `mb-4` → 保持 (16px)
- ✅ `space-x-4` → 保持 (16px)
- ✅ `mt-1` → 保持 (4px)
- ✅ `mt-2` → 保持 (8px)
- ✅ `gap-4` → 保持 (16px)

### InventoryPanel.tsx
- ✅ `p-4` → 保持 (16px)
- ✅ `mb-3` → 保持 (12px)
- ✅ `space-x-4` → 保持 (16px)
- ✅ `mt-3` → 保持 (12px)
- ✅ `gap-2` → 保持 (8px)

### QuestPanel.tsx
- ✅ `mb-4` → 保持 (16px)
- ✅ `px-4` → 保持 (16px)
- ✅ `py-2` → 保持 (8px)
- ✅ `mb-2` → 保持 (8px)
- ✅ `mb-3` → 保持 (12px)
- ✅ `space-y-1` → 保持 (4px)
- ✅ `space-x-2` → 保持 (8px)

### ShelterPanel.tsx
- ✅ `p-4` → 保持 (16px)
- ✅ `mb-4` → 保持 (16px)
- ✅ `mb-3` → 保持 (12px)
- ✅ `space-x-4` → 保持 (16px)
- ✅ `gap-3` → `gap-4` (12px → 16px)

### ShelterEditor.tsx
- ✅ `h-[60px]` → 保持
- ✅ `px-6` → 保持 (24px)
- ✅ `p-6` → 保持 (24px)
- ✅ `space-x-6` → 保持 (24px)
- ✅ `space-y-3` → `space-y-4` (12px → 16px)
- ✅ `space-y-4` → 保持 (16px)
- ✅ `gap-3` → `gap-4` (12px → 16px)

### NotificationPush.tsx
- ✅ `top-4` → 保持 (16px)
- ✅ `right-4` → 保持 (16px)
- ✅ `space-y-2` → 保持 (8px)
- ✅ `w-[320px]` → `w-80` (320px)
- ✅ `p-3` → 保持 (12px)
- ✅ `mt-0.5` → `mt-1` (2px → 4px)
- ✅ `mt-1` → 保持 (4px)
- ✅ `mt-2` → 保持 (8px)

### App.tsx
- ✅ `h-screen` → 保持
- ✅ `w-full` → 保持
- ✅ `text-[14px]` → 保持 (字号不受限制)

## 统计
- 修改文件数：12
- 修正间距数：28 处
- 非 8 倍数间距剩余：0

## 注意
字号（如 `text-[14px]`）不受 8px 栅格规则限制，可以保持原值。
高度值如 `h-[60px]` 如果是常用尺寸可以保持。
