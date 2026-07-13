'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { useAuth } from '@/lib/auth/AuthContext';
import { useSubscription } from '@/lib/subscription/SubscriptionContext';
import ConfirmDialog from '@/components/ConfirmDialog';
import ToastNotification from '@/components/ToastNotification';
import BusinessDirectoryCard from '@/components/BusinessDirectoryCard';
import { BusinessDTO, businessDirectoryApi } from '@/lib/businessDirectoryApi';

export default function MyBusinessesPage() {
  const { t } = useTranslation();
  const { can, user, isSuperAdmin, selectedOrganization } = useAuth();
  const { hasFeature, getLimit } = useSubscription();
  const hasDirectoryPlan = hasFeature('business.directory');
  const listingsLimit = getLimit('business.directory');
  const needsOrg = isSuperAdmin && !selectedOrganization;
  const hasMemberProfile = !!user?.personId;
  const canRegister = can('business_directory.register_own') && hasDirectoryPlan && !needsOrg && hasMemberProfile;
  const canViewFederation = can('business_directory.view') && hasDirectoryPlan;

  const [businesses, setBusinesses] = useState<BusinessDTO[]>([]);
  const [listingCount, setListingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [submitId, setSubmitId] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!canRegister) return;
    setLoading(true);
    setLoadError(null);
    try {
      const [data, usage] = await Promise.all([
        businessDirectoryApi.listMy(),
        businessDirectoryApi.getUsage().catch(() => null),
      ]);
      setBusinesses(Array.isArray(data) ? data : []);
      setListingCount(usage?.count ?? (Array.isArray(data) ? data.length : 0));
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.toLowerCase().includes('not linked') || msg.toLowerCase().includes('member profile')) {
        setLoadError('unlinked');
      } else {
        setLoadError('generic');
      }
      setBusinesses([]);
    } finally {
      setLoading(false);
    }
  }, [canRegister]);

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
        <h1 className="text-2xl font-bold text-stone-800 mb-2">{t('my_businesses.title')}</h1>
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          {t('common.super_admin_select_org')}
        </p>
      </div>
    );
  }

  if (!hasMemberProfile || loadError === 'unlinked') {
    return (
      <div className="p-8 max-w-lg">
        <h1 className="text-2xl font-bold text-stone-800 mb-2">{t('my_businesses.title')}</h1>
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          {t('my_businesses.no_member_profile')}
        </p>
      </div>
    );
  }

  if (!hasDirectoryPlan) {
    return (
      <div className="p-8 max-w-lg">
        <h1 className="text-2xl font-bold text-stone-800 mb-2">{t('my_businesses.title')}</h1>
        <p className="text-stone-500 mb-3">{t('my_businesses.pro_required')}</p>
        <a href="/billing" className="text-sm font-medium text-emerald-700 underline hover:text-emerald-900">
          {t('plan.upgrade_button')} →
        </a>
      </div>
    );
  }

  if (loadError === 'generic') {
    return (
      <div className="p-8 max-w-lg">
        <h1 className="text-2xl font-bold text-stone-800 mb-2">{t('my_businesses.title')}</h1>
        <p className="text-sm text-stone-600 bg-stone-50 border border-stone-200 rounded-lg px-4 py-3">
          {t('my_businesses.load_error')}
        </p>
      </div>
    );
  }

  const atLimit = listingsLimit != null && listingCount >= listingsLimit;

  const confirmSubmit = async () => {
    if (!submitId) return;
    try {
      await businessDirectoryApi.submitMy(submitId);
      setToast({ message: t('my_businesses.submit_success'), type: 'success' });
      load();
    } catch {
      setToast({ message: t('my_businesses.submit_error'), type: 'error' });
    } finally {
      setSubmitId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await businessDirectoryApi.deleteMy(deleteId);
      setToast({ message: t('my_businesses.delete_success'), type: 'success' });
      load();
    } catch {
      setToast({ message: t('my_businesses.delete_error'), type: 'error' });
    } finally {
      setDeleteId(null);
    }
  };

  const statusLabel = (status?: string) => {
    if (status === 'PENDING_APPROVAL') return t('my_businesses.status_pending');
    if (status === 'PUBLISHED') return t('my_businesses.status_published');
    if (status === 'SUSPENDED') return t('my_businesses.status_suspended');
    return t('my_businesses.status_draft');
  };

  const statusBadgeClass = (status?: string) => {
    if (status === 'PUBLISHED') return 'bg-emerald-100 text-emerald-800';
    if (status === 'PENDING_APPROVAL') return 'bg-amber-100 text-amber-800';
    if (status === 'SUSPENDED') return 'bg-red-100 text-red-800';
    return 'bg-stone-100 text-stone-700';
  };

  return (
    <div className="p-8">
      {atLimit && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <div>
            <span>{t('plan.listings_limit_reached', { limit: String(listingsLimit) })}</span>
            {' '}
            <span className="text-amber-700">{t('plan.upgrade_prompt')}</span>
            {' '}
            <a href="/billing" className="font-semibold underline hover:text-amber-900">{t('plan.upgrade_button')}</a>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('my_businesses.title')}</h1>
          <p className="text-gray-600 mt-1">{t('my_businesses.subtitle')}</p>
          {listingsLimit != null && (
            <p className="text-sm text-stone-500 mt-1">
              {t('my_businesses.listings_usage', {
                used: String(listingCount),
                limit: String(listingsLimit),
              })}
            </p>
          )}
        </div>
        {!atLimit && (
          <Link
            href="/my-businesses/new"
            className="px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800"
          >
            {t('my_businesses.add')}
          </Link>
        )}
      </div>

      {canViewFederation && (
        <p className="text-sm text-gray-600 mb-4">
          {t('my_businesses.federation_hint')}{' '}
          <Link href="/directory" className="text-emerald-700 hover:underline">{t('sidebar.business_directory')}</Link>
        </p>
      )}

      {loading ? (
        <p className="text-gray-500">{t('common.loading')}</p>
      ) : businesses.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-500">
          <p>{t('my_businesses.empty')}</p>
          <Link
            href="/my-businesses/new"
            className="inline-block mt-4 px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 text-sm"
          >
            {t('my_businesses.add')}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {businesses.map((business) => {
            const listing = business.listing;
            const isDraft = listing?.status === 'DRAFT';
            const isPending = listing?.status === 'PENDING_APPROVAL';
            const isPublished = listing?.status === 'PUBLISHED';
            const isSuspended = listing?.status === 'SUSPENDED';
            const hasActions =
              isDraft || isPending || isPublished || isSuspended || !!listing?.rejectionReason || !!listing?.suspensionReason;

            return (
              <BusinessDirectoryCard
                key={business.id}
                business={business}
                badge={
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadgeClass(listing?.status)}`}>
                    {statusLabel(listing?.status)}
                  </span>
                }
                footer={
                  hasActions ? (
                    <div className="space-y-3">
                      {listing?.rejectionReason && (
                        <p className="text-sm text-red-600">{listing.rejectionReason}</p>
                      )}
                      {isSuspended && listing?.suspensionReason && (
                        <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2 space-y-1">
                          <p className="font-medium">{t('my_businesses.suspended_heading')}</p>
                          <p>{listing.suspensionReason}</p>
                          <p className="text-xs text-red-600/80">{t('my_businesses.suspended_hint')}</p>
                        </div>
                      )}
                      {isPublished && (
                        <p className="text-xs text-stone-500">{t('my_businesses.published_visibility_hint')}</p>
                      )}
                      {(isDraft || isPending || isSuspended || isPublished) && (
                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={`/my-businesses/${business.id}/edit`}
                            className="px-3 py-1.5 border border-stone-300 rounded-lg text-sm text-stone-700 hover:bg-stone-50"
                          >
                            {t('common.edit')}
                          </Link>
                          {(isDraft || isSuspended) && (
                            <button
                              onClick={() => setSubmitId(business.id)}
                              className="px-3 py-1.5 bg-emerald-700 text-white rounded-lg text-sm hover:bg-emerald-800"
                            >
                              {t('my_businesses.submit_for_approval')}
                            </button>
                          )}
                          {(isDraft || isSuspended || isPublished) && (
                            <button
                              onClick={() => setDeleteId(business.id)}
                              className="px-3 py-1.5 border border-red-300 text-red-700 rounded-lg text-sm hover:bg-red-50"
                            >
                              {t('common.delete')}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : undefined
                }
              />
            );
          })}
        </div>
      )}

      {toast && (
        <ToastNotification message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      <ConfirmDialog
        open={submitId != null}
        title={t('my_businesses.submit_title')}
        message={t('my_businesses.submit_message')}
        confirmLabel={t('my_businesses.submit_for_approval')}
        onConfirm={confirmSubmit}
        onCancel={() => setSubmitId(null)}
      />

      <ConfirmDialog
        open={deleteId != null}
        title={t('my_businesses.delete_title')}
        message={t('my_businesses.delete_message')}
        confirmLabel={t('common.delete')}
        danger
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
