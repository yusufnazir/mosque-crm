'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { buildAuthUrl, useAuth } from '@/lib/auth/AuthContext';
import { useSubscription } from '@/lib/subscription/SubscriptionContext';
import BusinessDirectoryCard from '@/components/BusinessDirectoryCard';
import BusinessDetailDialog, { type DetailBusiness } from '@/components/BusinessDetailDialog';
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
  | 'images'
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

function SearchForm({
  value,
  onChange,
  onSubmit,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
}) {
  const { t } = useTranslation();
  return (
    <form
      className="flex gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={t('directory.search_placeholder')}
        className="min-w-0 flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
      />
      <button
        type="submit"
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-800"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
          <circle cx="11" cy="11" r="7" />
          <path strokeLinecap="round" d="M20 20l-3.5-3.5" />
        </svg>
        {t('directory.search_button')}
      </button>
    </form>
  );
}

function LayersIcon() {
  return (
    <svg className="h-4 w-4 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l9 5-9 5-9-5 9-5z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13l9 5 9-5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 17l9 5 9-5" />
    </svg>
  );
}

function CategoryItems({
  categories,
  counts,
  total,
  selected,
  onSelect,
  labelFor,
}: {
  categories: string[];
  counts: Record<string, number>;
  total: number;
  selected: string;
  onSelect: (value: string) => void;
  labelFor: (code: string | null | undefined) => string;
}) {
  const { t, language } = useTranslation();
  const numberFormat = new Intl.NumberFormat(language);
  const itemClass = (active: boolean) =>
    `flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
      active ? 'bg-emerald-50 font-semibold text-emerald-900' : 'text-stone-700 hover:bg-stone-50'
    }`;

  return (
    <div className="space-y-0.5">
      <button type="button" onClick={() => onSelect('')} className={itemClass(!selected)}>
        <span className="truncate">{t('directory.all_businesses')}</span>
        <span className="shrink-0 text-xs tabular-nums text-stone-400">{numberFormat.format(total)}</span>
      </button>
      {categories.map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => onSelect(selected === code ? '' : code)}
          className={itemClass(selected === code)}
        >
          <span className="truncate">{labelFor(code)}</span>
          <span className="shrink-0 text-xs tabular-nums text-stone-400">
            {numberFormat.format(counts[code] ?? 0)}
          </span>
        </button>
      ))}
    </div>
  );
}

