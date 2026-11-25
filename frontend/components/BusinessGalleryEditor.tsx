'use client';

import { useRef, useState } from 'react';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import ConfirmDialog from '@/components/ConfirmDialog';
import {
  BUSINESS_IMAGE_MAX_COUNT,
  BUSINESS_IMAGE_MAX_SIZE_MB,
  type BusinessImageDTO,
} from '@/lib/businessDirectoryApi';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp'];

/**
 * Backend error codes → i18n keys. The API answers `{ code, error, message }`; the code
 * is language-neutral, so the user always sees a message in the UI language instead of
 * the server's English fallback text.
 */
const ERROR_CODE_KEYS: Record<string, string> = {
  EMPTY_FILE: 'business_gallery.error_empty',
  UNSUPPORTED_TYPE: 'business_gallery.error_type',
  FILE_TOO_LARGE: 'business_gallery.error_size_generic',
  IMAGE_LIMIT_REACHED: 'business_gallery.error_limit',
  PROCESSING_FAILED: 'business_gallery.error_unreadable',
  STORAGE_UNAVAILABLE: 'business_gallery.error_storage',
  SAVE_FAILED: 'business_gallery.upload_failed',
  IMAGE_NOT_FOUND: 'business_gallery.error_not_found',
  INVALID_ORDER: 'business_gallery.error_order',
};

/** Prefer a translated message for a known error code, else fall back to the server text. */
export function apiErrorMessage(
  error: unknown,
  fallback: string,
  translate?: (key: string) => string,
): string {
  if (error instanceof Error) {
    try {
      const parsed = JSON.parse(error.message) as { code?: string; error?: string; message?: string };
      const key = parsed?.code ? ERROR_CODE_KEYS[parsed.code] : undefined;
      if (key && translate) return translate(key);
      if (parsed?.error) return parsed.error;
      if (parsed?.message) return parsed.message;
    } catch {
      /* not JSON */
    }
    if (error.message && !error.message.startsWith('{')) return error.message;
  }
  return fallback;
}

type Props = {
  images: BusinessImageDTO[];
  /** Parent busy state (e.g. the business form is saving). */
  disabled?: boolean;
  onUpload: (file: File) => Promise<void>;
  onDelete: (imageId: number) => Promise<void>;
  onReorder: (imageIds: number[]) => Promise<void>;
};

/**
 * Gallery editor for a business listing: up to 5 photos, 5 MB each.
 *
 * Files are validated in the browser (type + size + count) so the user gets
 * instant feedback; the backend re-validates and re-encodes everything into the
 * bandwidth-friendly variants that are actually served.
 */
export default function BusinessGalleryEditor({
  images,
  disabled = false,
  onUpload,
  onDelete,
  onReorder,
}: Props) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<BusinessImageDTO | null>(null);

  const busy = working || disabled;
  const atLimit = images.length >= BUSINESS_IMAGE_MAX_COUNT;

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setError(null);

    const files = Array.from(fileList);
    const slots = BUSINESS_IMAGE_MAX_COUNT - images.length;
    if (slots <= 0) {
      setError(t('business_gallery.error_limit'));
      return;
    }

    const accepted: File[] = [];
    for (const file of files.slice(0, slots)) {
      if (!ACCEPTED_TYPES.includes(file.type.toLowerCase())) {
        setError(t('business_gallery.error_type'));
        continue;
      }
      if (file.size > BUSINESS_IMAGE_MAX_SIZE_MB * 1024 * 1024) {
        setError(t('business_gallery.error_size', { name: file.name }));
        continue;
      }
      accepted.push(file);
    }
    if (files.length > slots) {
      // Some files were dropped because the gallery is (almost) full.
      setError(t('business_gallery.error_limit'));
    }

    setWorking(true);
    try {
      for (const file of accepted) {
        await onUpload(file);
      }
    } catch (e) {
      setError(apiErrorMessage(e, t('business_gallery.upload_failed'), t));
    } finally {
      setWorking(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const move = async (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= images.length) return;
    const ids = images.map((image) => image.id);
    const [moved] = ids.splice(index, 1);
    ids.splice(target, 0, moved);
    setError(null);
    setWorking(true);
    try {
      await onReorder(ids);
    } catch (e) {
      setError(apiErrorMessage(e, t('business_gallery.reorder_failed'), t));
    } finally {
      setWorking(false);
    }
  };

  const confirmDelete = async () => {
    const image = pendingDelete;
    setPendingDelete(null);
    if (!image) return;
    setError(null);
    setWorking(true);
    try {
      await onDelete(image.id);
    } catch (e) {
      setError(apiErrorMessage(e, t('business_gallery.delete_failed'), t));
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 mb-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-stone-900">{t('business_gallery.title')}</h2>
        <span className="text-xs text-stone-500">
          {t('business_gallery.count', {
            count: images.length,
            max: BUSINESS_IMAGE_MAX_COUNT,
          })}
        </span>
      </div>
      <p className="text-sm text-stone-500 mt-1">{t('business_gallery.hint')}</p>

      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
        {images.map((image, index) => (
          <div
            key={image.id}
            className="relative aspect-4/3 rounded-lg overflow-hidden border border-stone-200 bg-stone-100"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.thumbUrl}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover"
            />
            {index === 0 && (
              <span className="absolute left-2 top-2 rounded-full bg-emerald-700/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                {t('business_gallery.cover')}
              </span>
            )}
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/60 to-transparent p-1.5">
              <div className="flex gap-1">
                <button
                  type="button"
                  disabled={busy || index === 0}
                  onClick={() => move(index, -1)}
                  aria-label={t('business_gallery.move_left')}
                  title={t('business_gallery.move_left')}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-white/90 text-stone-700 hover:bg-white disabled:opacity-40"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  type="button"
                  disabled={busy || index === images.length - 1}
                  onClick={() => move(index, 1)}
                  aria-label={t('business_gallery.move_right')}
                  title={t('business_gallery.move_right')}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-white/90 text-stone-700 hover:bg-white disabled:opacity-40"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => setPendingDelete(image)}
                aria-label={t('business_gallery.remove')}
                title={t('business_gallery.remove')}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-white/90 text-red-600 hover:bg-white disabled:opacity-40"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 7h12M9 7V5h6v2m-8 0l1 12h8l1-12" />
                </svg>
              </button>
            </div>
          </div>
        ))}

        {!atLimit && (
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="aspect-4/3 rounded-lg border-2 border-dashed border-stone-300 bg-stone-50 text-stone-500 hover:border-emerald-400 hover:text-emerald-700 disabled:opacity-50 flex flex-col items-center justify-center gap-1"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
            </svg>
            <span className="text-xs font-medium">
              {working ? t('business_gallery.uploading') : t('business_gallery.add')}
            </span>
          </button>
        )}
      </div>

      {images.length === 0 && (
        <p className="mt-3 text-xs text-stone-400">{t('business_gallery.empty')}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <ConfirmDialog
        open={pendingDelete !== null}
        title={t('business_gallery.delete_title')}
        message={t('business_gallery.delete_message')}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
