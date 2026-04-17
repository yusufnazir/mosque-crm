'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { useDateFormat } from '@/lib/DateFormatContext';
import {
  generalEventApi,
  GeneralEvent,
  GeneralEventStatus,
  GeneralEventType,
} from '@/lib/generalEventApi';
import ToastNotification from '@/components/ToastNotification';
import ConfirmDialog from '@/components/ConfirmDialog';

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
  const router = useRouter();

  const [events, setEvents] = useState<GeneralEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<GeneralEventStatus | ''>('');
  const [filterType, setFilterType] = useState<GeneralEventType | ''>('');

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GeneralEvent | null>(null);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const data = await generalEventApi.listEvents();
      setEvents(data);
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
        message={`Are you sure you want to delete "${deleteTarget?.name}"?`}
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
        <button
          onClick={() => router.push('/general-events/new')}
          className="bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-800 transition-colors"
        >
          + {t('general_events.create')}
        </button>
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

              {/* Actions */}
              <div className="flex gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                <button
                  onClick={() => router.push(`/general-events/${ev.id}/edit`)}
                  className="text-xs text-emerald-700 hover:underline"
                >
                  Edit
                </button>
                <span className="text-stone-300">|</span>
                <button
                  onClick={() => setDeleteTarget(ev)}
                  className="text-xs text-red-600 hover:underline"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
