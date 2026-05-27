'use client';

import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { memberApi } from '@/lib/api';
import {
  eventFeatureApi,
  EventKind,
  EventSacrificeAnimal,
  EventSacrificeAnimalCreate,
  EventSacrificeAnimalShare,
  EventSacrificeAnimalShareCreate,
  EventSacrificeAnimalUpdate,
  EventSacrificeSummary,
  SacrificeAnimalSize,
} from '@/lib/eventFeatureApi';
import EventFormModal, {
  EVENT_FORM_BTN_PRIMARY,
  EVENT_FORM_BTN_SECONDARY,
  EVENT_FORM_INPUT,
} from '@/components/events/EventFormModal';

const FORM_LABEL = 'block text-sm font-medium text-stone-700 mb-1';
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

interface Props {
  eventKind: EventKind;
  eventId: number;
}

type AnimalModalState = { mode: 'create' } | { mode: 'edit'; animal: EventSacrificeAnimal };
type ShareModalState =
  | { mode: 'create'; animal: EventSacrificeAnimal }
  | { mode: 'edit'; animal: EventSacrificeAnimal; share: EventSacrificeAnimalShare };

function personDisplayName(p: { firstName: string; lastName?: string }) {
  return `${p.firstName}${p.lastName ? ` ${p.lastName}` : ''}`.trim();
}

function formatKg(value?: number | null) {
  if (value == null) return '—';
  return String(value);
}

