'use client';

import { useBusinessCategories } from '@/lib/useBusinessCategories';

type Props = {
  value: string;
  onChange: (value: string) => void;
};

export default function CategoryChipPicker({ value, onChange }: Props) {
  const { categories, loading } = useBusinessCategories();

  if (loading && categories.length === 0) {
    return <p className="text-sm text-stone-500">…</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((category) => {
        const selected = value === category.code;
        return (
          <button
            key={category.code}
            type="button"
            onClick={() => onChange(selected ? '' : category.code)}
            className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
              selected
                ? 'bg-emerald-700 text-white border-emerald-700'
                : 'bg-white text-stone-700 border-stone-300 hover:border-emerald-500 hover:text-emerald-800'
            }`}
          >
            {category.name}
          </button>
        );
      })}
    </div>
  );
}
