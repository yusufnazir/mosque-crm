'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { memberApi } from '@/lib/api';
import {
  distributionApi,
  DistributionRegistration,
  DistributionRegistrationCreate,
  DistributionRegistrationType,
  DistributionRegistrationUpdate,
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
  ResponsiveFilters,
  ResponsiveFilterInput,
  ResponsiveFilterSelect,
  MobileCardList,
  MobileCardItem,
  DesktopTableWrap,
  ListCountFooter,
} from '@/components/ResponsiveEventLayout';
import { getTypeSoftLimitStatus } from '@/lib/distributionRegistrationUtils';
import {
  formatParcelUnitLabel,
  formatParcelWeightTotal,
  normalizeParcelWeightUnit,
  ParcelWeightUnit,
} from '@/lib/distributionParcelUnit';
import DistributionRegistrationSummaryCards from '@/components/events/DistributionRegistrationSummaryCards';
import { eventFeatureApi } from '@/lib/eventFeatureApi';

const FORM_LABEL = 'block text-sm font-medium text-stone-700 mb-1';

interface Props {
  eventId: number;
  eventClosed: boolean;
  parcelKgPerUnit?: number;
  parcelWeightUnit?: ParcelWeightUnit | string;
  onChanged?: () => void;
}

function personDisplayName(p: { firstName: string; lastName?: string }) {
  return `${p.firstName}${p.lastName ? ` ${p.lastName}` : ''}`.trim();
}

