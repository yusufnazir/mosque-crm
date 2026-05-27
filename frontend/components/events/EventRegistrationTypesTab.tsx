'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import {
  distributionApi,
  DistributionRegistrationType,
  DistributionRegistrationTypeCreate,
  RegistrationFulfillmentMode,
} from '@/lib/distributionApi';
import EventFormModal, {
  EVENT_FORM_BTN_PRIMARY,
  EVENT_FORM_BTN_SECONDARY,
  EVENT_FORM_INPUT,
} from '@/components/events/EventFormModal';
import ToastNotification from '@/components/ToastNotification';
import ConfirmDialog from '@/components/ConfirmDialog';
import { ActionButton, RowActions } from '@/components/events/EventResourceRowActions';
import {
  TabSectionHeader,
  MobileCardList,
  MobileCardItem,
  DesktopTableWrap,
  ListCountFooter,
} from '@/components/ResponsiveEventLayout';
import { getTypeSoftLimitStatus } from '@/lib/distributionRegistrationUtils';

const FORM_LABEL = 'block text-sm font-medium text-stone-700 mb-1';

function softLimitBadge(
  row: DistributionRegistrationType,
  t: (key: string, params?: Record<string, string | number>) => string,
) {
  const status = getTypeSoftLimitStatus(row);
  if (status === 'none' || status === 'ok' || row.softLimit == null) return null;
  const isOver = status === 'over';
  return (
    <span
      className={`shrink-0 px-2 py-0.5 rounded text-xs font-medium ${
        isOver ? 'bg-amber-100 text-amber-800' : 'bg-yellow-100 text-yellow-800'
      }`}
    >
      {isOver ? t('distribution.soft_limit_exceeded') : t('distribution.soft_limit_reached')}
      {' · '}
      {t('distribution.soft_limit_count', { count: row.registrationCount, limit: row.softLimit })}
    </span>
  );
}

function registeredCountClass(row: DistributionRegistrationType) {
  const status = getTypeSoftLimitStatus(row);
  if (status === 'over') return 'text-amber-700 font-semibold';
  if (status === 'at') return 'text-yellow-700 font-semibold';
  return 'text-stone-600';
}

interface Props {
  eventId: number;
  eventClosed: boolean;
  onChanged?: () => void;
}

const emptyForm = (): DistributionRegistrationTypeCreate => ({
  name: '',
  fulfillmentMode: 'QUEUE',
  defaultPlannedParcels: 1,
  softLimit: null,
  assignDistributionNumber: false,
});

