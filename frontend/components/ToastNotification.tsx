import { useEffect, useState } from 'react';
import Link from 'next/link';

interface ToastAction {
  label: string;
  href: string;
}

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
  onClose?: () => void;
  /** Optional call-to-action link rendered below the message */
  action?: ToastAction;
}

const ToastNotification = ({ message, type = 'info', duration = 5000, onClose, action }: ToastProps) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      if (onClose) onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!isVisible) return null;

  const bgColor = {
    success: 'bg-green-700',
    error: 'bg-red-700',
    info: 'bg-blue-700',
    warning: 'bg-yellow-600',
  }[type];

  return (
    <div className={`fixed top-4 right-4 ${bgColor} text-white px-5 py-3 rounded-lg shadow-2xl z-50 max-w-sm`}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium block">{message}</span>
          {action && (
            <Link
              href={action.href}
              className="mt-2 inline-block text-xs font-semibold underline underline-offset-2 hover:opacity-80"
            >
              {action.label} →
            </Link>
          )}
        </div>
        <button
          onClick={() => { setIsVisible(false); onClose?.(); }}
          className="shrink-0 text-white hover:text-gray-200 focus:outline-none mt-0.5"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default ToastNotification;