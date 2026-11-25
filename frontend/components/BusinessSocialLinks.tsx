'use client';

import type { ComponentType } from 'react';
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

type IconProps = { className?: string };

function WebsiteIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" d="M3.5 9h17M3.5 15h17" />
      <path strokeLinecap="round" d="M12 3c2.5 2.6 3.9 5.7 3.9 9s-1.4 6.4-3.9 9c-2.5-2.6-3.9-5.7-3.9-9s1.4-6.4 3.9-9z" />
    </svg>
  );
}

function FacebookIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"
      />
    </svg>
  );
}

function InstagramIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden>
      <rect x="3.6" y="3.6" width="16.8" height="16.8" rx="5" />
      <circle cx="12" cy="12" r="3.9" />
      <circle cx="17.1" cy="6.9" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function TikTokIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M16.6 2h-3v13.1a2.6 2.6 0 1 1-2.1-2.5V9.4a5.7 5.7 0 1 0 5.1 5.7V8.3a6.6 6.6 0 0 0 3.9 1.3V6.5a3.7 3.7 0 0 1-3.9-3.7V2z" />
    </svg>
  );
}

function YoutubeIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M21.6 7.6a2.5 2.5 0 0 0-1.8-1.8C18.2 5.4 12 5.4 12 5.4s-6.2 0-7.8.4A2.5 2.5 0 0 0 2.4 7.6 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.4 2.5 2.5 0 0 0 1.8 1.8c1.6.4 7.8.4 7.8.4s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.4zM10 15.2V8.8L15.5 12 10 15.2z" />
    </svg>
  );
}

function LinkedinIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9.5h4V21H3V9.5zm6.5 0h3.8v1.6h.05a4.2 4.2 0 0 1 3.75-2.05c4 0 4.75 2.6 4.75 6V21h-4v-5.3c0-1.3 0-3-1.8-3s-2.1 1.4-2.1 2.9V21h-4V9.5z" />
    </svg>
  );
}

function WhatsappIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2a9.9 9.9 0 0 0-8.5 15L2 22l5.2-1.4A9.9 9.9 0 1 0 12 2zm0 18a8 8 0 0 1-4.1-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1 1 12 20zm4.5-5.9c-.2-.1-1.4-.7-1.6-.8s-.4-.1-.5.1l-.7.9c-.1.2-.3.2-.5.1a6.5 6.5 0 0 1-3.2-2.8c-.1-.2 0-.4.1-.5l.6-.7c.1-.2.1-.3.2-.5s0-.3 0-.4l-.7-1.5c-.2-.4-.4-.4-.5-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.7 11.7 0 0 0 4.6 4.1 5 5 0 0 0 2.3.5 2.5 2.5 0 0 0 1.7-1.2 2 2 0 0 0 .1-1.2c0-.1-.2-.2-.4-.3z" />
    </svg>
  );
}

const SOCIAL_FIELDS: Array<{
  key: keyof SocialLinksFields;
  labelKey: string;
  Icon: ComponentType<IconProps>;
}> = [
  { key: 'facebookUrl', labelKey: 'business_directory.fields.facebook', Icon: FacebookIcon },
  { key: 'instagramUrl', labelKey: 'business_directory.fields.instagram', Icon: InstagramIcon },
  { key: 'tiktokUrl', labelKey: 'business_directory.fields.tiktok', Icon: TikTokIcon },
  { key: 'youtubeUrl', labelKey: 'business_directory.fields.youtube', Icon: YoutubeIcon },
  { key: 'linkedinUrl', labelKey: 'business_directory.fields.linkedin', Icon: LinkedinIcon },
  { key: 'whatsappUrl', labelKey: 'business_directory.fields.whatsapp', Icon: WhatsappIcon },
];

const CHIP_STYLES = {
  default: {
    website:
      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-stone-100 text-stone-800 hover:bg-stone-200 transition-colors',
    social:
      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-100 hover:bg-emerald-100 transition-colors',
  },
  rail: {
    website:
      'inline-flex items-center justify-center w-7 h-7 rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80',
    social:
      'inline-flex items-center justify-center w-7 h-7 rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80',
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
  const isRail = variant === 'rail';

  if (links.length === 0 && !business.website) return null;

  const layout = isRail
    ? `flex flex-col gap-2 w-full ${className}`
    : `flex flex-wrap gap-2 ${className}`;

  return (
    <div className={layout}>
      {business.website && (
        <a
          href={hrefFor(business.website)}
          target="_blank"
          rel="noopener noreferrer"
          className={chips.website}
          title={t('business_directory.fields.website')}
          aria-label={t('business_directory.fields.website')}
        >
          <WebsiteIcon className="w-4 h-4" />
          {isRail ? (
            <span className="sr-only">{t('business_directory.fields.website')}</span>
          ) : (
            t('business_directory.fields.website')
          )}
        </a>
      )}
      {links.map(({ key, labelKey, Icon }) => (
        <a
          key={key}
          href={hrefFor(String(business[key]))}
          target="_blank"
          rel="noopener noreferrer"
          className={chips.social}
          title={t(labelKey)}
          aria-label={t(labelKey)}
        >
          <Icon className="w-4 h-4" />
          {isRail ? <span className="sr-only">{t(labelKey)}</span> : t(labelKey)}
        </a>
      ))}
    </div>
  );
}
