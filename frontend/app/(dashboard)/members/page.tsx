'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import { memberApi } from '@/lib/api';
import Button from '@/components/Button';
import { PersonSearchResult } from '@/types';
import { getInitials, getStatusColor, getLocalizedStatus } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n/LanguageContext';

// Progressive rendering: render rows in batches for smooth scrolling with large datasets
const VISIBLE_BATCH_SIZE = 100;

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
  const [members, setMembers] = useState<PersonSearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'firstName', direction: 'asc' });
  const [visibleCount, setVisibleCount] = useState(VISIBLE_BATCH_SIZE);

  // Callback ref — observer attaches/detaches whenever the sentinel element mounts/unmounts
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useCallback((node: HTMLDivElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    if (node) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            setVisibleCount((prev) => prev + VISIBLE_BATCH_SIZE);
          }
        },
        { rootMargin: '200px' }
      );
      observerRef.current.observe(node);
    }
  }, []);

  // Fetch once on mount — no server re-fetch for sort/filter changes
  useEffect(() => {
    fetchMembers();
  }, []);

  // Reset visible count when search changes
  useEffect(() => {
    setVisibleCount(VISIBLE_BATCH_SIZE);
  }, [searchTerm]);

  const fetchMembers = async () => {
    try {
      const data: any = await memberApi.getAll();
      setMembers(data);
    } catch (error) {
      console.error('Failed to fetch members:', error);
    } finally {
      setLoading(false);
    }
  };

  // Client-side sort toggle — instant, no server round-trip
  const handleSort = useCallback((key: string) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  // Memoized filter + sort — only recalculates when data, search, or sort changes
  const sortedAndFilteredMembers = useMemo(() => {
    const term = searchTerm.toLowerCase();
    const filtered = members.filter(
      (member) =>
        member.id &&
        (
          (member.firstName?.toLowerCase() || '').includes(term) ||
          (member.lastName?.toLowerCase() || '').includes(term) ||
          (member.email?.toLowerCase() || '').includes(term)
        )
    );

    return [...filtered].sort((a, b) => {
      const key = sortConfig.key as keyof PersonSearchResult;
      const aVal = (a[key] ?? '').toString().toLowerCase();
      const bVal = (b[key] ?? '').toString().toLowerCase();
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [members, searchTerm, sortConfig]);

  // Only render rows up to visibleCount for DOM performance
  const visibleMembers = useMemo(
    () => sortedAndFilteredMembers.slice(0, visibleCount),
    [sortedAndFilteredMembers, visibleCount]
  );

  const hasMore = visibleCount < sortedAndFilteredMembers.length;

  if (loading) {
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
      <div className="mb-6 md:mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-charcoal mb-1 md:mb-2">{t('members.title')}</h1>
          <p className="text-gray-600 text-sm md:text-base">{t('members.subtitle')}</p>
        </div>
        <Button onClick={() => router.push('/members/add')}>{t('members.add_new_member')}</Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle>{t('members.all_members')} ({sortedAndFilteredMembers.length})</CardTitle>
            <input
              type="text"
              placeholder={t('members.search_members')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Mobile: Card list */}
          <div className="md:hidden divide-y divide-gray-200">
            {visibleMembers.map((member, index) => (
              <div
                key={member.id || `member-${index}`}
                className="p-4"
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-full text-white flex items-center justify-center font-semibold flex-shrink-0 ${
                    member.status === 'DECEASED' ? 'bg-red-600' : 'bg-emerald-600'
                  }`}>
                    {member.firstName && member.lastName 
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
                {visibleMembers.map((member, index) => (
                  <tr key={member.id || `member-${index}`} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full text-white flex items-center justify-center font-semibold ${
                          member.status === 'DECEASED' ? 'bg-red-600' : 'bg-emerald-600'
                        }`}>
                          {member.firstName && member.lastName 
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
        </CardContent>
      </Card>

      {/* Sentinel for progressive rendering + "showing X of Y" indicator */}
      {hasMore && (
        <div ref={sentinelRef} className="flex justify-center py-4">
          <span className="text-sm text-gray-400">
            {t('members.showing_count', { visible: visibleMembers.length, total: sortedAndFilteredMembers.length })}
          </span>
        </div>
      )}
    </div>
  );
}
