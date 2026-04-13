'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { organizationApi, Organization } from '@/lib/organizationApi';
import ToastNotification from '@/components/ToastNotification';

export default function OrganizationsPage() {
  const { can } = useAuth();
  const { t } = useTranslation();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingOrganization, setEditingOrganization] = useState<Organization | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [form, setForm] = useState({
    name: '',
    shortName: '',
    address: '',
    city: '',
    country: '',
    postalCode: '',
    phone: '',
    email: '',
    website: '',
    handle: '',
    active: true,
  });

  const [handleAvailable, setHandleAvailable] = useState<boolean | null>(null);
  const [handleChecking, setHandleChecking] = useState(false);
  const handleDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkHandleAvailability = (handle: string, excludeId?: number) => {
    if (handleDebounceRef.current) clearTimeout(handleDebounceRef.current);
    if (!handle.trim()) {
      setHandleAvailable(null);
      setHandleChecking(false);
      return;
    }
    if (!/^[a-z0-9-]+$/.test(handle.toLowerCase())) {
      setHandleAvailable(false);
      setHandleChecking(false);
      return;
    }
    setHandleChecking(true);
    setHandleAvailable(null);
    handleDebounceRef.current = setTimeout(async () => {
      try {
        const result = await organizationApi.checkHandle(handle, excludeId);
        setHandleAvailable(result.available);
      } catch {
        setHandleAvailable(null);
      } finally {
        setHandleChecking(false);
      }
    }, 400);
  };

  const loadOrganizations = async () => {
    try {
      setLoading(true);
      const data = await organizationApi.getAll();
      setOrganizations(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load organizations:', error);
      setToast({ message: t('organizations.load_error'), type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrganizations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCreateModal = () => {
    setEditingOrganization(null);
    setHandleAvailable(null);
    setHandleChecking(false);
    setForm({
      name: '',
      shortName: '',
      address: '',
      city: '',
      country: '',
      postalCode: '',
      phone: '',
      email: '',
      website: '',
      handle: '',
      active: true,
    });
    setShowModal(true);
  };

  const openEditModal = (organization: Organization) => {
    setEditingOrganization(organization);
    setHandleAvailable(null);
    setHandleChecking(false);
    setForm({
      name: organization.name || '',
      shortName: organization.shortName || '',
      address: organization.address || '',
      city: organization.city || '',
      country: organization.country || '',
      postalCode: organization.postalCode || '',
      phone: organization.phone || '',
      email: organization.email || '',
      website: organization.website || '',
      handle: organization.handle || '',
      active: organization.active,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.handle && handleAvailable === false) return;
    try {
      if (editingOrganization) {
        await organizationApi.update(editingOrganization.id, form);
        setToast({ message: t('organizations.updated'), type: 'success' });
      } else {
        await organizationApi.create(form);
        setToast({ message: t('organizations.created'), type: 'success' });
      }
      setShowModal(false);
      loadOrganizations();
    } catch (error) {
      console.error('Failed to save organization:', error);
      setToast({ message: t('organizations.save_error'), type: 'error' });
    }
  };

  if (!can('organization.manage')) {
    return (
      <div className="p-4 md:p-8">
        <p className="text-red-500">{t('common.access_denied')}</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      {toast && (
        <ToastNotification
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-charcoal">{t('organizations.title')}</h1>
          <p className="text-gray-500 mt-1">{t('organizations.subtitle')}</p>
        </div>
        <button
          onClick={openCreateModal}
          className="px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t('organizations.add')}
        </button>
      </div>

      {/* Organizations Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-700" />
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('organizations.name')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('organizations.city')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('organizations.contact')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('organizations.handle_label')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('organizations.status')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('common.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {organizations.map((organization) => (
                <tr key={organization.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-medium text-gray-900">{organization.name}</div>
                      {organization.shortName && (
                        <div className="text-sm text-gray-500">{organization.shortName}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {organization.city}{organization.country ? `, ${organization.country}` : ''}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <div>{organization.email}</div>
                    <div>{organization.phone}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {organization.handle ? (
                      <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{organization.handle}</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        organization.active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {organization.active ? t('organizations.active') : t('organizations.inactive')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => openEditModal(organization)}
                      className="text-emerald-700 hover:text-emerald-900 font-medium text-sm"
                    >
                      {t('common.edit')}
                    </button>
                  </td>
                </tr>
              ))}
              {organizations.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    {t('organizations.empty')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-charcoal">
                {editingOrganization ? t('organizations.edit_title') : t('organizations.add_title')}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('organizations.name')} *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('organizations.short_name')}
                </label>
                <input
                  type="text"
                  value={form.shortName}
                  onChange={(e) => setForm({ ...form, shortName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              {/* Handle / subdomain */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('organizations.handle_label')}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={form.handle}
                    onChange={(e) => {
                      const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                      setForm({ ...form, handle: val });
                      checkHandleAvailability(val, editingOrganization?.id);
                    }}
                    placeholder="e.g. btr-mosque"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 pr-8 ${
                      form.handle && handleAvailable === false
                        ? 'border-red-400'
                        : form.handle && handleAvailable === true
                        ? 'border-green-400'
                        : 'border-gray-300'
                    }`}
                  />
                  {form.handle && (
                    <span className="absolute right-2 top-1/2 -translate-y-1/2">
                      {handleChecking ? (
                        <svg className="animate-spin h-4 w-4 text-gray-400" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                        </svg>
                      ) : handleAvailable === true ? (
                        <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
                        </svg>
                      ) : handleAvailable === false ? (
                        <svg className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                      ) : null}
                    </span>
                  )}
                </div>
                <p className={`text-xs mt-1 ${
                  form.handle && handleAvailable === false ? 'text-red-500' :
                  form.handle && handleAvailable === true ? 'text-green-600' :
                  'text-gray-500'
                }`}>
                  {handleChecking
                    ? t('organizations.handle_checking')
                    : form.handle && handleAvailable === false
                    ? t('organizations.handle_taken')
                    : form.handle && handleAvailable === true
                    ? t('organizations.handle_available')
                    : t('organizations.handle_description')}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('organizations.city')}
                  </label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('organizations.country')}
                  </label>
                  <input
                    type="text"
                    value={form.country}
                    onChange={(e) => setForm({ ...form, country: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('organizations.address')}
                </label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('organizations.postal_code')}
                  </label>
                  <input
                    type="text"
                    value={form.postalCode}
                    onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('organizations.phone')}
                  </label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('organizations.email')}
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('organizations.website')}
                </label>
                <input
                  type="text"
                  value={form.website}
                  onChange={(e) => setForm({ ...form, website: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="active"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                  className="h-4 w-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                />
                <label htmlFor="active" className="text-sm font-medium text-gray-700">
                  {t('organizations.active')}
                </label>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={!!(form.handle && handleAvailable === false) || handleChecking}
                  className="px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingOrganization ? t('common.save') : t('organizations.add')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
