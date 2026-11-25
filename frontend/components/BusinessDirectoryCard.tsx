'use client';

import type { CSSProperties, ReactNode } from 'react';
import Link from 'next/link';
import CategoryPill from '@/components/CategoryPill';
import BusinessSocialLinks from '@/components/BusinessSocialLinks';
import { formatPhoneNumber, phoneHref } from '@/lib/formatPhone';

export type DirectoryCardBusiness = {
  id: number;
  name: string;
  category?: string | null;
  description?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  facebookUrl?: string | null;
  instagramUrl?: string | null;
  tiktokUrl?: string | null;
  youtubeUrl?: string | null;
  linkedinUrl?: string | null;
  whatsappUrl?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  logoUrl?: string | null;
  /** Gallery images, first one is the cover. Cards fall back to its thumbnail. */
  images?: { id: number; url: string; thumbUrl: string }[] | null;
  /** When the business joined the directory — powers the “Member since” badge. */
  createdAt?: string | null;
};

/**
 * Colour sets for the identity rail. Every stop is deliberately mid-to-dark:
 * white text sits on top of these, so keeping the lightest stop ≤ #0d9488 (plus
 * the scrim below) keeps the contrast ratio above WCAG AA on every card.
 */
const HEADER_STYLES = [
  {
    gradient: 'linear-gradient(135deg, #0f766e 0%, #0d9488 55%, #115e59 100%)',
    pattern: 'dots',
  },
  {
    gradient: 'linear-gradient(135deg, #1e3a5f 0%, #1d4ed8 55%, #075985 100%)',
    pattern: 'stripes',
  },
  {
    gradient: 'linear-gradient(135deg, #7c2d12 0%, #9a3412 50%, #b45309 100%)',
    pattern: 'grid',
  },
  {
    gradient: 'linear-gradient(135deg, #134e4a 0%, #115e59 45%, #0f766e 100%)',
    pattern: 'waves',
  },
  {
    gradient: 'linear-gradient(135deg, #312e81 0%, #3730a3 55%, #1e1b4b 100%)',
    pattern: 'chevrons',
  },
  {
    gradient: 'linear-gradient(135deg, #881337 0%, #9f1239 50%, #4c0519 100%)',
    pattern: 'dots',
  },
  {
    gradient: 'linear-gradient(135deg, #365314 0%, #3f6212 50%, #14532d 100%)',
    pattern: 'stripes',
  },
  {
    gradient: 'linear-gradient(135deg, #164e63 0%, #0e7490 55%, #155e75 100%)',
    pattern: 'grid',
  },
  {
    gradient: 'linear-gradient(135deg, #44403c 0%, #57534e 50%, #292524 100%)',
    pattern: 'waves',
  },
  {
    gradient: 'linear-gradient(135deg, #78350f 0%, #a16207 50%, #713f12 100%)',
    pattern: 'chevrons',
  },
  {
    gradient: 'linear-gradient(145deg, #1e293b 0%, #334155 45%, #0f172a 100%)',
    pattern: 'dots',
  },
  {
    gradient: 'linear-gradient(135deg, #115e59 0%, #0f766e 45%, #92400e 100%)',
    pattern: 'stripes',
  },
] as const;

type PatternKind = (typeof HEADER_STYLES)[number]['pattern'];

export type HeaderStyle = (typeof HEADER_STYLES)[number];

function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

/** Deterministic gradient/pattern pair for a business (shared by card + detail dialog). */
export function businessHeaderStyle(business: { id: number; name?: string | null }): HeaderStyle {
  const seed = `${business.id}-${business.name || ''}`;
  return HEADER_STYLES[hashSeed(seed) % HEADER_STYLES.length];
}

export function patternStyle(kind: PatternKind): CSSProperties {
  switch (kind) {
    case 'stripes':
      return {
        backgroundImage:
          'repeating-linear-gradient(135deg, rgba(255,255,255,0.14) 0 10px, transparent 10px 20px)',
      };
    case 'grid':
      return {
        backgroundImage:
          'linear-gradient(rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px)',
        backgroundSize: '22px 22px',
      };
    case 'waves':
      return {
        backgroundImage:
          'radial-gradient(ellipse 80% 50% at 10% 100%, rgba(255,255,255,0.18), transparent 55%), radial-gradient(ellipse 70% 45% at 90% 0%, rgba(255,255,255,0.14), transparent 50%), radial-gradient(ellipse 60% 40% at 50% 50%, rgba(0,0,0,0.12), transparent 60%)',
      };
    case 'chevrons':
      return {
        backgroundImage:
          'repeating-linear-gradient(60deg, rgba(255,255,255,0.1) 0 8px, transparent 8px 16px), repeating-linear-gradient(-60deg, rgba(255,255,255,0.08) 0 8px, transparent 8px 16px)',
      };
    case 'dots':
    default:
      return {
        backgroundImage:
          'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.28) 1px, transparent 0)',
        backgroundSize: '14px 14px',
      };
  }
}

