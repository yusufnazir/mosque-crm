'use client';

import { useState } from 'react';
import { externalLinkProps } from '@/lib/externalLinkProps';

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Outcomes', href: '#outcomes' },
  { label: 'Contact', href: '#contact' },
];

type NavbarProps = {
  signInUrl?: string;
  getStartedUrl?: string;
};

export default function Navbar({ signInUrl = '#contact', getStartedUrl = '#contact' }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const SIGNIN_URL = signInUrl;
  const GETSTARTED_URL = getStartedUrl;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-stone-200/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <a href="#" className="flex items-center gap-2">
            <img src="/memberflow-icon.svg" alt="MemberFlow" className="w-9 h-9" />
            <span className="text-xl font-display font-bold text-charcoal">
              Member<span className="text-primary">Flow</span>
            </span>
          </a>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-charcoal-light hover:text-primary transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            <a
              href={SIGNIN_URL}
              {...externalLinkProps(SIGNIN_URL)}
              className="text-sm font-medium text-charcoal-light hover:text-primary transition-colors"
            >
              Sign In
            </a>
            <a
              href={GETSTARTED_URL}
              {...externalLinkProps(GETSTARTED_URL)}
              className="px-4 py-2 text-sm font-semibold text-white bg-primary rounded-lg hover:bg-primary-light transition-colors"
            >
              Get Started Free
            </a>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 text-charcoal-light hover:text-primary"
            aria-label="Toggle menu"
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

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-stone-200">
          <div className="px-4 py-4 space-y-3">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="block text-sm font-medium text-charcoal-light hover:text-primary"
              >
                {link.label}
              </a>
            ))}
            <div className="pt-3 border-t border-stone-200 space-y-2">
              <a
                href={SIGNIN_URL}
                {...externalLinkProps(SIGNIN_URL)}
                className="block text-sm font-medium text-charcoal-light"
              >
                Sign In
              </a>
              <a
                href={GETSTARTED_URL}
                {...externalLinkProps(GETSTARTED_URL)}
                className="block text-center px-4 py-2 text-sm font-semibold text-white bg-primary rounded-lg"
              >
                Get Started Free
              </a>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
