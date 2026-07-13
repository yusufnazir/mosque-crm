'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { BusinessCategoryDTO, businessCategoryApi } from '@/lib/businessCategoryApi';

let cachedLocale: string | null = null;
let cachedCategories: BusinessCategoryDTO[] | null = null;
let inflight: Promise<BusinessCategoryDTO[]> | null = null;

async function loadCategories(locale: 'en' | 'nl'): Promise<BusinessCategoryDTO[]> {
  if (cachedCategories && cachedLocale === locale) {
    return cachedCategories;
  }
  if (inflight && cachedLocale === locale) {
    return inflight;
  }
  cachedLocale = locale;
  inflight = businessCategoryApi.listActive(locale)
    .then((data) => {
      cachedCategories = Array.isArray(data) ? data : [];
      return cachedCategories;
    })
    .catch(() => {
      cachedCategories = [];
      return cachedCategories;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export function useBusinessCategories() {
  const { language } = useTranslation();
  const locale = language === 'nl' ? 'nl' : 'en';
  const [categories, setCategories] = useState<BusinessCategoryDTO[]>(
    cachedLocale === locale && cachedCategories ? cachedCategories : []
  );
  const [loading, setLoading] = useState(!(cachedLocale === locale && cachedCategories));

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadCategories(locale).then((data) => {
      if (!cancelled) {
        setCategories(data);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [locale]);

  const codeSet = useMemo(() => new Set(categories.map((c) => c.code)), [categories]);

  const labelFor = (code: string | null | undefined): string => {
    if (!code) return '';
    const match = categories.find((c) => c.code === code);
    return match?.name || code;
  };

  const isKnown = (code: string | null | undefined): boolean =>
    !!code && codeSet.has(code);

  return { categories, loading, labelFor, isKnown };
}
