'use client';

import { useRef, useState } from 'react';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import LogoCropDialog from '@/components/LogoCropDialog';

type Props = {
  /** Already-uploaded logo (edit pages). */
  logoUrl?: string | null;
  /** Locally staged preview (create page) — wins over logoUrl when set. */
  previewUrl?: string | null;
  uploading: boolean;
  /** Edit pages: upload the cropped file immediately. */
  onUpload?: (file: File, onProgress?: (percent: number) => void) => Promise<void>;
  /** Create page: keep the cropped file so it can be uploaded after the business exists. */
  onSelect?: (file: File) => void;
  onDelete: () => void | Promise<void>;
  title?: string;
  hint?: string;
};

export default function BusinessLogoEditor({
  logoUrl,
  previewUrl,
  uploading,
  onUpload,
  onSelect,
  onDelete,
  title,
  hint,
}: Props) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewError, setPreviewError] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const displayUrl = previewUrl || logoUrl || null;
  const heading = title ?? t('my_businesses.logo.title');
  const helper = hint ?? t('my_businesses.logo.hint');

  const handleCropApply = async (cropped: File) => {
    setPendingFile(null);
    if (onSelect) {
      onSelect(cropped);
      return;
    }
    if (!onUpload) return;
    setProgress(null);
    try {
      await onUpload(cropped, (percent) => setProgress(percent));
    } finally {
      setProgress(null);
    }
  };

  return (
    <>
      <div className="rounded-xl border border-stone-200 bg-white p-5 mb-6">
        <h2 className="text-sm font-semibold text-stone-900">{heading}</h2>
        <p className="text-sm text-stone-500 mt-1">{helper}</p>

        <div className="mt-4 flex flex-wrap items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border border-stone-200 bg-white p-1.5">
            {displayUrl && !previewError ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={displayUrl}
                alt=""
                className="h-full w-full object-contain"
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
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (!file) return;
                setPreviewError(false);
                setPendingFile(file);
              }}
            />
            <button
              type="button"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
              className="px-3 py-1.5 text-sm rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-50 inline-flex items-center gap-2"
            >
              {uploading && (
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              )}
              {displayUrl ? t('my_businesses.logo.replace') : t('my_businesses.logo.upload')}
            </button>
            {displayUrl && (
              <button
                type="button"
                disabled={uploading}
                onClick={() => {
                  setPreviewError(false);
                  void onDelete();
                }}
                className="px-3 py-1.5 text-sm rounded-lg border border-stone-300 text-stone-700 hover:bg-stone-50 disabled:opacity-50"
              >
                {t('my_businesses.logo.remove')}
              </button>
            )}
          </div>
        </div>

        {uploading && (
          <div className="mt-3" role="status" aria-live="polite">
            <div className="mb-1 flex items-center justify-between text-xs text-stone-600">
              <span>{t('my_businesses.logo.uploading')}</span>
              {progress != null && <span className="tabular-nums">{progress}%</span>}
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-stone-200">
              <div
                className={`h-full rounded-full bg-emerald-600 ${progress != null ? 'transition-all duration-200' : 'animate-pulse'}`}
                style={{ width: progress != null ? `${Math.max(progress, 4)}%` : '100%' }}
              />
            </div>
          </div>
        )}
      </div>

      <LogoCropDialog
        file={pendingFile}
        onCancel={() => setPendingFile(null)}
        onApply={(cropped) => {
          void handleCropApply(cropped);
        }}
      />
    </>
  );
}
