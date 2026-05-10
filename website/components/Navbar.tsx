'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { externalLinkProps } from '@/lib/externalLinkProps';

type NavbarProps = {
  signInUrl?: string;
  getStartedUrl?: string;
};

export default function Navbar({ signInUrl = '#contact', getStartedUrl = '#contact' }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const t = useTranslations('Navbar');
  const locale = useLocale();
  const pathname = usePathname();
  const SIGNIN_URL = signInUrl;
  const GETSTARTED_URL = getStartedUrl;

  const navLinks = [
    { label: t('features'), href: '#features' },
    { label: t('pricing'), href: '#pricing' },
    { label: t('outcomes'), href: '#outcomes' },
    { label: t('contact'), href: '#contact' },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-stone-200/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <img src="/memberflow-icon.svg" alt="MemberFlow" className="w-9 h-9" />
            <span className="text-xl font-display font-bold text-charcoal">
              Member<span className="text-primary">Flow</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-6 lg:gap-8">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-charcoal-light hover:text-primary transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <div
              className="flex items-center rounded-lg border border-stone-200 bg-white p-0.5 text-xs font-medium"
              role="group"
              aria-label={t('language')}
            >
              <Link
                href={pathname}
                locale="en"
                className={`rounded-md px-2 py-1 transition-colors ${locale === 'en' ? 'bg-primary/10 text-primary' : 'text-charcoal-light hover:text-charcoal'}`}
                aria-current={locale === 'en' ? 'true' : undefined}
              >
                EN
              </Link>
              <Link
                href={pathname}
                locale="nl"
                className={`rounded-md px-2 py-1 transition-colors ${locale === 'nl' ? 'bg-primary/10 text-primary' : 'text-charcoal-light hover:text-charcoal'}`}
                aria-current={locale === 'nl' ? 'true' : undefined}
              >
                NL
              </Link>
            </div>
            <a
              href={SIGNIN_URL}
              {...externalLinkProps(SIGNIN_URL)}
              className="text-sm font-medium text-charcoal-light hover:text-primary transition-colors"
            >
              {t('signIn')}
            </a>
            <a
              href={GETSTARTED_URL}
              {...externalLinkProps(GETSTARTED_URL)}
              className="px-4 py-2 text-sm font-semibold text-white bg-primary rounded-lg hover:bg-primary-light transition-colors"
            >
              {t('getStarted')}
            </a>
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 text-charcoal-light hover:text-primary"
            aria-label={t('toggleMenu')}
            aria-expanded={mobileOpen}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-stone-200">
          <div className="px-4 py-4 space-y-3">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="block text-sm font-medium text-charcoal-light hover:text-primary"
              >
                {link.label}
              </a>
            ))}
            <div className="flex items-center gap-2 pt-2">
              <span className="text-xs font-medium text-charcoal-light">{t('language')}:</span>
              <Link
                href={pathname}
                locale="en"
                onClick={() => setMobileOpen(false)}
                className={`rounded-md border px-2 py-1 text-xs font-semibold ${locale === 'en' ? 'border-primary bg-primary/10 text-primary' : 'border-stone-200 text-charcoal-light'}`}
              >
                EN
              </Link>
              <Link
                href={pathname}
                locale="nl"
                onClick={() => setMobileOpen(false)}
                className={`rounded-md border px-2 py-1 text-xs font-semibold ${locale === 'nl' ? 'border-primary bg-primary/10 text-primary' : 'border-stone-200 text-charcoal-light'}`}
              >
                NL
              </Link>
            </div>
            <div className="pt-3 border-t border-stone-200 space-y-2">
              <a
                href={SIGNIN_URL}
                {...externalLinkProps(SIGNIN_URL)}
                className="block text-sm font-medium text-charcoal-light"
              >
                {t('signIn')}
              </a>
              <a
                href={GETSTARTED_URL}
                {...externalLinkProps(GETSTARTED_URL)}
                className="block text-center px-4 py-2 text-sm font-semibold text-white bg-primary rounded-lg"
              >
                {t('getStarted')}
              </a>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
