'use client';

import { useTranslation } from '@/lib/i18n/LanguageContext';

export type SocialLinksFields = {
  website?: string | null;
  facebookUrl?: string | null;
  instagramUrl?: string | null;
  tiktokUrl?: string | null;
  youtubeUrl?: string | null;
  linkedinUrl?: string | null;
  whatsappUrl?: string | null;
};

function hrefFor(url: string): string {
  return url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
}

const SOCIAL_FIELDS: Array<{
  key: keyof SocialLinksFields;
  labelKey: string;
}> = [
  { key: 'facebookUrl', labelKey: 'business_directory.fields.facebook' },
  { key: 'instagramUrl', labelKey: 'business_directory.fields.instagram' },
  { key: 'tiktokUrl', labelKey: 'business_directory.fields.tiktok' },
  { key: 'youtubeUrl', labelKey: 'business_directory.fields.youtube' },
  { key: 'linkedinUrl', labelKey: 'business_directory.fields.linkedin' },
  { key: 'whatsappUrl', labelKey: 'business_directory.fields.whatsapp' },
];

const CHIP_STYLES = {
  default: {
    website:
      'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-stone-100 text-stone-800 hover:bg-stone-200 transition-colors',
    social:
      'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-100 hover:bg-emerald-100 transition-colors',
  },
  rail: {
    website:
      'inline-flex items-center justify-center w-full px-2 py-1.5 rounded-lg text-[11px] font-medium bg-white/20 text-white hover:bg-white/30 backdrop-blur-[2px] transition-colors text-center leading-tight',
    social:
      'inline-flex items-center justify-center w-full px-2 py-1.5 rounded-lg text-[11px] font-medium bg-white/10 text-white/95 ring-1 ring-white/25 hover:bg-white/25 backdrop-blur-[2px] transition-colors text-center leading-tight',
  },
} as const;

export default function BusinessSocialLinks({
  business,
  className = 'mt-3',
  variant = 'default',
}: {
  business: SocialLinksFields;
  className?: string;
  /** `rail` = vertical stack styled for a colored identity sidebar */
  variant?: 'default' | 'rail';
}) {
  const { t } = useTranslation();
  const links = SOCIAL_FIELDS.filter((f) => business[f.key]);
  const chips = CHIP_STYLES[variant];

  if (links.length === 0 && !business.website) return null;

  const layout =
    variant === 'rail'
      ? `flex flex-col gap-1.5 w-full ${className}`
      : `flex flex-wrap gap-2 ${className}`;

  return (
    <div className={layout}>
      {business.website && (
        <a
          href={hrefFor(business.website)}
          target="_blank"
          rel="noopener noreferrer"
          className={chips.website}
        >
          {t('business_directory.fields.website')}
        </a>
      )}
      {links.map((f) => (
        <a
          key={f.key}
          href={hrefFor(String(business[f.key]))}
          target="_blank"
          rel="noopener noreferrer"
          className={chips.social}
        >
          {t(f.labelKey)}
        </a>
      ))}
    </div>
  );
}
