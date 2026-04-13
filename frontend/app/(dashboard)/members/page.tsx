'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import { memberApi, PageResponse } from '@/lib/api';
import Button from '@/components/Button';
import { PersonSearchResult } from '@/types';
import { getInitials, getStatusColor, getLocalizedStatus } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { joinRequestApi } from '@/lib/joinRequestApi';
import ToastNotification from '@/components/ToastNotification';

const DEFAULT_PAGE_SIZE = 20;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const SEARCH_DEBOUNCE_MS = 400;

// Helper function to capitalize names properly
const capitalizeName = (name: string | undefined): string => {
  if (!name) return '';
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

export default function MembersPage() {
  const router = useRouter();
  const { t } = useTranslation();

  // Pagination state
  const [members, setMembers] = useState<PersonSearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Search & sort
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'firstName', direction: 'asc' });

  // Search debounce
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Invite modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteSending, setInviteSending] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(0);
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [searchTerm]);

  // Fetch data when pagination/search/sort changes
  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await memberApi.getPaged({
        page,
        size: pageSize,
        search: debouncedSearch || undefined,
        sortBy: sortConfig.key,
        direction: sortConfig.direction,
      }) as PageResponse<PersonSearchResult>;
      setMembers(Array.isArray(data?.content) ? data.content : []);
      setTotalElements(data?.totalElements ?? 0);
      setTotalPages(data?.totalPages ?? 0);
    } catch (error) {
      console.error('Failed to fetch members:', error);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, debouncedSearch, sortConfig]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  // Sort toggle — triggers server-side re-fetch
  const handleSort = useCallback((key: string) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
    setPage(0);
  }, []);

  const handleSendInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviteSending(true);
    try {
      await joinRequestApi.invite(inviteEmail.trim());
      setToast({ message: t('members.invite_success'), type: 'success' });
      setShowInviteModal(false);
      setInviteEmail('');
    } catch {
      setToast({ message: t('members.invite_error'), type: 'error' });
    } finally {
      setInviteSending(false);
    }
  };

  // Page navigation
  const goToPage = (newPage: number) => {
    if (newPage >= 0 && newPage < totalPages) {
      setPage(newPage);
    }
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(0);
  };

  // Compute display range
  const startItem = totalElements === 0 ? 0 : page * pageSize + 1;
  const endItem = Math.min((page + 1) * pageSize, totalElements);

  // Generate page numbers to show
  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(0, page - Math.floor(maxVisible / 2));
    const end = Math.min(totalPages - 1, start + maxVisible - 1);
    if (end - start < maxVisible - 1) {
      start = Math.max(0, end - maxVisible + 1);
    }
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }, [page, totalPages]);

  if (loading && members.length === 0) {
    return (
      <div className="p-4 md:p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      {toast && (
        <ToastNotification
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="mb-6 md:mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-charcoal mb-1 md:mb-2">{t('members.title')}</h1>
          <p className="text-gray-600 text-sm md:text-base">{t('members.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setInviteEmail(''); setShowInviteModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 transition text-sm font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            {t('members.invite')}
          </button>
          <Button onClick={() => router.push('/members/add')}>{t('members.add_new_member')}</Button>
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
            <h2 className="text-xl font-bold text-charcoal mb-2">{t('members.invite_title')}</h2>
            <p className="text-sm text-gray-500 mb-5">{t('members.invite_description')}</p>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('members.invite_email_label')}
            </label>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder={t('members.invite_email_placeholder')}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition mb-5"
              onKeyDown={(e) => { if (e.key === 'Enter') handleSendInvite(); }}
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowInviteModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm"
                disabled={inviteSending}
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSendInvite}
                disabled={inviteSending || !inviteEmail.trim()}
                className="px-5 py-2 bg-emerald-700 text-white rounded-lg font-semibold hover:bg-emerald-800 transition text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {inviteSending ? t('members.invite_sending') : t('members.invite_send')}
              </button>
            </div>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle>{t('members.all_members')} ({totalElements})</CardTitle>
            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder={t('members.search_members')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 relative">
          {/* Loading overlay for page transitions */}
          {loading && members.length > 0 && (
            <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
            </div>
          )}

          {/* Mobile: Card list */}
          <div className="md:hidden divide-y divide-gray-200">
            {members.map((member, index) => (
              <div
                key={member.id || `member-${index}`}
                className="p-4"
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-full text-white flex items-center justify-center font-semibold flex-shrink-0 overflow-hidden ${
                    member.status === 'DECEASED' ? 'bg-red-600' : 'bg-emerald-600'
                  }`}>
                    {member.profileImageUrl ? (
                      <img src={member.profileImageUrl} alt="" className="w-full h-full object-cover" />
                    ) : member.firstName && member.lastName 
                      ? getInitials(member.firstName, member.lastName)
                      : 'M'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-charcoal truncate">
                        {member.firstName && member.lastName 
                          ? `${capitalizeName(member.firstName)} ${capitalizeName(member.lastName)}`
                          : t('members.unknown')}
                      </span>
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded-full flex-shrink-0 ${getStatusColor(
                          member.status || 'ACTIVE'
                        )}`}
                      >
                        {t(getLocalizedStatus(member.status || 'ACTIVE'))}
                      </span>
                    </div>
                    {member.email && (
                      <div className="text-sm text-gray-500 truncate mt-0.5">{member.email}</div>
                    )}
                    {member.phone && (
                      <div className="text-sm text-gray-400 mt-0.5">{member.phone}</div>
                    )}
                    {/* Action buttons */}
                    <div className="flex items-center gap-4 mt-2 pt-2 border-t border-gray-100">
                      <button
                        onClick={() => router.push(`/members/${member.id}`)}
                        className="text-emerald-700 hover:text-emerald-900 transition-colors flex items-center gap-1 text-sm"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        {t('common.view')}
                      </button>
                      <button
                        onClick={() => router.push(`/members/${member.id}/edit`)}
                        className="text-emerald-700 hover:text-emerald-900 transition-colors flex items-center gap-1 text-sm"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        {t('common.edit')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('firstName')}
                  >
                    <div className="flex items-center">
                      {t('members.member')}
                      {sortConfig?.key === 'firstName' && (
                        <span className="ml-1">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('email')}
                  >
                    <div className="flex items-center">
                      {t('members.contact')}
                      {sortConfig?.key === 'email' && (
                        <span className="ml-1">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center">
                      {t('common.status')}
                      {sortConfig?.key === 'status' && (
                        <span className="ml-1">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t('common.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {members.map((member, index) => (
                  <tr key={member.id || `member-${index}`} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full text-white flex items-center justify-center font-semibold overflow-hidden ${
                          member.status === 'DECEASED' ? 'bg-red-600' : 'bg-emerald-600'
                        }`}>
                          {member.profileImageUrl ? (
                            <img src={member.profileImageUrl} alt="" className="w-full h-full object-cover" />
                          ) : member.firstName && member.lastName 
                            ? getInitials(member.firstName, member.lastName)
                            : 'M'}
                        </div>
                        <div>
                          <div className="font-medium text-charcoal">
                            {member.firstName && member.lastName 
                              ? `${capitalizeName(member.firstName)} ${capitalizeName(member.lastName)}`
                              : t('members.unknown')}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {member.email && <div className="text-sm text-gray-900">{member.email}</div>}
                      {member.phone && <div className="text-sm text-gray-500">{member.phone}</div>}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                          member.status || 'ACTIVE'
                        )}`}
                      >
                        {t(getLocalizedStatus(member.status || 'ACTIVE'))}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => router.push(`/members/${member.id}`)}
                          className="text-emerald-700 hover:text-emerald-900 transition-colors"
                          title={t('common.view')}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => router.push(`/members/${member.id}/edit`)}
                          className="text-emerald-700 hover:text-emerald-900 transition-colors"
                          title={t('common.edit')}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Empty state */}
          {members.length === 0 && !loading && (
            <div className="p-8 text-center text-gray-500">
              {debouncedSearch ? t('members.no_results') : t('members.no_members')}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination controls */}
      {totalPages > 0 && (
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Page size selector + showing info */}
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <span>{t('pagination.rows_per_page')}:</span>
            <select
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white"
            >
              {PAGE_SIZE_OPTIONS.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            <span>
              {t('pagination.showing_range', { start: String(startItem), end: String(endItem), total: String(totalElements) })}
            </span>
          </div>

          {/* Page navigation */}
          <div className="flex items-center gap-1">
            {/* First page */}
            <button
              onClick={() => goToPage(0)}
              disabled={page === 0}
              className="px-2 py-1.5 text-sm rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title={t('pagination.first')}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
            {/* Previous */}
            <button
              onClick={() => goToPage(page - 1)}
              disabled={page === 0}
              className="px-2 py-1.5 text-sm rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title={t('pagination.previous')}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* Page numbers */}
            {pageNumbers.length > 0 && pageNumbers[0] > 0 && (
              <span className="px-2 py-1.5 text-sm text-gray-400">...</span>
            )}
            {pageNumbers.map((p) => (
              <button
                key={p}
                onClick={() => goToPage(p)}
                className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                  p === page
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'border-gray-300 hover:bg-gray-100 text-gray-700'
                }`}
              >
                {p + 1}
              </button>
            ))}
            {pageNumbers.length > 0 && pageNumbers[pageNumbers.length - 1] < totalPages - 1 && (
              <span className="px-2 py-1.5 text-sm text-gray-400">...</span>
            )}

            {/* Next */}
            <button
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages - 1}
              className="px-2 py-1.5 text-sm rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title={t('pagination.next')}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            {/* Last page */}
            <button
              onClick={() => goToPage(totalPages - 1)}
              disabled={page >= totalPages - 1}
              className="px-2 py-1.5 text-sm rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title={t('pagination.last')}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
