'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { useAuth } from '@/lib/auth/AuthContext';
import { useSubscription } from '@/lib/subscription/SubscriptionContext';
import BusinessDirectoryCard from '@/components/BusinessDirectoryCard';
import {
  BusinessDTO,
  FederatedBusinessListingDTO,
  PublicBusinessDTO,
  PublicBusinessDirectoryResponse,
  businessDirectoryApi,
} from '@/lib/businessDirectoryApi';
import { useBusinessCategories } from '@/lib/useBusinessCategories';
import { businessPublicPath } from '@/lib/publicDirectorySeo';

type Tab = 'local' | 'federation';
type DirectoryMode = 'loading' | 'needs_org' | 'member' | 'public';

type BrowsableBusiness = Pick<
  BusinessDTO,
  | 'id'
  | 'name'
  | 'category'
  | 'description'
  | 'email'
  | 'phone'
  | 'website'
  | 'facebookUrl'
  | 'instagramUrl'
  | 'tiktokUrl'
  | 'youtubeUrl'
  | 'linkedinUrl'
  | 'whatsappUrl'
  | 'city'
  | 'country'
  | 'logoUrl'
>;

const PAGE_SIZE_OPTIONS = [12, 24, 48];
const DEFAULT_PAGE_SIZE = 12;

function extractOrgHandle(): string {
  if (typeof window === 'undefined') return '';
  const hostname = window.location.hostname;
  const parts = hostname.split('.');
  if (parts.length > 1 && parts[0] !== 'localhost') {
    return parts[0];
  }
  return '';
}

function CategoryFilterBar({
  value,
  onChange,
  available,
  labelFor,
}: {
  value: string;
  onChange: (value: string) => void;
  available: string[];
  labelFor: (code: string | null | undefined) => string;
}) {
  const { t } = useTranslation();
  if (available.length === 0) return null;

  const chipClass = (active: boolean) =>
    `px-3 py-1 rounded-full text-sm border transition-colors ${
      active
        ? 'bg-emerald-700 text-white border-emerald-700'
        : 'bg-white text-gray-700 border-gray-300 hover:border-emerald-500'
    }`;

  return (
    <div className="flex flex-wrap gap-2 mb-6">
      <button type="button" onClick={() => onChange('')} className={chipClass(!value)}>
        {t('directory.filter_all')}
      </button>
      {available.map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(value === key ? '' : key)}
          className={chipClass(value === key)}
        >
          {labelFor(key)}
        </button>
      ))}
    </div>
  );
}

function DirectoryPagination({
  page,
  pageSize,
  totalElements,
  totalPages,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}) {
  const { t } = useTranslation();

  const pageNumbers = useMemo(() => {
    const maxVisible = 5;
    const start = Math.max(0, Math.min(page - Math.floor(maxVisible / 2), Math.max(0, totalPages - maxVisible)));
    const end = Math.min(totalPages - 1, start + maxVisible - 1);
    const pages: number[] = [];
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }, [page, totalPages]);

  if (totalElements === 0) return null;

  const startItem = page * pageSize + 1;
  const endItem = Math.min((page + 1) * pageSize, totalElements);

  return (
    <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-3 text-sm text-gray-600">
        <span>{t('pagination.rows_per_page')}:</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white"
        >
          {PAGE_SIZE_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        <span>
          {t('pagination.showing_range', {
            start: String(startItem),
            end: String(endItem),
            total: String(totalElements),
          })}
        </span>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPageChange(0)}
            disabled={page === 0}
            className="px-2 py-1.5 text-sm rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
            title={t('pagination.first')}
          >
            «
          </button>
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page === 0}
            className="px-2 py-1.5 text-sm rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
            title={t('pagination.previous')}
          >
            ‹
          </button>
          {pageNumbers[0] > 0 && <span className="px-2 text-sm text-gray-400">…</span>}
          {pageNumbers.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              className={`px-3 py-1.5 text-sm rounded-lg border ${
                p === page
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'border-gray-300 hover:bg-gray-100 text-gray-700'
              }`}
            >
              {p + 1}
            </button>
          ))}
          {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && (
            <span className="px-2 text-sm text-gray-400">…</span>
          )}
          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages - 1}
            className="px-2 py-1.5 text-sm rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
            title={t('pagination.next')}
          >
            ›
          </button>
          <button
            type="button"
            onClick={() => onPageChange(totalPages - 1)}
            disabled={page >= totalPages - 1}
            className="px-2 py-1.5 text-sm rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
            title={t('pagination.last')}
          >
            »
          </button>
        </div>
      )}
    </div>
  );
}

