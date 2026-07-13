'use client';

import { useRef, useState } from 'react';
import { useTranslation } from '@/lib/i18n/LanguageContext';

type Props = {
  logoUrl?: string | null;
  uploading: boolean;
  onUpload: (file: File) => Promise<void>;
  onDelete: () => Promise<void>;
};

export default function BusinessLogoEditor({ logoUrl, uploading, onUpload, onDelete }: Props) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewError, setPreviewError] = useState(false);

  const displayUrl = logoUrl ? `${logoUrl}${logoUrl.includes('?') ? '&' : '?'}t=${Date.now()}` : null;

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 mb-6">
      <h2 className="text-sm font-semibold text-stone-900">{t('my_businesses.logo.title')}</h2>
      <p className="text-sm text-stone-500 mt-1">{t('my_businesses.logo.hint')}</p>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <div className="w-20 h-20 rounded-full bg-stone-100 border border-stone-200 overflow-hidden flex items-center justify-center">
          {displayUrl && !previewError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={displayUrl}
              alt=""
              className="w-full h-full object-cover"
              onError={() => setPreviewError(true)}
            />
          ) : (
            <span className="text-xs text-stone-400">{t('my_businesses.logo.empty')}</span>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (!file) return;
              setPreviewError(false);
              await onUpload(file);
            }}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="px-3 py-1.5 text-sm rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            {logoUrl ? t('my_businesses.logo.replace') : t('my_businesses.logo.upload')}
          </button>
          {logoUrl && (
            <button
              type="button"
              disabled={uploading}
              onClick={onDelete}
              className="px-3 py-1.5 text-sm rounded-lg border border-stone-300 text-stone-700 hover:bg-stone-50 disabled:opacity-50"
            >
              {t('my_businesses.logo.remove')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
