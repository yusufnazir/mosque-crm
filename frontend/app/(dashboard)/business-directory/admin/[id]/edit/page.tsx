'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { useAuth } from '@/lib/auth/AuthContext';
import { useSubscription } from '@/lib/subscription/SubscriptionContext';
import ToastNotification from '@/components/ToastNotification';
import BusinessLogoEditor from '@/components/BusinessLogoEditor';
import { businessDirectoryApi } from '@/lib/businessDirectoryApi';
import BusinessForm, { BusinessFormValues } from '@/app/(dashboard)/my-businesses/BusinessForm';

function toFormValues(business: {
  name?: string;
  category?: string;
  description?: string;
  email?: string;
  phone?: string;
  website?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  tiktokUrl?: string;
  youtubeUrl?: string;
  linkedinUrl?: string;
  whatsappUrl?: string;
  city?: string;
  country?: string;
}): BusinessFormValues {
  return {
    name: business.name || '',
    category: business.category || '',
    description: business.description || '',
    email: business.email || '',
    phone: business.phone || '',
    website: business.website || '',
    facebookUrl: business.facebookUrl || '',
    instagramUrl: business.instagramUrl || '',
    tiktokUrl: business.tiktokUrl || '',
    youtubeUrl: business.youtubeUrl || '',
    linkedinUrl: business.linkedinUrl || '',
    whatsappUrl: business.whatsappUrl || '',
    city: business.city || '',
    country: business.country || '',
  };
}

export default function AdminEditBusinessPage() {
  const { t } = useTranslation();
  const { can, isSuperAdmin, selectedOrganization } = useAuth();
  const { hasFeature } = useSubscription();
  const router = useRouter();
  const params = useParams();
  const id = Number(params.id);
  const needsOrg = isSuperAdmin && !selectedOrganization;
  const canManage = can('business_directory.manage') && hasFeature('business.directory') && !needsOrg;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [initial, setInitial] = useState<BusinessFormValues | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const load = useCallback(async () => {
    if (!canManage || !Number.isFinite(id)) return;
    setLoading(true);
    try {
      const business = await businessDirectoryApi.getById(id);
      setInitial(toFormValues(business));
      setLogoUrl(business.logoUrl || null);
    } catch {
      setToast({ message: t('business_directory.load_error'), type: 'error' });
      setInitial(null);
    } finally {
      setLoading(false);
    }
  }, [canManage, id, t]);

  useEffect(() => {
    load();
  }, [load]);

  if (!can('business_directory.manage')) {
    return (
      <div className="p-8">
        <p className="text-gray-600">{t('common.access_denied')}</p>
      </div>
    );
  }

  if (needsOrg) {
    return (
      <div className="p-8 max-w-lg">
        <h1 className="text-2xl font-bold text-stone-800 mb-2">{t('business_directory.admin_title')}</h1>
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          {t('common.super_admin_select_org')}
        </p>
      </div>
    );
  }

  if (!hasFeature('business.directory')) {
    return (
      <div className="p-8 max-w-lg">
        <h1 className="text-2xl font-bold text-stone-800 mb-2">{t('business_directory.admin_title')}</h1>
        <p className="text-stone-500 mb-3">{t('business_directory.pro_required')}</p>
        <a href="/billing" className="text-sm font-medium text-emerald-700 underline hover:text-emerald-900">
          {t('plan.upgrade_button')} →
        </a>
      </div>
    );
  }

  const handleSubmit = async (values: BusinessFormValues) => {
    setSaving(true);
    try {
      await businessDirectoryApi.update(id, values);
      router.push('/business-directory/admin');
    } catch {
      setToast({ message: t('business_directory.save_error'), type: 'error' });
      setSaving(false);
    }
  };

  const handleLogoUpload = async (file: File) => {
    setLogoUploading(true);
    try {
      const result = await businessDirectoryApi.uploadLogo(id, file);
      setLogoUrl(result.imageUrl);
      setToast({ message: t('my_businesses.logo.upload_success'), type: 'success' });
    } catch {
      setToast({ message: t('my_businesses.logo.upload_error'), type: 'error' });
    } finally {
      setLogoUploading(false);
    }
  };

  const handleLogoDelete = async () => {
    setLogoUploading(true);
    try {
      await businessDirectoryApi.deleteLogo(id);
      setLogoUrl(null);
      setToast({ message: t('my_businesses.logo.delete_success'), type: 'success' });
    } catch {
      setToast({ message: t('my_businesses.logo.delete_error'), type: 'error' });
    } finally {
      setLogoUploading(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      {toast && (
        <ToastNotification message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      <div className="mb-6">
        <Link href="/business-directory/admin" className="text-sm text-emerald-700 hover:underline">
          ← {t('business_directory.back_to_admin')}
        </Link>
        <h1 className="text-2xl font-bold text-stone-900 mt-3">{t('business_directory.edit_business')}</h1>
        <p className="text-stone-500 text-sm mt-1">{t('business_directory.admin_form_subtitle')}</p>
      </div>

      {loading ? (
        <p className="text-gray-500">{t('common.loading')}</p>
      ) : initial ? (
        <>
          <BusinessLogoEditor
            logoUrl={logoUrl}
            uploading={logoUploading}
            onUpload={handleLogoUpload}
            onDelete={handleLogoDelete}
          />
          <BusinessForm
            initial={initial}
            saving={saving}
            submitLabel={t('common.save')}
            onCancel={() => router.push('/business-directory/admin')}
            onSubmit={handleSubmit}
          />
        </>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-500">
          {t('business_directory.load_error')}
        </div>
      )}
    </div>
  );
}
