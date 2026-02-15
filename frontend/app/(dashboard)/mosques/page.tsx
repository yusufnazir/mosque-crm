'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { mosqueApi, Mosque } from '@/lib/mosqueApi';
import ToastNotification from '@/components/ToastNotification';

export default function MosquesPage() {
  const { can } = useAuth();
  const { t } = useTranslation();
  const [mosques, setMosques] = useState<Mosque[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingMosque, setEditingMosque] = useState<Mosque | null>(null);
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
    active: true,
  });

  const loadMosques = async () => {
    try {
      setLoading(true);
      const data = await mosqueApi.getAll();
      setMosques(data);
    } catch (error) {
      console.error('Failed to load mosques:', error);
      setToast({ message: t('mosques.load_error'), type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMosques();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCreateModal = () => {
    setEditingMosque(null);
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
      active: true,
    });
    setShowModal(true);
  };

  const openEditModal = (mosque: Mosque) => {
    setEditingMosque(mosque);
    setForm({
      name: mosque.name || '',
      shortName: mosque.shortName || '',
      address: mosque.address || '',
      city: mosque.city || '',
      country: mosque.country || '',
      postalCode: mosque.postalCode || '',
      phone: mosque.phone || '',
      email: mosque.email || '',
      website: mosque.website || '',
      active: mosque.active,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingMosque) {
        await mosqueApi.update(editingMosque.id, form);
        setToast({ message: t('mosques.updated'), type: 'success' });
      } else {
        await mosqueApi.create(form);
        setToast({ message: t('mosques.created'), type: 'success' });
      }
      setShowModal(false);
      loadMosques();
    } catch (error) {
      console.error('Failed to save mosque:', error);
      setToast({ message: t('mosques.save_error'), type: 'error' });
    }
  };

  if (!can('mosque.manage')) {
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
          <h1 className="text-2xl md:text-3xl font-bold text-charcoal">{t('mosques.title')}</h1>
          <p className="text-gray-500 mt-1">{t('mosques.subtitle')}</p>
        </div>
        <button
          onClick={openCreateModal}
          className="px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t('mosques.add')}
        </button>
      </div>

      {/* Mosques Table */}
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
                  {t('mosques.name')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('mosques.city')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('mosques.contact')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('mosques.status')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('common.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {mosques.map((mosque) => (
                <tr key={mosque.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-medium text-gray-900">{mosque.name}</div>
                      {mosque.shortName && (
                        <div className="text-sm text-gray-500">{mosque.shortName}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {mosque.city}{mosque.country ? `, ${mosque.country}` : ''}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <div>{mosque.email}</div>
                    <div>{mosque.phone}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        mosque.active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {mosque.active ? t('mosques.active') : t('mosques.inactive')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => openEditModal(mosque)}
                      className="text-emerald-700 hover:text-emerald-900 font-medium text-sm"
                    >
                      {t('common.edit')}
                    </button>
                  </td>
                </tr>
              ))}
              {mosques.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    {t('mosques.empty')}
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
                {editingMosque ? t('mosques.edit_title') : t('mosques.add_title')}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('mosques.name')} *
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
                  {t('mosques.short_name')}
                </label>
                <input
                  type="text"
                  value={form.shortName}
                  onChange={(e) => setForm({ ...form, shortName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('mosques.city')}
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
                    {t('mosques.country')}
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
                  {t('mosques.address')}
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
                    {t('mosques.postal_code')}
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
                    {t('mosques.phone')}
                  </label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('mosques.email')}
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
                    {t('mosques.website')}
                  </label>
                  <input
                    type="text"
                    value={form.website}
                    onChange={(e) => setForm({ ...form, website: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
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
                  {t('mosques.active')}
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
                  className="px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 transition-colors"
                >
                  {editingMosque ? t('common.save') : t('mosques.add')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
