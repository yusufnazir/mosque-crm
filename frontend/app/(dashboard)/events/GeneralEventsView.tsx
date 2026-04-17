'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import {
  generalEventApi,
  GeneralEvent,
  GeneralEventStatus,
  GeneralEventType,
} from '@/lib/generalEventApi';
import { distributionApi, DistributionEvent } from '@/lib/distributionApi';
import { useSubscription } from '@/lib/subscription/SubscriptionContext';
import ToastNotification from '@/components/ToastNotification';
import ConfirmDialog from '@/components/ConfirmDialog';

const STATUS_COLORS: Record<GeneralEventStatus, string> = {
  DRAFT: 'bg-stone-100 text-stone-700',
  PUBLISHED: 'bg-blue-100 text-blue-700',
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  CLOSED: 'bg-amber-100 text-amber-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

const DIST_STATUS_COLORS: Record<DistributionEvent['status'], string> = {
  PLANNED: 'bg-blue-100 text-blue-700',
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  CLOSED: 'bg-amber-100 text-amber-700',
};

const EVENT_TYPES: GeneralEventType[] = [
  'LECTURE', 'FUNDRAISER', 'IFTAR', 'NIKAH', 'YOUTH_PROGRAM',
  'SPORTS_DAY', 'QURAN_COMPETITION', 'GRADUATION', 'OTHER',
];
const STATUSES: GeneralEventStatus[] = ['DRAFT', 'PUBLISHED', 'ACTIVE', 'CLOSED', 'CANCELLED'];

interface Props {
  onSelectDistribution?: (event: DistributionEvent) => void;
}

export default function GeneralEventsView({ onSelectDistribution }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const { getLimit } = useSubscription();
  const eventsLimit = getLimit('events.max');

  const [events, setEvents] = useState<GeneralEvent[]>([]);
  const [distEvents, setDistEvents] = useState<DistributionEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<GeneralEventStatus | ''>('');
  const [filterType, setFilterType] = useState<GeneralEventType | 'EID_UL_ADHA_DISTRIBUTION' | ''>('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GeneralEvent | null>(null);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const [generalData, distData] = await Promise.all([
        generalEventApi.listEvents(),
        distributionApi.listEvents().catch(() => [] as DistributionEvent[]),
      ]);
      setEvents(generalData);
      setDistEvents(distData);
    } catch {
      setToast({ message: t('general_events.toast.error'), type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [t]);

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

  const filteredGeneral = events.filter(ev => {
    if (filterType === 'EID_UL_ADHA_DISTRIBUTION') return false;
    const matchesSearch = !searchQuery ||
      ev.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ev.location ?? '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = !filterStatus || ev.status === filterStatus;
    const matchesType = !filterType || ev.generalEventType === filterType;
    return matchesSearch && matchesStatus && matchesType;
  });

  const filteredDist = distEvents.filter(ev => {
    if (filterType && filterType !== 'EID_UL_ADHA_DISTRIBUTION') return false;
    const matchesSearch = !searchQuery ||
      ev.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ev.location ?? '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = !filterStatus ||
      (filterStatus === 'ACTIVE' && ev.status === 'ACTIVE') ||
      (filterStatus === 'CLOSED' && ev.status === 'CLOSED') ||
      (filterStatus === 'PUBLISHED' && ev.status === 'PLANNED');
    return matchesSearch && matchesStatus;
  });

  const totalCount = filteredGeneral.length + filteredDist.length;
  const allEventsCount = events.length + distEvents.length;
  const atLimit = eventsLimit != null && eventsLimit > 0 && allEventsCount >= eventsLimit;

  return (
    <>
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
        message={`Are you sure you want to delete "${deleteTarget?.name}"?`}
        confirmLabel={t('general_events.delete')}
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Plan limit banner */}
      {atLimit && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
          <div>
            <span>{t('plan.events_limit_reached', { limit: String(eventsLimit) })}</span>
            {' '}
            <span className="text-amber-700">{t('plan.upgrade_prompt')}</span>
            {' '}
            <a href="/billing" className="font-semibold underline hover:text-amber-900">{t('plan.upgrade_button')}</a>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-stone-500 text-sm">{t('general_events.subtitle')}</p>
        </div>
        {!atLimit && (
          <button
            onClick={() => router.push('/general-events/new')}
            className="bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-800 transition-colors"
          >
            + {t('general_events.create')}
          </button>
        )}
      </div>

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
          onChange={e => setFilterType(e.target.value as GeneralEventType | 'EID_UL_ADHA_DISTRIBUTION' | '')}
          className="border border-stone-300 rounded-lg px-3 py-2 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">{t('general_events.all_types')}</option>
          <option value="EID_UL_ADHA_DISTRIBUTION">{t('distribution.type_eid_ul_adha')}</option>
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
      ) : totalCount === 0 ? (
        <div className="text-center py-16">
          <svg className="w-12 h-12 text-stone-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-stone-500 font-medium">{t('general_events.no_events')}</p>
          <p className="text-stone-400 text-sm mt-1">{t('general_events.no_events_hint')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {/* General events */}
          {filteredGeneral.map(ev => (
            <div
              key={`gen-${ev.id}`}
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
                  <span>{new Date(ev.startDate).toLocaleDateString()}{ev.startTime ? ` · ${ev.startTime}` : ''}</span>
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
                <span>{ev.totalRegistrations} {t('general_events.registrations.title').toLowerCase()}</span>
                <span>{ev.totalVolunteers} {t('general_events.volunteers.title').toLowerCase()}</span>
              </div>

              <div className="flex gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                <button onClick={() => router.push(`/general-events/${ev.id}/edit`)} className="text-xs text-emerald-700 hover:underline">
                  {t('common.edit')}
                </button>
                <span className="text-stone-300">|</span>
                <button onClick={() => setDeleteTarget(ev)} className="text-xs text-red-600 hover:underline">
                  {t('common.delete')}
                </button>
              </div>
            </div>
          ))}

          {/* Distribution events */}
          {filteredDist.map(ev => (
            <div
              key={`dist-${ev.id}`}
              className="bg-white border border-stone-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
              onClick={() => onSelectDistribution?.(ev)}
            >
              <div className="flex items-start justify-between mb-3">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${DIST_STATUS_COLORS[ev.status]}`}>
                  {ev.status}
                </span>
                <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 font-medium px-2 py-0.5 rounded-full">
                  {t('distribution.type_eid_ul_adha')}
                </span>
              </div>

              <h3 className="font-semibold text-stone-800 text-base mb-1 group-hover:text-emerald-700 transition-colors line-clamp-2">
                {ev.name}
              </h3>

              <p className="text-xs text-stone-500 mb-3">{ev.year}</p>

              <div className="space-y-1.5 text-xs text-stone-500">
                {ev.eventDate && (
                  <div className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>{new Date(ev.eventDate).toLocaleDateString()}</span>
                  </div>
                )}
                {ev.location && (
                  <div className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="truncate">{ev.location}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
