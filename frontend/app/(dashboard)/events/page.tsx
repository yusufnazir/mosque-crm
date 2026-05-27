'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { useSubscription } from '@/lib/subscription/SubscriptionContext';
import {
  distributionApi,
  DistributionEvent,
  DistributionEventCreate,
  ParcelDistribution,
  DistributionSummary,
  DistributionRegistration,
} from '@/lib/distributionApi';
import { eventFeatureApi } from '@/lib/eventFeatureApi';
import EventRegistrationTypesTab from '@/components/events/EventRegistrationTypesTab';
import EventRegistrationsTab from '@/components/events/EventRegistrationsTab';
import EventParcelConfigTab from '@/components/events/EventParcelConfigTab';
import { resolveEventStatusUpdateError } from '@/lib/api';
import ToastNotification from '@/components/ToastNotification';
import ConfirmDialog from '@/components/ConfirmDialog';
import GeneralEventsView from './GeneralEventsView';
import DistributionEventFormModal from '@/components/events/DistributionEventFormModal';
import EventResourcesTab from '@/components/events/EventResourcesTab';
import EventMemberGroupsTab from '@/components/events/EventMemberGroupsTab';
import EventSacrificeAnimalsTab from '@/components/events/EventSacrificeAnimalsTab';
import DistributionRegistrationSummaryCards from '@/components/events/DistributionRegistrationSummaryCards';
import ScrollableTabs from '@/components/ScrollableTabs';
import {
  TabSectionHeader,
  ResponsiveFilters,
  ResponsiveFilterInput,
  ResponsiveFilterSelect,
  MobileCardList,
  MobileCardItem,
  DesktopTableWrap,
} from '@/components/ResponsiveEventLayout';
import DistributionEventSummaryReports from '@/components/events/DistributionEventSummaryReports';
import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, ArcElement, Title, Tooltip, Legend);

type Tab = 'summary' | 'config' | 'registration_types' | 'registrations' | 'distribute' | 'log' | 'resources' | 'member_groups' | 'sacrifice_animals';

function recipientTypeLabel(type: string, t: (key: string) => string) {
  if (type === 'REGISTRATION') return t('distribution.parcel_recipient');
  if (type === 'MEMBER') return t('distribution.member');
  return t('distribution.non_member');
}