function CategorySidebar(props: {
  categories: string[];
  counts: Record<string, number>;
  total: number;
  selected: string;
  onSelect: (value: string) => void;
  labelFor: (code: string | null | undefined) => string;
}) {
  const { t } = useTranslation();
  if (props.categories.length === 0) return null;

  return (
    <aside className="lg:sticky lg:top-6 lg:self-start">
      {/* Mobile: collapsible list */}
      <details className="rounded-xl border border-stone-200 bg-white lg:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold text-stone-900">
          <span className="inline-flex items-center gap-2">
            <LayersIcon />
            {t('directory.categories')}
          </span>
          <svg className="h-4 w-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
          </svg>
        </summary>
        <div className="max-h-72 overflow-y-auto border-t border-stone-100 p-2">
          <CategoryItems {...props} />
        </div>
      </details>

      {/* Desktop: sticky rail */}
      <div className="hidden rounded-xl border border-stone-200 bg-white lg:block">
        <div className="flex items-center gap-2 border-b border-stone-100 px-4 py-3">
          <LayersIcon />
          <h2 className="text-sm font-semibold text-stone-900">{t('directory.categories')}</h2>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-2">
          <CategoryItems {...props} />
        </div>
      </div>
    </aside>
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

export default function DirectoryBrowseClient({ seed }: { seed?: number } = {}) {
  const { t, language } = useTranslation();
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
  const [appliedSearch, setAppliedSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [localBusinesses, setLocalBusinesses] = useState<BusinessDTO[]>([]);
  const [federationBusinesses, setFederationBusinesses] = useState<FederatedBusinessListingDTO[]>([]);
  const [publicData, setPublicData] = useState<PublicBusinessDirectoryResponse | null>(null);
  const [availableCategoryCodes, setAvailableCategoryCodes] = useState<string[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [totalAll, setTotalAll] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [detailBusiness, setDetailBusiness] = useState<DetailBusiness | null>(null);
  const [loginHref, setLoginHref] = useState('/login');

  useEffect(() => {
    setOrgHandle(extractOrgHandle());
    // buildAuthUrl() needs window (auth.<base> on subdomains)
    setLoginHref(buildAuthUrl('/login'));
  }, []);

  useEffect(() => {
    setPage(0);
  }, [appliedSearch, categoryFilter, tab, pageSize, mode]);

  useEffect(() => {
    setCategoryFilter('');
  }, [tab, mode]);

  /** Explicit search: typing does not fetch; the button (or Enter) applies it. */
  const submitSearch = () => {
    setAppliedSearch(search.trim());
    setPage(0);
  };

  const browseParams = useMemo(
    () => ({
      page,
      size: pageSize,
      search: appliedSearch,
      category: categoryFilter,
      seed,
    }),
    [page, pageSize, appliedSearch, categoryFilter, seed]
  );

  const loadMemberPage = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      if (tab === 'local') {
        const data = await businessDirectoryApi.listPublishedPage(browseParams);
        setLocalBusinesses(data.content ?? []);
        setAvailableCategoryCodes(data.availableCategories ?? []);
        setCategoryCounts(data.categoryCounts ?? {});
        setTotalAll(data.totalAll ?? data.totalElements ?? 0);
        setTotalElements(data.totalElements ?? 0);
        setTotalPages(data.totalPages ?? 0);
      } else {
        const data = await businessDirectoryApi.listFederationPage(browseParams);
        setFederationBusinesses(data.content ?? []);
        setAvailableCategoryCodes(data.availableCategories ?? []);
        setCategoryCounts(data.categoryCounts ?? {});
        setTotalAll(data.totalAll ?? data.totalElements ?? 0);
        setTotalElements(data.totalElements ?? 0);
        setTotalPages(data.totalPages ?? 0);
      }
    } catch {
      setLocalBusinesses([]);
      setFederationBusinesses([]);
      setCategoryCounts({});
      setTotalAll(0);
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
        setCategoryCounts(data.categoryCounts ?? {});
        setTotalAll(data.totalAll ?? data.totalElements ?? data.businesses?.length ?? 0);
        setTotalElements(data.totalElements ?? data.businesses?.length ?? 0);
        setTotalPages(data.totalPages ?? 1);
      } catch {
        setPublicData(null);
        setCategoryCounts({});
        setTotalAll(0);
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
    <BusinessDirectoryCard
      key={business.id}
      business={business}
      onSelect={setDetailBusiness}
      detailsLabel={t('directory.card_details')}
    />
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
        onSelect={setDetailBusiness}
        detailsLabel={t('directory.card_details')}
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
      onSelect={setDetailBusiness}
      detailsLabel={t('directory.card_details')}
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
      <div className="p-8 max-w-6xl mx-auto">
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
            <div className="mb-6">
              <SearchForm value={search} onChange={setSearch} onSubmit={submitSearch} />
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-8">
              <CategorySidebar
                categories={availableCategories}
                counts={categoryCounts}
                total={totalAll}
                selected={categoryFilter}
                onSelect={setCategoryFilter}
                labelFor={labelFor}
              />

              <div className="min-w-0">
                <p className="mb-4 text-sm text-stone-500">
                  {t(totalElements === 1 ? 'directory.result_count_one' : 'directory.result_count', {
                    count: new Intl.NumberFormat(language).format(totalElements),
                  })}
                </p>
                {loading ? (
                  <p className="text-gray-500">{t('common.loading')}</p>
                ) : (publicData?.businesses?.length ?? 0) === 0 ? (
                  <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-500">
                    {appliedSearch || categoryFilter ? t('directory.empty_search') : t('directory.public_empty')}
                  </div>
                ) : (
                  <>
                    <div className="grid gap-5 grid-cols-[repeat(auto-fill,minmax(min(21rem,100%),1fr))]">
                      {publicData!.businesses.map((b) => renderPublicCard(b))}
                    </div>
                    {pagination}
                  </>
                )}
              </div>
            </div>
          </>
        )}

        {/* Member CTA — turns the public directory into an engagement funnel */}
        {orgName && (
          <div className="mt-10 flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-emerald-900">
                {t('directory.member_cta_title', { org: orgName })}
              </p>
              <p className="mt-0.5 text-sm text-emerald-800/80">{t('directory.member_cta_text')}</p>
            </div>
            {user ? (
              <Link
                href={canRegister ? '/my-businesses/new' : '/my-businesses'}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-emerald-700 bg-white px-4 py-2 text-sm font-medium text-emerald-800 transition-colors hover:bg-emerald-100"
              >
                {canRegister ? t('directory.register_business') : t('directory.my_businesses')}
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ) : (
              <a
                href={loginHref}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-800"
              >
                {t('directory.member_cta_button')}
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </a>
            )}
          </div>
        )}

        <BusinessDetailDialog
          business={detailBusiness}
          onClose={() => setDetailBusiness(null)}
          fullPageHref={
            detailBusiness ? businessPublicPath(detailBusiness.id, detailBusiness.name) : undefined
          }
          subtitle={
            detailBusiness?.listedByOrganizationHandle &&
            detailBusiness.listedByOrganizationHandle !== orgHandle
              ? t('business_directory.listed_by', {
                  org:
                    detailBusiness.listedByOrganizationName ||
                    detailBusiness.listedByOrganizationHandle,
                })
              : undefined
          }
        />
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

      <div className="mb-4">
        <SearchForm value={search} onChange={setSearch} onSubmit={submitSearch} />
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-8">
        <CategorySidebar
          categories={availableCategories}
          counts={categoryCounts}
          total={totalAll}
          selected={categoryFilter}
          onSelect={setCategoryFilter}
          labelFor={labelFor}
        />

        <div className="min-w-0">
          <p className="mb-4 text-sm text-stone-500">
            {t(totalElements === 1 ? 'directory.result_count_one' : 'directory.result_count', {
              count: new Intl.NumberFormat(language).format(totalElements),
            })}
          </p>

          {loading ? (
            <p className="text-gray-500">{t('common.loading')}</p>
          ) : loadError ? (
            <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-500">
              {loadError}
            </div>
          ) : activeList.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-500">
              {appliedSearch || categoryFilter
                ? t('directory.empty_search')
                : t(tab === 'local' ? 'directory.empty_local' : 'directory.empty_federation')}
            </div>
          ) : (
            <>
              <div className="grid gap-5 grid-cols-[repeat(auto-fill,minmax(min(21rem,100%),1fr))]">
                {tab === 'local'
                  ? localBusinesses.map(renderLocalCard)
                  : federationBusinesses.map(renderFederationCard)}
              </div>
              {pagination}
            </>
          )}
        </div>
      </div>

      {/* Signed-in viewers get the same detail view as the public page. */}
      <BusinessDetailDialog
        business={detailBusiness}
        onClose={() => setDetailBusiness(null)}
        subtitle={
          detailBusiness?.listedByOrganizationHandle
            ? t('business_directory.listed_by', {
                org:
                  detailBusiness.listedByOrganizationName ||
                  detailBusiness.listedByOrganizationHandle,
              })
            : undefined
        }
      />
    </div>
  );
}