export default function EventRegistrationTypesTab({ eventId, eventClosed, onChanged }: Props) {
  const { t } = useTranslation();
  const [types, setTypes] = useState<DistributionRegistrationType[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DistributionRegistrationType | null>(null);
  const [form, setForm] = useState<DistributionRegistrationTypeCreate>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await distributionApi.listRegistrationTypes(eventId);
      setTypes(Array.isArray(data) ? data : []);
    } catch {
      setToast({ message: t('distribution.registration_types_load_error'), type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [eventId, t]);

  useEffect(() => {
    load();
  }, [load]);

  const fulfillmentLabel = (mode: RegistrationFulfillmentMode) => {
    if (mode === 'QUEUE') return t('distribution.fulfillment_queue');
    if (mode === 'ADHOC') return t('distribution.fulfillment_adhoc');
    return t('distribution.fulfillment_manual');
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm(), sortOrder: types.length });
    setModalOpen(true);
  };

  const openEdit = (row: DistributionRegistrationType) => {
    setEditing(row);
    setForm({
      name: row.name,
      sortOrder: row.sortOrder,
      fulfillmentMode: row.fulfillmentMode,
      defaultPlannedParcels: row.defaultPlannedParcels,
      softLimit: row.softLimit ?? null,
      assignDistributionNumber: row.assignDistributionNumber,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setForm(emptyForm());
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const payload: DistributionRegistrationTypeCreate = {
        ...form,
        name: form.name.trim(),
        softLimit: form.softLimit == null ? null : Number(form.softLimit),
      };
      if (editing) {
        await distributionApi.updateRegistrationType(editing.id, payload);
        setToast({ message: t('distribution.registration_type_update_success'), type: 'success' });
      } else {
        await distributionApi.createRegistrationType(eventId, payload);
        setToast({ message: t('distribution.registration_type_create_success'), type: 'success' });
      }
      closeModal();
      await load();
      onChanged?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('distribution.registration_type_save_error');
      setToast({ message: msg, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleteId == null) return;
    try {
      await distributionApi.deleteRegistrationType(deleteId);
      setToast({ message: t('distribution.registration_type_delete_success'), type: 'success' });
      setDeleteId(null);
      await load();
      onChanged?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('distribution.registration_type_delete_error');
      setToast({ message: msg, type: 'error' });
    }
  };

  if (loading) {
    return <p className="text-center py-8 text-stone-500">{t('common.loading')}</p>;
  }

  return (
    <div className="w-full min-w-0">
      {toast && <ToastNotification message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <TabSectionHeader
        title={t('distribution.registration_types_tab')}
        subtitle={t('distribution.registration_types_desc')}
        action={
          !eventClosed ? (
            <button
              type="button"
              onClick={openCreate}
              className="w-full sm:w-auto px-3 py-2 bg-emerald-700 text-white rounded-lg text-sm font-medium hover:bg-emerald-800"
            >
              {t('distribution.add_registration_type')}
            </button>
          ) : undefined
        }
      />

      {types.length === 0 ? (
        <p className="text-center py-8 text-stone-500">{t('distribution.no_registration_types')}</p>
      ) : (
        <>
          <div className="md:hidden bg-white rounded-lg shadow overflow-hidden">
          <MobileCardList>
            {types.map(row => (
              <MobileCardItem key={row.id}>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <p className="text-sm font-semibold text-stone-900 break-words">{row.name}</p>
                  {softLimitBadge(row, t)}
                </div>
                <dl className="mt-2 space-y-1.5 text-sm text-stone-600">
                  <div className="flex justify-between gap-3">
                    <dt className="text-stone-500 shrink-0">{t('distribution.fulfillment_mode')}</dt>
                    <dd className="text-right break-words">{fulfillmentLabel(row.fulfillmentMode)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-stone-500 shrink-0">{t('distribution.default_planned_parcels')}</dt>
                    <dd>{row.defaultPlannedParcels}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-stone-500 shrink-0">{t('distribution.soft_limit')}</dt>
                    <dd>{row.softLimit ?? '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-stone-500 shrink-0">{t('distribution.registered')}</dt>
                    <dd className={registeredCountClass(row)}>{row.registrationCount}</dd>
                  </div>
                </dl>
                {!eventClosed && (
                  <RowActions>
                    <ActionButton variant="primary" onClick={() => openEdit(row)}>{t('common.edit')}</ActionButton>
                    <ActionButton
                      variant="danger"
                      onClick={() => setDeleteId(row.id)}
                      disabled={row.registrationCount > 0}
                    >
                      {t('common.delete')}
                    </ActionButton>
                  </RowActions>
                )}
              </MobileCardItem>
            ))}
          </MobileCardList>
          <p className="px-4 py-3 text-xs text-stone-500 text-center border-t border-stone-100">
            {types.length} {t('distribution.records')}
          </p>
          </div>

          <DesktopTableWrap>
            <div className="overflow-x-auto">
            <table className="min-w-[640px] w-full divide-y divide-stone-200">
              <thead className="bg-stone-50">
                <tr>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase">{t('distribution.registration_type_name')}</th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase">{t('distribution.fulfillment_mode')}</th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase">{t('distribution.default_planned_parcels')}</th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase">{t('distribution.soft_limit')}</th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase">{t('distribution.registered')}</th>
                  {!eventClosed && (
                    <th className="px-4 lg:px-6 py-3 text-right text-xs font-medium text-stone-500 uppercase">{t('common.actions')}</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {types.map(row => (
                  <tr key={row.id}>
                    <td className="px-4 lg:px-6 py-4 text-sm font-medium text-stone-900">
                      <span className="inline-flex flex-wrap items-center gap-2">
                        {row.name}
                        {softLimitBadge(row, t)}
                      </span>
                    </td>
                    <td className="px-4 lg:px-6 py-4 text-sm text-stone-600">{fulfillmentLabel(row.fulfillmentMode)}</td>
                    <td className="px-4 lg:px-6 py-4 text-sm text-stone-600">{row.defaultPlannedParcels}</td>
                    <td className="px-4 lg:px-6 py-4 text-sm text-stone-600">{row.softLimit ?? '—'}</td>
                    <td className={`px-4 lg:px-6 py-4 text-sm ${registeredCountClass(row)}`}>{row.registrationCount}</td>
                    {!eventClosed && (
                      <td className="px-4 lg:px-6 py-4 text-right">
                        <div className="flex justify-end gap-3 flex-wrap">
                          <button type="button" onClick={() => openEdit(row)} className="text-sm text-emerald-700 hover:text-emerald-900 font-medium">
                            {t('common.edit')}
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteId(row.id)}
                            disabled={row.registrationCount > 0}
                            className="text-sm text-red-600 hover:text-red-800 font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {t('common.delete')}
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            <ListCountFooter>{types.length}</ListCountFooter>
          </DesktopTableWrap>
        </>
      )}

      <EventFormModal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? t('distribution.edit_registration_type') : t('distribution.add_registration_type')}
        footer={
          <>
            <button type="button" onClick={closeModal} className={EVENT_FORM_BTN_SECONDARY}>{t('common.cancel')}</button>
            <button type="button" onClick={handleSave} disabled={saving || !form.name.trim()} className={EVENT_FORM_BTN_PRIMARY}>
              {saving ? t('common.saving') : t('common.save')}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className={FORM_LABEL}>{t('distribution.registration_type_name')} *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className={EVENT_FORM_INPUT}
            />
          </div>
          <div>
            <label className={FORM_LABEL}>{t('distribution.fulfillment_mode')}</label>
            <select
              value={form.fulfillmentMode}
              onChange={e => setForm({ ...form, fulfillmentMode: e.target.value as RegistrationFulfillmentMode })}
              className={EVENT_FORM_INPUT}
            >
              <option value="QUEUE">{t('distribution.fulfillment_queue')}</option>
              <option value="ADHOC">{t('distribution.fulfillment_adhoc')}</option>
              <option value="MANUAL">{t('distribution.fulfillment_manual')}</option>
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={FORM_LABEL}>{t('distribution.default_planned_parcels')}</label>
              <input
                type="number"
                min={0}
                value={form.defaultPlannedParcels}
                onChange={e => setForm({ ...form, defaultPlannedParcels: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                className={EVENT_FORM_INPUT}
              />
            </div>
            <div>
              <label className={FORM_LABEL}>{t('distribution.soft_limit')}</label>
              <input
                type="number"
                min={0}
                value={form.softLimit ?? ''}
                onChange={e => setForm({ ...form, softLimit: e.target.value === '' ? null : Math.max(0, parseInt(e.target.value, 10) || 0) })}
                className={EVENT_FORM_INPUT}
                placeholder={t('distribution.soft_limit_optional')}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-stone-700">
            <input
              type="checkbox"
              checked={!!form.assignDistributionNumber}
              onChange={e => setForm({ ...form, assignDistributionNumber: e.target.checked })}
              className="rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
            />
            {t('distribution.assign_distribution_number')}
          </label>
        </div>
      </EventFormModal>

      <ConfirmDialog
        open={deleteId != null}
        title={t('distribution.confirm_delete_registration_type_title')}
        message={t('distribution.confirm_delete_registration_type_message')}
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
