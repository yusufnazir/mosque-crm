'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { useBusinessCategories } from '@/lib/useBusinessCategories';
import BusinessSocialLinks from '@/components/BusinessSocialLinks';
import {
  businessHeaderStyle,
  businessInitials,
  MailIcon,
  MapPinIcon,
  patternStyle,
  PhoneIcon,
  type DirectoryCardBusiness,
} from '@/components/BusinessDirectoryCard';
import { formatPhoneNumber, phoneHref } from '@/lib/formatPhone';

export type DetailBusiness = DirectoryCardBusiness & {
  listedByOrganizationName?: string | null;
  listedByOrganizationHandle?: string | null;
};

type Props = {
  business: DetailBusiness | null;
  onClose: () => void;
  /** Public SEO detail page — rendered as a “full page” link in the footer. */
  fullPageHref?: string;
  /** e.g. “Listed by Partner Org” for federated listings. */
  subtitle?: string;
};

function mapHref(business: DetailBusiness): string | null {
  const query = [business.address, business.city, business.country]
    .filter((part) => !!part && String(part).trim() !== '')
    .join(', ');
  if (!query) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export default function BusinessDetailDialog({ business, onClose, fullPageHref, subtitle }: Props) {
  const { t } = useTranslation();
  const { labelFor } = useBusinessCategories();
  const closeRef = useRef<HTMLButtonElement>(null);
  // Viewer state is keyed by business id, so opening another business never shows a stale photo.
  const [openPhoto, setOpenPhoto] = useState<{ businessId: number; url: string } | null>(null);

  useEffect(() => {
    if (!business) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [business, onClose]);

  if (!business) return null;

  const activeImageUrl = openPhoto && openPhoto.businessId === business.id ? openPhoto.url : null;
  const setActiveImageUrl = (url: string | null) =>
    setOpenPhoto(url ? { businessId: business.id, url } : null);

  const style = businessHeaderStyle(business);
  const initials = businessInitials(business.name || '');
  const categoryLabel = labelFor(business.category);
  const memberSinceYear = business.createdAt ? new Date(business.createdAt).getFullYear() : null;
  const location = [business.city, business.country].filter(Boolean).join(', ');
  const maps = mapHref(business);
  const hasSocial = !!(
    business.website ||
    business.facebookUrl ||
    business.instagramUrl ||
    business.tiktokUrl ||
    business.youtubeUrl ||
    business.linkedinUrl ||
    business.whatsappUrl
  );

  const pillClass =
    'inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium text-white ring-1 ring-white/40 backdrop-blur-[2px]';
  const sectionTitle = 'text-xs font-semibold uppercase tracking-wide text-stone-500';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div
        className="absolute inset-0 bg-stone-950/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="business-detail-title"
        className="relative flex w-full max-h-[calc(100vh_-_2rem)] flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-w-lg sm:rounded-2xl"
      >
        {/* Header — same deterministic gradient as the card, with a legibility scrim */}
        <div className="relative shrink-0 px-5 pb-5 pt-5 sm:px-6" style={{ backgroundImage: style.gradient }}>
          <div className="absolute inset-0" style={patternStyle(style.pattern)} aria-hidden />
          <div className="absolute inset-0 bg-black/30" aria-hidden />
          <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-black/25" aria-hidden />

          <div className="relative flex items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1.5 shadow-lg ring-1 ring-black/5">
              {business.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={business.logoUrl} alt="" className="h-full w-full object-contain" />
              ) : (
                <span className="select-none text-xl font-semibold tracking-wide text-stone-600">
                  {initials}
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1 pr-8">
              <h2 id="business-detail-title" className="text-xl font-semibold leading-snug text-white break-words">
                {business.name}
              </h2>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {categoryLabel && (
                  <span className={pillClass}>
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5a1.99 1.99 0 0 1 1.41.59l7 7a2 2 0 0 1 0 2.82l-5 5a2 2 0 0 1-2.82 0l-7-7A1.99 1.99 0 0 1 5 10V5a2 2 0 0 1 2-2z" />
                    </svg>
                    {categoryLabel}
                  </span>
                )}
                {memberSinceYear && (
                  <span className={pillClass}>
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l2.35 4.76 5.25.77-3.8 3.7.9 5.23L12 15l-4.7 2.46.9-5.23-3.8-3.7 5.25-.77L12 3z" />
                    </svg>
                    {t('directory.member_since', { year: String(memberSinceYear) })}
                  </span>
                )}
              </div>
              {subtitle && <p className="mt-2 text-xs text-white/85">{subtitle}</p>}
            </div>

            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label={t('common.close')}
              className="absolute right-0 top-0 inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/25 text-white ring-1 ring-white/40 transition-colors hover:bg-black/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body — scrolls inside the bounded panel */}
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
          {business.description && (
            <section>
              <h3 className={sectionTitle}>{t('directory.detail_about')}</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-stone-700">
                {business.description}
              </p>
            </section>
          )}

          {business.images && business.images.length > 0 && (
            <section>
              <h3 className={sectionTitle}>{t('directory.detail_photos')}</h3>
              {/* Thumbnails only — the full variant loads when a photo is opened. */}
              <div className="mt-2 grid grid-cols-3 gap-2">
                {business.images.map((image) => (
                  <button
                    key={image.id}
                    type="button"
                    onClick={() => setActiveImageUrl(image.url)}
                    className="aspect-4/3 overflow-hidden rounded-lg border border-stone-200 bg-stone-100 transition-colors hover:border-emerald-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image.thumbUrl}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </section>
          )}

          {(business.email || business.phone || location || business.address) && (
            <section>
              <h3 className={sectionTitle}>{t('directory.detail_contact')}</h3>
              <ul className="mt-2 space-y-2.5 text-sm">
                {business.email && (
                  <li>
                    <a
                      href={`mailto:${business.email}`}
                      className="inline-flex min-w-0 items-center gap-2 text-emerald-800 hover:text-emerald-950 hover:underline"
                    >
                      <MailIcon />
                      <span className="break-all">{business.email}</span>
                    </a>
                  </li>
                )}
                {business.phone && (
                  <li>
                    <a
                      href={phoneHref(business.phone)}
                      className="inline-flex items-center gap-2 text-emerald-800 hover:text-emerald-950 hover:underline"
                    >
                      <PhoneIcon />
                      <span>{formatPhoneNumber(business.phone)}</span>
                    </a>
                  </li>
                )}
                {(business.address || location) && (
                  <li className="flex items-start gap-2 text-stone-600">
                    <span className="mt-0.5">
                      <MapPinIcon />
                    </span>
                    <span>
                      {business.address && <span className="block">{business.address}</span>}
                      {location && <span className="block">{location}</span>}
                      {maps && (
                        <a
                          href={maps}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-emerald-800 hover:text-emerald-950 hover:underline"
                        >
                          {t('directory.detail_open_map')}
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7M9 7h8v8" />
                          </svg>
                        </a>
                      )}
                    </span>
                  </li>
                )}
              </ul>
            </section>
          )}

          {hasSocial && (
            <section>
              <h3 className={sectionTitle}>{t('directory.detail_online')}</h3>
              <BusinessSocialLinks business={business} className="mt-2" />
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-stone-200 bg-stone-50 px-5 py-3 sm:px-6">
          {fullPageHref ? (
            <Link
              href={fullPageHref}
              className="inline-flex items-center gap-1 text-sm font-medium text-emerald-800 hover:text-emerald-950 hover:underline"
            >
              {t('directory.detail_full_page')}
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7M9 7h8v8" />
              </svg>
            </Link>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-stone-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-600"
          >
            {t('common.close')}
          </button>
        </div>

        {/* Full-size photo viewer (thumbnail grid opens it) */}
        {activeImageUrl && (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center bg-stone-950/85 p-4"
            onClick={() => setActiveImageUrl(null)}
            aria-hidden
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={activeImageUrl}
              alt=""
              className="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              type="button"
              onClick={() => setActiveImageUrl(null)}
              aria-label={t('common.close')}
              className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white ring-1 ring-white/40 hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
