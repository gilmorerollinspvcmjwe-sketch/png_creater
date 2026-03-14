# 组件使用指南 🧩

微信生存游戏基础 UE 组件使用文档。

---

## 📋 目录

1. [Toast 提示组件](#1-toast-提示组件)
2. [Loading 加载组件](#2-loading-加载组件)
3. [EmptyState 空状态组件](#3-emptystate-空状态组件)
4. [FormValidation 表单校验组件](#4-formvalidation-表单校验组件)
5. [交互状态](#交互状态)
6. [动效使用规范](#动效使用规范)
7. [UE 最佳实践](#ue-最佳实践)

---

## 1. Toast 提示组件

### 功能特性

- ✅ 成功/失败/警告/信息四种类型
- ✅ 自动消失（可配置时长）
- ✅ 可手动关闭
- ✅ 堆叠显示

### 基础用法

```tsx
import { ToastContainer, ToastType } from '@/components/ui';

// 在根组件中
const App = () => {
  const [toasts, setToasts] = useState([]);
  
  const addToast = (message: string, type: ToastType = 'info') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
  };
  
  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };
  
  return (
    <>
      <ToastContainer toasts={toasts} onClose={removeToast} />
      {/* 其他内容 */}
    </>
  );
};
```

### 使用示例

```tsx
// 成功提示
addToast('操作成功！', 'success');

// 错误提示
addToast('保存失败，请重试', 'error');

// 警告提示
addToast('该操作不可撤销', 'warning');

// 信息提示
addToast('正在同步数据...', 'info');

// 不自动消失
addToast({ message: '重要通知', type: 'info', duration: 0 });
```

### Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `id` | `string` | - | 唯一标识 |
| `message` | `string` | - | 提示内容 |
| `type` | `'success' \| 'error' \| 'warning' \| 'info'` | `'info'` | 类型 |
| `duration` | `number` | `3000` | 自动关闭时长 (ms)，0 为不自动关闭 |

---

## 2. Loading 加载组件

### 功能特性

- ✅ 全屏加载
- ✅ 局部加载
- ✅ 骨架屏

### 基础用法

```tsx
import { Loading } from '@/components/ui';
```

### 三种模式

#### 2.1 局部加载（默认）

```tsx
<Loading text="加载中..." />
```

#### 2.2 全屏加载

```tsx
<Loading variant="fullscreen" text="正在初始化..." />
```

#### 2.3 骨架屏

```tsx
<Loading variant="skeleton" skeletonRows={5} />
```

### Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `variant` | `'fullscreen' \| 'inline' \| 'skeleton'` | `'inline'` | 加载类型 |
| `text` | `string` | `'加载中...'` | 加载文本 |
| `skeletonRows` | `number` | `3` | 骨架屏行数 |
| `className` | `string` | - | 自定义样式类 |

---

## 3. EmptyState 空状态组件

### 功能特性

- ✅ 无数据、无网络、无权限等场景
- ✅ 可自定义图标、标题、描述
- ✅ 支持操作按钮

### 基础用法

```tsx
import { EmptyState } from '@/components/ui';
```

### 预设类型

```tsx
// 无数据
<EmptyState type="noData" />

// 无网络
<EmptyState type="noNetwork" />

// 无权限
<EmptyState type="noPermission" />
```

### 自定义内容

```tsx
<EmptyState
  icon="🎮"
  title="游戏未开始"
  description="点击下方按钮开始新的冒险"
  action={
    <button className="btn-primary">
      开始游戏
    </button>
  }
/>
```

### Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `type` | `'noData' \| 'noNetwork' \| 'noPermission' \| 'custom'` | `'noData'` | 类型 |
| `icon` | `ReactNode` | - | 自定义图标 |
| `title` | `string` | - | 标题 |
| `description` | `string` | - | 描述 |
| `action` | `ReactNode` | - | 操作按钮 |
| `className` | `string` | - | 自定义样式类 |

---

## 4. FormValidation 表单校验组件

### 功能特性

- ✅ 实时校验
- ✅ 错误提示
- ✅ 校验状态显示
- ✅ 支持多种校验规则

### 基础用法

```tsx
import { FormValidation, useFormValidation, ValidationRule } from '@/components/ui';
```

### 组件用法

```tsx
const [value, setValue] = useState('');
const [touched, setTouched] = useState(false);

const rules: ValidationRule[] = [
  { type: 'required', message: '此项为必填' },
  { type: 'minLength', min: 6, message: '至少 6 个字符' },
];

return (
  <div>
    <input
      value={value}
      onChange={e => setValue(e.target.value)}
      onBlur={() => setTouched(true)}
      className="input-interaction"
    />
    <FormValidation
      value={value}
      rules={rules}
      touched={touched}
      showSuccess
    />
  </div>
);
```

### Hook 用法

```tsx
const {
  errors,
  touched,
  validateField,
  setFieldTouched,
  setFieldError,
  validateForm,
  reset,
} = useFormValidation();

// 验证单个字段
const error = validateField('email', value, [
  { type: 'required', message: '必填' },
  { type: 'email', message: '邮箱格式不正确' },
]);

// 验证整个表单
const isValid = validateForm(
  { email, password },
  {
    email: [{ type: 'required', message: '必填' }, { type: 'email', message: '格式错误' }],
    password: [{ type: 'required', message: '必填' }, { type: 'minLength', min: 6, message: '至少 6 位' }],
  }
);
```

### 校验规则类型

| 类型 | 说明 | 额外参数 |
|------|------|----------|
| `required` | 必填 | - |
| `email` | 邮箱格式 | - |
| `phone` | 手机号格式 | - |
| `minLength` | 最小长度 | `min` |
| `maxLength` | 最大长度 | `max` |
| `pattern` | 正则匹配 | `pattern` |
| `custom` | 自定义验证 | `validator` |

---

## 交互状态

所有可交互元素必须使用统一的交互状态类。

### 按钮交互

```tsx
<button className="btn-interaction">
  点击我
</button>
```

### 卡片交互

```tsx
<div className="card-interaction">
  可点击的卡片
</div>
```

### 输入框交互

```tsx
<input className="input-interaction" />
```

### 列表项交互

```tsx
<div className="list-item-interaction">
  列表项
</div>
```

### 链接交互

```tsx
<a className="link-interaction" href="#">
  链接
</a>
```

---

## 动效使用规范

### 可用动画

| 类名 | 效果 | 时长 |
|------|------|------|
| `animate-fade-in` | 淡入 | 200ms |
| `animate-fade-out` | 淡出 | 200ms |
| `animate-slide-in-right` | 从右侧滑入 | 300ms |
| `animate-slide-in-left` | 从左侧滑入 | 300ms |
| `animate-slide-in-bottom` | 从底部滑入 | 300ms |
| `animate-scale-in` | 缩入 | 200ms |
| `animate-hover-lift` | Hover 抬升 | 300ms |
| `animate-spin` | 旋转 | 1s |
| `animate-pulse` | 脉冲 | 2s |

### 动画时长

```tsx
// 瞬时
<div className="duration-instant">瞬时</div>

// 快速
<div className="duration-fast">快速 (150ms)</div>

// 正常
<div className="duration-normal">正常 (200ms)</div>

// 慢速
<div className="duration-slow">慢速 (300ms)</div>
```

### 使用示例

```tsx
// Toast 进入
<Toast className="animate-slide-in-right" />

// 模态框出现
<Modal className="animate-scale-in" />

// 内容加载
<Content className="animate-fade-in" />

// 列表项 Hover
<ListItem className="animate-hover-lift" />
```

---

## UE 最佳实践

### 1. 即时反馈

用户操作后必须在 **200ms** 内给出反馈。

```tsx
// ✅ 正确：点击立即响应
<button className="btn-interaction" onClick={handleClick}>
  提交
</button>

// ❌ 错误：无反馈
<button onClick={handleClick}>
  提交
</button>
```

### 2. 加载状态

超过 **500ms** 的操作必须显示加载状态。

```tsx
// ✅ 正确：显示加载
const [loading, setLoading] = useState(false);

const handleSubmit = async () => {
  setLoading(true);
  await api.submit();
  setLoading(false);
};

return loading ? <Loading /> : <Form />;
```

### 3. 空状态处理

数据为空时显示友好的空状态，而非空白。

```tsx
// ✅ 正确
{data.length === 0 ? (
  <EmptyState type="noData" />
) : (
  <List data={data} />
)}

// ❌ 错误
<List data={data} /> {/* 空白页面 */}
```

### 4. 错误处理

错误必须有明确的提示和恢复建议。

```tsx
// ✅ 正确
try {
  await api.fetch();
} catch (error) {
  addToast('获取失败，请检查网络', 'error');
}

// ❌ 错误
try {
  await api.fetch();
} catch (error) {
  console.error(error); // 用户不知情
}
```

### 5. 表单校验

实时校验 + 提交前校验双重保障。

```tsx
// ✅ 正确
<FormValidation
  value={email}
  rules={[
    { type: 'required', message: '必填' },
    { type: 'email', message: '格式错误' },
  ]}
  touched={touched}
  showSuccess
/>
```

---

## 更新记录

| 日期 | 版本 | 变更内容 |
|------|------|----------|
| 2026-03-14 | v1.0 | 初始版本 |

---

**最后更新**: 2026-03-14  
**维护者**: 微信生存游戏开发团队
