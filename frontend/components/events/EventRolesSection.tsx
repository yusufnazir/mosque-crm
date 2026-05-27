'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import {
  eventFeatureApi,
  EventKind,
  EventRole,
  EventRoleCreate,
} from '@/lib/eventFeatureApi';
import ToastNotification from '@/components/ToastNotification';
import ConfirmDialog from '@/components/ConfirmDialog';
import EventFormModal, {
  EVENT_FORM_BTN_PRIMARY,
  EVENT_FORM_BTN_SECONDARY,
  EVENT_FORM_INPUT,
} from '@/components/events/EventFormModal';
import { ActionButton, RowActions } from '@/components/events/EventResourceRowActions';

interface Props {
  eventKind: EventKind;
  eventId: number;
  onDataChange?: () => void;
}

export default function EventRolesSection({ eventKind, eventId, onDataChange }: Props) {
  const { t } = useTranslation();
  const [roles, setRoles] = useState<EventRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<EventRoleCreate>({ name: '', description: '', sortOrder: 0 });
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRoles(await eventFeatureApi.listRoles(eventKind, eventId));
    } catch {
      setToast({ message: t('event_features.toast.error'), type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [eventKind, eventId, t]);

  useEffect(() => {
    load();
  }, [load]);

  const closeForm = () => {
    setShowForm(false);
    setEditId(null);
  };

  const openCreate = () => {
    setEditId(null);
    setForm({ name: '', description: '', sortOrder: 0 });
    setShowForm(true);
  };

  const openEdit = (role: EventRole) => {
    setEditId(role.id);
    setForm({
      name: role.name,
      description: role.description ?? '',
      sortOrder: role.sortOrder ?? 0,
      maxMembers: role.maxMembers,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editId) {
        await eventFeatureApi.updateRole(eventKind, eventId, editId, form);
      } else {
        await eventFeatureApi.createRole(eventKind, eventId, form);
      }
      closeForm();
      setToast({ message: t('event_features.toast.saved'), type: 'success' });
      await load();
      onDataChange?.();
    } catch (e: unknown) {
      setToast({ message: e instanceof Error ? e.message : t('event_features.toast.error'), type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await eventFeatureApi.deleteRole(eventKind, eventId, deleteId);
      setDeleteId(null);
      setToast({ message: t('event_features.toast.deleted'), type: 'success' });
      await load();
      onDataChange?.();
    } catch (e: unknown) {
      setToast({ message: e instanceof Error ? e.message : t('event_features.toast.error'), type: 'error' });
    }
  };

  return (
    <section className="w-full min-w-0 bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between px-4 sm:px-6 py-4 sm:py-5 border-b border-stone-100">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-stone-900">{t('event_features.roles.title')}</h2>
          <p className="text-sm text-stone-500 mt-1">{t('event_features.roles.hint')}</p>
        </div>
        <button type="button" className={`${EVENT_FORM_BTN_PRIMARY} shrink-0`} onClick={openCreate}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t('event_features.roles.add')}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : roles.length === 0 ? (
        <p className="px-4 sm:px-6 py-10 text-center text-stone-500 text-sm">{t('event_features.roles.empty')}</p>
      ) : (
        <>
          <ul className="md:hidden divide-y divide-stone-100">
            {roles.map(role => (
              <li key={role.id} className="px-4 py-4">
                <p className="text-sm font-semibold text-stone-900">{role.name}</p>
                {role.description ? <p className="text-sm text-stone-500 mt-0.5">{role.description}</p> : null}
                <p className="text-xs text-stone-400 mt-1">
                  {t('event_features.roles.members')}: {role.memberCount ?? 0}
                </p>
                <RowActions>
                  <ActionButton variant="primary" onClick={() => openEdit(role)}>
                    {t('common.edit')}
                  </ActionButton>
                  <ActionButton variant="danger" onClick={() => setDeleteId(role.id)}>
                    {t('common.delete')}
                  </ActionButton>
                </RowActions>
              </li>
            ))}
          </ul>
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-stone-200">
              <thead className="bg-stone-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase">
                    {t('event_features.roles.name')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase">
                    {t('event_features.resources.description')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-stone-500 uppercase">
                    {t('event_features.roles.members')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-stone-500 uppercase" />
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {roles.map(role => (
                  <tr key={role.id} className="hover:bg-stone-50">
                    <td className="px-6 py-4 text-sm font-medium text-stone-900">{role.name}</td>
                    <td className="px-6 py-4 text-sm text-stone-500">{role.description || '—'}</td>
                    <td className="px-6 py-4 text-sm text-right text-stone-600">{role.memberCount ?? 0}</td>
                    <td className="px-6 py-4 text-right space-x-3">
                      <button
                        type="button"
                        className="text-sm text-emerald-700 font-medium hover:text-emerald-900"
                        onClick={() => openEdit(role)}
                      >
                        {t('common.edit')}
                      </button>
                      <button
                        type="button"
                        className="text-sm text-red-600 font-medium hover:text-red-800"
                        onClick={() => setDeleteId(role.id)}
                      >
                        {t('common.delete')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <EventFormModal
        open={showForm}
        onClose={closeForm}
        title={editId ? t('event_features.roles.edit') : t('event_features.roles.add')}
        size="lg"
        footer={
          <>
            <button type="button" className={EVENT_FORM_BTN_SECONDARY} onClick={closeForm} disabled={saving}>
              {t('common.cancel')}
            </button>
            <button
              type="button"
              className={EVENT_FORM_BTN_PRIMARY}
              disabled={!form.name.trim() || saving}
              onClick={handleSave}
            >
              {saving ? t('common.saving') : t('common.save')}
            </button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-stone-700 mb-1">{t('event_features.roles.name')}</label>
            <input
              type="text"
              className={EVENT_FORM_INPUT}
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              autoFocus
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-stone-700 mb-1">{t('event_features.resources.description')}</label>
            <input
              type="text"
              className={EVENT_FORM_INPUT}
              value={form.description ?? ''}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">{t('event_features.resources.sort_order')}</label>
            <input
              type="number"
              className={EVENT_FORM_INPUT}
              value={form.sortOrder ?? 0}
              onChange={e => setForm(f => ({ ...f, sortOrder: parseInt(e.target.value, 10) || 0 }))}
            />
          </div>
        </div>
      </EventFormModal>

      <ConfirmDialog
        open={deleteId !== null}
        title={t('event_features.roles.delete')}
        message={t('event_features.roles.delete_confirm')}
        confirmLabel={t('common.delete')}
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
      {toast && <ToastNotification message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </section>
  );
}
