'use client';

import type { CSSProperties, ReactNode } from 'react';
import Link from 'next/link';
import CategoryPill from '@/components/CategoryPill';
import BusinessSocialLinks from '@/components/BusinessSocialLinks';

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
  city?: string | null;
  country?: string | null;
  logoUrl?: string | null;
};

const HEADER_STYLES = [
  {
    gradient: 'linear-gradient(135deg, #0f766e 0%, #14b8a6 55%, #0d9488 100%)',
    pattern: 'dots',
  },
  {
    gradient: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 50%, #0ea5e9 100%)',
    pattern: 'stripes',
  },
  {
    gradient: 'linear-gradient(135deg, #7c2d12 0%, #c2410c 45%, #ea580c 100%)',
    pattern: 'grid',
  },
  {
    gradient: 'linear-gradient(135deg, #134e4a 0%, #0f766e 40%, #5eead4 100%)',
    pattern: 'waves',
  },
  {
    gradient: 'linear-gradient(135deg, #312e81 0%, #4f46e5 50%, #818cf8 100%)',
    pattern: 'chevrons',
  },
  {
    gradient: 'linear-gradient(135deg, #881337 0%, #be123c 45%, #fb7185 100%)',
    pattern: 'dots',
  },
  {
    gradient: 'linear-gradient(135deg, #365314 0%, #65a30d 50%, #a3e635 100%)',
    pattern: 'stripes',
  },
  {
    gradient: 'linear-gradient(135deg, #164e63 0%, #0891b2 50%, #67e8f9 100%)',
    pattern: 'grid',
  },
  {
    gradient: 'linear-gradient(135deg, #44403c 0%, #78716c 45%, #a8a29e 100%)',
    pattern: 'waves',
  },
  {
    gradient: 'linear-gradient(135deg, #9a3412 0%, #d97706 50%, #fbbf24 100%)',
    pattern: 'chevrons',
  },
  {
    gradient: 'linear-gradient(145deg, #1e293b 0%, #334155 40%, #64748b 100%)',
    pattern: 'dots',
  },
  {
    gradient: 'linear-gradient(135deg, #115e59 0%, #0d9488 35%, #f59e0b 100%)',
    pattern: 'stripes',
  },
] as const;

type PatternKind = (typeof HEADER_STYLES)[number]['pattern'];

function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

function patternStyle(kind: PatternKind): CSSProperties {
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

function MailIcon() {
  return (
    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  );
}

function MapPinIcon() {
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
};

export default function BusinessDirectoryCard({
  business,
  titleHref,
  subtitle,
  badge,
  footer,
}: Props) {
  const initials = businessInitials(business.name || '');
  const seed = `${business.id}-${business.name || ''}`;
  const style = HEADER_STYLES[hashSeed(seed) % HEADER_STYLES.length];
  const location = [business.city, business.country].filter(Boolean).join(', ');
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

  return (
    <article className="group bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-emerald-200 transition-all duration-200 flex flex-row h-full min-h-[11rem]">
      {/* Identity rail */}
      <div
        className="relative w-[5.5rem] sm:w-28 shrink-0 flex flex-col items-center px-2 py-4"
        style={{ backgroundImage: style.gradient }}
      >
        <div className="absolute inset-0" style={patternStyle(style.pattern)} aria-hidden />
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-black/25" aria-hidden />

        <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white/15 ring-2 ring-white/30 flex items-center justify-center shadow-lg backdrop-blur-[2px] overflow-hidden shrink-0">
          {business.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={business.logoUrl}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-white text-lg sm:text-xl font-semibold tracking-wide select-none drop-shadow-sm">
              {initials}
            </span>
          )}
        </div>

        {hasSocial && (
          <div className="relative mt-auto w-full pt-3">
            <BusinessSocialLinks business={business} variant="rail" className="mt-0" />
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
          <ul className="mt-4 pt-4 border-t border-stone-100 space-y-2 text-sm text-stone-600">
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
                  href={`tel:${business.phone}`}
                  className="inline-flex items-center gap-2 text-emerald-800 hover:text-emerald-950 hover:underline"
                >
                  <PhoneIcon />
                  <span>{business.phone}</span>
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

        {footer && (
          <div className="mt-auto pt-4 border-t border-stone-100">
            {footer}
          </div>
        )}
      </div>
    </article>
  );
}