export default function DirectoryBrowseClient() {
  const { t } = useTranslation();
  const { categories, labelFor, isKnown } = useBusinessCategories();
  const { user, can, canAny, loading: authLoading, isSuperAdmin, selectedOrganization } = useAuth();
  const { hasFeature } = useSubscription();
  const needsOrg = isSuperAdmin && !selectedOrganization;
  const hasDirectoryPlan = hasFeature('business.directory');
  const hasOrgContext = !needsOrg;
  const canViewMember = !!user && hasOrgContext && hasDirectoryPlan && can('business_directory.view');
  const canRegister = !!user && hasOrgContext && hasDirectoryPlan && can('business_directory.register_own');
  const canManageDirectory = !!user && hasOrgContext && hasDirectoryPlan && canAny(
    'business_directory.manage',
    'business_directory.approve',
    'business_directory.moderate'
  );

  const [mode, setMode] = useState<DirectoryMode>('loading');
  const [orgHandle, setOrgHandle] = useState('');
  const [tab, setTab] = useState<Tab>('local');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [localBusinesses, setLocalBusinesses] = useState<BusinessDTO[]>([]);
  const [federationBusinesses, setFederationBusinesses] = useState<FederatedBusinessListingDTO[]>([]);
  const [publicData, setPublicData] = useState<PublicBusinessDirectoryResponse | null>(null);
  const [availableCategoryCodes, setAvailableCategoryCodes] = useState<string[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    setOrgHandle(extractOrgHandle());
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(0);
  }, [debouncedSearch, categoryFilter, tab, pageSize, mode]);

  useEffect(() => {
    setCategoryFilter('');
  }, [tab, mode]);

  const browseParams = useMemo(
    () => ({
      page,
      size: pageSize,
      search: debouncedSearch,
      category: categoryFilter,
    }),
    [page, pageSize, debouncedSearch, categoryFilter]
  );

  const loadMemberPage = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      if (tab === 'local') {
        const data = await businessDirectoryApi.listPublishedPage(browseParams);
        setLocalBusinesses(data.content ?? []);
        setAvailableCategoryCodes(data.availableCategories ?? []);
        setTotalElements(data.totalElements ?? 0);
        setTotalPages(data.totalPages ?? 0);
      } else {
        const data = await businessDirectoryApi.listFederationPage(browseParams);
        setFederationBusinesses(data.content ?? []);
        setAvailableCategoryCodes(data.availableCategories ?? []);
        setTotalElements(data.totalElements ?? 0);
        setTotalPages(data.totalPages ?? 0);
      }
    } catch {
      setLocalBusinesses([]);
      setFederationBusinesses([]);
      setLoadError(t('directory.load_error'));
    } finally {
      setLoading(false);
    }
  }, [browseParams, tab, t]);

  const loadPublicPage = useCallback(
    async (handle: string) => {
      setLoading(true);
      setLoadError(null);
      setPublicData(null);
      try {
        const data = await businessDirectoryApi.getPublic(handle, browseParams);
        setPublicData(data);
        setAvailableCategoryCodes(data.availableCategories ?? []);
        setTotalElements(data.totalElements ?? data.businesses?.length ?? 0);
        setTotalPages(data.totalPages ?? 1);
      } catch {
        setPublicData(null);
        setLoadError(t('directory.load_error'));
      } finally {
        setLoading(false);
      }
    },
    [browseParams, t]
  );

  useEffect(() => {
    if (authLoading) return;

    // Logged-in superadmin with no org selected: ask to pick one (do not fall back to public mode).
    if (needsOrg) {
      setMode('needs_org');
      setLoading(false);
      setLoadError(null);
      return;
    }

    if (canViewMember) {
      setMode('member');
      return;
    }

    const handle = orgHandle || extractOrgHandle();
    if (handle) {
      setMode('public');
      setOrgHandle(handle);
      return;
    }

    setMode('public');
    setLoading(false);
  }, [authLoading, needsOrg, canViewMember, orgHandle]);

  useEffect(() => {
    if (mode === 'member') {
      loadMemberPage();
    } else if (mode === 'public' && orgHandle) {
      loadPublicPage(orgHandle);
    }
  }, [mode, orgHandle, loadMemberPage, loadPublicPage]);

  const availableCategories = useMemo(() => {
    const present = new Set(availableCategoryCodes.filter(Boolean));
    const knownOrder = categories.map((c) => c.code).filter((code) => present.has(code));
    const legacy = [...present].filter((c) => !isKnown(c)).sort();
    return [...knownOrder, ...legacy];
  }, [availableCategoryCodes, categories, isKnown]);

  const renderLocalCard = (business: BrowsableBusiness & { id: number }) => (
    <BusinessDirectoryCard key={business.id} business={business} />
  );

  const renderPublicCard = (business: PublicBusinessDTO) => {
    const listedBy =
      business.listedByOrganizationHandle &&
      business.listedByOrganizationHandle !== orgHandle
        ? business.listedByOrganizationName || business.listedByOrganizationHandle
        : null;
    return (
      <BusinessDirectoryCard
        key={`${business.listedByOrganizationHandle || 'local'}-${business.id}`}
        business={business}
        titleHref={businessPublicPath(business.id, business.name)}
        subtitle={
          listedBy
            ? t('business_directory.listed_by', { org: listedBy })
            : undefined
        }
      />
    );
  };

  const renderFederationCard = (business: FederatedBusinessListingDTO) => (
    <BusinessDirectoryCard
      key={`${business.listingId}-${business.id}`}
      business={business}
      subtitle={t('business_directory.listed_by', {
        org: business.listedByOrganizationName || business.listedByOrganizationHandle || '',
      })}
    />
  );

  const pagination = (
    <DirectoryPagination
      page={page}
      pageSize={pageSize}
      totalElements={totalElements}
      totalPages={totalPages}
      onPageChange={setPage}
      onPageSizeChange={(size) => {
        setPageSize(size);
        setPage(0);
      }}
    />
  );

  if (mode === 'loading' || authLoading) {
    return (
      <div className="p-8">
        <p className="text-gray-500">{t('common.loading')}</p>
      </div>
    );
  }

  if (mode === 'needs_org' || needsOrg) {
    return (
      <div className="p-8 max-w-lg">
        <h1 className="text-2xl font-bold text-stone-800 mb-2">{t('directory.title')}</h1>
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          {t('common.super_admin_select_org')}
        </p>
      </div>
    );
  }

  if (mode === 'public') {
    const orgName = publicData?.organizationName;
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {orgName ? t('directory.public_title', { org: orgName }) : t('directory.title')}
          </h1>
          <p className="text-gray-600 mt-1">
            {publicData?.includesFederationListings
              ? t('directory.public_subtitle_federation')
              : t('directory.public_subtitle')}
          </p>
        </div>

        {!orgHandle ? (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-500">
            {t('directory.public_no_subdomain')}
          </div>
        ) : loading && !publicData ? (
          <p className="text-gray-500">{t('common.loading')}</p>
        ) : loadError ? (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-500">
            {loadError}
          </div>
        ) : publicData && !publicData.enabled ? (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-500 space-y-3">
            <p>
              {user && !hasDirectoryPlan
                ? t('directory.pro_required')
                : t('directory.public_disabled')}
            </p>
            {user && !hasDirectoryPlan && (
              <a href="/billing" className="inline-block text-sm font-medium text-emerald-700 underline hover:text-emerald-900">
                {t('plan.upgrade_button')} →
              </a>
            )}
          </div>
        ) : (
          <>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('directory.search_placeholder')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-4"
            />
            <CategoryFilterBar
              value={categoryFilter}
              onChange={setCategoryFilter}
              available={availableCategories}
              labelFor={labelFor}
            />
            {loading ? (
              <p className="text-gray-500">{t('common.loading')}</p>
            ) : (publicData?.businesses?.length ?? 0) === 0 ? (
              <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-500">
                {search.trim() || categoryFilter ? t('directory.empty_search') : t('directory.public_empty')}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {publicData!.businesses.map((b) => renderPublicCard(b))}
                </div>
                {pagination}
              </>
            )}
          </>
        )}
      </div>
    );
  }

  const activeList = tab === 'local' ? localBusinesses : federationBusinesses;

  return (
    <div className="p-8">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('directory.title')}</h1>
          <p className="text-gray-600 mt-1">{t('directory.subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canRegister && (
            <>
              <Link
                href="/my-businesses"
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
              >
                {t('directory.my_businesses')}
              </Link>
              <Link
                href="/my-businesses/new"
                className="px-4 py-2 border border-emerald-700 text-emerald-700 rounded-lg hover:bg-emerald-50 text-sm"
              >
                {t('directory.register_business')}
              </Link>
            </>
          )}
          {canManageDirectory && (
            <Link
              href="/business-directory/admin"
              className="px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 text-sm"
            >
              {t('directory.manage_directory')}
            </Link>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('directory.search_placeholder')}
          className="flex-1 min-w-[200px] border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={() => setTab('local')}
          className={`px-4 py-2 rounded-lg text-sm ${tab === 'local' ? 'bg-emerald-700 text-white' : 'bg-white border border-gray-300'}`}
        >
          {t('directory.tab_local')}
        </button>
        <button
          type="button"
          onClick={() => setTab('federation')}
          className={`px-4 py-2 rounded-lg text-sm ${tab === 'federation' ? 'bg-emerald-700 text-white' : 'bg-white border border-gray-300'}`}
        >
          {t('directory.tab_federation')}
        </button>
      </div>

      <CategoryFilterBar
        value={categoryFilter}
        onChange={setCategoryFilter}
        available={availableCategories}
        labelFor={labelFor}
      />

      {loading ? (
        <p className="text-gray-500">{t('common.loading')}</p>
      ) : loadError ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-500">
          {loadError}
        </div>
      ) : activeList.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-500">
          {search.trim() || categoryFilter
            ? t('directory.empty_search')
            : t(tab === 'local' ? 'directory.empty_local' : 'directory.empty_federation')}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {tab === 'local'
              ? localBusinesses.map(renderLocalCard)
              : federationBusinesses.map(renderFederationCard)}
          </div>
          {pagination}
        </>
      )}
    </div>
  );
}
