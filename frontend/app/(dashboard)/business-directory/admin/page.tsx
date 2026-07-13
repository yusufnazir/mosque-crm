'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { useAuth } from '@/lib/auth/AuthContext';
import { useSubscription } from '@/lib/subscription/SubscriptionContext';
import ConfirmDialog from '@/components/ConfirmDialog';
import ToastNotification from '@/components/ToastNotification';
import BusinessDirectoryCard from '@/components/BusinessDirectoryCard';
import {
  BusinessDTO,
  FederatedBusinessListingDTO,
  businessDirectoryApi,
} from '@/lib/businessDirectoryApi';
import { useBusinessCategories } from '@/lib/useBusinessCategories';

type Tab = 'local' | 'pending' | 'federation';
type LocalStatusFilter = 'PUBLISHED' | 'DRAFT' | 'SUSPENDED' | 'ALL';

function matchesAdminSearch(
  business: BusinessDTO,
  query: string,
  labelFor: (code: string | null | undefined) => string
): boolean {
  if (!query.trim()) return true;
  const q = query.toLowerCase();
  return [
    business.name,
    business.ownerPersonName,
    business.category,
    labelFor(business.category),
    business.description,
    business.email,
    business.phone,
    business.city,
    business.country,
  ]
    .filter(Boolean)
    .some((value) => value!.toLowerCase().includes(q));
}

