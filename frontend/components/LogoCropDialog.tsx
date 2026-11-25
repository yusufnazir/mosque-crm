'use client';

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { useTranslation } from '@/lib/i18n/LanguageContext';

/** Side length of the square crop viewport, in CSS pixels. */
const VIEWPORT = 256;
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
/** Longest side of the produced logo — mirrors BusinessImageProcessor.LOGO_MAX_DIMENSION. */
const OUTPUT_MAX = 512;

type Props = {
  /** The image the user picked; the dialog renders nothing until this is set. */
  file: File | null;
  onCancel: () => void;
  onApply: (cropped: File) => void;
};

type LoadedImage = {
  element: HTMLImageElement;
  width: number;
  height: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Square logo cropper: drag to reposition, slider to zoom, then apply.
 *
 * The square viewport is exactly what the directory card shows. Transparent areas
 * are drawn on white to match the white logo tile, and the result is exported as a
 * JPEG (≤512 px) so the upload stays small.
 */
export default function LogoCropDialog({ file, onCancel, onApply }: Props) {
  const { t } = useTranslation();
  const [image, setImage] = useState<LoadedImage | null>(null);
  const [error, setError] = useState(false);
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    baseX: number;
    baseY: number;
  } | null>(null);

  // Load the picked file. The dialog is mounted fresh for every selection, so the
  // useState initial values already represent a reset crop.
  useEffect(() => {
    if (!file) return;

    const url = URL.createObjectURL(file);
    const element = new Image();
    element.onload = () => {
      const width = element.naturalWidth || element.width;
      const height = element.naturalHeight || element.height;
      if (!width || !height) {
        setError(true);
        return;
      }
      setImage({ element, width, height });
    };
    element.onerror = () => setError(true);
    element.src = url;

    return () => {
      element.onload = null;
      element.onerror = null;
      URL.revokeObjectURL(url);
    };
  }, [file]);

  // Zoom 1 = the whole image fits; higher values crop in.
  const containScale = image ? Math.min(VIEWPORT / image.width, VIEWPORT / image.height) : 1;
  const scale = containScale * zoom;
  const displayedWidth = image ? image.width * scale : VIEWPORT;
  const displayedHeight = image ? image.height * scale : VIEWPORT;
  const maxOffsetX = Math.max(0, (displayedWidth - VIEWPORT) / 2);
  const maxOffsetY = Math.max(0, (displayedHeight - VIEWPORT) / 2);

  /** Zoom and re-clamp in the same event so no effect is needed. */
  const handleZoomChange = (nextZoom: number) => {
    const nextScale = containScale * nextZoom;
    const nextWidth = image ? image.width * nextScale : VIEWPORT;
    const nextHeight = image ? image.height * nextScale : VIEWPORT;
    const nextMaxX = Math.max(0, (nextWidth - VIEWPORT) / 2);
    const nextMaxY = Math.max(0, (nextHeight - VIEWPORT) / 2);
    setZoom(nextZoom);
    setOffset((prev) => ({
      x: clamp(prev.x, -nextMaxX, nextMaxX),
      y: clamp(prev.y, -nextMaxY, nextMaxY),
    }));
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!image) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      baseX: offset.x,
      baseY: offset.y,
    };
    setDragging(true);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    setOffset({
      x: clamp(drag.baseX + (event.clientX - drag.startX), -maxOffsetX, maxOffsetX),
      y: clamp(drag.baseY + (event.clientY - drag.startY), -maxOffsetY, maxOffsetY),
    });
  };

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setDragging(false);
  };

  const reset = useCallback(() => {
    setZoom(MIN_ZOOM);
    setOffset({ x: 0, y: 0 });
  }, []);

  // Escape closes without uploading.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onCancel]);

  const handleApply = () => {
    if (!image) return;
    // Source pixels covered by the square; never upscale beyond it.
    const outSize = Math.min(OUTPUT_MAX, Math.max(64, Math.round(VIEWPORT / scale)));
    const canvas = document.createElement('canvas');
    canvas.width = outSize;
    canvas.height = outSize;
    const context = canvas.getContext('2d');
    if (!context) {
      setError(true);
      return;
    }

    const ratio = outSize / VIEWPORT;
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, outSize, outSize);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(
      image.element,
      (outSize - displayedWidth * ratio) / 2 + offset.x * ratio,
      (outSize - displayedHeight * ratio) / 2 + offset.y * ratio,
      displayedWidth * ratio,
      displayedHeight * ratio,
    );

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError(true);
          return;
        }
        onApply(new File([blob], 'logo.jpg', { type: 'image/jpeg' }));
      },
      'image/jpeg',
      0.92,
    );
  };

  if (!file) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="logo-crop-title"
        className="relative w-full rounded-t-2xl bg-white shadow-2xl sm:max-w-sm sm:rounded-xl"
      >
        <div className="border-b border-stone-100 px-5 py-4">
          <h2 id="logo-crop-title" className="text-lg font-bold text-stone-900">
            {t('logo_crop.title')}
          </h2>
          <p className="mt-1 text-sm text-stone-500">{t('logo_crop.hint')}</p>
        </div>

        <div className="px-5 py-4">
          <div
            className="relative mx-auto touch-none select-none overflow-hidden rounded-xl border border-stone-200 bg-white"
            style={{
              width: VIEWPORT,
              height: VIEWPORT,
              cursor: image ? (dragging ? 'grabbing' : 'grab') : 'default',
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            aria-label={t('logo_crop.title')}
          >
            {image ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.element.src}
                  alt=""
                  draggable={false}
                  className="pointer-events-none absolute left-1/2 top-1/2 max-w-none"
                  style={{
                    width: displayedWidth,
                    height: displayedHeight,
                    transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px)`,
                  }}
                />
                <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-stone-300/80" aria-hidden />
              </>
            ) : error ? (
              <div className="flex h-full items-center justify-center p-4 text-center text-sm text-red-600">
                {t('logo_crop.error')}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-stone-500">
                {t('logo_crop.loading')}
              </div>
            )}
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between">
              <label htmlFor="logo-crop-zoom" className="text-xs font-medium text-stone-600">
                {t('logo_crop.zoom')}
              </label>
              <button
                type="button"
                onClick={reset}
                disabled={!image}
                className="text-xs font-medium text-emerald-700 hover:text-emerald-900 disabled:opacity-50"
              >
                {t('logo_crop.reset')}
              </button>
            </div>
            <input
              id="logo-crop-zoom"
              type="range"
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step={0.01}
              value={zoom}
              onChange={(event) => handleZoomChange(Number(event.target.value))}
              disabled={!image}
              className="mt-2 w-full accent-emerald-700"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-stone-100 px-5 py-4">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-stone-300 px-4 py-2 text-stone-600 transition-colors hover:bg-stone-50"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={!image}
            className="rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white transition-colors hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t('logo_crop.apply')}
          </button>
        </div>
      </div>
    </div>
  );
}
