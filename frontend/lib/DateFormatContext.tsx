'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { formatDate as utilsFormatDate } from './utils';

export const DEFAULT_DATE_FORMAT = 'dd MMM yyyy';

export const DATE_FORMAT_PRESETS = [
  { label: '11 Apr 2026', value: 'dd MMM yyyy' },
  { label: '11 April 2026', value: 'd MMMM yyyy' },
  { label: 'Apr 11, 2026', value: 'MMM d, yyyy' },
  { label: 'April 11, 2026', value: 'MMMM d, yyyy' },
  { label: '11/04/2026', value: 'dd/MM/yyyy' },
  { label: '04/11/2026', value: 'MM/dd/yyyy' },
  { label: '2026-04-11', value: 'yyyy-MM-dd' },
  { label: '11-04-2026', value: 'dd-MM-yyyy' },
];

interface DateFormatContextType {
  dateFormat: string;
  setDateFormat: (format: string) => void;
  formatDate: (dateString?: string | null) => string;
}

const DateFormatContext = createContext<DateFormatContextType>({
  dateFormat: DEFAULT_DATE_FORMAT,
  setDateFormat: () => {},
  formatDate: (d) => utilsFormatDate(d, DEFAULT_DATE_FORMAT),
});

export function DateFormatProvider({ children }: { children: React.ReactNode }) {
  const [dateFormat, setDateFormatState] = useState(DEFAULT_DATE_FORMAT);
  const hasFetched = useRef(false);

  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      fetch('/api/configurations/DATE_FORMAT')
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.value) setDateFormatState(data.value);
        })
        .catch(() => {});
    }
  }, []);

  const setDateFormat = (format: string) => setDateFormatState(format);

  const formatDate = (dateString?: string | null) =>
    utilsFormatDate(dateString, dateFormat);

  return (
    <DateFormatContext.Provider value={{ dateFormat, setDateFormat, formatDate }}>
      {children}
    </DateFormatContext.Provider>
  );
}

export function useDateFormat() {
  return useContext(DateFormatContext);
}
