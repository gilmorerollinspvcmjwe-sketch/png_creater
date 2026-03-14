import React from 'react';

export interface ValidationRule {
  /** 验证类型：required-required, email, phone, minLength, maxLength, pattern, custom */
  type: 'required' | 'email' | 'phone' | 'minLength' | 'maxLength' | 'pattern' | 'custom';
  /** 错误消息 */
  message: string;
  /** 最小长度（minLength 使用） */
  min?: number;
  /** 最大长度（maxLength 使用） */
  max?: number;
  /** 正则表达式（pattern 使用） */
  pattern?: RegExp;
  /** 自定义验证函数（custom 使用） */
  validator?: (value: string) => boolean;
}

export interface FormValidationProps {
  /** 字段值 */
  value: string;
  /** 验证规则列表 */
  rules?: ValidationRule[];
  /** 是否已触摸（用户交互过） */
  touched?: boolean;
  /** 自定义错误消息 */
  errorMessage?: string;
  /** 成功时显示成功状态 */
  showSuccess?: boolean;
}

/**
 * 表单校验组件
 * 功能：实时校验、错误提示、校验状态
 */
const FormValidation: React.FC<FormValidationProps> = ({
  value,
  rules = [],
  touched = false,
  errorMessage,
  showSuccess = false,
}) => {
  const validate = (): string | null => {
    // 如果有自定义错误消息，直接返回
    if (errorMessage) {
      return errorMessage;
    }

    // 如果没有规则或值为空且非必填，通过验证
    if (rules.length === 0) {
      return null;
    }

    // 遍历所有规则
    for (const rule of rules) {
      switch (rule.type) {
        case 'required':
          if (!value || value.trim() === '') {
            return rule.message;
          }
          break;

        case 'minLength':
          if (value && rule.min && value.length < rule.min) {
            return rule.message;
          }
          break;

        case 'maxLength':
          if (value && rule.max && value.length > rule.max) {
            return rule.message;
          }
          break;

        case 'email':
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (value && !emailRegex.test(value)) {
            return rule.message;
          }
          break;

        case 'phone':
          const phoneRegex = /^1[3-9]\d{9}$/;
          if (value && !phoneRegex.test(value)) {
            return rule.message;
          }
          break;

        case 'pattern':
          if (value && rule.pattern && !rule.pattern.test(value)) {
            return rule.message;
          }
          break;

        case 'custom':
          if (rule.validator && !rule.validator(value)) {
            return rule.message;
          }
          break;
      }
    }

    return null;
  };

  const error = touched ? validate() : null;
  const isSuccess = touched && !error && showSuccess;

  if (!touched && !errorMessage) {
    return null;
  }

  return (
    <div
      className={`
        mt-1 text-xs flex items-center gap-1
        ${error ? 'animate-fade-in' : ''}
      `}
      style={{
        marginTop: 'var(--space-1)',
        fontSize: 'var(--text-xs)',
      }}
    >
      {error ? (
        <>
          <span
            style={{ color: 'var(--color-error)' }}
            className="text-[var(--color-error)]"
          >
            ⚠
          </span>
          <span
            style={{ color: 'var(--color-error)' }}
            className="text-[var(--color-error)]"
          >
            {error}
          </span>
        </>
      ) : isSuccess ? (
        <>
          <span
            style={{ color: 'var(--color-success)' }}
            className="text-[var(--color-success)]"
          >
            ✓
          </span>
          <span
            style={{ color: 'var(--color-success)' }}
            className="text-[var(--color-success)]"
          >
            验证通过
          </span>
        </>
      ) : null}
    </div>
  );
};

/**
 * 验证 Hook
 */
export const useFormValidation = () => {
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [touched, setTouched] = React.useState<Record<string, boolean>>({});

  const validateField = (name: string, value: string, rules: ValidationRule[] = []): string | null => {
    for (const rule of rules) {
      switch (rule.type) {
        case 'required':
          if (!value || value.trim() === '') {
            return rule.message;
          }
          break;
        case 'minLength':
          if (value && rule.min && value.length < rule.min) {
            return rule.message;
          }
          break;
        case 'maxLength':
          if (value && rule.max && value.length > rule.max) {
            return rule.message;
          }
          break;
        case 'email':
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (value && !emailRegex.test(value)) {
            return rule.message;
          }
          break;
        case 'phone':
          const phoneRegex = /^1[3-9]\d{9}$/;
          if (value && !phoneRegex.test(value)) {
            return rule.message;
          }
          break;
        case 'pattern':
          if (value && rule.pattern && !rule.pattern.test(value)) {
            return rule.message;
          }
          break;
        case 'custom':
          if (rule.validator && !rule.validator(value)) {
            return rule.message;
          }
          break;
      }
    }
    return null;
  };

  const setFieldTouched = (name: string, isTouched: boolean = true) => {
    setTouched((prev) => ({ ...prev, [name]: isTouched }));
  };

  const setFieldError = (name: string, error: string | null) => {
    setErrors((prev) => {
      const newErrors = { ...prev };
      if (error) {
        newErrors[name] = error;
      } else {
        delete newErrors[name];
      }
      return newErrors;
    });
  };

  const validateForm = (
    values: Record<string, string>,
    rules: Record<string, ValidationRule[]>
  ): boolean => {
    const newErrors: Record<string, string> = {};
    const newTouched: Record<string, boolean> = {};

    Object.keys(rules).forEach((name) => {
      newTouched[name] = true;
      const error = validateField(name, values[name], rules[name]);
      if (error) {
        newErrors[name] = error;
      }
    });

    setErrors(newErrors);
    setTouched(newTouched);

    return Object.keys(newErrors).length === 0;
  };

  const reset = () => {
    setErrors({});
    setTouched({});
  };

  return {
    errors,
    touched,
    validateField,
    setFieldTouched,
    setFieldError,
    validateForm,
    reset,
  };
};

// React 类型声明补充
declare namespace React {
  function useState<S>(initialState: S | (() => S)): [S, (value: S | ((prev: S) => S)) => void];
}

export default FormValidation;
