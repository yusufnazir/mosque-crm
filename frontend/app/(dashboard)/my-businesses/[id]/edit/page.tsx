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
import BusinessForm, { BusinessFormValues } from '../../BusinessForm';

export default function EditBusinessPage() {
  const { t } = useTranslation();
  const { can, user, isSuperAdmin, selectedOrganization } = useAuth();
  const { hasFeature } = useSubscription();
  const router = useRouter();
  const params = useParams();
  const id = Number(params.id);
  const needsOrg = isSuperAdmin && !selectedOrganization;
  const hasMemberProfile = !!user?.personId;
  const canRegister =
    can('business_directory.register_own') && hasFeature('business.directory') && !needsOrg && hasMemberProfile;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [wasPublished, setWasPublished] = useState(false);
  const [initial, setInitial] = useState<BusinessFormValues | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const load = useCallback(async () => {
    if (!canRegister || !Number.isFinite(id)) return;
    setLoading(true);
    try {
      const businesses = await businessDirectoryApi.listMy();
      const business = businesses.find((b) => b.id === id);
      if (!business) {
        setToast({ message: t('my_businesses.load_error'), type: 'error' });
        setInitial(null);
        return;
      }
      const status = business.listing?.status;
      if (
        status !== 'DRAFT'
        && status !== 'PENDING_APPROVAL'
        && status !== 'SUSPENDED'
        && status !== 'PUBLISHED'
      ) {
        router.replace('/my-businesses');
        return;
      }
      setWasPublished(status === 'PUBLISHED');
      setLogoUrl(business.logoUrl || null);
      setInitial({
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
      });
    } catch {
      setToast({ message: t('my_businesses.load_error'), type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [canRegister, id, router, t]);

  useEffect(() => {
    load();
  }, [load]);

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
        <h1 className="text-2xl font-bold text-stone-800 mb-2">{t('my_businesses.edit')}</h1>
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          {t('common.super_admin_select_org')}
        </p>
      </div>
    );
  }

  if (!hasMemberProfile) {
    return (
      <div className="p-8 max-w-lg">
        <h1 className="text-2xl font-bold text-stone-800 mb-2">{t('my_businesses.edit')}</h1>
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          {t('my_businesses.no_member_profile')}
        </p>
      </div>
    );
  }

  if (!hasFeature('business.directory')) {
    return (
      <div className="p-8 max-w-lg">
        <h1 className="text-2xl font-bold text-stone-800 mb-2">{t('my_businesses.edit')}</h1>
        <p className="text-stone-500 mb-3">{t('my_businesses.pro_required')}</p>
        <a href="/billing" className="text-sm font-medium text-emerald-700 underline hover:text-emerald-900">
          {t('plan.upgrade_button')} →
        </a>
      </div>
    );
  }

  const handleSubmit = async (values: BusinessFormValues) => {
    setSaving(true);
    try {
      await businessDirectoryApi.updateMy(id, values);
      router.push('/my-businesses');
    } catch {
      setToast({ message: t('my_businesses.save_error'), type: 'error' });
      setSaving(false);
    }
  };

  const handleLogoUpload = async (file: File) => {
    setLogoUploading(true);
    try {
      const result = await businessDirectoryApi.uploadMyLogo(id, file);
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
      await businessDirectoryApi.deleteMyLogo(id);
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
        <Link href="/my-businesses" className="text-sm text-emerald-700 hover:underline">
          ← {t('my_businesses.back_to_list')}
        </Link>
        <h1 className="text-2xl font-bold text-stone-900 mt-3">{t('my_businesses.edit')}</h1>
        <p className="text-stone-500 text-sm mt-1">
          {wasPublished
            ? t('my_businesses.edit_published_hint')
            : t('my_businesses.form_page_subtitle')}
        </p>
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
            submitLabel={
              wasPublished ? t('my_businesses.save_and_resubmit') : t('common.save')
            }
            onCancel={() => router.push('/my-businesses')}
            onSubmit={handleSubmit}
          />
        </>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-500">
          {t('my_businesses.load_error')}
        </div>
      )}
    </div>
  );
}
