'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { useSubscription } from '@/lib/subscription/SubscriptionContext';
import { useAuth } from '@/lib/auth/AuthContext';
import type { MemberFilterCriteria } from '@/lib/api';
import { groupApi, GroupDTO } from '@/lib/groupApi';
import { savedFilterApi, SavedMemberFilter, parseFilterJson, serializeFilterCriteria } from '@/lib/savedFilterApi';
import { isPlanRestriction } from '@/lib/api';
import ToastNotification from '@/components/ToastNotification';
import ConfirmDialog from '@/components/ConfirmDialog';

const STATUSES = ['ACTIVE', 'INACTIVE', 'DECEASED', 'PENDING'];

interface FilterPanelProps {
  criteria: MemberFilterCriteria;
  onChange: (criteria: MemberFilterCriteria) => void;
  onClear: () => void;
}

export default function FilterPanel({ criteria, onChange, onClear }: FilterPanelProps) {
  const { t } = useTranslation();
  const { hasFeature } = useSubscription();
  const { can } = useAuth();
  const canSavedFilters = hasFeature('member.saved_filters') && can('member.saved_filters.manage');

  const [groups, setGroups] = useState<GroupDTO[]>([]);
  const [savedFilters, setSavedFilters] = useState<SavedMemberFilter[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [filterName, setFilterName] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SavedMemberFilter | null>(null);

  // Fetch groups for the groups multi-select
  useEffect(() => {
    groupApi.list().then(setGroups).catch(() => {});
  }, []);

  // Fetch saved filters (ungated read)
  useEffect(() => {
    if (canSavedFilters) {
      savedFilterApi.list().then(setSavedFilters).catch(() => {});
    }
  }, [canSavedFilters]);

  // ---- Status checkboxes ----
  const toggleStatus = (status: string) => {
    const current = criteria.statuses ?? [];
    const next = current.includes(status)
      ? current.filter(s => s !== status)
      : [...current, status];
    onChange({ ...criteria, statuses: next.length ? next : undefined });
  };

  // ---- Group multi-select ----
  const toggleGroup = (groupId: number) => {
    const current = criteria.groupIds ?? [];
    const next = current.includes(groupId)
      ? current.filter(g => g !== groupId)
      : [...current, groupId];
    onChange({ ...criteria, groupIds: next.length ? next : undefined });
  };

  // ---- Save filter ----
  const handleSaveFilter = async () => {
    if (!filterName.trim()) return;
    setSaving(true);
    try {
      const created = await savedFilterApi.create({
        name: filterName.trim(),
        filterJson: serializeFilterCriteria(criteria),
      });
      setSavedFilters(prev => [...prev, created]);
      setFilterName('');
      setShowSaveDialog(false);
      setToast({ message: t('members.filter_saved'), type: 'success' });
    } catch {
      setToast({ message: t('common.error'), type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // ---- Load filter ----
  const handleLoadFilter = (filter: SavedMemberFilter) => {
    onChange(parseFilterJson(filter.filterJson));
  };

  // ---- Delete filter ----
  const handleDeleteFilter = async () => {
    if (!deleteTarget) return;
    try {
      await savedFilterApi.delete(deleteTarget.id);
      setSavedFilters(prev => prev.filter(f => f.id !== deleteTarget.id));
      setToast({ message: t('members.filter_deleted'), type: 'success' });
    } catch {
      setToast({ message: t('common.error'), type: 'error' });
    } finally {
      setDeleteTarget(null);
    }
  };

  const hasActiveFilters =
    (criteria.statuses?.length ?? 0) > 0 ||
    criteria.gender ||
    criteria.minAge !== undefined ||
    criteria.maxAge !== undefined ||
    criteria.hasEmail !== undefined ||
    criteria.hasPhone !== undefined ||
    (criteria.groupIds?.length ?? 0) > 0 ||
    criteria.joinedFrom ||
    criteria.joinedTo;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-700">{t('members.filter_panel')}</span>
        <div className="flex items-center gap-2">
          {canSavedFilters && savedFilters.length > 0 && (
            <div className="relative group">
              <button className="text-xs text-emerald-700 hover:underline font-medium">
                {t('members.saved_filters')} ({savedFilters.length})
              </button>
              <div className="absolute right-0 top-6 z-20 hidden group-hover:block bg-white border border-gray-200 rounded-lg shadow-lg min-w-[180px]">
                {savedFilters.map(f => (
                  <div key={f.id} className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 gap-2">
                    <button
                      className="text-sm text-gray-700 truncate text-left flex-1"
                      onClick={() => handleLoadFilter(f)}
                    >
                      {f.isDefault && <span className="mr-1">★</span>}
                      {f.name}
                    </button>
                    <button
                      className="text-gray-400 hover:text-red-500 text-xs ml-1 flex-shrink-0"
                      onClick={() => setDeleteTarget(f)}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {canSavedFilters && hasActiveFilters && (
            <button
              className="text-xs bg-emerald-700 text-white px-2 py-1 rounded hover:bg-emerald-800"
              onClick={() => setShowSaveDialog(true)}
            >
              {t('members.save_filter')}
            </button>
          )}
          {hasActiveFilters && (
            <button
              className="text-xs text-gray-500 hover:text-gray-800 underline"
              onClick={onClear}
            >
              {t('members.clear_filters')}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Status */}
        <div>
          <p className="text-xs font-medium text-gray-600 mb-1">{t('members.filter_status')}</p>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {STATUSES.map(s => (
              <label key={s} className="flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-emerald-700"
                  checked={(criteria.statuses ?? []).includes(s)}
                  onChange={() => toggleStatus(s)}
                />
                <span className="text-xs text-gray-700">{t(`common.status_${s.toLowerCase()}`) || s}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Gender */}
        <div>
          <p className="text-xs font-medium text-gray-600 mb-1">{t('members.filter_gender')}</p>
          <div className="flex gap-3">
            {(['', 'male', 'female', 'other'] as const).map(g => (
              <label key={g} className="flex items-center gap-1 cursor-pointer">
                <input
                  type="radio"
                  className="text-emerald-700"
                  name="filter-gender"
                  value={g}
                  checked={(criteria.gender ?? '') === g}
                  onChange={() => onChange({ ...criteria, gender: g || undefined })}
                />
                <span className="text-xs text-gray-700">
                  {g === '' ? t('common.all') : t(`common.gender_${g}`) || g}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Age range */}
        <div>
          <p className="text-xs font-medium text-gray-600 mb-1">{t('members.filter_age')}</p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={150}
              placeholder="Min"
              value={criteria.minAge ?? ''}
              onChange={e => onChange({ ...criteria, minAge: e.target.value ? Number(e.target.value) : undefined })}
              className="w-16 border border-gray-300 rounded px-2 py-1 text-xs"
            />
            <span className="text-gray-400 text-xs">–</span>
            <input
              type="number"
              min={0}
              max={150}
              placeholder="Max"
              value={criteria.maxAge ?? ''}
              onChange={e => onChange({ ...criteria, maxAge: e.target.value ? Number(e.target.value) : undefined })}
              className="w-16 border border-gray-300 rounded px-2 py-1 text-xs"
            />
          </div>
        </div>

        {/* Has Email / Has Phone */}
        <div>
          <p className="text-xs font-medium text-gray-600 mb-1">{t('members.filter_contact')}</p>
          <div className="flex flex-col gap-1">
            <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                className="rounded border-gray-300 text-emerald-700"
                checked={criteria.hasEmail === true}
                onChange={e => onChange({ ...criteria, hasEmail: e.target.checked ? true : undefined })}
              />
              {t('members.filter_has_email')}
            </label>
            <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                className="rounded border-gray-300 text-emerald-700"
                checked={criteria.hasPhone === true}
                onChange={e => onChange({ ...criteria, hasPhone: e.target.checked ? true : undefined })}
              />
              {t('members.filter_has_phone')}
            </label>
          </div>
        </div>

        {/* Joined date range */}
        <div>
          <p className="text-xs font-medium text-gray-600 mb-1">{t('members.filter_joined')}</p>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={criteria.joinedFrom ?? ''}
              onChange={e => onChange({ ...criteria, joinedFrom: e.target.value || undefined })}
              className="border border-gray-300 rounded px-2 py-1 text-xs"
            />
            <span className="text-gray-400 text-xs">–</span>
            <input
              type="date"
              value={criteria.joinedTo ?? ''}
              onChange={e => onChange({ ...criteria, joinedTo: e.target.value || undefined })}
              className="border border-gray-300 rounded px-2 py-1 text-xs"
            />
          </div>
        </div>

        {/* Groups */}
        {groups.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-600 mb-1">{t('members.filter_groups')}</p>
            <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
              {groups.map(g => (
                <label key={g.id} className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-emerald-700"
                    checked={(criteria.groupIds ?? []).includes(g.id!)}
                    onChange={() => toggleGroup(g.id!)}
                  />
                  <span className="text-xs text-gray-700">{g.name}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Save Filter Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="text-base font-semibold text-gray-800 mb-3">{t('members.save_filter')}</h3>
            <label className="block text-sm text-gray-600 mb-1">{t('members.filter_name_label')}</label>
            <input
              autoFocus
              type="text"
              value={filterName}
              onChange={e => setFilterName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSaveFilter()}
              placeholder={t('members.filter_name_label')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                onClick={() => { setShowSaveDialog(false); setFilterName(''); }}
              >
                {t('common.cancel')}
              </button>
              <button
                className="px-4 py-2 text-sm bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 disabled:opacity-50"
                disabled={!filterName.trim() || saving}
                onClick={handleSaveFilter}
              >
                {saving ? t('common.saving') : t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Filter Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        title={t('members.delete_saved_filter')}
        message={t('members.delete_saved_filter_confirm', { name: deleteTarget?.name ?? '' })}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        variant="danger"
        onConfirm={handleDeleteFilter}
        onCancel={() => setDeleteTarget(null)}
      />

      {toast && (
        <ToastNotification
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
