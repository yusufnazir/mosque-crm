'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import { ApiClient } from '@/lib/api';
import { UserDTO, CreateUserRequest, UpdateUserRequest, userApi } from '@/lib/userApi';
import ToastNotification from '@/components/ToastNotification';

interface RoleDTO {
  id: number;
  name: string;
  description: string;
  permissionCodes: string[];
}

export default function UsersPage() {
  const { t } = useTranslation();

  const [users, setUsers] = useState<UserDTO[]>([]);
  const [roles, setRoles] = useState<RoleDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserDTO | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRoles, setFormRoles] = useState<Set<string>>(new Set());
  const [formEnabled, setFormEnabled] = useState(true);

  // Delete confirmation
  const [deleteUserId, setDeleteUserId] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [usersData, rolesData] = await Promise.all([
        userApi.getAll(),
        ApiClient.get<RoleDTO[]>('/admin/roles'),
      ]);
      setUsers(usersData);
      setRoles(rolesData);
    } catch (err) {
      console.error('Failed to load users:', err);
      setToast({ message: t('users.load_error'), type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter users by search
  const filteredUsers = users.filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      u.username.toLowerCase().includes(q) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      u.roles.some((r) => r.toLowerCase().includes(q)) ||
      (u.mosqueName && u.mosqueName.toLowerCase().includes(q))
    );
  });

  // Open modal for create
  const openCreateModal = () => {
    setEditingUser(null);
    setFormUsername('');
    setFormPassword('');
    setFormEmail('');
    setFormRoles(new Set());
    setFormEnabled(true);
    setShowModal(true);
  };

  // Open modal for edit
  const openEditModal = (user: UserDTO) => {
    setEditingUser(user);
    setFormUsername(user.username);
    setFormPassword('');
    setFormEmail(user.email || '');
    setFormRoles(new Set(user.roles));
    setFormEnabled(user.accountEnabled);
    setShowModal(true);
  };

  const toggleFormRole = (roleName: string) => {
    setFormRoles((prev) => {
      const next = new Set(prev);
      if (next.has(roleName)) {
        next.delete(roleName);
      } else {
        next.add(roleName);
      }
      return next;
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      if (editingUser) {
        // Update
        const req: UpdateUserRequest = {
          email: formEmail || undefined,
          roles: Array.from(formRoles),
          accountEnabled: formEnabled,
        };
        if (formPassword) {
          req.password = formPassword;
        }
        await userApi.update(editingUser.id, req);
        setToast({ message: t('users.updated'), type: 'success' });
      } else {
        // Create
        if (!formUsername || !formPassword) {
          setToast({ message: t('users.username_password_required'), type: 'error' });
          setSaving(false);
          return;
        }
        const req: CreateUserRequest = {
          username: formUsername,
          password: formPassword,
          email: formEmail || undefined,
          roles: Array.from(formRoles),
        };
        await userApi.create(req);
        setToast({ message: t('users.created'), type: 'success' });
      }
      setShowModal(false);
      loadData();
    } catch (err: any) {
      console.error('Failed to save user:', err);
      setToast({ message: err.message || t('users.save_error'), type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleEnabled = async (user: UserDTO) => {
    try {
      await userApi.toggleEnabled(user.id);
      setToast({
        message: user.accountEnabled ? t('users.disabled') : t('users.enabled'),
        type: 'success',
      });
      loadData();
    } catch (err) {
      console.error('Failed to toggle user:', err);
      setToast({ message: t('users.save_error'), type: 'error' });
    }
  };

  const handleDelete = async () => {
    if (!deleteUserId) return;
    try {
      await userApi.delete(deleteUserId);
      setToast({ message: t('users.deleted'), type: 'success' });
      setDeleteUserId(null);
      loadData();
    } catch (err: any) {
      console.error('Failed to delete user:', err);
      setToast({ message: err.message || t('users.delete_error'), type: 'error' });
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString();
  };

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
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-charcoal">{t('users.title')}</h1>
        <p className="text-gray-600 mt-2">{t('users.subtitle')}</p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder={t('users.search_placeholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
          />
        </div>
        <button
          onClick={openCreateModal}
          className="bg-emerald-700 text-white px-4 py-2 rounded-lg font-semibold hover:bg-emerald-800 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t('users.add_user')}
        </button>
      </div>

      {/* Users List */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-12 text-gray-500">{t('common.loading')}</div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-gray-500">{t('users.no_users')}</div>
          ) : (
            <>
              {/* Mobile: Card list */}
              <div className="md:hidden divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className="p-4"
                  >
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0 ${
                        user.accountLocked ? 'bg-red-600' : user.accountEnabled ? 'bg-emerald-600' : 'bg-gray-400'
                      }`}>
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-charcoal truncate">{user.username}</span>
                            {user.currentUser && (
                              <span className="inline-block bg-blue-100 text-blue-800 text-xs font-medium px-1.5 py-0.5 rounded-full flex-shrink-0">
                                {t('users.you')}
                              </span>
                            )}
                          </div>
                          {user.accountLocked ? (
                            <span className="inline-flex items-center gap-1 text-red-700 bg-red-100 text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                              </svg>
                              {t('users.locked')}
                            </span>
                          ) : user.accountEnabled ? (
                            <span className="inline-block bg-green-100 text-green-800 text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0">
                              {t('users.active')}
                            </span>
                          ) : (
                            <span className="inline-block bg-gray-100 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0">
                              {t('users.inactive')}
                            </span>
                          )}
                        </div>
                        {user.personName && (
                          <div className="text-xs text-gray-500 mt-0.5">{user.personName}</div>
                        )}
                        {user.email && (
                          <div className="text-sm text-gray-500 truncate mt-0.5">{user.email}</div>
                        )}
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {user.roles.map((role) => (
                            <span
                              key={role}
                              className="inline-block bg-emerald-100 text-emerald-800 text-xs font-medium px-2 py-0.5 rounded-full"
                            >
                              {role}
                            </span>
                          ))}
                        </div>
                        {user.mosqueName && (
                          <div className="text-xs text-gray-400 mt-1">{user.mosqueName}</div>
                        )}
                        {/* Action buttons */}
                        <div className="flex items-center gap-4 mt-2 pt-2 border-t border-gray-100">
                          <button
                            onClick={() => openEditModal(user)}
                            className="text-emerald-700 hover:text-emerald-900 transition-colors flex items-center gap-1 text-sm"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            {t('common.edit')}
                          </button>
                          {!user.currentUser && (
                            <>
                              <button
                                onClick={() => handleToggleEnabled(user)}
                                className={`${user.accountEnabled ? 'text-yellow-600 hover:text-yellow-800' : 'text-green-600 hover:text-green-800'} transition-colors flex items-center gap-1 text-sm`}
                              >
                                {user.accountEnabled ? (
                                  <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                    </svg>
                                    {t('users.disable')}
                                  </>
                                ) : (
                                  <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    {t('users.enable')}
                                  </>
                                )}
                              </button>
                              <button
                                onClick={() => setDeleteUserId(user.id)}
                                className="text-red-500 hover:text-red-700 transition-colors flex items-center gap-1 text-sm"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                {t('common.delete')}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop: Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="py-3 px-4 text-sm font-semibold text-gray-600">{t('users.username')}</th>
                      <th className="py-3 px-4 text-sm font-semibold text-gray-600">{t('users.email')}</th>
                      <th className="py-3 px-4 text-sm font-semibold text-gray-600">{t('users.roles')}</th>
                      <th className="py-3 px-4 text-sm font-semibold text-gray-600">{t('users.mosque')}</th>
                      <th className="py-3 px-4 text-sm font-semibold text-gray-600">{t('users.status')}</th>
                      <th className="py-3 px-4 text-sm font-semibold text-gray-600">{t('users.last_login')}</th>
                      <th className="py-3 px-4 text-sm font-semibold text-gray-600">{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-charcoal">{user.username}</span>
                            {user.currentUser && (
                              <span className="inline-block bg-blue-100 text-blue-800 text-xs font-medium px-1.5 py-0.5 rounded-full">
                                {t('users.you')}
                              </span>
                            )}
                          </div>
                          {user.personName && (
                            <div className="text-xs text-gray-500">{user.personName}</div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-gray-600">{user.email || '—'}</td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            {user.roles.map((role) => (
                              <span
                                key={role}
                                className="inline-block bg-emerald-100 text-emerald-800 text-xs font-medium px-2 py-0.5 rounded-full"
                              >
                                {role}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-600">{user.mosqueName || '—'}</td>
                        <td className="py-3 px-4">
                          {user.accountLocked ? (
                            <span className="inline-flex items-center gap-1 text-red-700 bg-red-100 text-xs font-medium px-2 py-0.5 rounded-full">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                              </svg>
                              {t('users.locked')}
                            </span>
                          ) : user.accountEnabled ? (
                            <span className="inline-block bg-green-100 text-green-800 text-xs font-medium px-2 py-0.5 rounded-full">
                              {t('users.active')}
                            </span>
                          ) : (
                            <span className="inline-block bg-gray-100 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full">
                              {t('users.inactive')}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-gray-600 text-sm">{formatDate(user.lastLogin)}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openEditModal(user)}
                              className="text-emerald-700 hover:text-emerald-900 transition-colors"
                              title={t('common.edit')}
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            {!user.currentUser && (
                              <>
                                <button
                                  onClick={() => handleToggleEnabled(user)}
                                  className={`${user.accountEnabled ? 'text-yellow-600 hover:text-yellow-800' : 'text-green-600 hover:text-green-800'} transition-colors`}
                                  title={user.accountEnabled ? t('users.disable') : t('users.enable')}
                                >
                                  {user.accountEnabled ? (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                    </svg>
                                  ) : (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                  )}
                                </button>
                                <button
                                  onClick={() => setDeleteUserId(user.id)}
                                  className="text-red-500 hover:text-red-700 transition-colors"
                                  title={t('common.delete')}
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-charcoal">
                {editingUser ? t('users.edit_user') : t('users.add_user')}
              </h2>
            </div>
            <div className="p-6 space-y-4">
              {/* Username */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('users.username')} *
                </label>
                <input
                  type="text"
                  value={formUsername}
                  onChange={(e) => setFormUsername(e.target.value)}
                  disabled={!!editingUser}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none disabled:bg-gray-100 disabled:text-gray-500"
                  placeholder={t('users.username')}
                />
                {editingUser && (
                  <p className="text-xs text-gray-400 mt-1">{t('users.username_cannot_change')}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {editingUser ? t('users.new_password') : t('users.password')} {!editingUser && '*'}
                </label>
                <input
                  type="password"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  placeholder={editingUser ? t('users.leave_blank') : t('users.password')}
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('users.email')}
                </label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  placeholder={t('users.email')}
                />
              </div>

              {/* Roles */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('users.roles')}
                </label>
                <div className="space-y-2">
                  {roles.map((role) => {
                    const isChecked = formRoles.has(role.name);
                    // When editing self, prevent unchecking existing roles
                    const isLockedRole = editingUser?.currentUser && editingUser.roles.includes(role.name);
                    return (
                      <label
                        key={role.id}
                        className={`flex items-center gap-2 ${isLockedRole ? 'opacity-60' : 'cursor-pointer'}`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => !isLockedRole && toggleFormRole(role.name)}
                          disabled={isLockedRole}
                          className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500 disabled:cursor-not-allowed"
                        />
                        <span className="text-sm text-gray-700">{role.name}</span>
                        {role.description && (
                          <span className="text-xs text-gray-400">— {role.description}</span>
                        )}
                        {isLockedRole && (
                          <span className="text-xs text-gray-400 italic">({t('users.you')})</span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Enabled toggle (edit mode only, disabled for self) */}
              {editingUser && !editingUser.currentUser && (
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium text-gray-700">{t('users.account_enabled')}</label>
                  <button
                    type="button"
                    onClick={() => setFormEnabled(!formEnabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      formEnabled ? 'bg-emerald-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        formEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              )}
            </div>

            {/* Modal actions */}
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-emerald-700 text-white rounded-lg font-semibold hover:bg-emerald-800 transition-colors disabled:opacity-50"
              >
                {saving ? t('common.loading') : t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteUserId !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
            <h3 className="text-lg font-bold text-charcoal mb-2">{t('users.confirm_delete_title')}</h3>
            <p className="text-gray-600 mb-6">{t('users.confirm_delete')}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteUserId(null)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors"
              >
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
