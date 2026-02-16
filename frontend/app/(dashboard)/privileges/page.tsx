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

interface RoleDTO {
  id: number;
  name: string;
  description: string;
  permissionCodes: string[];
  assignablePermissionCodes: string[];
}

type RolePermissionMap = Record<number, Set<string>>;

export default function PrivilegesPage() {
  const { t } = useTranslation();
  const [roles, setRoles] = useState<RoleDTO[]>([]);
  const [permissions, setPermissions] = useState<PermissionDTO[]>([]);
  const [editState, setEditState] = useState<RolePermissionMap>({});
  const [originalState, setOriginalState] = useState<RolePermissionMap>({});
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'changed'>('all');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [rolesData, permsData] = await Promise.all([
        ApiClient.get<RoleDTO[]>('/admin/roles'),
        ApiClient.get<PermissionDTO[]>('/admin/roles/permissions'),
      ]);
      setRoles(rolesData);
      setPermissions(permsData);

      // Build role-permission maps from assignablePermissionCodes (the pool)
      const orig: RolePermissionMap = {};
      const edit: RolePermissionMap = {};
      rolesData.forEach((role) => {
        orig[role.id] = new Set(role.assignablePermissionCodes);
        edit[role.id] = new Set(role.assignablePermissionCodes);
      });
      setOriginalState(orig);
      setEditState(edit);

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

      // Text search: match on code, description, or category
      if (q) {
        filtered = filtered.filter(
          (p) =>
            p.code.toLowerCase().includes(q) ||
            p.description?.toLowerCase().includes(q) ||
            p.category.toLowerCase().includes(q),
        );
      }

      // Status filter: show only permissions that differ from original
      if (statusFilter === 'changed') {
        filtered = filtered.filter((p) =>
          roles.some((role) => {
            const orig = originalState[role.id];
            const edit = editState[role.id];
            if (!orig || !edit) return false;
            return orig.has(p.code) !== edit.has(p.code);
          }),
        );
      }

      if (filtered.length > 0) {
        result[category] = filtered;
      }
    }
    return result;
  }, [categories, searchQuery, statusFilter, roles, originalState, editState]);

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

  const togglePermission = (roleId: number, code: string) => {
    setEditState((prev) => {
      const next = { ...prev };
      const roleSet = new Set(next[roleId]);
      if (roleSet.has(code)) {
        roleSet.delete(code);
      } else {
        roleSet.add(code);
      }
      next[roleId] = roleSet;
      return next;
    });
  };

  const toggleCategoryForRole = (roleId: number, category: string) => {
    const categoryCodes = (categories[category] || []).map((p) => p.code);
    const roleSet = editState[roleId] || new Set<string>();
    const allChecked = categoryCodes.every((c) => roleSet.has(c));

    setEditState((prev) => {
      const next = { ...prev };
      const updated = new Set(next[roleId]);
      categoryCodes.forEach((code) => {
        if (allChecked) {
          updated.delete(code);
        } else {
          updated.add(code);
        }
      });
      next[roleId] = updated;
      return next;
    });
  };

  // Which roles have changes?
  const changedRoleIds = useMemo(() => {
    const changed: number[] = [];
    roles.forEach((role) => {
      const orig = originalState[role.id];
      const edit = editState[role.id];
      if (!orig || !edit) return;
      if (orig.size !== edit.size || ![...orig].every((c) => edit.has(c))) {
        changed.push(role.id);
      }
    });
    return changed;
  }, [roles, originalState, editState]);

  const hasChanges = changedRoleIds.length > 0;

  const handleSave = async () => {
    if (!hasChanges) return;
    try {
      setSaving(true);
      const updates = changedRoleIds.map((roleId) =>
        ApiClient.put<RoleDTO>(`/admin/roles/${roleId}/assignable-permissions`, {
          permissionCodes: Array.from(editState[roleId]),
        }),
      );
      const updatedRoles = await Promise.all(updates);

      // Merge updates back into state
      setRoles((prev) =>
        prev.map((r) => {
          const updated = updatedRoles.find((u) => u.id === r.id);
          return updated || r;
        }),
      );
      const newOrig: RolePermissionMap = { ...originalState };
      updatedRoles.forEach((r) => {
        newOrig[r.id] = new Set(r.assignablePermissionCodes);
      });
      setOriginalState(newOrig);
      const newEdit: RolePermissionMap = { ...editState };
      updatedRoles.forEach((r) => {
        newEdit[r.id] = new Set(r.assignablePermissionCodes);
      });
      setEditState(newEdit);

      setToast({ message: t('privileges.save_success'), type: 'success' });
    } catch (error) {
      console.error('Failed to save privileges:', error);
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
                {changedRoleIds.length}
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

      {/* Privilege Matrix — Desktop table */}
      <div className="hidden lg:block">
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left px-4 py-3 text-sm font-semibold text-charcoal min-w-[250px]">
                      {t('privileges.permission')}
                    </th>
                    {roles.map((role) => (
                      <th
                        key={role.id}
                        className={`px-3 py-3 text-center text-sm font-semibold min-w-[100px] ${
                          changedRoleIds.includes(role.id)
                            ? 'text-emerald-700 bg-emerald-50'
                            : 'text-charcoal'
                        }`}
                      >
                        {role.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(filteredCategories)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([category, perms]) => {
                      const isExpanded = expandedCategories.has(category);
                      const sortedPerms = [...perms].sort((a, b) => a.code.localeCompare(b.code));
                      return (
                        <DesktopCategoryGroup
                          key={category}
                          category={category}
                          permissions={sortedPerms}
                          roles={roles}
                          editState={editState}
                          isExpanded={isExpanded}
                          onToggleExpand={() => toggleExpand(category)}
                          onTogglePermission={togglePermission}
                          onToggleCategoryForRole={toggleCategoryForRole}
                        />
                      );
                    })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Privilege Matrix — Mobile cards */}
      <div className="lg:hidden space-y-3">
        {Object.entries(filteredCategories)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([category, perms]) => {
            const isExpanded = expandedCategories.has(category);
            const sortedPerms = [...perms].sort((a, b) => a.code.localeCompare(b.code));
            return (
              <MobileCategoryGroup
                key={category}
                category={category}
                permissions={sortedPerms}
                roles={roles}
                editState={editState}
                isExpanded={isExpanded}
                onToggleExpand={() => toggleExpand(category)}
                onTogglePermission={togglePermission}
                onToggleCategoryForRole={toggleCategoryForRole}
              />
            );
          })}
      </div>

      {/* Legend */}
      {hasChanges && (
        <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300"></span>
            {t('privileges.unsaved_change')}
          </span>
          <span>
            {t('privileges.roles_changed', { count: String(changedRoleIds.length) })}
          </span>
        </div>
      )}
    </div>
  );
}

/* ─── Desktop Category Group (table rows) ──────────────────────────────── */

interface CategoryGroupProps {
  category: string;
  permissions: PermissionDTO[];
  roles: RoleDTO[];
  editState: RolePermissionMap;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onTogglePermission: (roleId: number, code: string) => void;
  onToggleCategoryForRole: (roleId: number, category: string) => void;
}

function DesktopCategoryGroup({
  category,
  permissions,
  roles,
  editState,
  isExpanded,
  onToggleExpand,
  onTogglePermission,
  onToggleCategoryForRole,
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
              ({permissions.length})
            </span>
          </button>
        </td>
        {roles.map((role) => {
          const roleSet = editState[role.id] || new Set<string>();
          const allChecked = permissions.every((p) => roleSet.has(p.code));
          const someChecked = permissions.some((p) => roleSet.has(p.code));
          return (
            <td key={role.id} className="px-3 py-3 text-center">
              <input
                type="checkbox"
                checked={allChecked}
                ref={(el) => {
                  if (el) el.indeterminate = someChecked && !allChecked;
                }}
                onChange={() => onToggleCategoryForRole(role.id, category)}
                className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                title={`${allChecked ? 'Remove' : 'Assign'} all ${category} permissions for ${role.name}`}
              />
            </td>
          );
        })}
      </tr>

      {/* Individual permission rows (only if expanded) */}
      {isExpanded &&
        permissions.map((perm) => (
          <tr key={perm.code} className="border-t border-gray-100 hover:bg-gray-50/50">
            <td className="px-4 py-2.5 pl-10">
              <div>
                <span className="text-sm font-medium text-charcoal">{perm.code}</span>
                {perm.description && (
                  <p className="text-xs text-gray-500">{perm.description}</p>
                )}
              </div>
            </td>
            {roles.map((role) => {
              const roleSet = editState[role.id] || new Set<string>();
              const checked = roleSet.has(perm.code);
              return (
                <td key={role.id} className="px-3 py-2.5 text-center">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onTogglePermission(role.id, perm.code)}
                    className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                  />
                </td>
              );
            })}
          </tr>
        ))}
    </>
  );
}

