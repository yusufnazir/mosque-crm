'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { useDateFormat } from '@/lib/DateFormatContext';
import { useAuth } from '@/lib/auth/AuthContext';
import {
  generalEventApi,
  GeneralEvent,
  FederatedGeneralEvent,
  GeneralEventStatus,
  GeneralEventType,
} from '@/lib/generalEventApi';
import ToastNotification from '@/components/ToastNotification';
import ConfirmDialog from '@/components/ConfirmDialog';
import { ActionButton, RowActions } from '@/components/events/EventResourceRowActions';

type Tab = 'local' | 'federation';

const STATUS_COLORS: Record<GeneralEventStatus, string> = {
  DRAFT: 'bg-stone-100 text-stone-700',
  PUBLISHED: 'bg-blue-100 text-blue-700',
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  CLOSED: 'bg-amber-100 text-amber-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

export default function GeneralEventsPage() {
  const { t } = useTranslation();
  const { formatDate } = useDateFormat();
  const { can } = useAuth();
  const router = useRouter();
  const canViewFederation = can('public_events.view');
  const canModerate = can('public_events.moderate');

  const [tab, setTab] = useState<Tab>('local');
  const [events, setEvents] = useState<GeneralEvent[]>([]);
  const [federationEvents, setFederationEvents] = useState<FederatedGeneralEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<GeneralEventStatus | ''>('');
  const [filterType, setFilterType] = useState<GeneralEventType | ''>('');

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GeneralEvent | null>(null);
  const [hideEventId, setHideEventId] = useState<number | null>(null);
  const [hideReason, setHideReason] = useState('');

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 'local') {
        const data = await generalEventApi.listEvents();
        setEvents(data);
      } else if (canViewFederation) {
        const data = await generalEventApi.listFederationEvents();
        setFederationEvents(data);
      }
    } catch {
      setToast({ message: t('general_events.toast.error'), type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [t, tab, canViewFederation]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await generalEventApi.deleteEvent(deleteTarget.id);
      setToast({ message: t('general_events.toast.deleted'), type: 'success' });
      setDeleteTarget(null);
      loadEvents();
    } catch {
      setToast({ message: t('general_events.toast.error'), type: 'error' });
      setDeleteTarget(null);
    }
  };

  const hideEvent = async () => {
    if (!hideEventId) return;
    try {
      await generalEventApi.hideFromFederation(hideEventId, hideReason || undefined);
      setHideEventId(null);
      setHideReason('');
      setToast({ message: t('general_events.hide_success'), type: 'success' });
      loadEvents();
    } catch {
      setToast({ message: t('general_events.hide_error'), type: 'error' });
    }
  };

  const unhideEvent = async (eventId: number) => {
    try {
      await generalEventApi.unhideFromFederation(eventId);
      setToast({ message: t('general_events.unhide_success'), type: 'success' });
      loadEvents();
    } catch {
      setToast({ message: t('general_events.unhide_error'), type: 'error' });
    }
  };

  const filtered = events.filter(ev => {
    const matchesSearch = !searchQuery ||
      ev.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ev.location ?? '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = !filterStatus || ev.status === filterStatus;
    const matchesType = !filterType || ev.generalEventType === filterType;
    return matchesSearch && matchesStatus && matchesType;
  });

  const EVENT_TYPES: GeneralEventType[] = [
    'LECTURE', 'FUNDRAISER', 'IFTAR', 'NIKAH', 'YOUTH_PROGRAM',
    'SPORTS_DAY', 'QURAN_COMPETITION', 'GRADUATION', 'OTHER',
  ];
  const STATUSES: GeneralEventStatus[] = ['DRAFT', 'PUBLISHED', 'ACTIVE', 'CLOSED', 'CANCELLED'];

  return (
    <div className="p-8">
      {toast && (
        <ToastNotification
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title={t('general_events.delete')}
        message={t('general_events.delete_confirm_message', { name: deleteTarget?.name ?? '' })}
        confirmLabel={t('general_events.delete')}
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">{t('general_events.title')}</h1>
          <p className="text-stone-500 text-sm mt-1">{t('general_events.subtitle')}</p>
        </div>
        {tab === 'local' && (
          <button
            onClick={() => router.push('/general-events/new')}
            className="bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-800 transition-colors"
          >
            + {t('general_events.create')}
          </button>
        )}
      </div>

      {canViewFederation && (
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab('local')}
            className={`px-4 py-2 rounded-lg text-sm ${tab === 'local' ? 'bg-emerald-700 text-white' : 'bg-white border border-stone-300'}`}
          >
            {t('general_events.tab_local')}
          </button>
          <button
            onClick={() => setTab('federation')}
            className={`px-4 py-2 rounded-lg text-sm ${tab === 'federation' ? 'bg-emerald-700 text-white' : 'bg-white border border-stone-300'}`}
          >
            {t('general_events.tab_federation')}
          </button>
        </div>
      )}

      {tab === 'local' && (
      <>
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          placeholder={t('general_events.search_placeholder')}
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="border border-stone-300 rounded-lg px-3 py-2 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 w-60"
        />
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as GeneralEventStatus | '')}
          className="border border-stone-300 rounded-lg px-3 py-2 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">{t('general_events.all_statuses')}</option>
          {STATUSES.map(s => (
            <option key={s} value={s}>{t(`general_events.statuses.${s}`)}</option>
          ))}
        </select>
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value as GeneralEventType | '')}
          className="border border-stone-300 rounded-lg px-3 py-2 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">{t('general_events.all_types')}</option>
          {EVENT_TYPES.map(tp => (
            <option key={tp} value={tp}>{t(`general_events.types.${tp}`)}</option>
          ))}
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <svg className="w-12 h-12 text-stone-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-stone-500 font-medium">{t('general_events.no_events')}</p>
          <p className="text-stone-400 text-sm mt-1">{t('general_events.no_events_hint')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(ev => (
            <div
              key={ev.id}
              className="bg-white border border-stone-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
              onClick={() => router.push(`/general-events/${ev.id}`)}
            >
              <div className="flex items-start justify-between mb-3">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[ev.status]}`}>
                  {t(`general_events.statuses.${ev.status}`)}
                </span>
                {ev.featured && (
                  <span className="text-xs bg-amber-100 text-amber-700 font-semibold px-2.5 py-1 rounded-full">
                    ★ Featured
                  </span>
                )}
              </div>

              <h3 className="font-semibold text-stone-800 text-base mb-1 group-hover:text-emerald-700 transition-colors line-clamp-2">
                {ev.name}
              </h3>

              <p className="text-xs text-stone-500 mb-3">
                {t(`general_events.types.${ev.generalEventType}`)}
                {ev.customTypeLabel ? ` · ${ev.customTypeLabel}` : ''}
              </p>

              <div className="space-y-1.5 text-xs text-stone-500">
                <div className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>{formatDate(ev.startDate)}{ev.startTime ? ` · ${ev.startTime}` : ''}</span>
                </div>
                {ev.location && (
                  <div className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="truncate">{ev.location}</span>
                  </div>
                )}
                {ev.isOnline && (
                  <div className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.882v6.236a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span>Online</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4 mt-4 pt-3 border-t border-stone-100 text-xs text-stone-500">
                <span>{ev.totalRegistrations} registrations</span>
                <span>{ev.totalVolunteers} volunteers</span>
              </div>

              <RowActions>
                <ActionButton variant="primary" onClick={() => router.push(`/general-events/${ev.id}/edit`)}>
                  {t('common.edit')}
                </ActionButton>
                <ActionButton variant="danger" onClick={() => setDeleteTarget(ev)}>
                  {t('common.delete')}
                </ActionButton>
              </RowActions>
            </div>
          ))}
        </div>
      )}
      </>
      )}

      {tab === 'federation' && (
        loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : federationEvents.length === 0 ? (
          <div className="text-center py-16 text-stone-500">{t('general_events.empty_federation')}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {federationEvents.map(ev => (
              <div key={ev.id} className="bg-white border border-stone-200 rounded-xl p-5 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[ev.status]}`}>
                    {t(`general_events.statuses.${ev.status}`)}
                  </span>
                  {ev.federationHidden && (
                    <span className="text-xs bg-red-100 text-red-700 font-semibold px-2.5 py-1 rounded-full">
                      {t('general_events.hidden_from_federation')}
                    </span>
                  )}
                </div>
                <h3 className="font-semibold text-stone-800 text-base mb-1 line-clamp-2">{ev.name}</h3>
                <p className="text-xs text-stone-500 mb-2">
                  {t('general_events.listed_by', { org: ev.hostedByOrganizationName ?? '' })}
                </p>
                <div className="space-y-1.5 text-xs text-stone-500 mb-4">
                  <div>{formatDate(ev.startDate)}{ev.startTime ? ` · ${ev.startTime}` : ''}</div>
                  {ev.location && <div className="truncate">{ev.location}</div>}
                </div>
                {canModerate && (
                  <div className="flex gap-2">
                    {ev.federationHidden ? (
                      <button onClick={() => unhideEvent(ev.id)} className="px-3 py-1.5 border border-emerald-600 text-emerald-700 rounded-lg text-sm">
                        {t('general_events.unhide')}
                      </button>
                    ) : (
                      <button onClick={() => setHideEventId(ev.id)} className="px-3 py-1.5 border border-red-300 text-red-700 rounded-lg text-sm">
                        {t('general_events.hide')}
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {hideEventId !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl">
            <h2 className="text-lg font-semibold mb-4">{t('general_events.hide')}</h2>
            <textarea
              value={hideReason}
              onChange={(e) => setHideReason(e.target.value)}
              placeholder={t('general_events.hide_reason_placeholder')}
              className="w-full border border-stone-300 rounded-lg px-3 py-2 min-h-[80px] mb-4"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => { setHideEventId(null); setHideReason(''); }} className="px-4 py-2 border border-stone-300 rounded-lg">
                {t('common.cancel')}
              </button>
              <button onClick={hideEvent} className="px-4 py-2 bg-red-600 text-white rounded-lg">
                {t('general_events.hide')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
