'use client';

import { useEffect } from 'react';
import { usePageHeader } from '@/lib/page-header';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  title?: string;
}

/**
 * Headless breadcrumb component — renders nothing.
 * Sets the page header context so the Header component can display breadcrumbs.
 * Usage: <Breadcrumb items={[{ label: 'Settings', href: '/settings' }, { label: 'General' }]} />
 */
export function Breadcrumb({ items, title }: BreadcrumbProps) {
  const { setPageHeader } = usePageHeader();

  useEffect(() => {
    const pageTitle = title || items[items.length - 1]?.label || '';
    setPageHeader({ title: pageTitle, breadcrumbs: items });
    return () => setPageHeader({ title: '', breadcrumbs: [] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, JSON.stringify(items)]);

  return null;
}