/* ─── Mobile Category Group (card-based accordion) ─────────────────────── */

function MobileCategoryGroup({
  category,
  permissions,
  roles,
  editState,
  isExpanded,
  onToggleExpand,
  onTogglePermission,
  onToggleCategoryForRole,
}: CategoryGroupProps) {
  return (
    <Card>
      <CardContent className="p-0">
        {/* Category header */}
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <button
            onClick={onToggleExpand}
            className="w-full flex items-center gap-2"
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
            <span className="text-xs text-gray-400">({permissions.length})</span>
          </button>
          {/* Category-level role toggles below the header */}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2 ml-6">
            {roles.map((role) => {
              const roleSet = editState[role.id] || new Set<string>();
              const allChecked = permissions.every((p) => roleSet.has(p.code));
              const someChecked = permissions.some((p) => roleSet.has(p.code));
              return (
                <label key={role.id} className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allChecked}
                    ref={(el) => {
                      if (el) el.indeterminate = someChecked && !allChecked;
                    }}
                    onChange={() => onToggleCategoryForRole(role.id, category)}
                    className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                  />
                  <span className="text-xs text-gray-500">{role.name}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Expanded permission cards */}
        {isExpanded && (
          <div className="divide-y divide-gray-100">
            {permissions.map((perm) => (
              <div key={perm.code} className="px-4 py-3">
                <div className="mb-2">
                  <span className="text-sm font-medium text-charcoal">{perm.code}</span>
                  {perm.description && (
                    <p className="text-xs text-gray-500">{perm.description}</p>
                  )}
                </div>
                <div className="flex flex-wrap gap-3">
                  {roles.map((role) => {
                    const roleSet = editState[role.id] || new Set<string>();
                    const checked = roleSet.has(perm.code);
                    return (
                      <label
                        key={role.id}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                          checked
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => onTogglePermission(role.id, perm.code)}
                          className="w-3.5 h-3.5 text-emerald-600 rounded focus:ring-emerald-500"
                        />
                        {role.name}
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
