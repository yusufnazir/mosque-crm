'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import SubscriptionBanner from '@/components/SubscriptionBanner';
import { PageHeaderProvider } from '@/lib/page-header';
import { SubscriptionProvider } from '@/lib/subscription/SubscriptionContext';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <SubscriptionProvider>
    <PageHeaderProvider>
      <div className="flex h-screen bg-cream">
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <div
          className={`
            fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          `}
        >
          <Sidebar onNavigate={() => setSidebarOpen(false)} />
        </div>

        {/* Right column: header + main */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header onMenuToggle={() => setSidebarOpen(true)} />
          <SubscriptionBanner />
          <main className="flex-1 overflow-auto w-full">{children}</main>
        </div>
      </div>
    </PageHeaderProvider>
    </SubscriptionProvider>
  );
}
