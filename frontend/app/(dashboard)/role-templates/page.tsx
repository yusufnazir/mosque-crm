'use client';

import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import { ApiClient } from '@/lib/api';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import ToastNotification from '@/components/ToastNotification';

interface PermissionDTO {
  id: number;
  code: string;
  description: string;
  category: string;
}

interface RoleTemplateDTO {
  id: number;
  name: string;
  description: string;
  active: boolean;
  sortOrder: number;
  permissionCodes: string[];
  assignablePermissionCodes: string[];
}

export default function RoleTemplatesPage() {
  const { t } = useTranslation();
  const [templates, setTemplates] = useState<RoleTemplateDTO[]>([]);
  const [permissions, setPermissions] = useState<PermissionDTO[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);

  const [editPermissions, setEditPermissions] = useState<Set<string>>(new Set());
  const [editAssignablePermissions, setEditAssignablePermissions] = useState<Set<string>>(new Set());

  const [loading, setLoading] = useState(true);
  const [savingEffective, setSavingEffective] = useState(false);
  const [savingAssignable, setSavingAssignable] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [templateData, permissionData] = await Promise.all([
        ApiClient.get<RoleTemplateDTO[]>('/admin/role-templates'),
        ApiClient.get<PermissionDTO[]>('/admin/roles/permissions'),
      ]);

      setTemplates(templateData);
      setPermissions(permissionData);

      if (templateData.length > 0) {
        const currentId = selectedTemplateId ?? templateData[0].id;
        const selected = templateData.find((t) => t.id === currentId) ?? templateData[0];
        setSelectedTemplateId(selected.id);
        setEditPermissions(new Set(selected.permissionCodes));
        setEditAssignablePermissions(new Set(selected.assignablePermissionCodes));
      } else {
        setSelectedTemplateId(null);
        setEditPermissions(new Set());
        setEditAssignablePermissions(new Set());
      }
    } catch (error) {
      console.error('Failed to load role templates:', error);
      setToast({ message: t('role_templates.error_loading'), type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [selectedTemplateId, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedTemplateId),
    [templates, selectedTemplateId],
  );

  const categories = useMemo(() => {
    return permissions.reduce<Record<string, PermissionDTO[]>>((acc, permission) => {
      if (!acc[permission.category]) {
        acc[permission.category] = [];
      }
      acc[permission.category].push(permission);
      return acc;
    }, {});
  }, [permissions]);

  const selectTemplate = (template: RoleTemplateDTO) => {
    setSelectedTemplateId(template.id);
    setEditPermissions(new Set(template.permissionCodes));
    setEditAssignablePermissions(new Set(template.assignablePermissionCodes));
  };

  const toggleSetItem = (
    setter: Dispatch<SetStateAction<Set<string>>>,
    code: string,
  ) => {
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  };

  const toggleCategory = (
    category: string,
    sourceSet: Set<string>,
    setter: Dispatch<SetStateAction<Set<string>>>,
  ) => {
    const categoryCodes = (categories[category] || []).map((permission) => permission.code);
    const allSelected = categoryCodes.every((code) => sourceSet.has(code));

    setter((prev) => {
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

  const updateLocalTemplate = (updatedTemplate: RoleTemplateDTO) => {
    setTemplates((prev) => prev.map((template) => (template.id === updatedTemplate.id ? updatedTemplate : template)));
    if (selectedTemplateId === updatedTemplate.id) {
      setEditPermissions(new Set(updatedTemplate.permissionCodes));
      setEditAssignablePermissions(new Set(updatedTemplate.assignablePermissionCodes));
    }
  };

  const handleSaveEffective = async () => {
    if (!selectedTemplate) return;
    try {
      setSavingEffective(true);
      const updated = await ApiClient.put<RoleTemplateDTO>(
        `/admin/role-templates/${selectedTemplate.id}/permissions`,
        { permissionCodes: Array.from(editPermissions) },
      );
      updateLocalTemplate(updated);
      setToast({ message: t('role_templates.save_success'), type: 'success' });
    } catch (error) {
      console.error('Failed to save effective permissions:', error);
      setToast({ message: t('role_templates.save_error'), type: 'error' });
    } finally {
      setSavingEffective(false);
    }
  };

  const handleSaveAssignable = async () => {
    if (!selectedTemplate) return;
    try {
      setSavingAssignable(true);
      const updated = await ApiClient.put<RoleTemplateDTO>(
        `/admin/role-templates/${selectedTemplate.id}/assignable-permissions`,
        { permissionCodes: Array.from(editAssignablePermissions) },
      );
      updateLocalTemplate(updated);
      setToast({ message: t('role_templates.save_success'), type: 'success' });
    } catch (error) {
      console.error('Failed to save assignable permissions:', error);
      setToast({ message: t('role_templates.save_error'), type: 'error' });
    } finally {
      setSavingAssignable(false);
    }
  };

  const handleSync = async () => {
    if (!selectedTemplate) return;
    try {
      setSyncing(true);
      const updated = await ApiClient.post<RoleTemplateDTO>(`/admin/role-templates/${selectedTemplate.id}/sync`);
      updateLocalTemplate(updated);
      setToast({ message: t('role_templates.sync_success'), type: 'success' });
    } catch (error) {
      console.error('Failed to sync template to tenants:', error);
      setToast({ message: t('role_templates.sync_error'), type: 'error' });
    } finally {
      setSyncing(false);
    }
  };

  const hasEffectiveChanges =
    selectedTemplate !== undefined &&
    (editPermissions.size !== selectedTemplate.permissionCodes.length ||
      !selectedTemplate.permissionCodes.every((code) => editPermissions.has(code)));

  const hasAssignableChanges =
    selectedTemplate !== undefined &&
    (editAssignablePermissions.size !== selectedTemplate.assignablePermissionCodes.length ||
      !selectedTemplate.assignablePermissionCodes.every((code) => editAssignablePermissions.has(code)));

  if (loading) {
    return (
      <div className="p-4 md:p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
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

      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-charcoal mb-2">{t('role_templates.title')}</h1>
        <p className="text-gray-600">{t('role_templates.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="lg:sticky lg:top-4 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle>{t('role_templates.all_templates')}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {templates.length === 0 ? (
                <div className="px-4 py-6 text-sm text-gray-500">{t('role_templates.no_templates')}</div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {templates.map((template) => (
                    <li key={template.id}>
                      <button
                        onClick={() => selectTemplate(template)}
                        className={`w-full text-left px-4 py-3 transition-colors ${
                          selectedTemplateId === template.id
                            ? 'bg-emerald-50 border-l-4 border-emerald-600'
                            : 'hover:bg-gray-50 border-l-4 border-transparent'
                        }`}
                      >
                        <p className="font-semibold text-charcoal">{template.name}</p>
                        <p className="text-xs text-gray-500">
                          {template.permissionCodes.length}/{template.assignablePermissionCodes.length} {t('role_templates.permissions_count')}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3 space-y-6">
          {selectedTemplate ? (
            <>
              <Card>
                <CardHeader>
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <CardTitle>{selectedTemplate.name}</CardTitle>
                      {selectedTemplate.description && (
                        <p className="text-sm text-gray-500 mt-1">{selectedTemplate.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${selectedTemplate.active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-700'}`}>
                        {selectedTemplate.active ? t('role_templates.active') : t('role_templates.inactive')}
                      </span>
                      <span className="text-xs text-gray-500">
                        {t('role_templates.sort_order')}: {selectedTemplate.sortOrder}
                      </span>
                      <button
                        onClick={handleSync}
                        disabled={syncing}
                        className="px-4 py-2 rounded-lg font-medium text-sm bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                      >
                        {syncing ? t('role_templates.syncing') : t('role_templates.sync_now')}
                      </button>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle>{t('role_templates.effective_permissions')}</CardTitle>
                    <button
                      onClick={handleSaveEffective}
                      disabled={savingEffective || !hasEffectiveChanges}
                      className={`px-5 py-2 rounded-lg font-medium text-sm transition-all ${
                        hasEffectiveChanges
                          ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm'
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {savingEffective ? t('common.saving') || 'Saving...' : t('common.save')}
                    </button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(categories)
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([category, categoryPermissions]) => {
                        const allChecked = categoryPermissions.every((permission) => editPermissions.has(permission.code));
                        const someChecked = categoryPermissions.some((permission) => editPermissions.has(permission.code));

                        return (
                          <div key={`effective-${category}`} className="border border-gray-200 rounded-lg p-4">
                            <label className="flex items-center gap-3 mb-3 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={allChecked}
                                ref={(element) => {
                                  if (element) element.indeterminate = someChecked && !allChecked;
                                }}
                                onChange={() => toggleCategory(category, editPermissions, setEditPermissions)}
                                className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                              />
                              <span className="text-sm font-bold text-charcoal uppercase tracking-wide">{category}</span>
                              <span className="text-xs text-gray-400">
                                ({categoryPermissions.filter((permission) => editPermissions.has(permission.code)).length}/{categoryPermissions.length})
                              </span>
                            </label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 ml-7">
                              {categoryPermissions
                                .sort((a, b) => a.code.localeCompare(b.code))
                                .map((permission) => (
                                  <label
                                    key={`effective-${permission.code}`}
                                    className="flex items-start gap-2 cursor-pointer p-2 rounded hover:bg-gray-50 transition-colors"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={editPermissions.has(permission.code)}
                                      onChange={() => toggleSetItem(setEditPermissions, permission.code)}
                                      className="w-4 h-4 mt-0.5 text-emerald-600 rounded focus:ring-emerald-500"
                                    />
                                    <div>
                                      <span className="text-sm font-medium text-charcoal">{permission.code}</span>
                                      {permission.description && (
                                        <p className="text-xs text-gray-500">{permission.description}</p>
                                      )}
                                    </div>
                                  </label>
                                ))}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle>{t('role_templates.assignable_permissions')}</CardTitle>
                    <button
                      onClick={handleSaveAssignable}
                      disabled={savingAssignable || !hasAssignableChanges}
                      className={`px-5 py-2 rounded-lg font-medium text-sm transition-all ${
                        hasAssignableChanges
                          ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm'
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {savingAssignable ? t('common.saving') || 'Saving...' : t('common.save')}
                    </button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(categories)
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([category, categoryPermissions]) => {
                        const allChecked = categoryPermissions.every((permission) => editAssignablePermissions.has(permission.code));
                        const someChecked = categoryPermissions.some((permission) => editAssignablePermissions.has(permission.code));

                        return (
                          <div key={`assignable-${category}`} className="border border-gray-200 rounded-lg p-4">
                            <label className="flex items-center gap-3 mb-3 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={allChecked}
                                ref={(element) => {
                                  if (element) element.indeterminate = someChecked && !allChecked;
                                }}
                                onChange={() => toggleCategory(category, editAssignablePermissions, setEditAssignablePermissions)}
                                className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                              />
                              <span className="text-sm font-bold text-charcoal uppercase tracking-wide">{category}</span>
                              <span className="text-xs text-gray-400">
                                ({categoryPermissions.filter((permission) => editAssignablePermissions.has(permission.code)).length}/{categoryPermissions.length})
                              </span>
                            </label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 ml-7">
                              {categoryPermissions
                                .sort((a, b) => a.code.localeCompare(b.code))
                                .map((permission) => (
                                  <label
                                    key={`assignable-${permission.code}`}
                                    className="flex items-start gap-2 cursor-pointer p-2 rounded hover:bg-gray-50 transition-colors"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={editAssignablePermissions.has(permission.code)}
                                      onChange={() => toggleSetItem(setEditAssignablePermissions, permission.code)}
                                      className="w-4 h-4 mt-0.5 text-emerald-600 rounded focus:ring-emerald-500"
                                    />
                                    <div>
                                      <span className="text-sm font-medium text-charcoal">{permission.code}</span>
                                      {permission.description && (
                                        <p className="text-xs text-gray-500">{permission.description}</p>
                                      )}
                                    </div>
                                  </label>
                                ))}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="text-center py-16 text-gray-400">{t('role_templates.select_template')}</CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
