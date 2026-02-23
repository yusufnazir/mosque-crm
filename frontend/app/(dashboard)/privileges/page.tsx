'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Card, CardContent } from '@/components/Card';
import { ApiClient } from '@/lib/api';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import ToastNotification from '@/components/ToastNotification';

interface PermissionDTO {
  id: number;
  code: string;
  description: string;
  category: string;
}

export default function PrivilegesPage() {
  const { t } = useTranslation();
  const [permissions, setPermissions] = useState<PermissionDTO[]>([]);
  const [poolCodes, setPoolCodes] = useState<Set<string>>(new Set());
  const [originalPoolCodes, setOriginalPoolCodes] = useState<Set<string>>(new Set());
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'changed'>('all');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [permsData, poolData] = await Promise.all([
        ApiClient.get<PermissionDTO[]>('/admin/roles/permissions'),
        ApiClient.get<string[]>('/admin/roles/pool'),
      ]);
      setPermissions(permsData);

      const pool = new Set(poolData);
      setPoolCodes(pool);
      setOriginalPoolCodes(new Set(pool));

      // Expand all categories by default
      const cats = new Set(permsData.map((p) => p.category));
      setExpandedCategories(cats);
    } catch (error) {
      console.error('Failed to fetch privileges data:', error);
      setToast({ message: t('privileges.error_loading'), type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Group permissions by category
  const categories = useMemo(() => {
    return permissions.reduce<Record<string, PermissionDTO[]>>((acc, p) => {
      if (!acc[p.category]) acc[p.category] = [];
      acc[p.category].push(p);
      return acc;
    }, {});
  }, [permissions]);

  // Apply search + status filters
  const filteredCategories = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const result: Record<string, PermissionDTO[]> = {};

    for (const [category, perms] of Object.entries(categories)) {
      let filtered = perms;

      if (q) {
        filtered = filtered.filter(
          (p) =>
            p.code.toLowerCase().includes(q) ||
            p.description?.toLowerCase().includes(q) ||
            p.category.toLowerCase().includes(q),
        );
      }

      if (statusFilter === 'changed') {
        filtered = filtered.filter(
          (p) => poolCodes.has(p.code) !== originalPoolCodes.has(p.code),
        );
      }

      if (filtered.length > 0) {
        result[category] = filtered;
      }
    }
    return result;
  }, [categories, searchQuery, statusFilter, poolCodes, originalPoolCodes]);

  const toggleExpand = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedCategories(new Set(Object.keys(categories)));
  };

  const collapseAll = () => {
    setExpandedCategories(new Set());
  };

  const togglePermission = (code: string) => {
    setPoolCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  };

  const toggleCategory = (category: string) => {
    const categoryCodes = (categories[category] || []).map((p) => p.code);
    const allChecked = categoryCodes.every((c) => poolCodes.has(c));

    setPoolCodes((prev) => {
      const next = new Set(prev);
      categoryCodes.forEach((code) => {
        if (allChecked) {
          next.delete(code);
        } else {
          next.add(code);
        }
      });
      return next;
    });
  };

  // Count changes
  const changedCount = useMemo(() => {
    let count = 0;
    permissions.forEach((p) => {
      if (poolCodes.has(p.code) !== originalPoolCodes.has(p.code)) {
        count++;
      }
    });
    return count;
  }, [permissions, poolCodes, originalPoolCodes]);

  const hasChanges = changedCount > 0;

  const handleSave = async () => {
    if (!hasChanges) return;
    try {
      setSaving(true);
      const updatedPool = await ApiClient.put<string[]>('/admin/roles/pool', {
        permissionCodes: Array.from(poolCodes),
      });

      const newPool = new Set(updatedPool);
      setPoolCodes(newPool);
      setOriginalPoolCodes(new Set(newPool));

      setToast({ message: t('privileges.save_success'), type: 'success' });
    } catch (error) {
      console.error('Failed to save pool:', error);
      setToast({ message: t('privileges.save_error'), type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-96 bg-gray-200 rounded-xl"></div>
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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-charcoal mb-2">{t('privileges.title')}</h1>
          <p className="text-gray-600">{t('privileges.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={expandAll}
            className="px-3 py-1.5 text-xs rounded border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            {t('privileges.expand_all')}
          </button>
          <button
            onClick={collapseAll}
            className="px-3 py-1.5 text-xs rounded border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            {t('privileges.collapse_all')}
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className={`px-5 py-2 rounded-lg font-medium text-sm transition-all ${
              hasChanges
                ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {saving ? t('common.saving') || 'Saving...' : t('common.save')}
            {hasChanges && (
              <span className="ml-1.5 bg-white/20 text-white text-xs px-1.5 py-0.5 rounded">
                {changedCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        {/* Search */}
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('privileges.search_placeholder')}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        {/* Status filter */}
        <div className="flex rounded-lg border border-gray-300 overflow-hidden text-sm">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-4 py-2 transition-colors ${
              statusFilter === 'all'
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {t('privileges.filter_all')}
          </button>
          <button
            onClick={() => setStatusFilter('changed')}
            className={`px-4 py-2 border-l border-gray-300 transition-colors ${
              statusFilter === 'changed'
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {t('privileges.filter_changed')}
          </button>
        </div>
      </div>

      {/* Pool summary */}
      <div className="mb-4 flex items-center gap-3 text-sm text-gray-500">
        <span className="flex items-center gap-1.5">
          <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          {poolCodes.size} / {permissions.length} {t('privileges.available_count')}
        </span>
      </div>

      {/* No results */}
      {Object.keys(filteredCategories).length === 0 && (
        <Card>
          <CardContent className="text-center py-12 text-gray-400">
            {searchQuery || statusFilter !== 'all'
              ? t('privileges.no_results')
              : t('privileges.error_loading')}
          </CardContent>
        </Card>
      )}

      {/* Pool table - Desktop */}
      <div className="hidden lg:block">
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left px-4 py-3 text-sm font-semibold text-charcoal">
                      {t('privileges.permission')}
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-charcoal w-32">
                      {t('privileges.available')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(filteredCategories)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([category, perms]) => {
                      const isExpanded = expandedCategories.has(category);
                      const sortedPerms = [...perms].sort((a, b) => a.code.localeCompare(b.code));
                      const allChecked = sortedPerms.every((p) => poolCodes.has(p.code));
                      const someChecked = sortedPerms.some((p) => poolCodes.has(p.code));
                      return (
                        <DesktopCategoryGroup
                          key={category}
                          category={category}
                          permissions={sortedPerms}
                          poolCodes={poolCodes}
                          originalPoolCodes={originalPoolCodes}
                          allChecked={allChecked}
                          someChecked={someChecked}
                          isExpanded={isExpanded}
                          onToggleExpand={() => toggleExpand(category)}
                          onTogglePermission={togglePermission}
                          onToggleCategory={() => toggleCategory(category)}
                        />
                      );
                    })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pool cards - Mobile */}
      <div className="lg:hidden space-y-3">
        {Object.entries(filteredCategories)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([category, perms]) => {
            const isExpanded = expandedCategories.has(category);
            const sortedPerms = [...perms].sort((a, b) => a.code.localeCompare(b.code));
            const allChecked = sortedPerms.every((p) => poolCodes.has(p.code));
            const someChecked = sortedPerms.some((p) => poolCodes.has(p.code));
            return (
              <MobileCategoryGroup
                key={category}
                category={category}
                permissions={sortedPerms}
                poolCodes={poolCodes}
                originalPoolCodes={originalPoolCodes}
                allChecked={allChecked}
                someChecked={someChecked}
                isExpanded={isExpanded}
                onToggleExpand={() => toggleExpand(category)}
                onTogglePermission={togglePermission}
                onToggleCategory={() => toggleCategory(category)}
              />
            );
          })}
      </div>

      {/* Unsaved legend */}
      {hasChanges && (
        <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300"></span>
            {t('privileges.unsaved_change')}
          </span>
          <span>
            {t('privileges.changes_count', { count: String(changedCount) })}
          </span>
        </div>
      )}
    </div>
  );
}

/* --- Desktop Category Group (table rows) --- */

interface CategoryGroupProps {
  category: string;
  permissions: PermissionDTO[];
  poolCodes: Set<string>;
  originalPoolCodes: Set<string>;
  allChecked: boolean;
  someChecked: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onTogglePermission: (code: string) => void;
  onToggleCategory: () => void;
}

function DesktopCategoryGroup({
  category,
  permissions,
  poolCodes,
  originalPoolCodes,
  allChecked,
  someChecked,
  isExpanded,
  onToggleExpand,
  onTogglePermission,
  onToggleCategory,
}: CategoryGroupProps) {
  return (
    <>
      {/* Category header row */}
      <tr className="bg-gray-50 border-t border-gray-200">
        <td className="px-4 py-3">
          <button
            onClick={onToggleExpand}
            className="flex items-center gap-2 text-sm font-bold text-charcoal uppercase tracking-wide hover:text-emerald-700 transition-colors"
          >
            <svg
              className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            {category}
            <span className="text-xs text-gray-400 font-normal normal-case">
              ({permissions.filter((p) => poolCodes.has(p.code)).length}/{permissions.length})
            </span>
          </button>
        </td>
        <td className="px-4 py-3 text-center">
          <input
            type="checkbox"
            checked={allChecked}
            ref={(el) => {
              if (el) el.indeterminate = someChecked && !allChecked;
            }}
            onChange={onToggleCategory}
            className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
            title={`${allChecked ? 'Remove' : 'Add'} all ${category} permissions`}
          />
        </td>
      </tr>

      {/* Individual permission rows */}
      {isExpanded &&
        permissions.map((perm) => {
          const checked = poolCodes.has(perm.code);
          const changed = checked !== originalPoolCodes.has(perm.code);
          return (
            <tr
              key={perm.code}
              className={`border-t border-gray-100 hover:bg-gray-50/50 ${
                changed ? 'bg-emerald-50/50' : ''
              }`}
            >
              <td className="px-4 py-2.5 pl-10">
                <div>
                  <span className="text-sm font-medium text-charcoal">{perm.code}</span>
                  {perm.description && (
                    <p className="text-xs text-gray-500">{perm.description}</p>
                  )}
                </div>
              </td>
              <td className="px-4 py-2.5 text-center">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onTogglePermission(perm.code)}
                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                />
              </td>
            </tr>
          );
        })}
    </>
  );
}

/* --- Mobile Category Group (card-based accordion) --- */

function MobileCategoryGroup({
  category,
  permissions,
  poolCodes,
  originalPoolCodes,
  allChecked,
  someChecked,
  isExpanded,
  onToggleExpand,
  onTogglePermission,
  onToggleCategory,
}: CategoryGroupProps) {
  return (
    <Card>
      <CardContent className="p-0">
        {/* Category header */}
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <button
              onClick={onToggleExpand}
              className="flex items-center gap-2"
            >
              <svg
                className={`w-4 h-4 transition-transform text-gray-500 ${isExpanded ? 'rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className="text-sm font-bold text-charcoal uppercase tracking-wide">
                {category}
              </span>
              <span className="text-xs text-gray-400">
                ({permissions.filter((p) => poolCodes.has(p.code)).length}/{permissions.length})
              </span>
            </button>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={allChecked}
                ref={(el) => {
                  if (el) el.indeterminate = someChecked && !allChecked;
                }}
                onChange={onToggleCategory}
                className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
              />
              <span className="text-xs text-gray-500">{allChecked ? 'All' : 'Toggle'}</span>
            </label>
          </div>
        </div>

        {/* Expanded permission list */}
        {isExpanded && (
          <div className="divide-y divide-gray-100">
            {permissions.map((perm) => {
              const checked = poolCodes.has(perm.code);
              const changed = checked !== originalPoolCodes.has(perm.code);
              return (
                <label
                  key={perm.code}
                  className={`flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                    changed ? 'bg-emerald-50/50' : ''
                  }`}
                >
                  <div>
                    <span className="text-sm font-medium text-charcoal">{perm.code}</span>
                    {perm.description && (
                      <p className="text-xs text-gray-500">{perm.description}</p>
                    )}
                  </div>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onTogglePermission(perm.code)}
                    className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 ml-3 flex-shrink-0"
                  />
                </label>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
