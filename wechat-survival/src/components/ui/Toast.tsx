import React, { useEffect, useState } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  id: string;
  message: string;
  type?: ToastType;
  duration?: number;
  onClose: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({
  id,
  message,
  type = 'info',
  duration = 3000,
  onClose,
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => onClose(id), 200);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, id, onClose]);

  const getBgColor = () => {
    switch (type) {
      case 'success':
        return 'bg-[var(--color-success)]';
      case 'error':
        return 'bg-[var(--color-error)]';
      case 'warning':
        return 'bg-[var(--color-warning)]';
      case 'info':
      default:
        return 'bg-[var(--color-info)]';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      case 'info':
      default:
        return 'ℹ';
    }
  };

  if (!isVisible) return null;

  return (
    <div
      className={`
        ${getBgColor()}
        text-white px-4 py-3 rounded-md shadow-md
        flex items-center gap-3 min-w-[300px] max-w-[400px]
        animate-slide-in-right
      `}
      style={{
        backgroundColor: type === 'success' ? 'var(--color-success)' 
          : type === 'error' ? 'var(--color-error)'
          : type === 'warning' ? 'var(--color-warning)'
          : 'var(--color-info)',
      }}
    >
      <span className="text-lg font-semibold">{getIcon()}</span>
      <span className="flex-1 text-sm">{message}</span>
      <button
        onClick={() => {
          setIsVisible(false);
          setTimeout(() => onClose(id), 200);
        }}
        className="ml-2 hover:opacity-75 transition-opacity"
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
      >
        ✕
      </button>
    </div>
  );
};

export interface ToastContainerProps {
  toasts: Array<{ id: string; message: string; type?: ToastType; duration?: number }>;
  onClose: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onClose }) => {
  return (
    <div
      className="fixed top-4 right-4 flex flex-col gap-2 z-50"
      style={{ zIndex: 9999 }}
    >
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} onClose={onClose} />
      ))}
    </div>
  );
};

export default Toast;
