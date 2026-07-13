'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { useAuth } from '@/lib/auth/AuthContext';
import { useSubscription } from '@/lib/subscription/SubscriptionContext';
import ToastNotification from '@/components/ToastNotification';
import { businessDirectoryApi } from '@/lib/businessDirectoryApi';
import BusinessForm, { BusinessFormValues } from '../BusinessForm';

export default function NewBusinessPage() {
  const { t } = useTranslation();
  const { can, user, isSuperAdmin, selectedOrganization } = useAuth();
  const { hasFeature, getLimit } = useSubscription();
  const router = useRouter();
  const listingsLimit = getLimit('business.directory');
  const needsOrg = isSuperAdmin && !selectedOrganization;
  const hasMemberProfile = !!user?.personId;
  const canRegister =
    can('business_directory.register_own') && hasFeature('business.directory') && !needsOrg && hasMemberProfile;
  const [saving, setSaving] = useState(false);
  const [atLimit, setAtLimit] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (!canRegister) return;
    businessDirectoryApi
      .getUsage()
      .then((usage) => {
        if (usage.limit != null && usage.count >= usage.limit) {
          setAtLimit(true);
        }
      })
      .catch(() => {});
  }, [canRegister]);

  if (!can('business_directory.register_own')) {
    return (
      <div className="p-8">
        <p className="text-gray-500">{t('my_businesses.no_access')}</p>
      </div>
    );
  }

  if (needsOrg) {
    return (
      <div className="p-8 max-w-lg">
        <h1 className="text-2xl font-bold text-stone-800 mb-2">{t('my_businesses.add')}</h1>
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          {t('common.super_admin_select_org')}
        </p>
      </div>
    );
  }

  if (!hasMemberProfile) {
    return (
      <div className="p-8 max-w-lg">
        <h1 className="text-2xl font-bold text-stone-800 mb-2">{t('my_businesses.add')}</h1>
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          {t('my_businesses.no_member_profile')}
        </p>
      </div>
    );
  }

  if (!hasFeature('business.directory')) {
    return (
      <div className="p-8 max-w-lg">
        <h1 className="text-2xl font-bold text-stone-800 mb-2">{t('my_businesses.add')}</h1>
        <p className="text-stone-500 mb-3">{t('my_businesses.pro_required')}</p>
        <a href="/billing" className="text-sm font-medium text-emerald-700 underline hover:text-emerald-900">
          {t('plan.upgrade_button')} →
        </a>
      </div>
    );
  }

  if (atLimit) {
    return (
      <div className="p-8 max-w-lg">
        <h1 className="text-2xl font-bold text-stone-800 mb-2">{t('my_businesses.add')}</h1>
        <p className="text-stone-500 mb-3">
          {t('plan.listings_limit_reached', { limit: String(listingsLimit ?? '') })}
        </p>
        <a href="/billing" className="text-sm font-medium text-emerald-700 underline hover:text-emerald-900">
          {t('plan.upgrade_button')} →
        </a>
      </div>
    );
  }

  const handleSubmit = async (values: BusinessFormValues) => {
    setSaving(true);
    try {
      await businessDirectoryApi.createMy(values);
      router.push('/my-businesses');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('PLAN_LIMIT_EXCEEDED') || msg.includes('Plan limit exceeded')) {
        setToast({
          message: t('plan.listings_limit_reached', { limit: String(listingsLimit ?? '') }),
          type: 'error',
        });
        setAtLimit(true);
      } else {
        setToast({ message: t('my_businesses.save_error'), type: 'error' });
      }
      setSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      {toast && (
        <ToastNotification message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      <div className="mb-6">
        <Link href="/my-businesses" className="text-sm text-emerald-700 hover:underline">
          ← {t('my_businesses.back_to_list')}
        </Link>
        <h1 className="text-2xl font-bold text-stone-900 mt-3">{t('my_businesses.add')}</h1>
        <p className="text-stone-500 text-sm mt-1">{t('my_businesses.form_page_subtitle')}</p>
      </div>

      <BusinessForm
        saving={saving}
        submitLabel={t('my_businesses.save_draft')}
        onCancel={() => router.push('/my-businesses')}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