export default function EventRegistrationsTab({
  eventId,
  eventClosed,
  parcelKgPerUnit = 1,
  parcelWeightUnit,
  onChanged,
}: Props) {
  const { t } = useTranslation();
  const [registrations, setRegistrations] = useState<DistributionRegistration[]>([]);
  const [types, setTypes] = useState<DistributionRegistrationType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DistributionRegistration | null>(null);
  const [form, setForm] = useState<DistributionRegistrationCreate>({
    distributionEventId: eventId,
    registrationTypeId: 0,
    displayName: '',
    member: false,
    plannedParcelCount: 1,
    adHoc: false,
  });
  const [editPlanned, setEditPlanned] = useState(1);
  const [personQuery, setPersonQuery] = useState('');
  const [personResults, setPersonResults] = useState<
    { id: number; firstName: string; lastName?: string; email?: string; hasActiveMembership?: boolean }[]
  >([]);
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);
  const [isMember, setIsMember] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [summaryStats, setSummaryStats] = useState<{
    totalParcels: number;
    distributedParcels: number;
    remainingParcels: number;
    totalRegistrations?: number;
    collectedRegistrations?: number;
  } | null>(null);
  const [availableMeatKg, setAvailableMeatKg] = useState<number | null>(null);

  const amountPerParcel = parcelKgPerUnit > 0 ? parcelKgPerUnit : 1;
  const weightUnit = normalizeParcelWeightUnit(parcelWeightUnit);
  const oneParcelLabel = formatParcelUnitLabel(amountPerParcel, weightUnit, t);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [regs, typeList, summaryData, sacrificeSummary] = await Promise.all([
        distributionApi.listRegistrations(eventId),
        distributionApi.listRegistrationTypes(eventId),
        distributionApi.getEventSummary(eventId),
        eventFeatureApi.getSacrificeSummary('DISTRIBUTION', eventId).catch(() => null),
      ]);
      setRegistrations(Array.isArray(regs) ? regs : []);
      setTypes(Array.isArray(typeList) ? typeList : []);
      setSummaryStats(summaryData);
      setAvailableMeatKg(sacrificeSummary?.availableMeatKg ?? 0);
    } catch {
      setToast({ message: t('distribution.registrations_load_error'), type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [eventId, t]);

  useEffect(() => {
    load();
  }, [load]);

  const selectedType = types.find(ty => ty.id === form.registrationTypeId);
  const selectedSoftLimitStatus = selectedType ? getTypeSoftLimitStatus(selectedType) : 'none';

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    const defaultType = types[0];
    setForm({
      distributionEventId: eventId,
      registrationTypeId: defaultType?.id ?? 0,
      displayName: '',
      member: false,
      plannedParcelCount: defaultType?.defaultPlannedParcels ?? 1,
      adHoc: false,
    });
    setEditPlanned(1);
    setPersonQuery('');
    setPersonResults([]);
    setSelectedPersonId(null);
    setIsMember(false);
  };

  const openCreate = () => {
    const defaultType = types[0];
    if (!defaultType) {
      setToast({ message: t('distribution.add_registration_type_first'), type: 'error' });
      return;
    }
    setEditing(null);
    setForm({
      distributionEventId: eventId,
      registrationTypeId: defaultType.id,
      displayName: '',
      member: false,
      plannedParcelCount: defaultType.defaultPlannedParcels,
      adHoc: false,
    });
    setPersonQuery('');
    setSelectedPersonId(null);
    setIsMember(false);
    setModalOpen(true);
  };

  const openEdit = (row: DistributionRegistration) => {
    setEditing(row);
    setEditPlanned(row.plannedParcelCount);
    setModalOpen(true);
  };

  const searchPerson = (q: string) => {
    setPersonQuery(q);
    setSelectedPersonId(null);
    setIsMember(false);
    setForm(prev => ({ ...prev, displayName: q, personId: undefined, member: false }));
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (q.length < 2) {
      setPersonResults([]);
      return;
    }
    searchTimeout.current = setTimeout(async () => {
      try {
        const results = await memberApi.search(q);
        setPersonResults(
          (results || []).map((p: { id: number | string; firstName: string; lastName?: string; email?: string; hasActiveMembership?: boolean }) => ({
            id: typeof p.id === 'string' ? Number(p.id) : p.id,
            firstName: p.firstName,
            lastName: p.lastName,
            email: p.email,
            hasActiveMembership: p.hasActiveMembership,
          })),
        );
      } catch {
        setPersonResults([]);
      }
    }, 300);
  };

  const selectPerson = (p: { id: number; firstName: string; lastName?: string; hasActiveMembership?: boolean }) => {
    const name = personDisplayName(p);
    setPersonQuery(name);
    setSelectedPersonId(p.id);
    setIsMember(Boolean(p.hasActiveMembership));
    setForm(prev => ({
      ...prev,
      displayName: name,
      personId: p.id,
      member: Boolean(p.hasActiveMembership),
    }));
    setPersonResults([]);
  };

  const handleTypeChange = (typeId: number) => {
    const ty = types.find(x => x.id === typeId);
    setForm(prev => ({
      ...prev,
      registrationTypeId: typeId,
      plannedParcelCount: ty?.defaultPlannedParcels ?? prev.plannedParcelCount,
    }));
  };

  const handleSave = async () => {
    if (editing) {
      if (editPlanned < 0) return;
      setSaving(true);
      try {
        const payload: DistributionRegistrationUpdate = { plannedParcelCount: editPlanned };
        await distributionApi.updateRegistration(editing.id, payload);
        setToast({ message: t('distribution.registration_update_success'), type: 'success' });
        closeModal();
        await load();
        onChanged?.();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : t('distribution.registration_save_error');
        setToast({ message: msg, type: 'error' });
      } finally {
        setSaving(false);
      }
      return;
    }

    if (!form.displayName.trim() || !form.registrationTypeId) return;
    setSaving(true);
    try {
      const payload: DistributionRegistrationCreate = {
        ...form,
        displayName: form.displayName.trim(),
        personId: selectedPersonId ?? undefined,
        member: selectedPersonId ? isMember : false,
      };
      await distributionApi.createRegistration(payload);
      setToast({ message: t('distribution.registration_create_success'), type: 'success' });
      closeModal();
      await load();
      onChanged?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('distribution.registration_save_error');
      setToast({ message: msg, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleteId == null) return;
    try {
      await distributionApi.deleteRegistration(deleteId);
      setToast({ message: t('distribution.registration_delete_success'), type: 'success' });
      setDeleteId(null);
      await load();
      onChanged?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('distribution.registration_delete_error');
      setToast({ message: msg, type: 'error' });
    }
  };

  const handleMarkCollected = async (row: DistributionRegistration) => {
    try {
      await distributionApi.markRegistrationCollected(row.id);
      setToast({ message: t('distribution.mark_collected_success'), type: 'success' });
      await load();
      onChanged?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('distribution.mark_collected_error');
      setToast({ message: msg, type: 'error' });
    }
  };

  const parcelsToWeight = (count: number) =>
    formatParcelWeightTotal(count, amountPerParcel, weightUnit, t);

  const filtered = registrations.filter(r => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      r.displayName.toLowerCase().includes(q) ||
      (r.distributionNumber || '').toLowerCase().includes(q) ||
      (r.registrationTypeName || '').toLowerCase().includes(q);
    const matchesType = !typeFilter || String(r.registrationTypeId) === typeFilter;
    const matchesStatus = !statusFilter || r.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  const registrationStats = useMemo(() => {
    if (summaryStats) return summaryStats;
    const totalParcels = registrations.reduce((s, r) => s + (r.plannedParcelCount ?? 0), 0);
    const distributedParcels = registrations.reduce((s, r) => s + (r.distributedParcelCount ?? 0), 0);
    return {
      totalParcels,
      distributedParcels,
      remainingParcels: Math.max(0, totalParcels - distributedParcels),
      totalRegistrations: registrations.length,
      collectedRegistrations: registrations.filter(r => r.status === 'COLLECTED').length,
    };
  }, [summaryStats, registrations]);

  if (loading) {
    return <p className="text-center py-8 text-stone-500">{t('common.loading')}</p>;
  }

  const modalTitle = editing
    ? t('distribution.edit_registration_title', { name: editing.displayName })
    : t('distribution.register_recipient');

  const saveDisabled = saving || (!editing && (!form.displayName.trim() || !form.registrationTypeId));

  return (
    <div className="w-full min-w-0">
      {toast && <ToastNotification message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <DistributionRegistrationSummaryCards
        stats={registrationStats}
        parcelKgPerUnit={parcelKgPerUnit}
        parcelWeightUnit={parcelWeightUnit}
        availableMeatKg={availableMeatKg}
      />

      <TabSectionHeader
        title={t('distribution.registrations_tab')}
        subtitle={t('distribution.registrations_desc', { unit: oneParcelLabel })}
        action={
          !eventClosed && types.length > 0 ? (
            <button
              type="button"
              onClick={openCreate}
              className="w-full sm:w-auto px-3 py-2 bg-emerald-700 text-white rounded-lg text-sm font-medium hover:bg-emerald-800"
            >
              {t('distribution.register_recipient')}
            </button>
          ) : undefined
        }
      />

      {types.length === 0 && (
        <p className="text-amber-600 text-sm mb-4 px-1">{t('distribution.add_registration_type_first')}</p>
      )}

      <EventFormModal
        open={modalOpen}
        onClose={closeModal}
        title={modalTitle}
        subtitle={!editing ? t('distribution.registrations_desc', { unit: oneParcelLabel }) : undefined}
        size={editing ? 'md' : 'lg'}
        footer={
          <>
            <button type="button" onClick={closeModal} className={EVENT_FORM_BTN_SECONDARY}>
              {t('common.cancel')}
            </button>
            <button type="button" onClick={handleSave} disabled={saveDisabled} className={EVENT_FORM_BTN_PRIMARY}>
              {saving ? t('common.saving') : editing ? t('common.save') : t('distribution.register_recipient')}
            </button>
          </>
        }
      >
        {editing ? (
          <div>
            <label className={FORM_LABEL}>{t('distribution.planned_parcels')}</label>
            <input
              type="number"
              min={0}
              value={editPlanned}
              onChange={e => setEditPlanned(Math.max(0, parseInt(e.target.value, 10) || 0))}
              className={EVENT_FORM_INPUT}
            />
            <p className="text-xs text-stone-400 mt-1">
              {t('distribution.planned_weight_hint', { weight: parcelsToWeight(editPlanned) })}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className={FORM_LABEL}>{t('distribution.registration_type_name')}</label>
              <select
                value={form.registrationTypeId || ''}
                onChange={e => handleTypeChange(Number(e.target.value))}
                className={EVENT_FORM_INPUT}
              >
                {types.map(ty => (
                  <option key={ty.id} value={ty.id}>{ty.name}</option>
                ))}
              </select>
              {(selectedSoftLimitStatus === 'at' || selectedSoftLimitStatus === 'over') && selectedType?.softLimit != null && (
                <div
                  className={`mt-2 rounded-lg border px-3 py-2 text-sm ${
                    selectedSoftLimitStatus === 'over'
                      ? 'border-amber-300 bg-amber-50 text-amber-900'
                      : 'border-yellow-300 bg-yellow-50 text-yellow-900'
                  }`}
                  role="status"
                >
                  {selectedSoftLimitStatus === 'over'
                    ? t('distribution.soft_limit_warning_over', {
                        count: selectedType.registrationCount,
                        limit: selectedType.softLimit,
                      })
                    : t('distribution.soft_limit_warning_at', {
                        count: selectedType.registrationCount,
                        limit: selectedType.softLimit,
                      })}
                </div>
              )}
            </div>
            <div className="relative">
              <label className={FORM_LABEL}>{t('distribution.recipient_name')} *</label>
              <input
                type="text"
                value={personQuery}
                onChange={e => searchPerson(e.target.value)}
                className={EVENT_FORM_INPUT}
                placeholder={t('distribution.worker_person_placeholder')}
                autoComplete="off"
              />
              {personResults.length > 0 && (
                <ul className="absolute z-[60] left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-stone-200 rounded-lg shadow-lg">
                  {personResults.map(p => (
                    <li key={p.id}>
                      <button
                        type="button"
                        className="w-full text-left px-3 py-2.5 text-sm hover:bg-emerald-50 active:bg-emerald-100"
                        onClick={() => selectPerson(p)}
                      >
                        <span className="block break-words">
                          {personDisplayName(p)}
                          {p.email ? ` (${p.email})` : ''}
                        </span>
                        {p.hasActiveMembership && (
                          <span className="mt-0.5 inline-block text-xs text-emerald-700">{t('distribution.member')}</span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-xs text-stone-500 mt-1">{t('distribution.worker_person_hint')}</p>
              {personQuery.trim() && (
                <p className="text-xs mt-2 flex flex-wrap items-center gap-2">
                  <span
                    className={
                      selectedPersonId && isMember
                        ? 'inline-flex px-2 py-0.5 rounded bg-emerald-100 text-emerald-800'
                        : 'inline-flex px-2 py-0.5 rounded bg-stone-100 text-stone-700'
                    }
                  >
                    {selectedPersonId && isMember
                      ? t('distribution.member')
                      : t('distribution.worker_external')}
                  </span>
                  {!selectedPersonId && (
                    <span className="text-stone-500">{t('distribution.recipient_external_hint')}</span>
                  )}
                </p>
              )}
            </div>
            {selectedPersonId && (
              <label className="flex items-start gap-2 text-sm text-stone-700">
                <input
                  type="checkbox"
                  checked={isMember}
                  onChange={e => {
                    setIsMember(e.target.checked);
                    setForm(prev => ({ ...prev, member: e.target.checked }));
                  }}
                  className="mt-0.5 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span>{t('distribution.recipient_count_as_member')}</span>
              </label>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={FORM_LABEL}>{t('distribution.planned_parcels')}</label>
                <input
                  type="number"
                  min={0}
                  value={form.plannedParcelCount ?? 1}
                  onChange={e => setForm({ ...form, plannedParcelCount: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                  className={EVENT_FORM_INPUT}
                />
              </div>
              <div>
                <label className={FORM_LABEL}>{t('distribution.id_number')}</label>
                <input
                  type="text"
                  value={form.idNumber || ''}
                  onChange={e => setForm({ ...form, idNumber: e.target.value || undefined })}
                  className={EVENT_FORM_INPUT}
                />
              </div>
            </div>
            <div>
              <label className={FORM_LABEL}>{t('distribution.phone_number')}</label>
              <input
                type="text"
                value={form.phoneNumber || ''}
                onChange={e => setForm({ ...form, phoneNumber: e.target.value || undefined })}
                className={EVENT_FORM_INPUT}
              />
            </div>
            <label className="flex items-start gap-2 text-sm text-stone-700">
              <input
                type="checkbox"
                checked={!!form.adHoc}
                onChange={e => setForm({ ...form, adHoc: e.target.checked })}
                className="mt-0.5 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span>{t('distribution.ad_hoc_registration')}</span>
            </label>
          </div>
        )}
      </EventFormModal>

      {registrations.length > 0 && (
        <ResponsiveFilters>
          <ResponsiveFilterInput
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t('distribution.search_by_name_or_number')}
          />
          <ResponsiveFilterSelect value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="">{t('distribution.all_types')}</option>
            {types.map(ty => (
              <option key={ty.id} value={String(ty.id)}>{ty.name}</option>
            ))}
          </ResponsiveFilterSelect>
          <ResponsiveFilterSelect value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">{t('distribution.all_statuses')}</option>
            <option value="REGISTERED">{t('distribution.status_registered')}</option>
            <option value="COLLECTED">{t('distribution.status_collected')}</option>
          </ResponsiveFilterSelect>
        </ResponsiveFilters>
      )}

      {registrations.length === 0 ? (
        <p className="text-center py-8 text-stone-500">{t('distribution.no_registrations')}</p>
      ) : filtered.length === 0 ? (
        <p className="text-center py-8 text-stone-500">{t('distribution.no_matching_registrations')}</p>
      ) : (
        <>
          <div className="md:hidden bg-white rounded-lg shadow overflow-hidden">
          <MobileCardList>
            {filtered.map(r => (
              <MobileCardItem key={r.id}>
                {r.distributionNumber && (
                  <p className="text-xs font-medium text-stone-500">{r.distributionNumber}</p>
                )}
                <p className="text-sm font-semibold text-stone-900 mt-0.5 break-words">{r.displayName}</p>
                <p className="text-xs text-stone-500 mt-0.5">{r.registrationTypeName}</p>
                <dl className="mt-2 space-y-1 text-sm text-stone-600">
                  <div className="flex justify-between gap-2">
                    <dt className="text-stone-500">{t('distribution.planned_parcels')}</dt>
                    <dd>{r.plannedParcelCount} ({parcelsToWeight(r.plannedParcelCount)})</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-stone-500">{t('distribution.distributed_parcels')}</dt>
                    <dd>{r.distributedParcelCount} ({parcelsToWeight(r.distributedParcelCount)})</dd>
                  </div>
                </dl>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${r.status === 'COLLECTED' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                    {r.status === 'COLLECTED' ? t('distribution.status_collected') : t('distribution.status_registered')}
                  </span>
                  {r.adHoc && (
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-stone-100 text-stone-600">
                      {t('distribution.ad_hoc')}
                    </span>
                  )}
                </div>
                {!eventClosed && r.status === 'REGISTERED' && (
                  <RowActions>
                    <ActionButton variant="primary" onClick={() => openEdit(r)}>{t('common.edit')}</ActionButton>
                    <ActionButton variant="primary" onClick={() => handleMarkCollected(r)}>
                      {t('distribution.mark_collected')}
                    </ActionButton>
                    <ActionButton variant="danger" onClick={() => setDeleteId(r.id)}>{t('common.delete')}</ActionButton>
                  </RowActions>
                )}
              </MobileCardItem>
            ))}
          </MobileCardList>
          <p className="px-4 py-3 text-xs text-stone-500 text-center border-t border-stone-100">
            {filtered.length} / {registrations.length} {t('distribution.registered')}
          </p>
          </div>

          <DesktopTableWrap>
            <div className="overflow-x-auto">
            <table className="min-w-[720px] w-full divide-y divide-stone-200">
              <thead className="bg-stone-50">
                <tr>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase">{t('distribution.distribution_number')}</th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase">{t('distribution.recipient_name')}</th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase">{t('distribution.registration_type_name')}</th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase">{t('distribution.planned_parcels')}</th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase">{t('distribution.distributed_parcels')}</th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase">{t('distribution.event_status')}</th>
                  {!eventClosed && (
                    <th className="px-4 lg:px-6 py-3 text-right text-xs font-medium text-stone-500 uppercase">{t('common.actions')}</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {filtered.map(r => (
                  <tr key={r.id}>
                    <td className="px-4 lg:px-6 py-4 text-sm text-stone-500 whitespace-nowrap">{r.distributionNumber || '—'}</td>
                    <td className="px-4 lg:px-6 py-4 text-sm font-medium text-stone-900">{r.displayName}</td>
                    <td className="px-4 lg:px-6 py-4 text-sm text-stone-600">{r.registrationTypeName}</td>
                    <td className="px-4 lg:px-6 py-4 text-sm text-stone-600 whitespace-nowrap">
                      {r.plannedParcelCount}
                      <span className="text-xs text-stone-400 ml-1">({parcelsToWeight(r.plannedParcelCount)})</span>
                    </td>
                    <td className="px-4 lg:px-6 py-4 text-sm text-stone-600 whitespace-nowrap">
                      {r.distributedParcelCount}
                      <span className="text-xs text-stone-400 ml-1">({parcelsToWeight(r.distributedParcelCount)})</span>
                    </td>
                    <td className="px-4 lg:px-6 py-4 text-sm">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${r.status === 'COLLECTED' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                        {r.status === 'COLLECTED' ? t('distribution.status_collected') : t('distribution.status_registered')}
                      </span>
                    </td>
                    {!eventClosed && (
                      <td className="px-4 lg:px-6 py-4 text-right">
                        {r.status === 'REGISTERED' ? (
                          <div className="flex justify-end gap-2 lg:gap-3 flex-wrap">
                            <button type="button" onClick={() => openEdit(r)} className="text-sm text-emerald-700 font-medium">{t('common.edit')}</button>
                            <button type="button" onClick={() => handleMarkCollected(r)} className="text-sm text-emerald-700 font-medium">{t('distribution.mark_collected')}</button>
                            <button type="button" onClick={() => setDeleteId(r.id)} className="text-sm text-red-600 font-medium">{t('common.delete')}</button>
                          </div>
                        ) : (
                          <span className="text-sm text-stone-400">—</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            <ListCountFooter>{filtered.length} / {registrations.length}</ListCountFooter>
          </DesktopTableWrap>
        </>
      )}

      <ConfirmDialog
        open={deleteId != null}
        title={t('distribution.confirm_delete_registration_title')}
        message={t('distribution.confirm_delete_registration_message')}
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
