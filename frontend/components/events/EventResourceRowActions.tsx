'use client';

import { ReactNode } from 'react';

/** Stacked action buttons for mobile list rows */
export function RowActions({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex w-full min-w-0 flex-col sm:flex-row sm:flex-wrap gap-2 pt-3 mt-3 border-t border-stone-100 ${className}`}
      onClick={e => e.stopPropagation()}
      onKeyDown={e => e.stopPropagation()}
    >
      {children}
    </div>
  );
}

export function ActionButton({
  variant = 'default',
  onClick,
  children,
}: {
  variant?: 'default' | 'primary' | 'danger';
  onClick: () => void;
  children: ReactNode;
}) {
  const styles = {
    default: 'text-stone-700 bg-stone-100 hover:bg-stone-200',
    primary: 'text-emerald-800 bg-emerald-50 hover:bg-emerald-100',
    danger: 'text-red-700 bg-red-50 hover:bg-red-100',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full sm:flex-1 sm:min-w-[4.5rem] px-3 py-2 text-sm font-medium rounded-lg transition-colors ${styles[variant]}`}
    >
      {children}
    </button>
  );
}

export function SelectionIndicator({ selected }: { selected: boolean }) {
  return (
    <span
      className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
        selected ? 'border-emerald-600 bg-emerald-600' : 'border-stone-300 bg-white'
      }`}
      aria-hidden
    >
      {selected && <span className="h-2 w-2 rounded-full bg-white" />}
    </span>
  );
}