export default function DistributionPage() {
  const { t } = useTranslation();
  const { getLimit } = useSubscription();
  const eventsLimit = getLimit('events.max');

  function PlanUsageBar({ used, limit, label }: { used: number; limit: number; label: string }) {
    const pct = Math.min((used / limit) * 100, 100);
    const color = pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-400' : 'bg-emerald-600';
    return (
      <div className="mt-2">
        <div className="flex justify-between text-xs text-stone-500 mb-1">
          <span>{label}</span>
          <span>{used} / {limit}</span>
        </div>
        <div className="w-full bg-stone-200 rounded-full h-1.5">
          <div className={`${color} h-1.5 rounded-full transition-all`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    );
  }

  // Main tab (general events vs distribution)
  const [mainTab, setMainTab] = useState<'general' | 'distribution'>('general');

  // Events list state
  const [events, setEvents] = useState<DistributionEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<DistributionEvent | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('summary');

  // Summary
  const [summary, setSummary] = useState<DistributionSummary | null>(null);
  const [sacrificeAvailableMeatKg, setSacrificeAvailableMeatKg] = useState<number | null>(null);

  // Parcel registrations (recipients)
  const [parcelRegistrations, setParcelRegistrations] = useState<DistributionRegistration[]>([]);

  // Distributions
  const [distributions, setDistributions] = useState<ParcelDistribution[]>([]);
  const [logSearchQuery, setLogSearchQuery] = useState('');
  const [logTypeFilter, setLogTypeFilter] = useState('');
  // Queue-based distribution
  type QueueItem = {
    type: 'REGISTRATION';
    id: number;
    name: string;
    label: string;
    registrationTypeName?: string;
    plannedParcelCount?: number;
    distributedParcelCount?: number;
  };
  const [distQueue, setDistQueue] = useState<QueueItem[]>([]);
  const [distQueueIndex, setDistQueueIndex] = useState(0);
  const [skippedItems, setSkippedItems] = useState<QueueItem[]>([]);
  const [distGiveCount, setDistGiveCount] = useState(1);
  const [distributing, setDistributing] = useState(false);
  const [queueLoading, setQueueLoading] = useState(false);
  const [distSelectedTypeName, setDistSelectedTypeName] = useState<string | null>(null);
  const [distTypeOptions, setDistTypeOptions] = useState<
    { id: number; name: string; recipientCount: number; parcelsRemaining: number }[]
  >([]);
  const [distTypeOptionsLoading, setDistTypeOptionsLoading] = useState(false);

  // Event form
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<DistributionEvent | null>(null);
  const [eventForm, setEventForm] = useState<DistributionEventCreate>({ year: new Date().getFullYear(), name: '', eventType: 'EID_UL_ADHA_DISTRIBUTION' });
  const [savingEventForm, setSavingEventForm] = useState(false);

  // Confirm dialog
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<() => void>(() => {});
  const [confirmTitle, setConfirmTitle] = useState('');
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmVariant, setConfirmVariant] = useState<'default' | 'warning' | 'danger'>('default');

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Loading
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const data = await distributionApi.listEvents();
      setEvents(Array.isArray(data) ? data : []);
    } catch {
      setToast({ message: t('distribution.create_event_error'), type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const loadEventData = useCallback(async (event: DistributionEvent) => {
    try {
      const isDist = event.eventType === 'EID_UL_ADHA_DISTRIBUTION';
      const [summaryData, regs, dists, sacrificeSummary] = await Promise.all([
        distributionApi.getEventSummary(event.id),
        distributionApi.listRegistrations(event.id),
        distributionApi.listDistributions(event.id),
        isDist
          ? eventFeatureApi.getSacrificeSummary('DISTRIBUTION', event.id).catch(() => null)
          : Promise.resolve(null),
      ]);
      setSummary(summaryData);
      setParcelRegistrations(Array.isArray(regs) ? regs : []);
      setDistributions(Array.isArray(dists) ? dists : []);
      setSacrificeAvailableMeatKg(sacrificeSummary?.availableMeatKg ?? 0);
    } catch {
      setToast({ message: 'Failed to load event data', type: 'error' });
    }
  }, []);

  const selectEvent = (event: DistributionEvent) => {
    setSelectedEvent(event);
    setActiveTab('summary');
    loadEventData(event);
  };

  const closeEventForm = () => {
    setShowEventForm(false);
    setEditingEvent(null);
    setEventForm({ year: new Date().getFullYear(), name: '', eventType: 'EID_UL_ADHA_DISTRIBUTION' });
  };

  const openDistributionEventForm = (event?: DistributionEvent) => {
    if (event) {
      setEditingEvent(event);
      setEventForm({
        year: event.year,
        name: event.name,
        eventDate: event.eventDate ?? undefined,
        location: event.location ?? undefined,
        eventType: event.eventType,
        memberCapacity: event.memberCapacity,
        nonMemberCapacity: event.nonMemberCapacity,
        parcelKgPerUnit: event.parcelKgPerUnit ?? 1,
      });
    } else {
      setEditingEvent(null);
      setEventForm({ year: new Date().getFullYear(), name: '', eventType: 'EID_UL_ADHA_DISTRIBUTION', parcelKgPerUnit: 1 });
    }
    setShowEventForm(true);
  };

  // Event CRUD
  const handleSaveEvent = async () => {
    setSavingEventForm(true);
    try {
      if (editingEvent) {
        const updated = await distributionApi.updateEvent(editingEvent.id, eventForm);
        setToast({ message: t('distribution.update_event_success'), type: 'success' });
        closeEventForm();
        loadEvents();
        if (selectedEvent?.id === updated.id) {
          setSelectedEvent(updated);
        }
      } else {
        const created = await distributionApi.createEvent(eventForm);
        setToast({ message: t('distribution.create_event_success'), type: 'success' });
        closeEventForm();
        loadEvents();
        selectEvent(created);
      }
    } catch {
      setToast({
        message: editingEvent ? t('distribution.update_event_error') : t('distribution.create_event_error'),
        type: 'error',
      });
    } finally {
      setSavingEventForm(false);
    }
  };

  const handleDeleteEvent = (event: DistributionEvent) => {
    setConfirmTitle(t('distribution.confirm_delete_title'));
    setConfirmMessage(t('distribution.confirm_delete_message'));
    setConfirmVariant('danger');
    setConfirmAction(() => async () => {
      try {
        await distributionApi.deleteEvent(event.id);
        setToast({ message: t('distribution.delete_event_success'), type: 'success' });
        if (selectedEvent?.id === event.id) {
          setSelectedEvent(null);
        }
        loadEvents();
      } catch {
        setToast({ message: t('distribution.delete_event_error'), type: 'error' });
      }
    });
    setConfirmOpen(true);
  };

  const handleStatusChange = (status: string) => {
    if (!selectedEvent) return;
    const isActivate = status === 'ACTIVE';
    setConfirmTitle(t(isActivate ? 'distribution.confirm_activate_title' : 'distribution.confirm_close_title'));
    setConfirmMessage(t(isActivate ? 'distribution.confirm_activate_message' : 'distribution.confirm_close_message'));
    setConfirmVariant(isActivate ? 'default' : 'warning');
    setConfirmAction(() => async () => {
      try {
        const updated = await distributionApi.updateEventStatus(selectedEvent.id, status);
        setToast({ message: t('distribution.status_update_success'), type: 'success' });
        setSelectedEvent(updated);
        loadEvents();
      } catch (err) {
        const { message, goToResourcesTab } = resolveEventStatusUpdateError(err, {
          fallback: t('distribution.status_update_error'),
          closeBlockedMessage: count => t('event_features.close_blocked', { count }),
        });
        setToast({ message, type: 'error' });
        if (goToResourcesTab) setActiveTab('resources');
      }
    });
    setConfirmOpen(true);
  };

  const recipientRemainingParcels = (item?: QueueItem) => {
    if (!item || item.plannedParcelCount == null) return 999;
    return Math.max(0, item.plannedParcelCount - (item.distributedParcelCount ?? 0));
  };

  const loadDistTypeOptions = useCallback(async () => {
    if (!selectedEvent) return;
    setDistTypeOptionsLoading(true);
    try {
      const [types, queue] = await Promise.all([
        distributionApi.listRegistrationTypes(selectedEvent.id),
        distributionApi.listQueueRegistrations(selectedEvent.id),
      ]);
      const queueTypes = (Array.isArray(types) ? types : []).filter(ty => ty.fulfillmentMode === 'QUEUE');
      const queueRegs = Array.isArray(queue) ? queue : [];
      setDistTypeOptions(
        queueTypes.map(ty => {
          const regs = queueRegs.filter(r => r.registrationTypeId === ty.id);
          const parcelsRemaining = regs.reduce(
            (sum, r) => sum + Math.max(0, (r.plannedParcelCount ?? 0) - (r.distributedParcelCount ?? 0)),
            0,
          );
          return {
            id: ty.id,
            name: ty.name,
            recipientCount: regs.length,
            parcelsRemaining,
          };
        }),
      );
    } catch {
      setDistTypeOptions([]);
    } finally {
      setDistTypeOptionsLoading(false);
    }
  }, [selectedEvent]);

  useEffect(() => {
    if (activeTab === 'distribute' && selectedEvent && distQueue.length === 0) {
      loadDistTypeOptions();
    }
  }, [activeTab, selectedEvent?.id, distQueue.length, loadDistTypeOptions]);

  const resetDistQueue = () => {
    setDistQueue([]);
    setDistQueueIndex(0);
    setSkippedItems([]);
    setDistGiveCount(1);
    setDistSelectedTypeName(null);
  };

  // Queue-based distribution helpers
  const buildDistQueue = async (registrationTypeId: number, typeName: string) => {
    if (!selectedEvent) return;
    setQueueLoading(true);
    try {
      const queue = await distributionApi.listQueueRegistrations(selectedEvent.id);
      const filtered = (Array.isArray(queue) ? queue : []).filter(r => r.registrationTypeId === registrationTypeId);
      const items: QueueItem[] = filtered.map(r => ({
        type: 'REGISTRATION' as const,
        id: r.id,
        name: r.displayName,
        label: r.distributionNumber ? `${r.distributionNumber} — ${r.displayName}` : r.displayName,
        registrationTypeName: r.registrationTypeName ?? typeName,
        plannedParcelCount: r.plannedParcelCount,
        distributedParcelCount: r.distributedParcelCount,
      }));
      setDistSelectedTypeName(typeName);
      setDistQueue(items);
      setDistQueueIndex(0);
      setSkippedItems([]);
      setDistGiveCount(Math.max(1, recipientRemainingParcels(items[0])));
      if (items.length === 0) {
        setToast({ message: t('distribution.queue_empty_for_type', { type: typeName }), type: 'error' });
        setDistSelectedTypeName(null);
      }
    } catch {
      setToast({ message: t('distribution.queue_load_error'), type: 'error' });
    } finally {
      setQueueLoading(false);
    }
  };

  const currentQueueItem = distQueue[distQueueIndex] || null;
  const isGroupDone = distQueue.length > 0 && distQueueIndex >= distQueue.length;

  const handleQueueDistribute = async () => {
    if (!selectedEvent || !currentQueueItem) return;
    if (distGiveCount <= 0) {
      setToast({ message: t('distribution.select_at_least_one'), type: 'error' });
      return;
    }
    setDistributing(true);
    try {
      await distributionApi.distribute({
        distributionEventId: selectedEvent.id,
        recipientType: currentQueueItem.type,
        recipientId: currentQueueItem.id,
        parcelCount: distGiveCount,
      });
      setToast({ message: t('distribution.distribute_success'), type: 'success' });
      const nextIndex = distQueueIndex < distQueue.length - 1 ? distQueueIndex + 1 : distQueue.length;
      const nextItem = nextIndex < distQueue.length ? distQueue[nextIndex] : undefined;
      setDistGiveCount(Math.max(1, recipientRemainingParcels(nextItem)));
      if (distQueueIndex < distQueue.length - 1) {
        setDistQueueIndex(prev => prev + 1);
      } else {
        setDistQueueIndex(distQueue.length);
      }
      loadEventData(selectedEvent);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('distribution.distribute_error');
      setToast({ message: msg, type: 'error' });
    } finally {
      setDistributing(false);
    }
  };

  const handleQueueSkip = () => {
    if (!currentQueueItem) return;
    setSkippedItems(prev => [...prev, currentQueueItem]);
    setDistGiveCount(Math.max(1, recipientRemainingParcels(distQueue[distQueueIndex + 1])));
    if (distQueueIndex < distQueue.length - 1) {
      setDistQueueIndex(prev => prev + 1);
    } else {
      setDistQueueIndex(distQueue.length);
    }
  };

  const handleReturnToSkipped = (item: QueueItem) => {
    setSkippedItems(prev => prev.filter(s => !(s.type === item.type && s.id === item.id)));
    setDistQueue(prev => [...prev, item]);
    setDistGiveCount(Math.max(1, recipientRemainingParcels(item)));
  };

  const handleCancelSkipped = (item: QueueItem) => {
    setSkippedItems(prev => prev.filter(s => !(s.type === item.type && s.id === item.id)));
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      PLANNED: 'bg-yellow-100 text-yellow-800',
      ACTIVE: 'bg-green-100 text-green-800',
      CLOSED: 'bg-gray-100 text-gray-800',
      REGISTERED: 'bg-blue-100 text-blue-800',
      COLLECTED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800',
    };
    const label: Record<string, string> = {
      PLANNED: t('distribution.status_planned'),
      ACTIVE: t('distribution.status_active'),
      CLOSED: t('distribution.status_closed'),
      REGISTERED: t('distribution.registered'),
      COLLECTED: t('distribution.collected'),
      CANCELLED: t('distribution.cancelled'),
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
        {label[status] || status}
      </span>
    );
  };

  const eventModals = (
    <>
      <DistributionEventFormModal
        open={showEventForm}
        onClose={closeEventForm}
        form={eventForm}
        onChange={setEventForm}
        onSubmit={handleSaveEvent}
        saving={savingEventForm}
        isEdit={!!editingEvent}
      />
      <ConfirmDialog
        open={confirmOpen}
        title={confirmTitle}
        message={confirmMessage}
        confirmLabel={t('common.confirm')}
        cancelLabel={t('common.cancel')}
        variant={confirmVariant}
        onConfirm={() => { confirmAction(); setConfirmOpen(false); }}
        onCancel={() => setConfirmOpen(false)}
      />
      {toast && <ToastNotification message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </>
  );

  // ===== EVENTS LIST VIEW =====
  if (!selectedEvent) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-stone-900">{t('sidebar.events')}</h1>
        </div>

        <GeneralEventsView
          onSelectDistribution={ev => { selectEvent(ev); loadEventData(ev); }}
          onEditDistribution={openDistributionEventForm}
          onDeleteDistribution={handleDeleteEvent}
        />

        {eventModals}
      </div>
    );
  }

  // ===== EVENT DETAIL VIEW =====
  const isDistribution = selectedEvent.eventType === 'EID_UL_ADHA_DISTRIBUTION';

  const tabs: { key: Tab; label: string }[] = [
    { key: 'summary', label: t('distribution.summary') },
    ...(isDistribution ? [
      { key: 'config' as Tab, label: t('distribution.config') },
      { key: 'sacrifice_animals' as Tab, label: t('sacrifice_animals.tab') },
    ] : []),
    { key: 'resources', label: t('general_events.tabs.resources') },
    { key: 'member_groups', label: t('general_events.tabs.member_groups') },
    ...(isDistribution ? [
      { key: 'registration_types' as Tab, label: t('distribution.registration_types_tab') },
      { key: 'registrations' as Tab, label: t('distribution.registrations_tab') },
      { key: 'distribute' as Tab, label: t('distribution.distribute') },
      { key: 'log' as Tab, label: t('distribution.distributions') },
    ] : []),
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full min-w-0 max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4 mb-4 sm:mb-6">
        <button
          onClick={() => { setSelectedEvent(null); loadEvents(); }}
          className="self-start text-stone-500 hover:text-stone-700 p-1 -ml-1"
          aria-label={t('common.back')}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-stone-900 break-words">{selectedEvent.name}</h1>
          <p className="text-stone-500 text-sm mt-0.5">{selectedEvent.year} {selectedEvent.location && `· ${selectedEvent.location}`}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
          {statusBadge(selectedEvent.status)}
          <button
            type="button"
            onClick={() => openDistributionEventForm(selectedEvent)}
            className="px-3 py-1.5 border border-stone-300 text-stone-700 rounded-lg text-sm hover:bg-stone-50 whitespace-nowrap"
          >
            {t('distribution.edit_event')}
          </button>
          <button
            type="button"
            onClick={() => handleDeleteEvent(selectedEvent)}
            className="px-3 py-1.5 border border-red-200 text-red-700 rounded-lg text-sm hover:bg-red-50 whitespace-nowrap"
          >
            {t('distribution.delete_event')}
          </button>
          {selectedEvent.status === 'PLANNED' && (
            <button onClick={() => handleStatusChange('ACTIVE')} className="px-3 py-1.5 bg-emerald-700 text-white rounded-lg text-sm hover:bg-emerald-800 whitespace-nowrap">
              {t('distribution.activate_event')}
            </button>
          )}
          {selectedEvent.status === 'ACTIVE' && (
            <button onClick={() => handleStatusChange('CLOSED')} className="px-3 py-1.5 bg-stone-600 text-white rounded-lg text-sm hover:bg-stone-700 whitespace-nowrap">
              {t('distribution.close_event')}
            </button>
          )}
        </div>
      </div>

      <ScrollableTabs
        tabs={tabs.map(tab => ({ id: tab.key, label: tab.label }))}
        activeId={activeTab}
        onChange={id => setActiveTab(id as Tab)}
      />

      {/* Tab Content */}
      {activeTab === 'summary' && summary && (
        <div className="space-y-6">
          {/* Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-stone-500">{t('distribution.total_parcels')}</p>
              <p className="text-3xl font-bold text-stone-900">{summary.totalParcels}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-stone-500">{t('distribution.distributed_parcels')}</p>
              <p className="text-3xl font-bold text-emerald-700">{summary.distributedParcels}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-stone-500">{t('distribution.remaining_parcels')}</p>
              <p className="text-3xl font-bold text-amber-600">{summary.remainingParcels}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-stone-500">{t('distribution.registrations_tab')}</p>
              <p className="text-3xl font-bold text-stone-900">
                {summary.collectedRegistrations ?? 0} / {summary.totalRegistrations ?? 0}
              </p>
              <p className="text-xs text-stone-400 mt-1">
                {summary.totalMembers} {t('distribution.member')} · {summary.totalNonMembers} {t('distribution.worker_external')}
              </p>
            </div>
          </div>

          {/* Charts Row: Progress Donut + Recipient Split Donut */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Overall Progress Donut */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-semibold text-stone-700 mb-4">{t('distribution.chart_overall_progress')}</h3>
              <div className="flex items-center justify-center" style={{ height: 240 }}>
                {summary.totalParcels > 0 ? (
                  <Doughnut
                    data={{
                      labels: [t('distribution.distributed_parcels'), t('distribution.remaining_parcels')],
                      datasets: [{
                        data: [summary.distributedParcels, summary.remainingParcels],
                        backgroundColor: ['#047857', '#D97706'],
                        borderWidth: 0,
                      }]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      cutout: '65%',
                      plugins: {
                        legend: { position: 'bottom', labels: { padding: 12, usePointStyle: true, pointStyleWidth: 10, boxWidth: 8, font: { size: 11 } } },
                        tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${ctx.parsed} (${summary.totalParcels > 0 ? Math.round(ctx.parsed / summary.totalParcels * 100) : 0}%)` } }
                      }
                    }}
                  />
                ) : (
                  <p className="text-stone-400 text-sm">{t('distribution.no_data_yet')}</p>
                )}
              </div>
            </div>

            {/* Recipient Collection Donut */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-semibold text-stone-700 mb-4">{t('distribution.chart_recipient_status')}</h3>
              <div className="flex items-center justify-center" style={{ height: 240 }}>
                {(summary.totalMembers + summary.totalNonMembers) > 0 ? (
                  <Doughnut
                    data={{
                      labels: [
                        t('distribution.chart_members_collected'),
                        t('distribution.chart_members_pending'),
                        t('distribution.chart_non_members_collected'),
                        t('distribution.chart_non_members_pending'),
                      ],
                      datasets: [{
                        data: [
                          summary.collectedMembers,
                          summary.totalMembers - summary.collectedMembers,
                          summary.collectedNonMembers,
                          summary.totalNonMembers - summary.collectedNonMembers,
                        ],
                        backgroundColor: ['#047857', '#6EE7B7', '#D4AF37', '#FDE68A'],
                        borderWidth: 0,
                      }]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      cutout: '65%',
                      plugins: {
                        legend: { position: 'bottom', labels: { padding: 12, usePointStyle: true, pointStyleWidth: 10, boxWidth: 8, font: { size: 11 } } },
                      }
                    }}
                  />
                ) : (
                  <p className="text-stone-400 text-sm">{t('distribution.no_data_yet')}</p>
                )}
              </div>
            </div>
          </div>

          {/* Downloadable Reports */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-semibold text-stone-700 mb-1">{t('distribution.reports_download')}</h3>
            <p className="text-xs text-stone-400 mb-4">{t('distribution.reports_download_desc')}</p>
            <DistributionEventSummaryReports
              event={selectedEvent}
              distributions={distributions}
              registrations={parcelRegistrations}
            />
          </div>
        </div>
      )}

      {activeTab === 'config' && selectedEvent && isDistribution && (
        <EventParcelConfigTab
          event={selectedEvent}
          eventClosed={selectedEvent.status === 'CLOSED'}
          onSaved={updated => {
            setSelectedEvent(updated);
            loadEventData(updated);
          }}
        />
      )}

      {activeTab === 'registration_types' && selectedEvent && (
        <EventRegistrationTypesTab
          eventId={selectedEvent.id}
          eventClosed={selectedEvent.status === 'CLOSED'}
          onChanged={() => loadEventData(selectedEvent)}
        />
      )}

      {activeTab === 'registrations' && selectedEvent && (
        <EventRegistrationsTab
          eventId={selectedEvent.id}
          eventClosed={selectedEvent.status === 'CLOSED'}
          parcelKgPerUnit={selectedEvent.parcelKgPerUnit ?? 1}
          parcelWeightUnit={selectedEvent.parcelWeightUnit}
          onChanged={() => loadEventData(selectedEvent)}
        />
      )}

      {activeTab === 'distribute' && (
        <div className="space-y-5">
          {summary && (
            <DistributionRegistrationSummaryCards
              stats={{
                totalParcels: summary.totalParcels,
                distributedParcels: summary.distributedParcels,
                remainingParcels: summary.remainingParcels,
                totalRegistrations: summary.totalRegistrations,
                collectedRegistrations: summary.collectedRegistrations,
              }}
              parcelKgPerUnit={selectedEvent.parcelKgPerUnit ?? 1}
              parcelWeightUnit={selectedEvent.parcelWeightUnit}
              availableMeatKg={sacrificeAvailableMeatKg}
            />
          )}
          <div>
          <TabSectionHeader
            title={t('distribution.distribute_parcels')}
            subtitle={
              distQueue.length > 0 ? (
                <span>
                  {distSelectedTypeName && (
                    <span className="font-medium text-stone-700">{distSelectedTypeName}</span>
                  )}
                  {distSelectedTypeName && ' · '}
                  {distQueueIndex < distQueue.length
                    ? `${distQueueIndex + 1} / ${distQueue.length}`
                    : t('distribution.queue_complete')}
                  {skippedItems.length > 0 && ` · ${skippedItems.length} ${t('distribution.skipped')}`}
                </span>
              ) : undefined
            }
            action={
              distQueue.length > 0 ? (
                <button
                  onClick={resetDistQueue}
                  className="w-full sm:w-auto px-3 py-2 text-stone-600 hover:text-stone-800 text-sm border border-stone-300 rounded-lg"
                >
                  {t('distribution.change_registration_type')}
                </button>
              ) : undefined
            }
          />

          {selectedEvent.status !== 'ACTIVE' && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-amber-700">{t('distribution.activate_to_distribute')}</p>
            </div>
          )}

          {distQueue.length === 0 && selectedEvent.status === 'ACTIVE' && (
            <div className="bg-white rounded-lg shadow p-6 sm:p-8 max-w-2xl mx-auto">
              <p className="text-stone-900 font-semibold text-lg text-center">{t('distribution.distribute_choose_type_title')}</p>
              <p className="text-sm text-stone-500 text-center mt-1 mb-6">{t('distribution.distribute_choose_type_desc')}</p>
              {distTypeOptionsLoading ? (
                <p className="text-center text-stone-500 py-8">{t('common.loading')}</p>
              ) : distTypeOptions.length === 0 ? (
                <p className="text-center text-amber-700 text-sm py-4">{t('distribution.distribute_no_queue_types')}</p>
              ) : (
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {distTypeOptions.map(opt => (
                    <li key={opt.id}>
                      <button
                        type="button"
                        disabled={queueLoading || opt.recipientCount === 0}
                        onClick={() => buildDistQueue(opt.id, opt.name)}
                        className="w-full text-left rounded-xl border-2 border-stone-200 hover:border-emerald-500 hover:bg-emerald-50/50 disabled:opacity-50 disabled:hover:border-stone-200 disabled:hover:bg-white p-4 transition-colors"
                      >
                        <p className="font-semibold text-stone-900">{opt.name}</p>
                        <p className="text-sm text-stone-600 mt-2">
                          {t('distribution.distribute_type_recipients', { count: opt.recipientCount })}
                        </p>
                        <p className="text-sm text-stone-500">
                          {t('distribution.distribute_type_parcels_remaining', { count: opt.parcelsRemaining })}
                        </p>
                        {opt.recipientCount === 0 && (
                          <p className="text-xs text-amber-700 mt-2">{t('distribution.distribute_type_none_waiting')}</p>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {distQueue.length > 0 && distQueueIndex < distQueue.length && currentQueueItem && (
            <div className="max-w-2xl">
              <div className="bg-white rounded-lg shadow-lg border-2 border-emerald-200 p-6 mb-4">
                <div className="flex items-center justify-between mb-4">
                  <span className="px-2 py-1 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
                    {currentQueueItem.registrationTypeName || t('distribution.parcel_recipient')}
                  </span>
                  <span className="text-sm text-stone-400">{distQueueIndex + 1} / {distQueue.length}</span>
                </div>
                <h3 className="text-2xl font-bold text-stone-900">{currentQueueItem.label}</h3>
                {(currentQueueItem.plannedParcelCount != null) && (
                  <p className="text-sm text-stone-500 mt-1 mb-6">
                    {t('distribution.parcels_progress', {
                      distributed: currentQueueItem.distributedParcelCount ?? 0,
                      planned: currentQueueItem.plannedParcelCount,
                    })}
                  </p>
                )}
                {currentQueueItem.plannedParcelCount == null && <div className="mb-6" />}

                <div className="space-y-4">
                  <p className="text-base font-semibold text-stone-700">{t('distribution.parcels_to_give')}</p>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-4 border-b border-stone-100">
                    <p className="text-sm text-stone-500">
                      {t('distribution.remaining_for_recipient', {
                        count: recipientRemainingParcels(currentQueueItem),
                      })}
                    </p>
                    <div className="flex items-center">
                      <button
                        type="button"
                        onClick={() => setDistGiveCount(prev => Math.max(0, prev - 1))}
                        disabled={distGiveCount <= 0}
                        className="w-14 h-14 flex items-center justify-center bg-stone-100 hover:bg-stone-200 active:bg-stone-300 disabled:opacity-30 rounded-l-xl border border-stone-300 text-2xl font-bold text-stone-700"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min={0}
                        max={recipientRemainingParcels(currentQueueItem)}
                        value={distGiveCount}
                        onChange={e => {
                          const max = recipientRemainingParcels(currentQueueItem);
                          const val = Math.min(Math.max(0, parseInt(e.target.value, 10) || 0), max);
                          setDistGiveCount(val);
                        }}
                        className="w-20 h-14 border-y border-stone-300 text-center text-2xl font-bold focus:ring-2 focus:ring-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => setDistGiveCount(prev => Math.min(recipientRemainingParcels(currentQueueItem), prev + 1))}
                        disabled={distGiveCount >= recipientRemainingParcels(currentQueueItem)}
                        className="w-14 h-14 flex items-center justify-center bg-stone-100 hover:bg-stone-200 active:bg-stone-300 disabled:opacity-30 rounded-r-xl border border-stone-300 text-2xl font-bold text-stone-700"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-8">
                  <button
                    onClick={handleQueueSkip}
                    className="flex-1 px-4 py-4 border-2 border-stone-300 text-stone-700 rounded-xl hover:bg-stone-50 text-base font-semibold"
                  >
                    {t('distribution.skip')}
                  </button>
                  <button
                    onClick={handleQueueDistribute}
                    disabled={distributing || distGiveCount <= 0}
                    className="flex-[2] px-4 py-4 bg-emerald-700 text-white rounded-xl hover:bg-emerald-800 disabled:opacity-50 text-lg font-bold"
                  >
                    {distributing ? t('common.saving') : `${t('distribution.give_parcels')} (${distGiveCount})`}
                  </button>
                </div>
              </div>
            </div>
          )}

          {isGroupDone && (
            <div className="max-w-2xl">
              {skippedItems.length > 0 ? (
                <div>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                    <p className="text-base font-semibold text-amber-800">
                      {t('distribution.skipped_remaining', { count: skippedItems.length })}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg shadow overflow-hidden mb-4">
                    {skippedItems.map((item, i) => (
                      <div key={`${item.type}-${item.id}-${i}`} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-4 border-b border-stone-100 last:border-0">
                        <span className="text-base font-medium text-stone-900">{item.label}</span>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <button onClick={() => handleCancelSkipped(item)} className="px-4 py-2 border border-stone-300 rounded-lg text-sm">
                            {t('distribution.person_left')}
                          </button>
                          <button onClick={() => handleReturnToSkipped(item)} className="px-4 py-2 bg-emerald-700 text-white rounded-lg text-sm">
                            {t('distribution.distribute_now')}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-8 text-center mb-4">
                  <p className="text-lg font-semibold text-emerald-800">{t('distribution.all_done')}</p>
                  <p className="text-sm text-emerald-600 mt-1">{t('distribution.all_done_desc')}</p>
                </div>
              )}
            </div>
          )}
          </div>
        </div>
      )}

      {activeTab === 'log' && (
        <div>
          <TabSectionHeader title={t('distribution.distributions')} />

          {distributions.length > 0 && (
            <ResponsiveFilters>
              <ResponsiveFilterInput
                type="text"
                placeholder={t('distribution.search_recipient')}
                value={logSearchQuery}
                onChange={e => setLogSearchQuery(e.target.value)}
              />
              <ResponsiveFilterSelect value={logTypeFilter} onChange={e => setLogTypeFilter(e.target.value)}>
                <option value="">{t('distribution.all_types')}</option>
                <option value="REGISTRATION">{t('distribution.parcel_recipient')}</option>
              </ResponsiveFilterSelect>
              {(logSearchQuery || logTypeFilter) && (
                <button
                  onClick={() => { setLogSearchQuery(''); setLogTypeFilter(''); }}
                  className="text-sm text-stone-500 hover:text-stone-700 text-left"
                >
                  {t('distribution.clear_filters')}
                </button>
              )}
            </ResponsiveFilters>
          )}

          {distributions.length === 0 ? (
            <p className="text-center py-8 text-stone-500">{t('distribution.no_distributions')}</p>
          ) : (() => {
            const filtered = distributions.filter(d => {
              if (logSearchQuery && !(d.recipientName || '').toLowerCase().includes(logSearchQuery.toLowerCase())) return false;
              if (logTypeFilter && d.recipientType !== logTypeFilter) return false;
              return true;
            });
            return filtered.length === 0 ? (
              <p className="text-center py-8 text-stone-500">{t('distribution.no_matching_distributions')}</p>
            ) : (
            <>
              <MobileCardList>
                {filtered.map(d => (
                  <MobileCardItem key={d.id}>
                    <p className="text-sm font-semibold text-stone-900">{d.recipientName || `#${d.recipientId}`}</p>
                    <p className="text-xs text-stone-500 mt-0.5">
                      {recipientTypeLabel(d.recipientType, t)} · {d.parcelCount} {t('distribution.parcel_count').toLowerCase()}
                    </p>
                    <p className="text-xs text-stone-400 mt-2">
                      {d.distributedAt ? new Date(d.distributedAt).toLocaleString() : '—'}
                    </p>
                  </MobileCardItem>
                ))}
              </MobileCardList>
              <DesktopTableWrap>
                <table className="min-w-full divide-y divide-stone-200">
                  <thead className="bg-stone-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase">{t('distribution.recipient')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase">{t('distribution.recipient_type')}</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-stone-500 uppercase">{t('distribution.parcel_count')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase">{t('distribution.distributed_by')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase">{t('distribution.event_date')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200">
                    {filtered.map(d => (
                      <tr key={d.id}>
                        <td className="px-6 py-4 text-sm font-medium text-stone-900">{d.recipientName || `#${d.recipientId}`}</td>
                        <td className="px-6 py-4 text-sm text-stone-500">{recipientTypeLabel(d.recipientType, t)}</td>
                        <td className="px-6 py-4 text-sm text-right text-stone-900">{d.parcelCount}</td>
                        <td className="px-6 py-4 text-sm text-stone-500">{d.distributedBy || '—'}</td>
                        <td className="px-6 py-4 text-sm text-stone-500">{d.distributedAt ? new Date(d.distributedAt).toLocaleString() : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </DesktopTableWrap>
            </>
            );
          })()}
        </div>
      )}

      {activeTab === 'resources' && selectedEvent && (
        <EventResourcesTab eventKind="DISTRIBUTION" eventId={selectedEvent.id} />
      )}

      {activeTab === 'member_groups' && selectedEvent && (
        <EventMemberGroupsTab eventKind="DISTRIBUTION" eventId={selectedEvent.id} />
      )}

      {activeTab === 'sacrifice_animals' && isDistribution && selectedEvent && (
        <EventSacrificeAnimalsTab eventKind="DISTRIBUTION" eventId={selectedEvent.id} />
      )}

      {eventModals}
    </div>
  );
}
