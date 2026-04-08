'use client';

import { useTranslation } from '@/lib/i18n/LanguageContext';
import { useSubscription } from '@/lib/subscription/SubscriptionContext';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * Displays banners/overlays based on subscription status:
 * - PAST_DUE / GRACE: amber warning banner (non-blocking)
 * - READ_ONLY: red warning banner (non-blocking, mutations blocked server-side)
 * - LOCKED: full-screen blocking overlay
 * - INACTIVE: full-screen blocking overlay
 */
export default function SubscriptionBanner() {
  const { status } = useSubscription();
  const { t } = useTranslation();
  const pathname = usePathname();

  if (status === 'active' || status === 'trialing' || status === 'loading') {
    return null;
  }

  // Don't block the subscription page itself — user needs to see it to reactivate
  if (pathname === '/subscription') {
    return null;
  }

  // PAST_DUE / GRACE: warning banner at top (non-blocking)
  if (status === 'past_due' || status === 'grace') {
    return (
      <div className="bg-amber-50 border-b border-amber-300 px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5 text-amber-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <p className="text-sm text-amber-800 font-medium">
            {t('subscription_enforcement.grace_message')}
          </p>
        </div>
        <Link
          href="/subscription"
          className="flex-shrink-0 text-sm font-medium text-amber-700 hover:text-amber-900 underline"
        >
          {t('subscription_enforcement.view_subscription')}
        </Link>
      </div>
    );
  }

  // READ_ONLY: red warning banner (non-blocking, but mutations are blocked server-side)
  if (status === 'read_only') {
    return (
      <div className="bg-red-50 border-b border-red-300 px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <p className="text-sm text-red-800 font-medium">
            {t('subscription_enforcement.read_only_message')}
          </p>
        </div>
        <Link
          href="/subscription"
          className="flex-shrink-0 text-sm font-medium text-red-700 hover:text-red-900 underline"
        >
          {t('subscription_enforcement.view_subscription')}
        </Link>
      </div>
    );
  }

  // LOCKED / INACTIVE: blocking overlay
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-8 text-center">
        <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>

        <h2 className="text-xl font-bold text-charcoal mb-2">
          {status === 'locked'
            ? t('subscription_enforcement.locked_title')
            : t('subscription_enforcement.inactive_title')}
        </h2>
        <p className="text-stone-600 mb-6">
          {status === 'locked'
            ? t('subscription_enforcement.locked_message')
            : t('subscription_enforcement.inactive_message')}
        </p>

        <div className="flex flex-col gap-3">
          <Link
            href="/subscription"
            className="inline-flex items-center justify-center px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-medium rounded-lg transition-colors"
          >
            {t('subscription_enforcement.view_subscription')}
          </Link>
          <button
            onClick={() => { window.location.href = '/api/auth/logout'; }}
            className="text-sm text-stone-500 hover:text-stone-700 transition-colors"
          >
            {t('subscription_enforcement.logout')}
          </button>
        </div>
      </div>
    </div>
  );
}
