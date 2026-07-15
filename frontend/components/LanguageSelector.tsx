'use client';

import { useTranslation } from '@/lib/i18n/LanguageContext';

interface LanguageSelectorProps {
  className?: string;
  /** Compact text toggle for public/marketing headers */
  variant?: 'default' | 'public';
}

export default function LanguageSelector({ className = '', variant = 'default' }: LanguageSelectorProps) {
  const { language, setLanguage } = useTranslation();

  if (variant === 'public') {
    return (
      <div
        className={`inline-flex items-center gap-1.5 text-sm ${className}`}
        role="group"
        aria-label="Language"
      >
        <button
          type="button"
          onClick={() => setLanguage('en')}
          className={`font-medium transition-colors ${
            language === 'en'
              ? 'text-emerald-800 underline underline-offset-4 decoration-emerald-600/60'
              : 'text-stone-400 hover:text-stone-600'
          }`}
          aria-pressed={language === 'en'}
        >
          EN
        </button>
        <span className="text-stone-300 select-none" aria-hidden>
          ·
        </span>
        <button
          type="button"
          onClick={() => setLanguage('nl')}
          className={`font-medium transition-colors ${
            language === 'nl'
              ? 'text-emerald-800 underline underline-offset-4 decoration-emerald-600/60'
              : 'text-stone-400 hover:text-stone-600'
          }`}
          aria-pressed={language === 'nl'}
        >
          NL
        </button>
      </div>
    );
  }

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
