import { useEffect } from 'react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  onClose: () => void;
}

export default function Toast({ message, type = 'success', duration = 3000, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const colors = {
    success: 'bg-green-600',
    error: 'bg-red-600',
    warning: 'bg-yellow-600',
    info: 'bg-blue-600',
  };

  return (
    <div className={`fixed top-4 right-4 ${colors[type]} text-white px-4 py-3 rounded-lg shadow-lg z-50 animate-slide-in`}>
      <div className="flex items-center gap-2">
        {type === 'success' && <span>✓</span>}
        {type === 'error' && <span>✕</span>}
        {type === 'warning' && <span>⚠</span>}
        {type === 'info' && <span>ℹ</span>}
        <span>{message}</span>
      </div>
    </div>
  );
}
