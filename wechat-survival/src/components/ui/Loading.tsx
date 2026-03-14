import React from 'react';

export interface LoadingProps {
  /** 加载类型：fullscreen-全屏，inline-局部，skeleton-骨架屏 */
  variant?: 'fullscreen' | 'inline' | 'skeleton';
  /** 加载文本 */
  text?: string;
  /** 骨架屏行数（仅 skeleton 类型使用） */
  skeletonRows?: number;
  /** 自定义样式 */
  className?: string;
}

/**
 * 加载状态组件
 * 功能：全屏加载、局部加载、骨架屏
 */
const Loading: React.FC<LoadingProps> = ({
  variant = 'inline',
  text = '加载中...',
  skeletonRows = 3,
  className = '',
}) => {
  // 全屏加载
  if (variant === 'fullscreen') {
    return (
      <div
        className={`
          fixed inset-0 bg-white/80 backdrop-blur-sm
          flex flex-col items-center justify-center
          animate-fade-in
          ${className}
        `}
        style={{ zIndex: 9998 }}
      >
        <div
          className="w-12 h-12 border-4 border-[var(--neutral-200)] border-t-[var(--color-primary)] rounded-full"
          style={{
            width: 'var(--space-12)',
            height: 'var(--space-12)',
            borderWidth: '4px',
            borderColor: 'var(--neutral-200)',
            borderTopColor: 'var(--color-primary)',
          }}
        />
        {text && (
          <p
            className="mt-4 text-sm text-[var(--neutral-600)]"
            style={{
              marginTop: 'var(--space-4)',
              fontSize: 'var(--text-sm)',
              color: 'var(--neutral-600)',
            }}
          >
            {text}
          </p>
        )}
      </div>
    );
  }

  // 骨架屏
  if (variant === 'skeleton') {
    return (
      <div className={`space-y-3 animate-pulse ${className}`}>
        {Array.from({ length: skeletonRows }).map((_, i) => (
          <div
            key={i}
            className="h-4 bg-[var(--neutral-200)] rounded"
            style={{
              height: 'var(--space-4)',
              backgroundColor: 'var(--neutral-200)',
              borderRadius: 'var(--radius-sm)',
            }}
          />
        ))}
      </div>
    );
  }

  // 局部加载（默认）
  return (
    <div
      className={`
        flex items-center justify-center gap-3
        py-8
        ${className}
      `}
      style={{ padding: 'var(--space-8)' }}
    >
      <div
        className="w-6 h-6 border-2 border-[var(--neutral-200)] border-t-[var(--color-primary)] rounded-full animate-spin"
        style={{
          width: 'var(--space-6)',
          height: 'var(--space-6)',
          borderWidth: '2px',
          borderColor: 'var(--neutral-200)',
          borderTopColor: 'var(--color-primary)',
        }}
      />
      {text && (
        <span
          className="text-sm text-[var(--neutral-600)]"
          style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--neutral-600)',
          }}
        >
          {text}
        </span>
      )}
    </div>
  );
};

export default Loading;