export default function BusinessDirectoryAdminPage() {
  const { t } = useTranslation();
  const { categories, labelFor, isKnown } = useBusinessCategories();
  const { can, canAny, isSuperAdmin, selectedOrganization } = useAuth();
  const { hasFeature, getLimit } = useSubscription();
  const hasDirectoryPlan = hasFeature('business.directory');
  const listingsLimit = getLimit('business.directory');
  const needsOrg = isSuperAdmin && !selectedOrganization;
  const canManage = can('business_directory.manage') && hasDirectoryPlan && !needsOrg;
  const canApprove = can('business_directory.approve') && hasDirectoryPlan && !needsOrg;
  const canModerate = can('business_directory.moderate') && hasDirectoryPlan && !needsOrg;
  const hasAdminAccess = !needsOrg && hasDirectoryPlan && canAny(
    'business_directory.manage',
    'business_directory.approve',
    'business_directory.moderate'
  );

  const [tab, setTab] = useState<Tab>('local');
  const [localBusinesses, setLocalBusinesses] = useState<BusinessDTO[]>([]);
  const [pendingBusinesses, setPendingBusinesses] = useState<BusinessDTO[]>([]);
  const [federationBusinesses, setFederationBusinesses] = useState<FederatedBusinessListingDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<LocalStatusFilter>('PUBLISHED');
  const [categoryFilter, setCategoryFilter] = useState('');

  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [approveId, setApproveId] = useState<number | null>(null);
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [suspendId, setSuspendId] = useState<number | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [hideListingId, setHideListingId] = useState<number | null>(null);
  const [hideReason, setHideReason] = useState('');

  const loadData = useCallback(async () => {
    if (!hasAdminAccess) return;
    setLoading(true);
    try {
      const requests: Promise<unknown>[] = [
        businessDirectoryApi.listLocal(),
        businessDirectoryApi.listFederation(),
      ];
      if (canApprove) {
        requests.push(businessDirectoryApi.listPendingApproval());
      }
      const results = await Promise.all(requests);
      setLocalBusinesses(Array.isArray(results[0]) ? results[0] as BusinessDTO[] : []);
      setFederationBusinesses(Array.isArray(results[1]) ? results[1] as FederatedBusinessListingDTO[] : []);
      if (canApprove && results[2]) {
        setPendingBusinesses(Array.isArray(results[2]) ? results[2] as BusinessDTO[] : []);
      }
    } catch {
      setToast({ message: t('business_directory.load_error'), type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [canApprove, hasAdminAccess, t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const publishedLocalCount = localBusinesses.filter((b) => b.listing?.status === 'PUBLISHED').length;
  const atLimit = listingsLimit != null && localBusinesses.length >= listingsLimit;

  const availableCategories = useMemo(() => {
    const present = new Set(
      localBusinesses.map((b) => b.category).filter((c): c is string => !!c)
    );
    const knownOrder = categories.map((c) => c.code).filter((code) => present.has(code));
    const legacy = [...present].filter((c) => !isKnown(c)).sort();
    return [...knownOrder, ...legacy];
  }, [localBusinesses, categories, isKnown]);

  const filteredLocalBusinesses = useMemo(() => {
    return localBusinesses.filter((business) => {
      const status = business.listing?.status || 'DRAFT';
      if (statusFilter !== 'ALL' && status !== statusFilter) return false;
      if (categoryFilter && (business.category || '') !== categoryFilter) return false;
      return matchesAdminSearch(business, search, labelFor);
    });
  }, [localBusinesses, statusFilter, categoryFilter, search, labelFor]);

  const hasActiveFilters =
    search.trim() !== '' ||
    statusFilter !== 'PUBLISHED' ||
    categoryFilter !== '';

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('PUBLISHED');
    setCategoryFilter('');
  };

  const deleteBusiness = async () => {
    if (!deleteId) return;
    try {
      await businessDirectoryApi.delete(deleteId);
      setToast({ message: t('business_directory.delete_success'), type: 'success' });
      loadData();
    } catch {
      setToast({ message: t('business_directory.delete_error'), type: 'error' });
    } finally {
      setDeleteId(null);
    }
  };

  const approveBusiness = async () => {
    if (!approveId) return;
    try {
      await businessDirectoryApi.approve(approveId);
      setToast({ message: t('business_directory.approve_success'), type: 'success' });
      loadData();
    } catch {
      setToast({ message: t('business_directory.approve_error'), type: 'error' });
    } finally {
      setApproveId(null);
    }
  };

  const rejectBusiness = async () => {
    if (!rejectId) return;
    if (!rejectReason.trim()) {
      setToast({ message: t('business_directory.reject_reason_required'), type: 'error' });
      return;
    }
    try {
      await businessDirectoryApi.reject(rejectId, rejectReason.trim());
      setToast({ message: t('business_directory.reject_success'), type: 'success' });
      setRejectReason('');
      loadData();
    } catch {
      setToast({ message: t('business_directory.reject_error'), type: 'error' });
    } finally {
      setRejectId(null);
    }
  };

  const suspendBusiness = async () => {
    if (!suspendId) return;
    if (!suspendReason.trim()) {
      setToast({ message: t('business_directory.suspend_reason_required'), type: 'error' });
      return;
    }
    try {
      await businessDirectoryApi.suspend(suspendId, suspendReason.trim());
      setToast({ message: t('business_directory.suspend_success'), type: 'success' });
      setSuspendReason('');
      loadData();
    } catch {
      setToast({ message: t('business_directory.suspend_error'), type: 'error' });
    } finally {
      setSuspendId(null);
    }
  };

  const updateListing = async (
    business: BusinessDTO,
    updates: {
      status?: 'DRAFT' | 'PUBLISHED';
      visibility?: 'LOCAL_ONLY' | 'SHARED_WITH_FEDERATION';
      publicVisible?: boolean;
    }
  ) => {
    try {
      await businessDirectoryApi.updateListing(business.id, updates);
      setToast({ message: t('business_directory.listing_updated'), type: 'success' });
      loadData();
    } catch {
      setToast({ message: t('business_directory.listing_update_error'), type: 'error' });
    }
  };

  const hideListing = async () => {
    if (!hideListingId) return;
    try {
      await businessDirectoryApi.hideFromFederation(hideListingId, hideReason || undefined);
      setHideReason('');
      setToast({ message: t('business_directory.hide_success'), type: 'success' });
      loadData();
    } catch {
      setToast({ message: t('business_directory.hide_error'), type: 'error' });
    } finally {
      setHideListingId(null);
    }
  };

  const unhideListing = async (listingId: number) => {
    try {
      await businessDirectoryApi.unhideFromFederation(listingId);
      setToast({ message: t('business_directory.unhide_success'), type: 'success' });
      loadData();
    } catch {
      setToast({ message: t('business_directory.unhide_error'), type: 'error' });
    }
  };

  if (!canAny(
    'business_directory.manage',
    'business_directory.approve',
    'business_directory.moderate'
  )) {
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

  if (!hasDirectoryPlan) {
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

  const renderLocalCard = (business: BusinessDTO) => {
    const listing = business.listing;
    const isPublished = listing?.status === 'PUBLISHED';
    const isSuspended = listing?.status === 'SUSPENDED';
    const memberOwned = business.ownerPersonId != null;
    const canSuspend = (canApprove || canManage) && memberOwned && isPublished;
    const orgOwned = !memberOwned;

    const statusBadge = () => {
      if (isSuspended) {
        return (
          <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            {t('business_directory.suspended')}
          </span>
        );
      }
      if (listing) {
        return (
          <span
            className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${
              isPublished ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-700'
            }`}
          >
            {isPublished ? t('business_directory.published') : t('business_directory.draft')}
          </span>
        );
      }
      return undefined;
    };

    return (
      <BusinessDirectoryCard
        key={business.id}
        business={business}
        subtitle={business.ownerPersonName || undefined}
        badge={statusBadge()}
        footer={
          canManage || canSuspend ? (
            <div className="space-y-3">
              {isSuspended && listing?.suspensionReason && (
                <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {listing.suspensionReason}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {orgOwned && canManage && (
                  <>
                    <Link
                      href={`/business-directory/admin/${business.id}/edit`}
                      className="px-3 py-1.5 border border-stone-300 rounded-lg text-sm text-stone-700 hover:bg-stone-50"
                    >
                      {t('common.edit')}
                    </Link>
                    <button
                      onClick={() => setDeleteId(business.id)}
                      className="px-3 py-1.5 border border-red-300 text-red-700 rounded-lg text-sm hover:bg-red-50"
                    >
                      {t('common.delete')}
                    </button>
                    <button
                      onClick={() => updateListing(business, { status: isPublished ? 'DRAFT' : 'PUBLISHED' })}
                      className={`px-3 py-1.5 rounded-lg text-sm border ${
                        isPublished
                          ? 'border-emerald-300 text-emerald-800 hover:bg-emerald-50'
                          : 'border-stone-300 text-stone-700 hover:bg-stone-50'
                      }`}
                    >
                      {isPublished ? t('business_directory.unpublish') : t('business_directory.publish')}
                    </button>
                  </>
                )}
                {canSuspend && (
                  <button
                    onClick={() => setSuspendId(business.id)}
                    className="px-3 py-1.5 border border-amber-400 text-amber-900 rounded-lg text-sm hover:bg-amber-50"
                  >
                    {t('business_directory.suspend')}
                  </button>
                )}
              </div>
            </div>
          ) : undefined
        }
      />
    );
  };

  const renderPendingCard = (business: BusinessDTO) => (
    <BusinessDirectoryCard
      key={business.id}
      business={business}
      subtitle={business.ownerPersonName || undefined}
      badge={
        <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
          {t('my_businesses.status_pending')}
        </span>
      }
      footer={
        canApprove ? (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setApproveId(business.id)}
              className="px-3 py-1.5 bg-emerald-700 text-white rounded-lg text-sm hover:bg-emerald-800"
            >
              {t('business_directory.approve')}
            </button>
            <button
              onClick={() => setRejectId(business.id)}
              className="px-3 py-1.5 border border-red-300 text-red-700 rounded-lg text-sm hover:bg-red-50"
            >
              {t('business_directory.reject')}
            </button>
          </div>
        ) : undefined
      }
    />
  );

  const renderFederationCard = (business: FederatedBusinessListingDTO) => {
    const hidden = business.listing?.federationHidden;
    return (
      <div key={`${business.listingId}-${business.id}`} className={hidden ? 'opacity-75' : undefined}>
        <BusinessDirectoryCard
          business={business}
          subtitle={t('business_directory.listed_by', {
            org: business.listedByOrganizationName || business.listedByOrganizationHandle || '',
          })}
          badge={
            hidden ? (
              <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                {t('business_directory.hidden_from_federation')}
              </span>
            ) : undefined
          }
          footer={
            canModerate && business.listingId ? (
              <div className="flex flex-wrap gap-2">
                {hidden ? (
                  <button
                    onClick={() => unhideListing(business.listingId!)}
                    className="px-3 py-1.5 border border-emerald-600 text-emerald-700 rounded-lg text-sm hover:bg-emerald-50"
                  >
                    {t('business_directory.unhide')}
                  </button>
                ) : (
                  <button
                    onClick={() => setHideListingId(business.listingId!)}
                    className="px-3 py-1.5 border border-red-300 text-red-700 rounded-lg text-sm hover:bg-red-50"
                  >
                    {t('business_directory.hide')}
                  </button>
                )}
              </div>
            ) : undefined
          }
        />
      </div>
    );
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
          <h1 className="text-2xl font-bold text-gray-900">{t('business_directory.admin_title')}</h1>
          <p className="text-gray-600 mt-1">{t('business_directory.admin_subtitle')}</p>
          {listingsLimit != null && (
            <p className="text-sm text-stone-500 mt-1">
              {t('my_businesses.listings_usage', {
                used: String(localBusinesses.length),
                limit: String(listingsLimit),
              })}
            </p>
          )}
          <Link href="/directory" className="text-sm text-emerald-700 hover:underline mt-2 inline-block">
            {t('directory.view_public_directory')}
          </Link>
        </div>
        {canManage && tab === 'local' && !atLimit && (
          <Link
            href="/business-directory/admin/new"
            className="px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800"
          >
            {t('business_directory.add_business')}
          </Link>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <button onClick={() => setTab('local')} className={`px-4 py-2 rounded-lg text-sm ${tab === 'local' ? 'bg-emerald-700 text-white' : 'bg-white border border-gray-300'}`}>
          {t('business_directory.tab_local')}
        </button>
        {canApprove && (
          <button onClick={() => setTab('pending')} className={`px-4 py-2 rounded-lg text-sm ${tab === 'pending' ? 'bg-emerald-700 text-white' : 'bg-white border border-gray-300'}`}>
            {t('business_directory.tab_pending')}
            {pendingBusinesses.length > 0 && (
              <span className="ml-2 px-1.5 py-0.5 bg-amber-500 text-white rounded-full text-xs">{pendingBusinesses.length}</span>
            )}
          </button>
        )}
        <button onClick={() => setTab('federation')} className={`px-4 py-2 rounded-lg text-sm ${tab === 'federation' ? 'bg-emerald-700 text-white' : 'bg-white border border-gray-300'}`}>
          {t('business_directory.tab_federation')}
        </button>
      </div>

      {tab === 'local' && publishedLocalCount > 0 && (
        <p className="text-sm text-gray-600 mb-4">
          {t('business_directory.published_summary', {
            published: String(publishedLocalCount),
          })}
        </p>
      )}

      {tab === 'local' && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 space-y-3">
          <div className="flex flex-wrap gap-3">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('business_directory.admin_search_placeholder')}
              className="flex-1 min-w-[220px] border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as LocalStatusFilter)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
              aria-label={t('business_directory.filter_status')}
            >
              <option value="PUBLISHED">{t('business_directory.filter_status_published')}</option>
              <option value="DRAFT">{t('business_directory.filter_status_draft')}</option>
              <option value="SUSPENDED">{t('business_directory.filter_status_suspended')}</option>
              <option value="ALL">{t('business_directory.filter_status_all')}</option>
            </select>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
              >
                {t('business_directory.filter_clear')}
              </button>
            )}
          </div>
          {availableCategories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setCategoryFilter('')}
                className={`px-3 py-1 rounded-full text-sm border ${
                  !categoryFilter
                    ? 'bg-emerald-700 text-white border-emerald-700'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-emerald-500'
                }`}
              >
                {t('directory.filter_all')}
              </button>
              {availableCategories.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setCategoryFilter(categoryFilter === key ? '' : key)}
                  className={`px-3 py-1 rounded-full text-sm border ${
                    categoryFilter === key
                      ? 'bg-emerald-700 text-white border-emerald-700'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-emerald-500'
                  }`}
                >
                  {labelFor(key)}
                </button>
              ))}
            </div>
          )}
          <p className="text-xs text-gray-500">
            {t('business_directory.filter_result_count', {
              shown: String(filteredLocalBusinesses.length),
              total: String(localBusinesses.length),
            })}
          </p>
        </div>
      )}

      {loading ? (
        <p className="text-gray-500">{t('common.loading')}</p>
      ) : tab === 'local' ? (
        localBusinesses.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-500">{t('business_directory.empty_local')}</div>
        ) : filteredLocalBusinesses.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-500">
            <p>{t('business_directory.empty_filter')}</p>
            <button
              type="button"
              onClick={clearFilters}
              className="mt-3 text-sm text-emerald-700 hover:underline"
            >
              {t('business_directory.filter_clear')}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredLocalBusinesses.map(renderLocalCard)}
          </div>
        )
      ) : tab === 'pending' ? (
        pendingBusinesses.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-500">{t('business_directory.empty_pending')}</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {pendingBusinesses.map(renderPendingCard)}
          </div>
        )
      ) : federationBusinesses.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-500">{t('business_directory.empty_federation')}</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {federationBusinesses.map(renderFederationCard)}
        </div>
      )}

      {rejectId !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-2">{t('business_directory.reject')}</h2>
            <p className="text-sm text-gray-600 mb-3">{t('business_directory.reject_reason_required_hint')}</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder={t('business_directory.reject_reason_placeholder')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 min-h-[80px]"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => { setRejectId(null); setRejectReason(''); }} className="px-4 py-2 border border-gray-300 rounded-lg">{t('common.cancel')}</button>
              <button
                onClick={rejectBusiness}
                disabled={!rejectReason.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg disabled:opacity-50"
              >
                {t('business_directory.reject')}
              </button>
            </div>
          </div>
        </div>
      )}

      {suspendId !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-2">{t('business_directory.suspend_title')}</h2>
            <p className="text-sm text-gray-600 mb-3">{t('business_directory.suspend_message')}</p>
            <textarea
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              placeholder={t('business_directory.suspend_reason_placeholder')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 min-h-[80px]"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => { setSuspendId(null); setSuspendReason(''); }} className="px-4 py-2 border border-gray-300 rounded-lg">{t('common.cancel')}</button>
              <button
                onClick={suspendBusiness}
                disabled={!suspendReason.trim()}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg disabled:opacity-50"
              >
                {t('business_directory.suspend')}
              </button>
            </div>
          </div>
        </div>
      )}

      {hideListingId !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4">{t('business_directory.hide')}</h2>
            <textarea value={hideReason} onChange={(e) => setHideReason(e.target.value)} placeholder={t('business_directory.hide_reason_placeholder')} className="w-full border border-gray-300 rounded-lg px-3 py-2 min-h-[80px]" />
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => { setHideListingId(null); setHideReason(''); }} className="px-4 py-2 border border-gray-300 rounded-lg">{t('common.cancel')}</button>
              <button onClick={hideListing} className="px-4 py-2 bg-red-600 text-white rounded-lg">{t('business_directory.hide')}</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog open={deleteId !== null} title={t('business_directory.delete_title')} message={t('business_directory.delete_message')} confirmLabel={t('common.delete')} cancelLabel={t('common.cancel')} variant="danger" onConfirm={deleteBusiness} onCancel={() => setDeleteId(null)} />
      <ConfirmDialog open={approveId !== null} title={t('business_directory.approve_title')} message={t('business_directory.approve_message')} confirmLabel={t('business_directory.approve')} cancelLabel={t('common.cancel')} variant="default" onConfirm={approveBusiness} onCancel={() => setApproveId(null)} />
      {toast && <ToastNotification message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
