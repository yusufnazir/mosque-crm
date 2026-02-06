'use client';

import { useTranslation } from '@/lib/i18n/LanguageContext';

interface LanguageSelectorProps {
  className?: string;
}

export default function LanguageSelector({ className = '' }: LanguageSelectorProps) {
  const { language, setLanguage } = useTranslation();

  return (
    <div className={`relative ${className}`}>
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value as 'en' | 'nl')}
        className="w-full px-4 py-2 bg-emerald-700 text-emerald-100 rounded-lg border border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 hover:bg-emerald-600 transition-all cursor-pointer appearance-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23d1fae5'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 0.5rem center',
          backgroundSize: '1.5em 1.5em',
          paddingRight: '2.5rem'
        }}
      >
        <option value="en">🇬🇧 English</option>
        <option value="nl">🇳🇱 Nederlands</option>
      </select>
    </div>
  );
}
