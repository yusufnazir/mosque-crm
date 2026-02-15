'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import { memberApi, feeApi } from '@/lib/api';
import { familyApi } from '@/lib/familyApi';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { useAuth } from '@/lib/auth/AuthContext';

export default function DashboardPage() {
  const { t } = useTranslation();
  const { can } = useAuth();
  const [stats, setStats] = useState({
    totalFamilies: 0,
    activeMembers: 0,
    totalFees: 0,
    overdueFees: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      // Fetch families data
      const familiesData: any = await familyApi.getAll();
      const totalFamilies = typeof familiesData.count === 'number' ? familiesData.count : 0;
      // Fetch members count (lightweight - no full entity loading)
      const memberStats: any = await memberApi.getStats();
      const activeMembers = memberStats.active || 0;
      // Fetch fees data
      try {
        const feesData: any = await feeApi.getAll();
        const totalFees = feesData.length;
        const overdueFees = feesData.filter((f: any) => f.status === 'OVERDUE').length;
        setStats({ totalFamilies, activeMembers, totalFees, overdueFees });
      } catch (feeError) {
        // Fees table might not exist yet
        console.log('Fees data not available');
        setStats({ totalFamilies, activeMembers, totalFees: 0, overdueFees: 0 });
      }
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: t('dashboard.total_families'),
      value: stats.totalFamilies,
      bgColor: 'bg-emerald-50',
      iconColor: 'text-emerald-700',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4a8 8 0 018 8 8 8 0 11-16 0 8 8 0 018-8zm0 4a4 4 0 100 8 4 4 0 000-8z" />
        </svg>
      ),
    },
    {
      title: t('dashboard.active_members'),
      value: stats.activeMembers,
      bgColor: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      title: t('dashboard.pending_fees'),
      value: stats.totalFees,
      bgColor: 'bg-yellow-50',
      iconColor: 'text-yellow-700',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      title: t('dashboard.total_collected'),
      value: stats.overdueFees,
      bgColor: 'bg-red-50',
      iconColor: 'text-red-600',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  // ...existing code...
  // Import DashboardCharts
  // @ts-ignore
  // eslint-disable-next-line
  const DashboardCharts = require('@/components/DashboardCharts').default;

  return (
    <div className="p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-charcoal mb-2">{t('dashboard.title')}</h1>
        <p className="text-gray-600">{t('dashboard.subtitle')}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="flex items-center justify-between p-4 md:p-6">
              <div className="min-w-0">
                <p className="text-xs md:text-sm text-gray-600 mb-1 truncate">{stat.title}</p>
                <p className="text-2xl md:text-3xl font-bold text-charcoal">{stat.value}</p>
              </div>
              <div className={`${stat.bgColor} ${stat.iconColor} w-10 h-10 md:w-14 md:h-14 rounded-lg flex items-center justify-center flex-shrink-0`}>
                {stat.icon}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dashboard Charts */}
      <DashboardCharts />

      {/* Quick Actions */}
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.quick_actions')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {can('member.create') && (
                <a
                  href="/members/add"
                  className="flex flex-col items-center p-6 border-2 border-emerald-600 rounded-lg hover:bg-emerald-50 transition-all"
                >
                  <svg className="w-10 h-10 text-emerald-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  <span className="font-medium text-emerald-600">{t('dashboard.add_new_member')}</span>
                </a>
              )}
              <a
                href="/fees"
                className="flex flex-col items-center p-6 border-2 border-yellow-600 rounded-lg hover:bg-yellow-50 transition-all"
              >
                <svg className="w-10 h-10 text-yellow-700 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                <span className="font-medium text-yellow-700">{t('dashboard.record_payment')}</span>
              </a>
              {can('member.view') && (
                <a
                  href="/members"
                  className="flex flex-col items-center p-6 border-2 border-emerald-600 rounded-lg hover:bg-emerald-50 transition-all"
                >
                  <svg className="w-10 h-10 text-emerald-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span className="font-medium text-emerald-600">{t('members.title')}</span>
                </a>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
