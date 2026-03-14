import React from 'react';

export interface EmptyStateProps {
  /** 空状态类型：noData-无数据，noNetwork-无网络，noPermission-无权限，custom-自定义 */
  type?: 'noData' | 'noNetwork' | 'noPermission' | 'custom';
  /** 自定义图标 */
  icon?: React.ReactNode;
  /** 标题 */
  title?: string;
  /** 描述文本 */
  description?: string;
  /** 操作按钮 */
  action?: React.ReactNode;
  /** 自定义样式 */
  className?: string;
}

/**
 * 空状态组件
 * 功能：无数据、无网络、无权限等场景
 */
const EmptyState: React.FC<EmptyStateProps> = ({
  type = 'noData',
  icon,
  title,
  description,
  action,
  className = '',
}) => {
  const getDefaultContent = () => {
    switch (type) {
      case 'noData':
        return {
          icon: icon || '📭',
          title: title || '暂无数据',
          description: description || '这里空空如也，先去添加一些内容吧～',
        };
      case 'noNetwork':
        return {
          icon: icon || '📡',
          title: title || '网络连接失败',
          description: description || '请检查网络设置后重试',
        };
      case 'noPermission':
        return {
          icon: icon || '🔒',
          title: title || '无权限访问',
          description: description || '您没有权限查看此内容',
        };
      default:
        return {
          icon: icon || '❓',
          title: title || '空状态',
          description: description || '',
        };
    }
  };

  const content = getDefaultContent();

  return (
    <div
      className={`
        flex flex-col items-center justify-center
        py-12 px-4 text-center
        animate-fade-in
        ${className}
      `}
      style={{
        padding: `${'var(--space-12)'} ${'var(--space-4)'}`,
      }}
    >
      <div
        className="text-6xl mb-4"
        style={{
          fontSize: 'var(--text-2xl)',
          marginBottom: 'var(--space-4)',
        }}
      >
        {content.icon}
      </div>
      
      <h3
        className="text-lg font-semibold text-[var(--neutral-700)] mb-2"
        style={{
          fontSize: 'var(--text-lg)',
          fontWeight: 'var(--font-semibold)',
          color: 'var(--neutral-700)',
          marginBottom: 'var(--space-2)',
        }}
      >
        {content.title}
      </h3>
      
      {content.description && (
        <p
          className="text-sm text-[var(--neutral-500)] mb-4 max-w-sm"
          style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--neutral-500)',
            marginBottom: 'var(--space-4)',
          }}
        >
          {content.description}
        </p>
      )}
      
      {action && (
        <div
          className="mt-2"
          style={{ marginTop: 'var(--space-2)' }}
        >
          {action}
        </div>
      )}
    </div>
  );
};

export default EmptyState;
