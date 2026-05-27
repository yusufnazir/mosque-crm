'use client';

import { ReactNode } from 'react';

/** Stacked title + full-width action button on mobile */
export function TabSectionHeader({
  title,
  subtitle,
  action,
  /** When true, adds standard card inset padding and bottom border (no outer margin) */
  inCard = false,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  inCard?: boolean;
}) {
  const inner = (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1">
        <h2 className="text-lg font-semibold text-stone-900 break-words">{title}</h2>
        {subtitle && <div className="text-sm text-stone-500 mt-1 break-words">{subtitle}</div>}
      </div>
      {action && <div className="w-full sm:w-auto shrink-0 [&_button]:w-full sm:[&_button]:w-auto">{action}</div>}
    </div>
  );

  if (inCard) {
    return <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-stone-100">{inner}</div>;
  }

  return <div className="mb-4 sm:mb-5">{inner}</div>;
}

export function ResponsiveFilters({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 mb-4 ${className}`}>
      {children}
    </div>
  );
}

const filterInputClass =
  'w-full min-w-0 max-w-full sm:w-auto sm:min-w-[12rem] px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500';

export function ResponsiveFilterInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className = '', ...rest } = props;
  return <input className={`${filterInputClass} ${className}`} {...rest} />;
}

export function ResponsiveFilterSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const { className = '', ...rest } = props;
  return <select className={`${filterInputClass} ${className}`} {...rest} />;
}

export function ListCountFooter({ children }: { children: ReactNode }) {
  return <div className="bg-stone-50 px-4 sm:px-6 py-3 text-xs text-stone-500">{children}</div>;
}

export function MobileCardList({ children }: { children: ReactNode }) {
  return <ul className="md:hidden w-full min-w-0 divide-y divide-stone-100">{children}</ul>;
}

export function MobileCardItem({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <li className={`p-4 ${className}`}>{children}</li>;
}

export function DesktopTableWrap({ children }: { children: ReactNode }) {
  return <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden">{children}</div>;
}
