'use client';

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderState {
  title: string;
  breadcrumbs: BreadcrumbItem[];
}

interface PageHeaderContextValue extends PageHeaderState {
  setPageHeader: (state: Partial<PageHeaderState>) => void;
}

const PageHeaderContext = createContext<PageHeaderContextValue>({
  title: '',
  breadcrumbs: [],
  setPageHeader: () => {},
});

export function PageHeaderProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PageHeaderState>({ title: '', breadcrumbs: [] });

  const setPageHeader = useCallback((partial: Partial<PageHeaderState>) => {
    setState((prev) => ({ ...prev, ...partial }));
  }, []);

  return (
    <PageHeaderContext.Provider value={{ ...state, setPageHeader }}>
      {children}
    </PageHeaderContext.Provider>
  );
}

export function usePageHeader() {
  return useContext(PageHeaderContext);
}

/** Hook for pages to set header title & breadcrumbs on mount. Clears on unmount. */
export function useSetPageHeader(title: string, breadcrumbs: BreadcrumbItem[]) {
  const { setPageHeader } = usePageHeader();
  useEffect(() => {
    setPageHeader({ title, breadcrumbs });
    return () => setPageHeader({ title: '', breadcrumbs: [] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, JSON.stringify(breadcrumbs)]);
}
