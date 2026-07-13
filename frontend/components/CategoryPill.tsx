'use client';

import { useBusinessCategories } from '@/lib/useBusinessCategories';

type Props = {
  category?: string | null;
  className?: string;
};

export default function CategoryPill({ category, className = '' }: Props) {
  const { labelFor } = useBusinessCategories();
  if (!category) return null;

  return (
    <span
      className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-100 ${className}`}
    >
      {labelFor(category)}
    </span>
  );
}