export function businessInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function MailIcon() {
  return (
    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

export function PhoneIcon() {
  return (
    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  );
}

export function MapPinIcon() {
  return (
    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

type Props = {
  business: DirectoryCardBusiness;
  /** Detail page path — wraps the title only (avoids nested anchors with contact links). */
  titleHref?: string;
  subtitle?: string;
  badge?: ReactNode;
  footer?: ReactNode;
  /** Makes the card clickable and renders a “Details” button (opens the detail dialog). */
  onSelect?: (business: DirectoryCardBusiness) => void;
  /** Label for the details button (defaults to “Details”). */
  detailsLabel?: string;
};

export default function BusinessDirectoryCard({
  business,
  titleHref,
  subtitle,
  badge,
  footer,
  onSelect,
  detailsLabel = 'Details',
}: Props) {
  const initials = businessInitials(business.name || '');
  const style = businessHeaderStyle(business);
  const location = [business.city, business.country].filter(Boolean).join(', ');
  // Prefer the logo; otherwise use the cover photo's *thumbnail* (never the full image).
  const hasLogo = !!business.logoUrl;
  const coverUrl = business.logoUrl || business.images?.[0]?.thumbUrl || null;
  const hasContact = !!(business.email || business.phone || location);
  const hasSocial = !!(
    business.website ||
    business.facebookUrl ||
    business.instagramUrl ||
    business.tiktokUrl ||
    business.youtubeUrl ||
    business.linkedinUrl ||
    business.whatsappUrl
  );

  const handleSelect = () => onSelect?.(business);

  return (
    <article
      onClick={onSelect ? handleSelect : undefined}
      className={`group bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-emerald-200 transition-all duration-200 flex flex-row h-full min-h-[11rem]${
        onSelect ? ' cursor-pointer' : ''
      }`}
    >
      {/* Identity rail */}
      <div
        className="relative w-[5.5rem] sm:w-28 shrink-0 flex flex-col items-center px-2 py-4"
        style={{ backgroundImage: style.gradient }}
      >
        <div className="absolute inset-0" style={patternStyle(style.pattern)} aria-hidden />
        {/* Legibility scrim: keeps white text readable on every gradient tone. */}
        <div className="absolute inset-0 bg-black/30" aria-hidden />
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-black/25" aria-hidden />

        {/* Solid white tile: keeps transparent PNGs with dark wordmarks readable on every gradient. */}
        <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1.5 shadow-lg ring-1 ring-black/5 sm:h-16 sm:w-16">
          {coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverUrl}
              alt=""
              loading="lazy"
              className={`h-full w-full ${hasLogo ? 'object-contain' : 'object-cover'}`}
            />
          ) : (
            <span className="select-none text-lg font-semibold tracking-wide text-stone-600 sm:text-xl">
              {initials}
            </span>
          )}
        </div>

        {hasSocial && (
          <div className="relative mt-auto w-full pt-4" onClick={(e) => e.stopPropagation()}>
            <BusinessSocialLinks business={business} variant="rail" className="items-center mt-0" />
          </div>
        )}
      </div>

      {/* Details */}
      <div className="p-4 sm:p-5 flex flex-col flex-1 min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h3 className="text-lg font-semibold text-stone-900 leading-snug">
            {titleHref ? (
              <Link
                href={titleHref}
                onClick={(e) => e.stopPropagation()}
                className="hover:text-emerald-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded"
              >
                {business.name}
              </Link>
            ) : (
              business.name
            )}
          </h3>
          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            {badge}
            <CategoryPill category={business.category} />
          </div>
        </div>

        {subtitle && <p className="text-xs text-stone-500 mt-1.5">{subtitle}</p>}

        {business.description && (
          <p className="text-sm text-stone-600 mt-2 line-clamp-2 leading-relaxed">{business.description}</p>
        )}

        {hasContact && (
          <ul
            className="mt-4 pt-4 border-t border-stone-100 space-y-2 text-sm text-stone-600"
            onClick={(e) => e.stopPropagation()}
          >
            {business.email && (
              <li>
                <a
                  href={`mailto:${business.email}`}
                  className="inline-flex items-center gap-2 text-emerald-800 hover:text-emerald-950 hover:underline min-w-0"
                >
                  <MailIcon />
                  <span className="truncate">{business.email}</span>
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
            {location && (
              <li className="inline-flex items-center gap-2 text-stone-500">
                <MapPinIcon />
                <span>{location}</span>
              </li>
            )}
          </ul>
        )}

        {onSelect && (
          <div className="mt-auto pt-4">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleSelect();
              }}
              className="inline-flex items-center gap-1 text-sm font-medium text-emerald-800 hover:text-emerald-950 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded"
            >
              {detailsLabel}
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}

        {footer && (
          <div className="mt-auto pt-4 border-t border-stone-100">
            {footer}
          </div>
        )}
      </div>
    </article>
  );
}
