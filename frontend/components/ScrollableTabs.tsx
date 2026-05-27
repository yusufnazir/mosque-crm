'use client';

import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from '@/lib/i18n/LanguageContext';

export type ScrollableTabItem = {
  id: string;
  label: ReactNode;
  badge?: number;
};

type ScrollableTabsProps = {
  tabs: ScrollableTabItem[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
  /** Use pill style (e.g. catalog / assignments sub-tabs) instead of underline */
  variant?: 'underline' | 'pills';
};

function useScrollAffordance(deps: unknown[] = []) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const update = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    el.addEventListener('scroll', update, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener('scroll', update);
    };
  }, [update, ...deps]);

  const scrollBy = (delta: number) => {
    scrollRef.current?.scrollBy({ left: delta, behavior: 'smooth' });
  };

  return { scrollRef, canScrollLeft, canScrollRight, update, scrollBy };
}

function ScrollFade({
  side,
  visible,
  fadeFrom = 'white',
}: {
  side: 'left' | 'right';
  visible: boolean;
  fadeFrom?: 'white' | 'stone-50';
}) {
  if (!visible) return null;
  const from = fadeFrom === 'stone-50' ? 'from-stone-50 via-stone-50/80' : 'from-white via-white/80';
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute top-0 bottom-0 z-10 w-10 sm:w-12 ${
        side === 'left'
          ? `left-0 bg-gradient-to-r ${from} to-transparent`
          : `right-0 bg-gradient-to-l ${from} to-transparent`
      }`}
    />
  );
}

function ScrollChevron({
  direction,
  onClick,
  label,
}: {
  direction: 'left' | 'right';
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`absolute top-1/2 z-20 -translate-y-1/2 hidden sm:flex h-8 w-8 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-600 shadow-md hover:bg-stone-50 hover:text-stone-900 ${
        direction === 'left' ? 'left-0.5' : 'right-0.5'
      }`}
    >
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        {direction === 'left' ? (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        )}
      </svg>
    </button>
  );
}

/**
 * Horizontally scrollable tab bar with fade edges, chevrons, and scroll hint when more tabs exist.
 */
export default function ScrollableTabs({
  tabs,
  activeId,
  onChange,
  className = '',
  variant = 'underline',
}: ScrollableTabsProps) {
  const { t } = useTranslation();
  const { scrollRef, canScrollLeft, canScrollRight, update, scrollBy } = useScrollAffordance([tabs.length, activeId]);

  /** Scroll only the tab strip — avoid scrollIntoView shifting the page horizontally */
  useEffect(() => {
    const container = scrollRef.current;
    const tab = container?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!container || !tab) return;
    const target = tab.offsetLeft - (container.clientWidth - tab.offsetWidth) / 2;
    container.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
    const id = requestAnimationFrame(update);
    return () => cancelAnimationFrame(id);
  }, [activeId, scrollRef, update]);

  const showHint = canScrollLeft || canScrollRight;
  const tabButtons = tabs.map(tab => (
    <button
      key={tab.id}
      type="button"
      role="tab"
      aria-selected={activeId === tab.id}
      onClick={() => onChange(tab.id)}
      className={
        variant === 'pills'
          ? `shrink-0 whitespace-nowrap px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              activeId === tab.id
                ? 'bg-white text-emerald-800 shadow-sm'
                : 'text-stone-600 hover:text-stone-900'
            }`
          : `shrink-0 whitespace-nowrap px-3 sm:px-4 py-2.5 sm:py-3 text-sm font-medium border-b-2 transition-colors ${
              activeId === tab.id
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300'
            }`
      }
    >
      {tab.label}
      {tab.badge != null && tab.badge > 0 && (
        <span
          className={
            variant === 'pills'
              ? 'ml-1.5 bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full'
              : 'ml-1.5 bg-stone-100 text-stone-600 text-xs px-1.5 py-0.5 rounded-full'
          }
        >
          {tab.badge}
        </span>
      )}
    </button>
  ));

  const fadeFrom = variant === 'pills' ? 'stone-50' : 'white';

  const scrollNav = (
    <div className="relative min-w-0 w-full">
      <ScrollFade side="left" visible={canScrollLeft} fadeFrom={fadeFrom} />
      <ScrollFade side="right" visible={canScrollRight} fadeFrom={fadeFrom} />
      {canScrollLeft && (
        <ScrollChevron direction="left" onClick={() => scrollBy(-160)} label={t('common.scroll_tabs_left')} />
      )}
      {canScrollRight && (
        <ScrollChevron direction="right" onClick={() => scrollBy(160)} label={t('common.scroll_tabs_right')} />
      )}
      <div
        ref={scrollRef}
        role="tablist"
        className={`flex w-full min-w-0 overflow-x-auto overscroll-x-contain scrollbar-thin ${
          variant === 'pills' ? 'gap-1' : 'gap-0.5 sm:gap-1 pb-px -mb-px'
        } ${canScrollLeft || canScrollRight ? 'sm:px-9' : ''}`}
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {tabButtons}
      </div>
    </div>
  );

  if (variant === 'pills') {
    return (
      <div className={`w-full min-w-0 ${className}`}>
        <div className="w-full min-w-0 rounded-lg border border-stone-200 bg-stone-50 p-1">
          {scrollNav}
        </div>
        {showHint && (
          <p className="mt-1.5 text-xs text-stone-400 flex items-center gap-1">
            <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" transform="rotate(-90 12 12)" />
            </svg>
            {t('common.scroll_for_more')}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={`w-full min-w-0 border-b border-stone-200 mb-4 sm:mb-6 ${className}`}>
      {scrollNav}
      {showHint && (
        <p className="mt-1 pb-1 text-xs text-stone-400 flex items-center gap-1 sm:hidden">
          <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
          {t('common.scroll_for_more')}
        </p>
      )}
    </div>
  );
}
