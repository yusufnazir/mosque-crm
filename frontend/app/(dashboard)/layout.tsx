'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import SubscriptionBanner from '@/components/SubscriptionBanner';
import LanguageSelector from '@/components/LanguageSelector';
import { PageHeaderProvider } from '@/lib/page-header';
import { SubscriptionProvider } from '@/lib/subscription/SubscriptionContext';
import { buildAuthUrl, useAuth } from '@/lib/auth/AuthContext';
import { useTranslation } from '@/lib/i18n/LanguageContext';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const { t } = useTranslation();
  const isPublicDirectoryRoute =
    pathname === '/directory' || pathname.startsWith('/directory/');

  useEffect(() => {
    if (!loading && !user && !isPublicDirectoryRoute && typeof window !== 'undefined') {
      window.location.replace(buildAuthUrl('/login'));
    }
  }, [loading, user, isPublicDirectoryRoute]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-cream">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-100 border-t-primary-600" />
      </div>
    );
  }

  if (!user && isPublicDirectoryRoute) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-cream to-white">
        <header className="flex items-center justify-between px-6 py-4 border-b border-emerald-100 bg-white/90 backdrop-blur">
          <img src="/memberflow-logo.svg" alt="MemberFlow" className="h-7" />
          <div className="flex items-center gap-4">
            <LanguageSelector variant="public" />
            <Link href={buildAuthUrl('/login')} className="text-sm font-medium text-emerald-700 hover:underline">
              {t('directory.login')}
            </Link>
          </div>
        </header>
        <main>{children}</main>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-cream">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-100 border-t-primary-600" />
      </div>
    );
  }

  return (
    <SubscriptionProvider>
    <PageHeaderProvider>
      <div className="flex h-screen bg-cream">
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <div
          className={`
            fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          `}
        >
          <Sidebar onNavigate={() => setSidebarOpen(false)} />
        </div>

        <div className="flex flex-1 flex-col overflow-hidden">
          <Header onMenuToggle={() => setSidebarOpen(true)} />
          <SubscriptionBanner />
          <main className="flex-1 overflow-x-hidden overflow-y-auto w-full min-w-0">{children}</main>
        </div>
      </div>
    </PageHeaderProvider>
    </SubscriptionProvider>
  );
}