function formatSummaryKg(value: number) {
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function parseOptionalKg(val: string): number | null {
  const trimmed = val.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export default function EventSacrificeAnimalsTab({ eventKind, eventId }: Props) {
  const { t } = useTranslation();
  const [animals, setAnimals] = useState<EventSacrificeAnimal[]>([]);
  const [summary, setSummary] = useState<EventSacrificeSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  const [animalModal, setAnimalModal] = useState<AnimalModalState | null>(null);
  const [animalForm, setAnimalForm] = useState<EventSacrificeAnimalCreate>({ animalNumber: '', size: 'SMALL' });
  const [weightKg, setWeightKg] = useState('');
  const [meatKg, setMeatKg] = useState('');
  const [animalSaving, setAnimalSaving] = useState(false);
  const [deleteAnimalId, setDeleteAnimalId] = useState<number | null>(null);

  const [shareModal, setShareModal] = useState<ShareModalState | null>(null);
  const [shareForm, setShareForm] = useState<EventSacrificeAnimalShareCreate>({
    personName: '',
    member: false,
    shareCount: 1,
  });
  const [personQuery, setPersonQuery] = useState('');
  const [personResults, setPersonResults] = useState<
    { id: number; firstName: string; lastName?: string; hasActiveMembership?: boolean }[]
  >([]);
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);
  const [meatEntitlementInput, setMeatEntitlementInput] = useState('');
  const [shareSaving, setShareSaving] = useState(false);
  const [deleteShare, setDeleteShare] = useState<{ animalId: number; share: EventSacrificeAnimalShare } | null>(null);
  const personTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const load = useCallback(async () => {
    const [animalList, summaryData] = await Promise.all([
      eventFeatureApi.listSacrificeAnimals(eventKind, eventId),
      eventFeatureApi.getSacrificeSummary(eventKind, eventId),
    ]);
    setAnimals(animalList);
    setSummary(summaryData);
  }, [eventKind, eventId]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await load();
      } catch {
        setToast({ message: t('sacrifice_animals.toast.error'), type: 'error' });
      } finally {
        setLoading(false);
      }
    })();
  }, [load, t]);

  const filtered = animals.filter(a => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return a.animalNumber.toLowerCase().includes(q);
  });

  const openCreateAnimal = () => {
    setAnimalForm({ animalNumber: '', size: 'SMALL' });
    setWeightKg('');
    setMeatKg('');
    setAnimalModal({ mode: 'create' });
  };

  const openEditAnimal = (animal: EventSacrificeAnimal) => {
    setAnimalForm({ animalNumber: animal.animalNumber, size: animal.size });
    setWeightKg(animal.weightKg != null ? String(animal.weightKg) : '');
    setMeatKg(animal.meatKg != null ? String(animal.meatKg) : '');
    setAnimalModal({ mode: 'edit', animal });
  };

  const parseOptionalNumber = (val: string): number | null => {
    const trimmed = val.trim();
    if (!trimmed) return null;
    const n = Number(trimmed);
    return Number.isFinite(n) && n >= 0 ? n : null;
  };

  const handleSaveAnimal = async () => {
    if (!animalForm.animalNumber.trim() || !animalModal) return;
    setAnimalSaving(true);
    try {
      if (animalModal.mode === 'create') {
        const created = await eventFeatureApi.createSacrificeAnimal(eventKind, eventId, {
          animalNumber: animalForm.animalNumber.trim(),
          size: animalForm.size,
        });
        const w = parseOptionalNumber(weightKg);
        const m = parseOptionalNumber(meatKg);
        if (w != null || m != null) {
          await eventFeatureApi.updateSacrificeAnimal(eventKind, eventId, created.id, {
            animalNumber: created.animalNumber,
            size: created.size,
            weightKg: w,
            meatKg: m,
          });
        }
      } else {
        const data: EventSacrificeAnimalUpdate = {
          animalNumber: animalForm.animalNumber.trim(),
          size: animalForm.size,
          weightKg: parseOptionalNumber(weightKg),
          meatKg: parseOptionalNumber(meatKg),
        };
        await eventFeatureApi.updateSacrificeAnimal(eventKind, eventId, animalModal.animal.id, data);
      }
      setAnimalModal(null);
      setToast({ message: t('sacrifice_animals.toast.saved'), type: 'success' });
      await load();
    } catch (e: unknown) {
      setToast({ message: e instanceof Error ? e.message : t('sacrifice_animals.toast.error'), type: 'error' });
    } finally {
      setAnimalSaving(false);
    }
  };

  const confirmDeleteAnimal = async () => {
    if (deleteAnimalId == null) return;
    try {
      await eventFeatureApi.deleteSacrificeAnimal(eventKind, eventId, deleteAnimalId);
      setDeleteAnimalId(null);
      if (expandedId === deleteAnimalId) setExpandedId(null);
      setToast({ message: t('sacrifice_animals.toast.deleted'), type: 'success' });
      await load();
    } catch {
      setToast({ message: t('sacrifice_animals.toast.error'), type: 'error' });
    }
  };

  const openShareModal = (animal: EventSacrificeAnimal, share?: EventSacrificeAnimalShare) => {
    if (share) {
      setShareModal({ mode: 'edit', animal, share });
      setShareForm({
        personId: share.personId ?? null,
        personName: share.personName,
        member: share.member,
        shareCount: share.shareCount,
        meatEntitlementKg: share.meatEntitlementKg ?? null,
      });
      setSelectedPersonId(share.personId ?? null);
      setPersonQuery(share.personName);
      setMeatEntitlementInput(share.meatEntitlementKg != null ? String(share.meatEntitlementKg) : '');
    } else {
      setShareModal({ mode: 'create', animal });
      setShareForm({ personName: '', member: false, shareCount: 1 });
      setSelectedPersonId(null);
      setPersonQuery('');
      setMeatEntitlementInput('');
    }
    setPersonResults([]);
  };

  const handlePersonSearch = (val: string) => {
    setPersonQuery(val);
    setShareForm(prev => ({ ...prev, personName: val }));
    setSelectedPersonId(null);
    setShareForm(prev => ({ ...prev, member: false, personId: null }));
    if (personTimeout.current) clearTimeout(personTimeout.current);
    if (val.length < 2) {
      setPersonResults([]);
      return;
    }
    personTimeout.current = setTimeout(async () => {
      try {
        const results = await memberApi.search(val);
        setPersonResults(
          (results || []).map((p: { id: number | string; firstName: string; lastName?: string; hasActiveMembership?: boolean }) => ({
            id: typeof p.id === 'string' ? Number(p.id) : p.id,
            firstName: p.firstName,
            lastName: p.lastName,
            hasActiveMembership: p.hasActiveMembership,
          }))
        );
      } catch {
        setPersonResults([]);
      }
    }, 300);
  };

  const selectPerson = (p: { id: number; firstName: string; lastName?: string; hasActiveMembership?: boolean }) => {
    const name = personDisplayName(p);
    setSelectedPersonId(p.id);
    setPersonQuery(name);
    setShareForm(prev => ({
      ...prev,
      personId: p.id,
      personName: name,
      member: Boolean(p.hasActiveMembership),
    }));
    setPersonResults([]);
  };

  const handleSaveShare = async () => {
    if (!shareModal || !shareForm.personName.trim()) return;
    const maxAdd = shareModal.animal.remainingShares +
      (shareModal.mode === 'edit' ? shareModal.share.shareCount : 0);
    if (shareForm.shareCount < 1 || shareForm.shareCount > maxAdd) {
      setToast({
        message: t('sacrifice_animals.share_limit', {
          remaining: maxAdd,
          max: shareModal.animal.maxShares,
        }),
        type: 'error',
      });
      return;
    }
    setShareSaving(true);
    try {
      const payload: EventSacrificeAnimalShareCreate = {
        personId: selectedPersonId,
        personName: shareForm.personName.trim(),
        member: shareForm.member,
        shareCount: shareForm.shareCount,
        meatEntitlementKg: parseOptionalKg(meatEntitlementInput),
      };
      if (shareModal.mode === 'create') {
        await eventFeatureApi.addSacrificeShare(eventKind, eventId, shareModal.animal.id, payload);
      } else {
        await eventFeatureApi.updateSacrificeShare(
          eventKind,
          eventId,
          shareModal.animal.id,
          shareModal.share.id,
          payload
        );
      }
      setShareModal(null);
      setToast({ message: t('sacrifice_animals.toast.saved'), type: 'success' });
      await load();
    } catch (e: unknown) {
      const msg =
        e instanceof Error
          ? e.message
          : typeof e === 'object' && e && 'message' in e
            ? String((e as { message: string }).message)
            : t('sacrifice_animals.toast.error');
      setToast({ message: msg, type: 'error' });
    } finally {
      setShareSaving(false);
    }
  };

  const confirmDeleteShare = async () => {
    if (!deleteShare) return;
    try {
      await eventFeatureApi.deleteSacrificeShare(
        eventKind,
        eventId,
        deleteShare.animalId,
        deleteShare.share.id
      );
      setDeleteShare(null);
      setToast({ message: t('sacrifice_animals.toast.deleted'), type: 'success' });
      await load();
    } catch {
      setToast({ message: t('sacrifice_animals.toast.error'), type: 'error' });
    }
  };

  const handleMarkEntitlementReceived = async (animalId: number, share: EventSacrificeAnimalShare) => {
    try {
      await eventFeatureApi.markSacrificeShareEntitlementReceived(eventKind, eventId, animalId, share.id);
      setToast({ message: t('sacrifice_animals.mark_entitlement_received_success'), type: 'success' });
      await load();
    } catch {
      setToast({ message: t('sacrifice_animals.mark_entitlement_received_error'), type: 'error' });
    }
  };

  const entitlementStatusBadge = (share: EventSacrificeAnimalShare) =>
    share.entitlementReceived ? (
      <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
        {t('sacrifice_animals.entitlement_received')}
      </span>
    ) : (
      <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
        {t('sacrifice_animals.entitlement_pending')}
      </span>
    );

  const shareRowActions = (animal: EventSacrificeAnimal, share: EventSacrificeAnimalShare) => (
    <RowActions>
      {!share.entitlementReceived && (
        <ActionButton variant="primary" onClick={() => handleMarkEntitlementReceived(animal.id, share)}>
          {t('sacrifice_animals.mark_entitlement_received')}
        </ActionButton>
      )}
      <ActionButton variant="primary" onClick={() => openShareModal(animal, share)}>
        {t('common.edit')}
      </ActionButton>
      <ActionButton variant="danger" onClick={() => setDeleteShare({ animalId: animal.id, share })}>
        {t('common.delete')}
      </ActionButton>
    </RowActions>
  );

  const sizeLabel = (size: SacrificeAnimalSize) =>
    size === 'SMALL' ? t('sacrifice_animals.size_small') : t('sacrifice_animals.size_large');

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-5">
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-5 border border-stone-200">
            <p className="text-sm text-stone-500">{t('sacrifice_animals.summary_total_meat')}</p>
            <p className="text-2xl font-bold text-stone-900 mt-1">{formatSummaryKg(summary.totalMeatKg)} kg</p>
          </div>
          <div className="bg-white rounded-lg shadow p-5 border border-stone-200">
            <p className="text-sm text-stone-500">{t('sacrifice_animals.summary_share_entitlement')}</p>
            <p className="text-2xl font-bold text-amber-700 mt-1">{formatSummaryKg(summary.totalShareEntitlementKg)} kg</p>
            {summary.totalShareEntitlementKg > 0 && (
              <p className="text-xs text-stone-500 mt-1">
                {t('sacrifice_animals.summary_entitlement_received', {
                  received: formatSummaryKg(summary.totalReceivedEntitlementKg ?? 0),
                  total: formatSummaryKg(summary.totalShareEntitlementKg),
                })}
              </p>
            )}
          </div>
          <div className="bg-white rounded-lg shadow p-5 border border-stone-200">
            <p className="text-sm text-stone-500">{t('sacrifice_animals.summary_available_meat')}</p>
            <p className={`text-2xl font-bold mt-1 ${summary.availableMeatKg < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
              {formatSummaryKg(summary.availableMeatKg)} kg
            </p>
            <p className="text-xs text-stone-400 mt-1">{t('sacrifice_animals.summary_available_hint')}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-5 border border-stone-200">
            <p className="text-sm text-stone-500">{t('sacrifice_animals.summary_distributed_parcels')}</p>
            <p className="text-2xl font-bold text-blue-700 mt-1">{summary.totalDistributedParcels}</p>
            {eventKind === 'DISTRIBUTION' && summary.totalDistributedParcels > 0 && (
              <p className="text-xs text-stone-500 mt-1">
                {t('sacrifice_animals.summary_distributed_weight', {
                  kg: formatSummaryKg(summary.totalDistributedWeightKg),
                })}
              </p>
            )}
          </div>
        </div>
      )}

      <section className="w-full min-w-0 bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
        <TabSectionHeader
          inCard
          title={t('sacrifice_animals.title')}
          subtitle={t('sacrifice_animals.subtitle')}
          action={
            <button type="button" className={EVENT_FORM_BTN_PRIMARY} onClick={openCreateAnimal}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {t('sacrifice_animals.register')}
            </button>
          }
        />

        <div className="px-4 sm:px-6 py-4 border-b border-stone-100">
          <input
            type="search"
            className={EVENT_FORM_INPUT}
            placeholder={t('sacrifice_animals.search')}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {filtered.length === 0 ? (
          <p className="px-4 sm:px-6 py-10 text-center text-stone-500 text-sm">{t('sacrifice_animals.empty')}</p>
        ) : (
          <>
            <MobileCardList>
              {filtered.map(animal => {
                const expanded = expandedId === animal.id;
                return (
                  <MobileCardItem key={animal.id}>
                    <button
                      type="button"
                      className="w-full text-left"
                      onClick={() => setExpandedId(expanded ? null : animal.id)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-stone-900">
                            #{animal.animalNumber}{' '}
                            <span className="text-sm font-normal text-stone-500">({sizeLabel(animal.size)})</span>
                          </p>
                          <p className="text-sm text-stone-600 mt-1">
                            {t('sacrifice_animals.shares')}: {animal.allocatedShares}/{animal.maxShares}
                            {animal.remainingShares > 0 && (
                              <span className="text-amber-700"> · {animal.remainingShares} {t('sacrifice_animals.remaining')}</span>
                            )}
                          </p>
                          {(animal.weightKg != null || animal.meatKg != null || animal.totalMeatEntitlementKg != null) && (
                            <p className="text-xs text-stone-500 mt-1">
                              {animal.weightKg != null && `${t('sacrifice_animals.weight')}: ${animal.weightKg} kg`}
                              {animal.weightKg != null && (animal.meatKg != null || animal.totalMeatEntitlementKg != null) && ' · '}
                              {animal.meatKg != null && `${t('sacrifice_animals.meat')}: ${animal.meatKg} kg`}
                              {animal.meatKg != null && animal.totalMeatEntitlementKg != null && ' · '}
                              {animal.totalMeatEntitlementKg != null && animal.totalMeatEntitlementKg > 0 && (
                                <>{t('sacrifice_animals.entitlement_total')}: {animal.totalMeatEntitlementKg} kg</>
                              )}
                            </p>
                          )}
                        </div>
                        <svg
                          className={`w-5 h-5 text-stone-400 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </button>
                    {expanded && (
                      <div className="mt-4 pt-4 border-t border-stone-100 space-y-3">
                        {animal.totalMeatEntitlementKg != null && animal.totalMeatEntitlementKg > 0 && (
                          <p className="text-xs font-medium text-stone-600">
                            {t('sacrifice_animals.entitlement_total')}: {animal.totalMeatEntitlementKg} kg
                          </p>
                        )}
                        <RowActions>
                          <ActionButton variant="primary" onClick={() => openEditAnimal(animal)}>
                            {t('common.edit')}
                          </ActionButton>
                          {animal.remainingShares > 0 && (
                            <ActionButton variant="primary" onClick={() => openShareModal(animal)}>
                              {t('sacrifice_animals.add_share')}
                            </ActionButton>
                          )}
                          <ActionButton variant="danger" onClick={() => setDeleteAnimalId(animal.id)}>
                            {t('common.delete')}
                          </ActionButton>
                        </RowActions>
                        {animal.shares.length === 0 ? (
                          <p className="text-sm text-stone-500">{t('sacrifice_animals.no_shares')}</p>
                        ) : (
                          <ul className="space-y-2">
                            {animal.shares.map(s => (
                              <li
                                key={s.id}
                                className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between bg-stone-50 rounded-lg px-3 py-2"
                              >
                                <div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-sm font-medium text-stone-900">{s.personName}</p>
                                    {entitlementStatusBadge(s)}
                                  </div>
                                  <p className="text-xs text-stone-500 mt-0.5">
                                    {s.member ? t('sacrifice_animals.member') : t('sacrifice_animals.external')} ·{' '}
                                    {s.shareCount} {s.shareCount === 1 ? t('sacrifice_animals.share') : t('sacrifice_animals.shares_label')}
                                    {s.meatEntitlementKg != null && (
                                      <> · {s.meatEntitlementKg} kg {t('sacrifice_animals.entitlement')}</>
                                    )}
                                  </p>
                                </div>
                                {shareRowActions(animal, s)}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </MobileCardItem>
                );
              })}
            </MobileCardList>

            <DesktopTableWrap>
              <table className="min-w-full divide-y divide-stone-200 text-sm">
                <thead className="bg-stone-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase">
                      {t('sacrifice_animals.number')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase">
                      {t('sacrifice_animals.size')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase">
                      {t('sacrifice_animals.shares')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase">
                      {t('sacrifice_animals.weight')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase">
                      {t('sacrifice_animals.meat')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase">
                      {t('sacrifice_animals.entitlement_total')}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-stone-500 uppercase">
                      {t('common.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filtered.map(animal => (
                    <Fragment key={animal.id}>
                      <tr className="hover:bg-stone-50/80">
                        <td className="px-4 py-3 font-medium text-stone-900">#{animal.animalNumber}</td>
                        <td className="px-4 py-3 text-stone-600">{sizeLabel(animal.size)}</td>
                        <td className="px-4 py-3">
                          <span className={animal.remainingShares === 0 ? 'text-emerald-700' : 'text-stone-700'}>
                            {animal.allocatedShares}/{animal.maxShares}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-stone-600">{animal.weightKg ?? '—'}</td>
                        <td className="px-4 py-3 text-stone-600">{formatKg(animal.meatKg)}</td>
                        <td className="px-4 py-3 text-stone-600 font-medium">
                          {animal.totalMeatEntitlementKg != null && animal.totalMeatEntitlementKg > 0
                            ? `${animal.totalMeatEntitlementKg} kg`
                            : '—'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <RowActions className="justify-end">
                            <ActionButton
                              variant="primary"
                              onClick={() => setExpandedId(expandedId === animal.id ? null : animal.id)}
                            >
                              {expandedId === animal.id ? t('sacrifice_animals.hide') : t('sacrifice_animals.manage')}
                            </ActionButton>
                            <ActionButton variant="primary" onClick={() => openEditAnimal(animal)}>
                              {t('common.edit')}
                            </ActionButton>
                            <ActionButton variant="danger" onClick={() => setDeleteAnimalId(animal.id)}>
                              {t('common.delete')}
                            </ActionButton>
                          </RowActions>
                        </td>
                      </tr>
                      {expandedId === animal.id && (
                        <tr>
                          <td colSpan={7} className="px-4 py-4 bg-stone-50/50">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                              <div>
                                <p className="text-sm font-medium text-stone-700">{t('sacrifice_animals.share_holders')}</p>
                                {animal.totalMeatEntitlementKg != null && animal.totalMeatEntitlementKg > 0 && (
                                  <p className="text-xs text-stone-500 mt-0.5">
                                    {t('sacrifice_animals.entitlement_total')}: {animal.totalMeatEntitlementKg} kg
                                  </p>
                                )}
                              </div>
                              {animal.remainingShares > 0 && (
                                <button
                                  type="button"
                                  className={EVENT_FORM_BTN_PRIMARY}
                                  onClick={() => openShareModal(animal)}
                                >
                                  {t('sacrifice_animals.add_share')}
                                </button>
                              )}
                            </div>
                            {animal.shares.length === 0 ? (
                              <p className="text-sm text-stone-500">{t('sacrifice_animals.no_shares')}</p>
                            ) : (
                              <ul className="space-y-2">
                                {animal.shares.map(s => (
                                  <li
                                    key={s.id}
                                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-white border border-stone-200 rounded-lg px-3 py-2"
                                  >
                                    <div>
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className="font-medium text-stone-900">{s.personName}</span>
                                        {entitlementStatusBadge(s)}
                                      </div>
                                      <span className="text-stone-500 text-sm">
                                        ({s.member ? t('sacrifice_animals.member') : t('sacrifice_animals.external')})
                                      </span>
                                      <span className="text-stone-600 text-sm ml-2">
                                        — {s.shareCount}{' '}
                                        {s.shareCount === 1 ? t('sacrifice_animals.share') : t('sacrifice_animals.shares_label')}
                                        {s.meatEntitlementKg != null && (
                                          <> · {s.meatEntitlementKg} kg {t('sacrifice_animals.entitlement')}</>
                                        )}
                                      </span>
                                    </div>
                                    {shareRowActions(animal, s)}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </DesktopTableWrap>
            <ListCountFooter>
              {filtered.length} {t('sacrifice_animals.count')}
            </ListCountFooter>
          </>
        )}
      </section>

      <EventFormModal
        open={animalModal !== null}
        onClose={() => setAnimalModal(null)}
        title={
          animalModal?.mode === 'create'
            ? t('sacrifice_animals.register')
            : t('sacrifice_animals.edit_animal')
        }
        size="md"
        footer={
          <>
            <button type="button" className={EVENT_FORM_BTN_SECONDARY} onClick={() => setAnimalModal(null)} disabled={animalSaving}>
              {t('common.cancel')}
            </button>
            <button
              type="button"
              className={EVENT_FORM_BTN_PRIMARY}
              disabled={animalSaving || !animalForm.animalNumber.trim()}
              onClick={handleSaveAnimal}
            >
              {animalSaving ? t('common.saving') : t('common.save')}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className={FORM_LABEL}>{t('sacrifice_animals.number')}</label>
            <input
              className={EVENT_FORM_INPUT}
              value={animalForm.animalNumber}
              onChange={e => setAnimalForm(f => ({ ...f, animalNumber: e.target.value }))}
              placeholder="1"
              autoFocus
            />
          </div>
          <div>
            <label className={FORM_LABEL}>{t('sacrifice_animals.size')}</label>
            <select
              className={EVENT_FORM_INPUT}
              value={animalForm.size}
              onChange={e => setAnimalForm(f => ({ ...f, size: e.target.value as SacrificeAnimalSize }))}
            >
              <option value="SMALL">{t('sacrifice_animals.size_small')} (1 {t('sacrifice_animals.share')})</option>
              <option value="LARGE">{t('sacrifice_animals.size_large')} (7 {t('sacrifice_animals.shares_label')})</option>
            </select>
          </div>
          <div>
            <label className={FORM_LABEL}>{t('sacrifice_animals.weight_kg')}</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className={EVENT_FORM_INPUT}
              value={weightKg}
              onChange={e => setWeightKg(e.target.value)}
            />
          </div>
          <div>
            <label className={FORM_LABEL}>{t('sacrifice_animals.meat_kg')}</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className={EVENT_FORM_INPUT}
              value={meatKg}
              onChange={e => setMeatKg(e.target.value)}
            />
          </div>
          {animalModal?.mode === 'create' && (
            <p className="text-xs text-stone-500">{t('sacrifice_animals.weight_hint')}</p>
          )}
        </div>
      </EventFormModal>

      <EventFormModal
        open={shareModal !== null}
        onClose={() => setShareModal(null)}
        title={
          shareModal?.mode === 'create'
            ? t('sacrifice_animals.add_share')
            : t('sacrifice_animals.edit_share')
        }
        size="md"
        footer={
          <>
            <button type="button" className={EVENT_FORM_BTN_SECONDARY} onClick={() => setShareModal(null)} disabled={shareSaving}>
              {t('common.cancel')}
            </button>
            <button
              type="button"
              className={EVENT_FORM_BTN_PRIMARY}
              disabled={shareSaving || !shareForm.personName.trim()}
              onClick={handleSaveShare}
            >
              {shareSaving ? t('common.saving') : t('common.save')}
            </button>
          </>
        }
      >
        {shareModal && (
          <div className="space-y-4">
            <p className="text-sm text-stone-600">
              {t('sacrifice_animals.animal')}: #{shareModal.animal.animalNumber} ·{' '}
              {shareModal.animal.remainingShares +
                (shareModal.mode === 'edit' ? shareModal.share.shareCount : 0)}{' '}
              {t('sacrifice_animals.shares_available')}
            </p>
            <div className="relative">
              <label className={FORM_LABEL}>{t('sacrifice_animals.person')}</label>
              <input
                className={EVENT_FORM_INPUT}
                value={personQuery}
                onChange={e => handlePersonSearch(e.target.value)}
                placeholder={t('sacrifice_animals.person_placeholder')}
                autoComplete="off"
              />
              {personResults.length > 0 && (
                <ul className="absolute z-20 left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-stone-200 rounded-lg shadow-lg">
                  {personResults.map(p => (
                    <li key={p.id}>
                      <button
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-stone-50"
                        onClick={() => selectPerson(p)}
                      >
                        {personDisplayName(p)}
                        {p.hasActiveMembership && (
                          <span className="ml-2 text-xs text-emerald-700">{t('sacrifice_animals.member')}</span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-xs text-stone-500 mt-1">{t('sacrifice_animals.person_hint')}</p>
              {shareForm.personName && (
                <p className="text-xs mt-1">
                  <span
                    className={
                      shareForm.member
                        ? 'inline-flex px-2 py-0.5 rounded bg-emerald-100 text-emerald-800'
                        : 'inline-flex px-2 py-0.5 rounded bg-stone-100 text-stone-700'
                    }
                  >
                    {shareForm.member ? t('sacrifice_animals.member') : t('sacrifice_animals.external')}
                  </span>
                </p>
              )}
            </div>
            <div>
              <label className={FORM_LABEL}>{t('sacrifice_animals.share_count')}</label>
              <input
                type="number"
                min={1}
                max={
                  shareModal.animal.remainingShares +
                  (shareModal.mode === 'edit' ? shareModal.share.shareCount : 0)
                }
                className={EVENT_FORM_INPUT}
                value={shareForm.shareCount}
                onChange={e =>
                  setShareForm(f => ({ ...f, shareCount: Math.max(1, parseInt(e.target.value, 10) || 1) }))
                }
              />
            </div>
            <div>
              <label className={FORM_LABEL}>{t('sacrifice_animals.meat_entitlement_kg')}</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className={EVENT_FORM_INPUT}
                value={meatEntitlementInput}
                onChange={e => setMeatEntitlementInput(e.target.value)}
                placeholder={t('sacrifice_animals.meat_entitlement_placeholder')}
              />
            </div>
          </div>
        )}
      </EventFormModal>

      <ConfirmDialog
        open={deleteAnimalId != null}
        title={t('sacrifice_animals.delete_animal_title')}
        message={t('sacrifice_animals.delete_animal_message')}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        onConfirm={confirmDeleteAnimal}
        onCancel={() => setDeleteAnimalId(null)}
        variant="danger"
      />

      <ConfirmDialog
        open={deleteShare != null}
        title={t('sacrifice_animals.delete_share_title')}
        message={t('sacrifice_animals.delete_share_message')}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        onConfirm={confirmDeleteShare}
        onCancel={() => setDeleteShare(null)}
        variant="danger"
      />

      {toast && <ToastNotification message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
