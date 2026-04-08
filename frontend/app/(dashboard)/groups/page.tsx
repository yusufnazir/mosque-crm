'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import ToastNotification from '@/components/ToastNotification';
import ConfirmDialog from '@/components/ConfirmDialog';
import Button from '@/components/Button';
import { groupApi, GroupDTO, GroupTranslationDTO } from '@/lib/groupApi';
import { useTranslation } from '@/lib/i18n/LanguageContext';

/** Format a date string safely (avoids UTC timezone shift for date-only strings) */
const formatDate = (d: string) => {
  const s = d.length === 10 ? d + 'T00:00:00' : d;
  return new Date(s).toLocaleDateString();
};

export default function GroupsPage() {
  const router = useRouter();
  const { t, language: locale } = useTranslation();
  const [groups, setGroups] = useState<GroupDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [nameEn, setNameEn] = useState('');
  const [descEn, setDescEn] = useState('');
  const [nameNl, setNameNl] = useState('');
  const [descNl, setDescNl] = useState('');
  const [createStartDate, setCreateStartDate] = useState('');
  const [createEndDate, setCreateEndDate] = useState('');
  const [creating, setCreating] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState<GroupDTO | null>(null);

  /** Resolve translated name for a group (current locale → en fallback → raw name) */
  const getGroupName = useCallback((g: GroupDTO) => {
    const trans = g.translations?.find(tr => tr.locale === locale)
      || g.translations?.find(tr => tr.locale === 'en');
    return trans?.name || g.name;
  }, [locale]);

  /** Resolve translated description for a group */
  const getGroupDescription = useCallback((g: GroupDTO) => {
    const trans = g.translations?.find(tr => tr.locale === locale)
      || g.translations?.find(tr => tr.locale === 'en');
    return trans?.description || g.description;
  }, [locale]);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const data = await groupApi.list();
      setGroups(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load groups', err);
      setToast({ message: t('groups.load_error') || 'Failed to load groups', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredGroups = useMemo(() => {
    if (!searchTerm.trim()) return groups;
    const q = searchTerm.toLowerCase();
    return groups.filter(
      (g) => {
        const name = getGroupName(g);
        const desc = getGroupDescription(g);
        return name.toLowerCase().includes(q) || (desc && desc.toLowerCase().includes(q));
      }
    );
  }, [groups, searchTerm, getGroupName, getGroupDescription]);

  const resetCreateForm = () => {
    setNameEn('');
    setDescEn('');
    setNameNl('');
    setDescNl('');
    setCreateStartDate('');
    setCreateEndDate('');
  };

  const handleCreate = async () => {
    if (!nameEn.trim()) return;
    try {
      setCreating(true);
      const translations: GroupTranslationDTO[] = [];
      if (nameEn.trim()) translations.push({ locale: 'en', name: nameEn.trim(), description: descEn.trim() || undefined });
      if (nameNl.trim()) translations.push({ locale: 'nl', name: nameNl.trim(), description: descNl.trim() || undefined });

      const created = await groupApi.create({
        name: nameEn.trim(),
        description: descEn.trim() || undefined,
        startDate: createStartDate || undefined,
        endDate: createEndDate || undefined,
        translations,
      });
      setGroups((prev) => [...prev, created]);
      setShowCreate(false);
      resetCreateForm();
      setToast({ message: t('groups.create_success') || 'Group created', type: 'success' });
    } catch (err) {
      console.error('Create group failed', err);
      setToast({ message: t('groups.create_error') || 'Failed to create group', type: 'error' });
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await groupApi.delete(deleteConfirm.id as number);
      setGroups((prev) => prev.filter((g) => g.id !== deleteConfirm.id));
      setDeleteConfirm(null);
      setToast({ message: t('groups.delete_success') || 'Deleted', type: 'success' });
    } catch (err) {
      console.error('Failed to delete group', err);
      setToast({ message: t('groups.delete_error') || 'Failed to delete', type: 'error' });
    }
  };

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
      {toast && (
        <ToastNotification message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      {/* Page header */}
      <div className="mb-6 md:mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-charcoal mb-1 md:mb-2">
            {t('groups.title') || 'Groups'}
          </h1>
          <p className="text-gray-600 text-sm md:text-base">
            {t('groups.subtitle') || 'Manage groups and group memberships'}
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          + {t('groups.create') || 'Create Group'}
        </Button>
      </div>

      {/* Main card with table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle>
              {t('groups.all_groups') || 'All Groups'} ({filteredGroups.length})
            </CardTitle>
            <input
              type="text"
              placeholder={t('common.search') || 'Search...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredGroups.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-charcoal mb-1">
                {t('groups.no_groups') || 'No groups found'}
              </h3>
              <p className="text-gray-500 text-sm text-center max-w-sm">
                {t('groups.no_groups_description') || 'Get started by creating your first group.'}
              </p>
            </div>
          ) : (
            <>
              {/* Mobile: Card list */}
              <div className="md:hidden divide-y divide-gray-200">
                {filteredGroups.map((g) => {
                  const name = getGroupName(g);
                  const desc = getGroupDescription(g);
                  return (<div key={g.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-charcoal truncate">{name}</span>
                          <span
                            className={`px-2 py-0.5 text-xs font-medium rounded-full flex-shrink-0 ${
                              g.isActive !== false
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {g.isActive !== false
                              ? t('groups.active') || 'Active'
                              : t('groups.inactive') || 'Inactive'}
                          </span>
                        </div>
                        {desc && (
                          <p className="text-sm text-gray-500 truncate">{desc}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          {g.memberCount != null && (
                            <span className="text-xs text-gray-400">
                              {t('groups.members_count', { count: g.memberCount }) || `${g.memberCount} member(s)`}
                            </span>
                          )}
                          {g.startDate && (
                            <span className="text-xs text-gray-400">
                              {t('groups.start_date') || 'Start'}: {formatDate(g.startDate)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-2 pt-2 border-t border-gray-100">
                          <button
                            onClick={() => router.push(`/groups/${g.id}`)}
                            className="text-emerald-700 hover:text-emerald-900 transition-colors flex items-center gap-1 text-sm"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            {t('common.view') || 'View'}
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(g)}
                            className="text-red-600 hover:text-red-800 transition-colors flex items-center gap-1 text-sm"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            {t('common.delete') || 'Delete'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>);
                })}
              </div>

              {/* Desktop: Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        {t('groups.name') || 'Name'}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        {t('groups.description') || 'Description'}
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                        {t('members.title') || 'Members'}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        {t('groups.status') || 'Status'}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        {t('groups.start_date') || 'Start Date'}
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        {t('groups.actions') || 'Actions'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredGroups.map((g) => {
                      const name = getGroupName(g);
                      const desc = getGroupDescription(g);
                      return (<tr
                        key={g.id}
                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => router.push(`/groups/${g.id}`)}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-semibold text-sm flex-shrink-0">
                              {name.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-medium text-charcoal">{name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                          {desc || '—'}
                        </td>
                        <td className="px-6 py-4 text-center text-sm text-gray-500">
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 text-gray-700 font-medium text-xs">
                            {g.memberCount ?? 0}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${
                              g.isActive !== false
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {g.isActive !== false
                              ? t('groups.active') || 'Active'
                              : t('groups.inactive') || 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {g.startDate ? formatDate(g.startDate) : '—'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => router.push(`/groups/${g.id}`)}
                              className="text-emerald-700 hover:text-emerald-900 transition-colors p-1"
                              title={t('common.view') || 'View'}
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(g)}
                              className="text-red-500 hover:text-red-700 transition-colors p-1"
                              title={t('common.delete') || 'Delete'}
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>);
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Create Group modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-charcoal mb-4">
              {t('groups.create') || 'Create Group'}
            </h2>
            <div className="space-y-4">
              {/* English Translation */}
              <fieldset className="border border-gray-200 rounded-lg p-3">
                <legend className="text-xs font-medium text-gray-500 px-1">English</legend>
                <div className="space-y-2">
                  <input
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    placeholder={t('groups.name') || 'Name'}
                    value={nameEn}
                    onChange={(e) => setNameEn(e.target.value)}
                    autoFocus
                  />
                  <textarea
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none"
                    rows={2}
                    placeholder={t('groups.description') || 'Description'}
                    value={descEn}
                    onChange={(e) => setDescEn(e.target.value)}
                  />
                </div>
              </fieldset>

              {/* Dutch Translation */}
              <fieldset className="border border-gray-200 rounded-lg p-3">
                <legend className="text-xs font-medium text-gray-500 px-1">Nederlands</legend>
                <div className="space-y-2">
                  <input
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    placeholder={t('groups.name') || 'Naam'}
                    value={nameNl}
                    onChange={(e) => setNameNl(e.target.value)}
                  />
                  <textarea
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none"
                    rows={2}
                    placeholder={t('groups.description') || 'Beschrijving'}
                    value={descNl}
                    onChange={(e) => setDescNl(e.target.value)}
                  />
                </div>
              </fieldset>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{t('groups.start_date') || 'Start Date'}</label>
                  <input
                    type="date"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    value={createStartDate}
                    onChange={(e) => setCreateStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{t('groups.end_date') || 'End Date'}</label>
                  <input
                    type="date"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    value={createEndDate}
                    onChange={(e) => setCreateEndDate(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowCreate(false);
                  resetCreateForm();
                }}
              >
                {t('common.cancel') || 'Cancel'}
              </Button>
              <Button onClick={handleCreate} disabled={creating || !nameEn.trim()}>
                {creating ? '...' : t('common.save') || 'Save'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteConfirm}
        title={t('groups.delete_title') || 'Delete Group'}
        message={t('groups.delete_message', { name: deleteConfirm ? getGroupName(deleteConfirm) : '' }) || `Delete ${deleteConfirm ? getGroupName(deleteConfirm) : ''}?`}
        confirmLabel={t('common.delete') || 'Delete'}
        cancelLabel={t('common.cancel') || 'Cancel'}
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}
