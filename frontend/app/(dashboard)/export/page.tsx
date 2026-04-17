'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import Button from '@/components/Button';
import ToastNotification from '@/components/ToastNotification';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { useAuth } from '@/lib/auth/AuthContext';
import { useSubscription } from '@/lib/subscription/SubscriptionContext';
import { ExportApi } from '@/lib/exportApi';

type ExportType = 'full' | 'members' | 'payments';

export default function ExportPage() {
  const { t } = useTranslation();
  const { can } = useAuth();
  const { hasFeature } = useSubscription();

  const canView = can('export.view');
  const canExecute = can('export.execute') && hasFeature('data.export');

  const [loading, setLoading] = useState<ExportType | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  if (!canView) {
    return (
      <div className="p-8">
        <p className="text-stone-500">{t('export.no_permission')}</p>
      </div>
    );
  }

  if (!hasFeature('data.export')) {
    return (
      <div className="p-8">
        <div className="max-w-lg">
          <h1 className="text-2xl font-bold text-stone-800 mb-2">{t('export.title')}</h1>
          <p className="text-stone-500">{t('export.pro_required')}</p>
        </div>
      </div>
    );
  }

  async function handleExport(type: ExportType) {
    if (!canExecute || loading) return;
    setLoading(type);
    try {
      if (type === 'full') await ExportApi.downloadFull();
      else if (type === 'members') await ExportApi.downloadMembers();
      else await ExportApi.downloadPayments();
      setToast({ message: t('export.success'), type: 'success' });
    } catch (err: any) {
      setToast({ message: err?.message || t('export.error'), type: 'error' });
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="p-8">
      {toast && (
        <ToastNotification
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-stone-800">{t('export.title')}</h1>
        <p className="text-stone-500 mt-1">{t('export.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl">
        {/* Full export */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7M9 11l3 3m0 0l3-3m-3 3V3" />
                </svg>
              </div>
              <CardTitle>{t('export.full_title')}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-stone-500 mb-4">{t('export.full_description')}</p>
            <Button
              variant="primary"
              onClick={() => handleExport('full')}
              disabled={!canExecute || loading !== null}
              className="w-full"
            >
              {loading === 'full' ? t('export.downloading') : t('export.full_button')}
            </Button>
          </CardContent>
        </Card>

        {/* Members export */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <CardTitle>{t('export.members_title')}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-stone-500 mb-4">{t('export.members_description')}</p>
            <Button
              variant="secondary"
              onClick={() => handleExport('members')}
              disabled={!canExecute || loading !== null}
              className="w-full"
            >
              {loading === 'members' ? t('export.downloading') : t('export.members_button')}
            </Button>
          </CardContent>
        </Card>

        {/* Payments export */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <CardTitle>{t('export.payments_title')}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-stone-500 mb-4">{t('export.payments_description')}</p>
            <Button
              variant="secondary"
              onClick={() => handleExport('payments')}
              disabled={!canExecute || loading !== null}
              className="w-full"
            >
              {loading === 'payments' ? t('export.downloading') : t('export.payments_button')}
            </Button>
          </CardContent>
        </Card>
      </div>

      <p className="mt-6 text-xs text-stone-400">{t('export.format_note')}</p>
    </div>
  );
}
