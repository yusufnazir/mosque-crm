'use client';

import { ReactNode, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n/LanguageContext';

const SIZE_CLASS = {
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
} as const;

interface EventFormModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer: ReactNode;
  size?: keyof typeof SIZE_CLASS;
}

export const EVENT_FORM_INPUT =
  'w-full px-3 py-2 border border-stone-300 rounded-lg text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500';
export const EVENT_FORM_BTN_PRIMARY =
  'inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-700 text-white text-sm font-medium rounded-lg hover:bg-emerald-800 disabled:opacity-50 transition-colors w-full sm:w-auto';
export const EVENT_FORM_BTN_SECONDARY =
  'inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-stone-700 text-sm font-medium rounded-lg border border-stone-300 bg-white hover:bg-stone-50 transition-colors w-full sm:w-auto';

export default function EventFormModal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = 'md',
}: EventFormModalProps) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/40"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-form-modal-title"
    >
      <div
        className={`bg-white rounded-t-2xl sm:rounded-xl shadow-xl w-full ${SIZE_CLASS[size]} max-h-[min(90dvh,100%)] flex flex-col`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-4 sm:px-6 py-4 border-b border-stone-100 shrink-0">
          <div className="min-w-0">
            <h3 id="event-form-modal-title" className="text-lg font-semibold text-stone-900">
              {title}
            </h3>
            {subtitle ? <div className="text-sm text-stone-500 mt-1">{subtitle}</div> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 p-1.5 -mr-1 text-stone-400 hover:text-stone-600 rounded-lg"
            aria-label={t('common.close')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-4 sm:px-6 py-4 overflow-y-auto flex-1 min-h-0">{children}</div>
        <div className="px-4 sm:px-6 py-4 bg-stone-50 border-t border-stone-100 rounded-b-2xl sm:rounded-b-xl shrink-0 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3">
          {footer}
        </div>
      </div>
    </div>
  );
}
