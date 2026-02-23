'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import { ApiClient } from '@/lib/api';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import ToastNotification from '@/components/ToastNotification';
import ConfirmDialog from '@/components/ConfirmDialog';

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

export default function RolesPage() {
  const { t } = useTranslation();
  const [roles, setRoles] = useState<RoleDTO[]>([]);
  const [permissions, setPermissions] = useState<PermissionDTO[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [editPermissions, setEditPermissions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Create role modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [creating, setCreating] = useState(false);

  // Edit role modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editingRole, setEditingRole] = useState(false);

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<RoleDTO | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [rolesData, permsData] = await Promise.all([
        ApiClient.get<RoleDTO[]>('/admin/roles'),
        ApiClient.get<PermissionDTO[]>('/admin/roles/permissions'),
      ]);
      setRoles(rolesData);
      setPermissions(permsData);
      if (rolesData.length > 0 && selectedRoleId === null) {
        const first = rolesData[0];
        setSelectedRoleId(first.id);
        setEditPermissions(new Set(first.permissionCodes));
      }
    } catch (error) {
      console.error('Failed to fetch roles data:', error);
      setToast({ message: t('roles.error_loading'), type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [selectedRoleId, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const selectRole = (role: RoleDTO) => {
    setSelectedRoleId(role.id);
    setEditPermissions(new Set(role.permissionCodes));
  };

  const togglePermission = (code: string) => {
    setEditPermissions((prev) => {
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
    const assignablePool = selectedRole?.assignablePermissionCodes || [];
    const categoryCodes = permissions
      .filter((p) => p.category === category && assignablePool.includes(p.code))
      .map((p) => p.code);
    const allSelected = categoryCodes.every((c) => editPermissions.has(c));

    setEditPermissions((prev) => {
      const next = new Set(prev);
      categoryCodes.forEach((code) => {
        if (allSelected) {
          next.delete(code);
        } else {
          next.add(code);
        }
      });
      return next;
    });
  };

  const handleSave = async () => {
    if (selectedRoleId === null) return;
    try {
      setSaving(true);
      const updated = await ApiClient.put<RoleDTO>(
        `/admin/roles/${selectedRoleId}/permissions`,
        { permissionCodes: Array.from(editPermissions) },
      );
      setRoles((prev) =>
        prev.map((r) => (r.id === updated.id ? updated : r)),
      );
      setEditPermissions(new Set(updated.permissionCodes));
      setToast({ message: t('roles.save_success'), type: 'success' });
    } catch (error) {
      console.error('Failed to save role permissions:', error);
      setToast({ message: t('roles.save_error'), type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // Create role
  const handleCreate = async () => {
    if (!createName.trim()) return;
    try {
      setCreating(true);
      const newRole = await ApiClient.post<RoleDTO>('/admin/roles', {
        name: createName.trim(),
        description: createDescription.trim(),
      });
      setRoles((prev) => [...prev, newRole]);
      setSelectedRoleId(newRole.id);
      setEditPermissions(new Set(newRole.permissionCodes));
      setShowCreateModal(false);
      setCreateName('');
      setCreateDescription('');
      setToast({ message: t('roles.create_success'), type: 'success' });
    } catch (error: unknown) {
      console.error('Failed to create role:', error);
      const errMsg = error instanceof Error ? error.message : t('roles.create_error');
      setToast({ message: errMsg, type: 'error' });
    } finally {
      setCreating(false);
    }
  };

  // Edit role
  const openEditModal = () => {
    if (!selectedRole) return;
    setEditName(selectedRole.name);
    setEditDescription(selectedRole.description || '');
    setShowEditModal(true);
  };

  const handleEditRole = async () => {
    if (!selectedRole || !editName.trim()) return;
    try {
      setEditingRole(true);
      const updated = await ApiClient.put<RoleDTO>(`/admin/roles/${selectedRole.id}`, {
        name: editName.trim(),
        description: editDescription.trim(),
      });
      setRoles((prev) =>
        prev.map((r) => (r.id === updated.id ? updated : r)),
      );
      setShowEditModal(false);
      setToast({ message: t('roles.edit_success'), type: 'success' });
    } catch (error: unknown) {
      console.error('Failed to update role:', error);
      const errMsg = error instanceof Error ? error.message : t('roles.edit_error');
      setToast({ message: errMsg, type: 'error' });
    } finally {
      setEditingRole(false);
    }
  };

  // Delete role
  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await ApiClient.delete(`/admin/roles/${deleteConfirm.id}`);
      setRoles((prev) => prev.filter((r) => r.id !== deleteConfirm.id));
      if (selectedRoleId === deleteConfirm.id) {
        setSelectedRoleId(null);
        setEditPermissions(new Set());
      }
      setDeleteConfirm(null);
      setToast({ message: t('roles.delete_success'), type: 'success' });
    } catch (error: unknown) {
      console.error('Failed to delete role:', error);
      const errMsg = error instanceof Error ? error.message : t('roles.delete_error');
      setToast({ message: errMsg, type: 'error' });
    }
  };

  const selectedRole = roles.find((r) => r.id === selectedRoleId);

  // Only show permissions that are in the selected role's assignable pool
  const assignablePool = new Set(selectedRole?.assignablePermissionCodes || []);
  const availablePermissions = permissions.filter((p) => assignablePool.has(p.code));

  const categories = availablePermissions.reduce<Record<string, PermissionDTO[]>>((acc, p) => {
    if (!acc[p.category]) acc[p.category] = [];
    acc[p.category].push(p);
    return acc;
  }, {});

  const hasChanges =
    selectedRole &&
    (editPermissions.size !== selectedRole.permissionCodes.length ||
      !selectedRole.permissionCodes.every((c) => editPermissions.has(c)));

  if (loading) {
    return (
      <div className="p-4 md:p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6">
            <div className="h-64 bg-gray-200 rounded-xl"></div>
            <div className="lg:col-span-3 h-96 bg-gray-200 rounded-xl"></div>
          </div>
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

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        open={!!deleteConfirm}
        title={t('roles.delete_title')}
        message={t('roles.delete_message', { name: deleteConfirm?.name || '' })}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(null)}
      />

      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-charcoal mb-2">{t('roles.title')}</h1>
        <p className="text-gray-600">{t('roles.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6">
        {/* Role List */}
        <div className="lg:sticky lg:top-4 lg:self-start">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{t('roles.all_roles')}</CardTitle>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                  title={t('roles.create_role')}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y divide-gray-100">
                {roles.map((role) => (
                  <li key={role.id}>
                    <button
                      onClick={() => selectRole(role)}
                      className={`w-full text-left px-4 py-3 transition-colors ${
                        selectedRoleId === role.id
                          ? 'bg-emerald-50 border-l-4 border-emerald-600'
                          : 'hover:bg-gray-50 border-l-4 border-transparent'
                      }`}
                    >
                      <p className="font-semibold text-charcoal">{role.name}</p>
                      <p className="text-xs text-gray-500">
                        {role.permissionCodes.length}/{role.assignablePermissionCodes.length} {t('roles.permissions_count')}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Permission Editor */}
        <div className="lg:col-span-3">
          {selectedRole ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>
                      {selectedRole.name}  {t('roles.permissions')}
                    </CardTitle>
                    {selectedRole.description && (
                      <p className="text-sm text-gray-500 mt-1">{selectedRole.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Edit role button */}
                    <button
                      onClick={openEditModal}
                      className="p-2 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                      title={t('roles.edit_role')}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    {/* Delete role button */}
                    {selectedRole.name !== 'SUPER_ADMIN' && (
                      <button
                        onClick={() => setDeleteConfirm(selectedRole)}
                        className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title={t('roles.delete_role')}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                    {/* Save button */}
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
                    </button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {Object.keys(categories).length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    {t('roles.no_assignable')}
                  </div>
                ) : (
                <div className="space-y-6">
                  {Object.entries(categories)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([category, perms]) => {
                      const allChecked = perms.every((p) => editPermissions.has(p.code));
                      const someChecked = perms.some((p) => editPermissions.has(p.code));
                      return (
                        <div key={category} className="border border-gray-200 rounded-lg p-4">
                          <label className="flex items-center gap-3 mb-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={allChecked}
                              ref={(el) => {
                                if (el) el.indeterminate = someChecked && !allChecked;
                              }}
                              onChange={() => toggleCategory(category)}
                              className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                            />
                            <span className="text-sm font-bold text-charcoal uppercase tracking-wide">
                              {category}
                            </span>
                            <span className="text-xs text-gray-400">
                              ({perms.filter((p) => editPermissions.has(p.code)).length}/{perms.length})
                            </span>
                          </label>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 ml-7">
                            {perms
                              .sort((a, b) => a.code.localeCompare(b.code))
                              .map((perm) => (
                                <label
                                  key={perm.code}
                                  className="flex items-start gap-2 cursor-pointer p-2 rounded hover:bg-gray-50 transition-colors"
                                >
                                  <input
                                    type="checkbox"
                                    checked={editPermissions.has(perm.code)}
                                    onChange={() => togglePermission(perm.code)}
                                    className="w-4 h-4 mt-0.5 text-emerald-600 rounded focus:ring-emerald-500"
                                  />
                                  <div>
                                    <span className="text-sm font-medium text-charcoal">
                                      {perm.code}
                                    </span>
                                    {perm.description && (
                                      <p className="text-xs text-gray-500">{perm.description}</p>
                                    )}
                                  </div>
                                </label>
                              ))}
                          </div>
                        </div>
                      );
                    })}
                </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="text-center py-16 text-gray-400">
                {t('roles.select_role')}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Create Role Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-bold text-charcoal mb-4">{t('roles.create_role')}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('roles.role_name')}
                </label>
                <input
                  type="text"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder={t('roles.name_placeholder')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm"
                  autoFocus
                />
                <p className="text-xs text-gray-400 mt-1">{t('roles.name_hint')}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('roles.role_description')}
                </label>
                <textarea
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                  placeholder={t('roles.description_placeholder')}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => { setShowCreateModal(false); setCreateName(''); setCreateDescription(''); }}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !createName.trim()}
                className="px-5 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {creating ? t('common.saving') || 'Saving...' : t('roles.create_role')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Role Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-bold text-charcoal mb-4">{t('roles.edit_role')}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('roles.role_name')}
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm"
                  autoFocus
                />
                <p className="text-xs text-gray-400 mt-1">{t('roles.name_hint')}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('roles.role_description')}
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleEditRole}
                disabled={editingRole || !editName.trim()}
                className="px-5 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {editingRole ? t('common.saving') || 'Saving...' : t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
