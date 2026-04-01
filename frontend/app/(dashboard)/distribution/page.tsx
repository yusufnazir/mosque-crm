'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { distributionApi, DistributionEvent, DistributionEventCreate, ParcelCategory, ParcelCategoryCreate, NonMemberRecipient, NonMemberRecipientCreate, MemberRegistration, ParcelDistribution, ParcelDistributionCreate, DistributionSummary } from '@/lib/distributionApi';
import { memberApi } from '@/lib/api';
import ToastNotification from '@/components/ToastNotification';
import ConfirmDialog from '@/components/ConfirmDialog';
import { Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

function downloadExcel(filename: string, sheetName: string, headers: string[], rows: string[][]) {
  import('xlsx').then(XLSX => {
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const colWidths = headers.map((h, i) => {
      const maxLen = Math.max(h.length, ...rows.map(r => (r[i] || '').length));
      return { wch: Math.min(maxLen + 2, 40) };
    });
    ws['!cols'] = colWidths;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31));
    XLSX.writeFile(wb, filename);
  });
}

function downloadPdf(filename: string, title: string, headers: string[], rows: string[][]) {
  Promise.all([import('jspdf'), import('jspdf-autotable')]).then(([jspdfMod]) => {
    const doc = new jspdfMod.jsPDF({ orientation: rows[0]?.length > 4 ? 'landscape' : 'portrait' });
    doc.setFontSize(14);
    doc.text(title, 14, 18);
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(new Date().toLocaleString(), 14, 24);
    (doc as any).autoTable({
      head: [headers],
      body: rows,
      startY: 30,
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [4, 120, 87], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [250, 250, 249] },
      margin: { top: 30 },
    });
    doc.save(filename);
  });
}

type Tab = 'summary' | 'categories' | 'config' | 'members' | 'non-members' | 'distribute' | 'log';

export default function DistributionPage() {
  const { t } = useTranslation();

  // Events list state
  const [events, setEvents] = useState<DistributionEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<DistributionEvent | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('summary');

  // Summary
  const [summary, setSummary] = useState<DistributionSummary | null>(null);

  // Categories
  const [categories, setCategories] = useState<ParcelCategory[]>([]);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ParcelCategory | null>(null);
  const [categoryForm, setCategoryForm] = useState<ParcelCategoryCreate>({ distributionEventId: 0, name: '', totalParcels: 0 });

  // Non-member allocation config
  const [allocationEdits, setAllocationEdits] = useState<Record<number, number>>({});
  const [savingAllocations, setSavingAllocations] = useState(false);

  // Non-members
  const [nonMembers, setNonMembers] = useState<NonMemberRecipient[]>([]);
  const [nonMemberForm, setNonMemberForm] = useState<NonMemberRecipientCreate>({ distributionEventId: 0, name: '' });
  const [showNonMemberForm, setShowNonMemberForm] = useState(false);

  // Member registrations
  const [memberRegistrations, setMemberRegistrations] = useState<MemberRegistration[]>([]);
  const [personSearchQuery, setPersonSearchQuery] = useState('');
  const [personSearchResults, setPersonSearchResults] = useState<{ id: number; firstName: string; lastName: string; email?: string }[]>([]);
  const [selectedPerson, setSelectedPerson] = useState<{ id: number; firstName: string; lastName: string; email?: string } | null>(null);
  const [showPersonSearch, setShowPersonSearch] = useState(false);

  // Distributions
  const [distributions, setDistributions] = useState<ParcelDistribution[]>([]);
  const [distForm, setDistForm] = useState<ParcelDistributionCreate>({ distributionEventId: 0, recipientType: 'MEMBER', recipientId: 0, parcelCategoryId: 0, parcelCount: 1 });
  const [distRecipientSearch, setDistRecipientSearch] = useState('');
  const [distSearchResults, setDistSearchResults] = useState<(MemberRegistration | NonMemberRecipient)[]>([]);
  const [logSearchQuery, setLogSearchQuery] = useState('');
  const [logTypeFilter, setLogTypeFilter] = useState('');
  const [logCategoryFilter, setLogCategoryFilter] = useState('');
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [memberStatusFilter, setMemberStatusFilter] = useState('');
  const [nonMemberSearchQuery, setNonMemberSearchQuery] = useState('');
  const [nonMemberStatusFilter, setNonMemberStatusFilter] = useState('');

  // Queue-based distribution
  type QueueItem = { type: 'MEMBER' | 'NON_MEMBER'; id: number; name: string; label: string };
  const [distQueue, setDistQueue] = useState<QueueItem[]>([]);
  const [distQueueIndex, setDistQueueIndex] = useState(0);
  const [distNextGroup, setDistNextGroup] = useState<QueueItem[]>([]);
  const [distGroupNumber, setDistGroupNumber] = useState(0);
  const [skippedItems, setSkippedItems] = useState<QueueItem[]>([]);
  const [showSkipped, setShowSkipped] = useState(false);
  const [distCategoryAmounts, setDistCategoryAmounts] = useState<Record<number, number>>({});
  const [distributing, setDistributing] = useState(false);
  const [queueStartWith, setQueueStartWith] = useState<'MEMBER' | 'NON_MEMBER'>('NON_MEMBER');

  // Event form
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<DistributionEvent | null>(null);
  const [eventForm, setEventForm] = useState<DistributionEventCreate>({ year: new Date().getFullYear(), name: '' });

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
      setEvents(data);
    } catch {
      setToast({ message: t('distribution.create_event_error'), type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const loadEventData = useCallback(async (event: DistributionEvent) => {
    try {
      const [summaryData, cats, members, nonMems, dists] = await Promise.all([
        distributionApi.getEventSummary(event.id),
        distributionApi.listCategories(event.id),
        distributionApi.listMemberRegistrations(event.id),
        distributionApi.listNonMembers(event.id),
        distributionApi.listDistributions(event.id),
      ]);
      setSummary(summaryData);
      setCategories(cats);
      setMemberRegistrations(members);
      setNonMembers(nonMems);
      setDistributions(dists);
    } catch {
      setToast({ message: 'Failed to load event data', type: 'error' });
    }
  }, []);

  const selectEvent = (event: DistributionEvent) => {
    setSelectedEvent(event);
    setActiveTab('summary');
    loadEventData(event);
  };

  // Event CRUD
  const handleCreateEvent = async () => {
    try {
      const created = await distributionApi.createEvent(eventForm);
      setToast({ message: t('distribution.create_event_success'), type: 'success' });
      setShowEventForm(false);
      setEventForm({ year: new Date().getFullYear(), name: '' });
      loadEvents();
      selectEvent(created);
    } catch {
      setToast({ message: t('distribution.create_event_error'), type: 'error' });
    }
  };

  const handleUpdateEvent = async () => {
    if (!editingEvent) return;
    try {
      const updated = await distributionApi.updateEvent(editingEvent.id, eventForm);
      setToast({ message: t('distribution.update_event_success'), type: 'success' });
      setShowEventForm(false);
      setEditingEvent(null);
      setEventForm({ year: new Date().getFullYear(), name: '' });
      loadEvents();
      setSelectedEvent(updated);
    } catch {
      setToast({ message: t('distribution.update_event_error'), type: 'error' });
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
      } catch {
        setToast({ message: t('distribution.status_update_error'), type: 'error' });
      }
    });
    setConfirmOpen(true);
  };

  // Category CRUD
  const handleSaveCategory = async () => {
    if (!selectedEvent) return;
    try {
      const payload = { ...categoryForm, distributionEventId: selectedEvent.id };
      if (editingCategory) {
        await distributionApi.updateCategory(editingCategory.id, payload);
        setToast({ message: t('distribution.update_category_success'), type: 'success' });
      } else {
        await distributionApi.createCategory(payload);
        setToast({ message: t('distribution.create_category_success'), type: 'success' });
      }
      setShowCategoryForm(false);
      setEditingCategory(null);
      setCategoryForm({ distributionEventId: 0, name: '', totalParcels: 0 });
      loadEventData(selectedEvent);
    } catch {
      setToast({ message: editingCategory ? t('distribution.update_category_error') : t('distribution.create_category_error'), type: 'error' });
    }
  };

  // Non-member registration
  const handleRegisterNonMember = async () => {
    if (!selectedEvent) return;
    try {
      await distributionApi.createNonMember({ ...nonMemberForm, distributionEventId: selectedEvent.id });
      setToast({ message: t('distribution.register_non_member_success'), type: 'success' });
      setShowNonMemberForm(false);
      setNonMemberForm({ distributionEventId: 0, name: '' });
      loadEventData(selectedEvent);
    } catch {
      setToast({ message: t('distribution.register_non_member_error'), type: 'error' });
    }
  };

  // Member registration
  const handleRegisterMember = async () => {
    if (!selectedEvent || !selectedPerson) return;
    try {
      await distributionApi.createMemberRegistration({ distributionEventId: selectedEvent.id, personId: selectedPerson.id });
      setToast({ message: t('distribution.register_member_success'), type: 'success' });
      setSelectedPerson(null);
      setPersonSearchQuery('');
      setPersonSearchResults([]);
      setShowPersonSearch(false);
      loadEventData(selectedEvent);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('distribution.register_member_error');
      setToast({ message: msg, type: 'error' });
    }
  };

  const searchPersons = async (q: string) => {
    setPersonSearchQuery(q);
    if (q.length < 2) { setPersonSearchResults([]); return; }
    try {
      const results = await memberApi.search(q);
      setPersonSearchResults(results);
    } catch {
      setPersonSearchResults([]);
    }
  };

  // Distribute
  const handleDistribute = async () => {
    if (!selectedEvent) return;
    try {
      await distributionApi.distribute({ ...distForm, distributionEventId: selectedEvent.id });
      setToast({ message: t('distribution.distribute_success'), type: 'success' });
      setDistForm({ distributionEventId: 0, recipientType: 'MEMBER', recipientId: 0, parcelCategoryId: 0, parcelCount: 1 });
      setDistRecipientSearch('');
      setDistSearchResults([]);
      loadEventData(selectedEvent);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('distribution.distribute_error');
      setToast({ message: msg, type: 'error' });
    }
  };

  // Queue-based distribution helpers
  const buildDistQueue = (startWith: 'MEMBER' | 'NON_MEMBER' = queueStartWith) => {
    const memberItems: QueueItem[] = memberRegistrations
      .filter(r => r.status === 'REGISTERED')
      .map(r => ({ type: 'MEMBER' as const, id: r.id, name: r.personName, label: r.personName }));
    const nonMemberItems: QueueItem[] = nonMembers
      .filter(r => r.status === 'REGISTERED')
      .map(r => ({ type: 'NON_MEMBER' as const, id: r.id, name: r.name, label: `${r.distributionNumber} — ${r.name}` }));
    const first = startWith === 'MEMBER' ? memberItems : nonMemberItems;
    const second = startWith === 'MEMBER' ? nonMemberItems : memberItems;
    setDistQueue(first);
    setDistNextGroup(second);
    setDistQueueIndex(0);
    setDistGroupNumber(0);
    setSkippedItems([]);
    setShowSkipped(false);
    setDistCategoryAmounts({});
  };

  const currentQueueItem = distQueue[distQueueIndex] || null;
  const isGroupDone = distQueue.length > 0 && distQueueIndex >= distQueue.length;
  const hasNextGroup = distNextGroup.length > 0;
  const nextGroupLabel = hasNextGroup && distNextGroup[0]?.type === 'MEMBER'
    ? t('distribution.members')
    : t('distribution.non_members');

  const handleContinueToNextGroup = () => {
    setDistQueue(distNextGroup);
    setDistNextGroup([]);
    setDistQueueIndex(0);
    setDistGroupNumber(1);
    setSkippedItems([]);
    setDistCategoryAmounts({});
  };

  const handleQueueDistribute = async () => {
    if (!selectedEvent || !currentQueueItem) return;
    setDistributing(true);
    try {
      const entries = Object.entries(distCategoryAmounts).filter(([, count]) => count > 0);
      if (entries.length === 0) {
        setToast({ message: t('distribution.select_at_least_one'), type: 'error' });
        setDistributing(false);
        return;
      }
      for (const [catId, count] of entries) {
        await distributionApi.distribute({
          distributionEventId: selectedEvent.id,
          recipientType: currentQueueItem.type,
          recipientId: currentQueueItem.id,
          parcelCategoryId: Number(catId),
          parcelCount: count,
        });
      }
      setToast({ message: t('distribution.distribute_success'), type: 'success' });
      setDistCategoryAmounts({});
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
    setDistCategoryAmounts({});
    if (distQueueIndex < distQueue.length - 1) {
      setDistQueueIndex(prev => prev + 1);
    } else {
      setDistQueueIndex(distQueue.length);
    }
  };

  const handleReturnToSkipped = (item: QueueItem) => {
    setSkippedItems(prev => prev.filter(s => !(s.type === item.type && s.id === item.id)));
    setDistQueue(prev => [...prev, item]);
    setDistCategoryAmounts({});
  };

  const handleCancelSkipped = (item: QueueItem) => {
    setSkippedItems(prev => prev.filter(s => !(s.type === item.type && s.id === item.id)));
  };

  const searchDistRecipient = async (q: string) => {
    setDistRecipientSearch(q);
    if (!selectedEvent || q.length < 1) { setDistSearchResults([]); return; }
    if (distForm.recipientType === 'MEMBER') {
      const results = memberRegistrations.filter(r =>
        r.status === 'REGISTERED' && r.personName.toLowerCase().includes(q.toLowerCase())
      );
      setDistSearchResults(results);
    } else {
      const results = nonMembers.filter(r =>
        r.status === 'REGISTERED' && (r.distributionNumber.toLowerCase().includes(q.toLowerCase()) || r.name.toLowerCase().includes(q.toLowerCase()))
      );
      setDistSearchResults(results);
    }
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

  // ===== EVENTS LIST VIEW =====
  if (!selectedEvent) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-stone-900">{t('distribution.title')}</h1>
            <p className="text-stone-500 mt-1">{t('distribution.subtitle')}</p>
          </div>
          <button
            onClick={() => { setShowEventForm(true); setEditingEvent(null); setEventForm({ year: new Date().getFullYear(), name: '', eventType: 'EID_UL_ADHA_DISTRIBUTION' }); }}
            className="px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 transition-colors"
          >
            {t('distribution.create_event')}
          </button>
        </div>

        {/* Event Form Modal */}
        {showEventForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-lg font-semibold mb-4">{editingEvent ? t('distribution.edit_event') : t('distribution.create_event')}</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">{t('distribution.event_name')}</label>
                  <input type="text" value={eventForm.name} onChange={e => setEventForm({ ...eventForm, name: e.target.value })} className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">{t('distribution.event_year')}</label>
                  <input type="number" value={eventForm.year} onChange={e => setEventForm({ ...eventForm, year: parseInt(e.target.value) })} className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">{t('distribution.event_date')}</label>
                  <input type="date" value={eventForm.eventDate || ''} onChange={e => setEventForm({ ...eventForm, eventDate: e.target.value || undefined })} className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">{t('distribution.event_location')}</label>
                  <input type="text" value={eventForm.location || ''} onChange={e => setEventForm({ ...eventForm, location: e.target.value || undefined })} className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">{t('distribution.event_type')}</label>
                  <select value={eventForm.eventType || 'EID_UL_ADHA_DISTRIBUTION'} onChange={e => setEventForm({ ...eventForm, eventType: e.target.value as 'EID_UL_ADHA_DISTRIBUTION' | 'GENERAL' })} className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
                    <option value="EID_UL_ADHA_DISTRIBUTION">{t('distribution.type_eid_ul_adha')}</option>
                    <option value="GENERAL">{t('distribution.type_general')}</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => { setShowEventForm(false); setEditingEvent(null); }} className="px-4 py-2 text-stone-600 hover:text-stone-800">{t('common.cancel')}</button>
                <button onClick={editingEvent ? handleUpdateEvent : handleCreateEvent} disabled={!eventForm.name || !eventForm.year} className="px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 disabled:opacity-50">{t('common.save')}</button>
              </div>
            </div>
          </div>
        )}

        {/* Events Table */}
        {loading ? (
          <div className="text-center py-12 text-stone-500">Loading...</div>
        ) : events.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-stone-500">{t('distribution.no_events')}</p>
            <p className="text-stone-400 text-sm mt-1">{t('distribution.no_events_description')}</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-stone-200">
              <thead className="bg-stone-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase">{t('distribution.event_name')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase">{t('distribution.event_type')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase">{t('distribution.event_year')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase">{t('distribution.event_date')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase">{t('distribution.event_status')}</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-stone-500 uppercase"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {events.map(event => (
                  <tr key={event.id} className="hover:bg-stone-50 cursor-pointer" onClick={() => selectEvent(event)}>
                    <td className="px-6 py-4 text-sm font-medium text-stone-900">{event.name}</td>
                    <td className="px-6 py-4 text-sm text-stone-600">{event.eventType === 'EID_UL_ADHA_DISTRIBUTION' ? t('distribution.type_eid_ul_adha') : t('distribution.type_general')}</td>
                    <td className="px-6 py-4 text-sm text-stone-600">{event.year}</td>
                    <td className="px-6 py-4 text-sm text-stone-600">{event.eventDate || '—'}</td>
                    <td className="px-6 py-4">{statusBadge(event.status)}</td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={e => { e.stopPropagation(); setEditingEvent(event); setEventForm({ year: event.year, name: event.name, eventDate: event.eventDate || undefined, location: event.location || undefined, eventType: event.eventType }); setShowEventForm(true); }}
                        className="text-emerald-700 hover:text-emerald-900 text-sm"
                      >
                        {t('distribution.edit_event')}
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); handleDeleteEvent(event); }}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        {t('distribution.delete_event')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {toast && <ToastNotification message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

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
      </div>
    );
  }

  // ===== EVENT DETAIL VIEW =====
  const isDistribution = selectedEvent.eventType === 'EID_UL_ADHA_DISTRIBUTION';

  const tabs: { key: Tab; label: string }[] = [
    { key: 'summary', label: t('distribution.summary') },
    ...(isDistribution ? [
      { key: 'categories' as Tab, label: t('distribution.categories') },
      { key: 'config' as Tab, label: t('distribution.config') },
      { key: 'members' as Tab, label: t('distribution.member_registration') },
      { key: 'non-members' as Tab, label: t('distribution.non_member_registration') },
      { key: 'distribute' as Tab, label: t('distribution.distribute') },
      { key: 'log' as Tab, label: t('distribution.distributions') },
    ] : []),
  ];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => { setSelectedEvent(null); loadEvents(); }}
          className="text-stone-500 hover:text-stone-700"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-stone-900">{selectedEvent.name}</h1>
          <p className="text-stone-500 text-sm">{selectedEvent.year} {selectedEvent.location && `· ${selectedEvent.location}`}</p>
        </div>
        {statusBadge(selectedEvent.status)}
        {selectedEvent.status === 'PLANNED' && (
          <button onClick={() => handleStatusChange('ACTIVE')} className="px-3 py-1.5 bg-emerald-700 text-white rounded-lg text-sm hover:bg-emerald-800">
            {t('distribution.activate_event')}
          </button>
        )}
        {selectedEvent.status === 'ACTIVE' && (
          <button onClick={() => handleStatusChange('CLOSED')} className="px-3 py-1.5 bg-stone-600 text-white rounded-lg text-sm hover:bg-stone-700">
            {t('distribution.close_event')}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-stone-200 mb-6">
        <nav className="flex -mb-px space-x-8">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`py-2 px-1 border-b-2 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'border-emerald-700 text-emerald-700'
                  : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

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
              <p className="text-sm text-stone-500">{t('distribution.total_members')} / {t('distribution.total_non_members')}</p>
              <p className="text-3xl font-bold text-stone-900">{summary.totalMembers} / {summary.totalNonMembers}{summary.totalParcels > 0 ? ` (${t('distribution.of')} ${summary.totalParcels})` : ''}</p>
              <p className="text-xs text-stone-400 mt-1">{t('distribution.collected')}: {summary.collectedMembers} / {summary.collectedNonMembers}</p>
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
                        legend: { position: 'bottom', labels: { padding: 16, usePointStyle: true, pointStyleWidth: 10 } },
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
                        legend: { position: 'bottom', labels: { padding: 16, usePointStyle: true, pointStyleWidth: 10 } },
                      }
                    }}
                  />
                ) : (
                  <p className="text-stone-400 text-sm">{t('distribution.no_data_yet')}</p>
                )}
              </div>
            </div>
          </div>

          {/* Category Breakdown Bar Chart */}
          {categories.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-semibold text-stone-700 mb-4">{t('distribution.chart_category_breakdown')}</h3>
              <div style={{ height: Math.max(200, categories.length * 50 + 80) }}>
                <Bar
                  data={{
                    labels: categories.map(c => c.name),
                    datasets: [
                      {
                        label: t('distribution.distributed_parcels'),
                        data: categories.map(c => c.distributedParcels),
                        backgroundColor: '#047857',
                        borderRadius: 4,
                      },
                      {
                        label: t('distribution.remaining_parcels'),
                        data: categories.map(c => c.remainingParcels),
                        backgroundColor: '#D97706',
                        borderRadius: 4,
                      },
                    ]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    indexAxis: 'y',
                    scales: {
                      x: { stacked: true, grid: { display: false }, ticks: { stepSize: 1 } },
                      y: { stacked: true, grid: { display: false } },
                    },
                    plugins: {
                      legend: { position: 'top', labels: { usePointStyle: true, pointStyleWidth: 10, padding: 16 } },
                      tooltip: {
                        callbacks: {
                          label: (ctx) => {
                            const cat = categories[ctx.dataIndex];
                            const total = cat.totalParcels;
                            return `${ctx.dataset.label}: ${ctx.parsed.x} / ${total}`;
                          }
                        }
                      }
                    }
                  }}
                />
              </div>
            </div>
          )}

          {/* Per-Category Non-Member Allocation */}
          {categories.some(c => c.nonMemberAllocation > 0) && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-semibold text-stone-700 mb-4">{t('distribution.chart_allocation_usage')}</h3>
              <div className="space-y-3">
                {categories.filter(c => c.nonMemberAllocation > 0).map(cat => {
                  const used = Math.min(cat.distributedParcels, cat.nonMemberAllocation);
                  const pct = cat.nonMemberAllocation > 0 ? Math.round(used / cat.nonMemberAllocation * 100) : 0;
                  return (
                    <div key={cat.id}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-stone-700">{cat.name}</span>
                        <span className="text-xs text-stone-500">{used} / {cat.nonMemberAllocation} ({pct}%)</span>
                      </div>
                      <div className="w-full bg-stone-200 rounded-full h-2.5">
                        <div
                          className={`h-2.5 rounded-full ${pct >= 100 ? 'bg-red-500' : pct >= 75 ? 'bg-amber-500' : 'bg-emerald-600'}`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Downloadable Reports */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-semibold text-stone-700 mb-1">{t('distribution.reports_download')}</h3>
            <p className="text-xs text-stone-400 mb-4">{t('distribution.reports_download_desc')}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Distribution Log */}
              {(() => {
                const headers = [t('distribution.recipient'), t('distribution.recipient_type'), t('distribution.parcel_category'), t('distribution.quantity'), t('distribution.distributed_at')];
                const rows = distributions.map(d => [d.recipientName, d.recipientType, d.parcelCategoryName, String(d.parcelCount), d.distributedAt ? new Date(d.distributedAt).toLocaleString() : '']);
                const eventName = selectedEvent?.name || 'event';
                const title = t('distribution.report_distribution_log');
                return (
                  <div className={`flex items-center gap-3 p-4 border border-stone-200 rounded-lg ${distributions.length === 0 ? 'opacity-40' : ''}`}>
                    <span className="flex-shrink-0 w-10 h-10 bg-emerald-100 text-emerald-700 rounded-lg flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-stone-800">{title}</p>
                      <p className="text-xs text-stone-400">{distributions.length} {t('distribution.records')}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => downloadExcel(`${eventName}-distribution-log.xlsx`, title, headers, rows)} disabled={distributions.length === 0} className="px-3 py-1.5 text-xs font-medium bg-emerald-700 text-white rounded-md hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed">Excel</button>
                      <button onClick={() => downloadPdf(`${eventName}-distribution-log.pdf`, `${selectedEvent?.name} — ${title}`, headers, rows)} disabled={distributions.length === 0} className="px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed">PDF</button>
                    </div>
                  </div>
                );
              })()}

              {/* Member Registration List */}
              {(() => {
                const headers = [t('distribution.recipient_name'), t('distribution.event_status'), t('distribution.registered')];
                const rows = memberRegistrations.map(r => [r.personName || '', r.status, r.registeredAt ? new Date(r.registeredAt).toLocaleString() : '']);
                const eventName = selectedEvent?.name || 'event';
                const title = t('distribution.report_member_list');
                return (
                  <div className={`flex items-center gap-3 p-4 border border-stone-200 rounded-lg ${memberRegistrations.length === 0 ? 'opacity-40' : ''}`}>
                    <span className="flex-shrink-0 w-10 h-10 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-stone-800">{title}</p>
                      <p className="text-xs text-stone-400">{memberRegistrations.length} {t('distribution.records')}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => downloadExcel(`${eventName}-member-registrations.xlsx`, title, headers, rows)} disabled={memberRegistrations.length === 0} className="px-3 py-1.5 text-xs font-medium bg-emerald-700 text-white rounded-md hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed">Excel</button>
                      <button onClick={() => downloadPdf(`${eventName}-member-registrations.pdf`, `${selectedEvent?.name} — ${title}`, headers, rows)} disabled={memberRegistrations.length === 0} className="px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed">PDF</button>
                    </div>
                  </div>
                );
              })()}

              {/* Non-Member Registration List */}
              {(() => {
                const headers = [t('distribution.distribution_number'), t('distribution.recipient_name'), t('distribution.id_number'), t('distribution.phone_number'), t('distribution.event_status')];
                const rows = nonMembers.map(nm => [nm.distributionNumber, nm.name, nm.idNumber || '', nm.phoneNumber || '', nm.status]);
                const eventName = selectedEvent?.name || 'event';
                const title = t('distribution.report_non_member_list');
                return (
                  <div className={`flex items-center gap-3 p-4 border border-stone-200 rounded-lg ${nonMembers.length === 0 ? 'opacity-40' : ''}`}>
                    <span className="flex-shrink-0 w-10 h-10 bg-amber-100 text-amber-700 rounded-lg flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-stone-800">{title}</p>
                      <p className="text-xs text-stone-400">{nonMembers.length} {t('distribution.records')}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => downloadExcel(`${eventName}-non-member-registrations.xlsx`, title, headers, rows)} disabled={nonMembers.length === 0} className="px-3 py-1.5 text-xs font-medium bg-emerald-700 text-white rounded-md hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed">Excel</button>
                      <button onClick={() => downloadPdf(`${eventName}-non-member-registrations.pdf`, `${selectedEvent?.name} — ${title}`, headers, rows)} disabled={nonMembers.length === 0} className="px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed">PDF</button>
                    </div>
                  </div>
                );
              })()}

              {/* Uncollected Recipients */}
              {(() => {
                const headers = [t('distribution.recipient_name'), t('distribution.recipient_type'), t('distribution.distribution_number'), t('distribution.phone_number'), t('distribution.event_status')];
                const uncollectedMembers = memberRegistrations.filter(r => r.status !== 'COLLECTED').map(r => [r.personName || '', t('distribution.member'), '', '', r.status]);
                const uncollectedNonMembers = nonMembers.filter(nm => nm.status !== 'COLLECTED').map(nm => [nm.name, t('distribution.non_member'), nm.distributionNumber, nm.phoneNumber || '', nm.status]);
                const rows = [...uncollectedMembers, ...uncollectedNonMembers];
                const eventName = selectedEvent?.name || 'event';
                const title = t('distribution.report_uncollected');
                return (
                  <div className={`flex items-center gap-3 p-4 border border-stone-200 rounded-lg ${rows.length === 0 ? 'opacity-40' : ''}`}>
                    <span className="flex-shrink-0 w-10 h-10 bg-red-100 text-red-700 rounded-lg flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-stone-800">{title}</p>
                      <p className="text-xs text-stone-400">{rows.length} {t('distribution.records')}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => downloadExcel(`${eventName}-uncollected.xlsx`, title, headers, rows)} disabled={rows.length === 0} className="px-3 py-1.5 text-xs font-medium bg-emerald-700 text-white rounded-md hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed">Excel</button>
                      <button onClick={() => downloadPdf(`${eventName}-uncollected.pdf`, `${selectedEvent?.name} — ${title}`, headers, rows)} disabled={rows.length === 0} className="px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed">PDF</button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'categories' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-stone-900">{t('distribution.categories')}</h2>
            <button
              onClick={() => { setShowCategoryForm(true); setEditingCategory(null); setCategoryForm({ distributionEventId: selectedEvent.id, name: '', totalParcels: 0 }); }}
              className="px-3 py-1.5 bg-emerald-700 text-white rounded-lg text-sm hover:bg-emerald-800"
            >
              {t('distribution.create_category')}
            </button>
          </div>

          {showCategoryForm && (
            <div className="bg-white rounded-lg shadow p-4 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">{t('distribution.category_name')}</label>
                  <input type="text" value={categoryForm.name} onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })} className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">{t('distribution.category_description')}</label>
                  <input type="text" value={categoryForm.description || ''} onChange={e => setCategoryForm({ ...categoryForm, description: e.target.value || undefined })} className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">{t('distribution.category_total')}</label>
                  <input type="number" value={categoryForm.totalParcels} onChange={e => setCategoryForm({ ...categoryForm, totalParcels: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button onClick={() => { setShowCategoryForm(false); setEditingCategory(null); }} className="px-3 py-1.5 text-stone-600 hover:text-stone-800 text-sm">{t('common.cancel')}</button>
                <button onClick={handleSaveCategory} disabled={!categoryForm.name || categoryForm.totalParcels <= 0} className="px-3 py-1.5 bg-emerald-700 text-white rounded-lg text-sm hover:bg-emerald-800 disabled:opacity-50">{t('common.save')}</button>
              </div>
            </div>
          )}

          {categories.length === 0 ? (
            <p className="text-center py-8 text-stone-500">{t('distribution.no_categories')}</p>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-stone-200">
                <thead className="bg-stone-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase">{t('distribution.category_name')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase">{t('distribution.category_description')}</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-stone-500 uppercase">{t('distribution.category_total')}</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-stone-500 uppercase">{t('distribution.category_distributed')}</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-stone-500 uppercase">{t('distribution.category_remaining')}</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-stone-500 uppercase"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {categories.map(cat => (
                    <tr key={cat.id}>
                      <td className="px-6 py-4 text-sm font-medium text-stone-900">{cat.name}</td>
                      <td className="px-6 py-4 text-sm text-stone-500">{cat.description || '—'}</td>
                      <td className="px-6 py-4 text-sm text-right text-stone-900">{cat.totalParcels}</td>
                      <td className="px-6 py-4 text-sm text-right text-emerald-700">{cat.distributedParcels}</td>
                      <td className="px-6 py-4 text-sm text-right text-amber-600">{cat.remainingParcels}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => { setEditingCategory(cat); setCategoryForm({ distributionEventId: selectedEvent.id, name: cat.name, description: cat.description || undefined, totalParcels: cat.totalParcels }); setShowCategoryForm(true); }}
                          className="text-emerald-700 hover:text-emerald-900 text-sm"
                        >{t('distribution.edit_category')}</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'config' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-lg font-semibold text-stone-900">{t('distribution.non_member_allocation')}</h2>
              <p className="text-sm text-stone-500 mt-1">{t('distribution.non_member_allocation_desc')}</p>
            </div>
          </div>

          {categories.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-stone-500">{t('distribution.config_no_categories')}</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-stone-200">
                <thead className="bg-stone-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase">{t('distribution.category_name')}</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-stone-500 uppercase">{t('distribution.category_total')}</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-stone-500 uppercase">{t('distribution.non_member_allocation')}</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-stone-500 uppercase">{t('distribution.remaining_for_members')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {categories.map(cat => {
                    const allocation = allocationEdits[cat.id] ?? cat.nonMemberAllocation;
                    const remaining = cat.totalParcels - allocation;
                    return (
                      <tr key={cat.id}>
                        <td className="px-6 py-4 text-sm font-medium text-stone-900">{cat.name}</td>
                        <td className="px-6 py-4 text-sm text-right text-stone-900">{cat.totalParcels}</td>
                        <td className="px-6 py-4 text-right">
                          <input
                            type="number"
                            min={0}
                            max={cat.totalParcels}
                            value={allocation}
                            onChange={e => {
                              const val = Math.min(Math.max(0, parseInt(e.target.value) || 0), cat.totalParcels);
                              setAllocationEdits(prev => ({ ...prev, [cat.id]: val }));
                            }}
                            className="w-24 px-3 py-1.5 border border-stone-300 rounded-lg text-right focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                          />
                        </td>
                        <td className={`px-6 py-4 text-sm text-right ${remaining < 0 ? 'text-red-600 font-medium' : 'text-stone-600'}`}>
                          {remaining}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-stone-50">
                  <tr>
                    <td className="px-6 py-3 text-sm font-semibold text-stone-900">{t('common.total')}</td>
                    <td className="px-6 py-3 text-sm text-right font-semibold text-stone-900">
                      {categories.reduce((sum, c) => sum + c.totalParcels, 0)}
                    </td>
                    <td className="px-6 py-3 text-sm text-right font-semibold text-emerald-700">
                      {categories.reduce((sum, c) => sum + (allocationEdits[c.id] ?? c.nonMemberAllocation), 0)}
                    </td>
                    <td className="px-6 py-3 text-sm text-right font-semibold text-stone-600">
                      {categories.reduce((sum, c) => sum + c.totalParcels - (allocationEdits[c.id] ?? c.nonMemberAllocation), 0)}
                    </td>
                  </tr>
                </tfoot>
              </table>

              <div className="px-6 py-4 border-t border-stone-200 flex justify-between items-center">
                <p className="text-sm text-stone-500">
                  {t('distribution.non_member_limit')}: <span className="font-semibold text-stone-900">{categories.reduce((sum, c) => sum + (allocationEdits[c.id] ?? c.nonMemberAllocation), 0)}</span>
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setAllocationEdits({})}
                    className="px-3 py-1.5 text-stone-600 hover:text-stone-800 text-sm"
                  >{t('common.cancel')}</button>
                  <button
                    onClick={async () => {
                      setSavingAllocations(true);
                      try {
                        const updates = Object.entries(allocationEdits).map(([catId, allocation]) => {
                          const cat = categories.find(c => c.id === Number(catId));
                          if (!cat) return null;
                          return distributionApi.updateCategory(cat.id, {
                            distributionEventId: selectedEvent!.id,
                            name: cat.name,
                            description: cat.description || undefined,
                            totalParcels: cat.totalParcels,
                            nonMemberAllocation: allocation,
                          });
                        }).filter(Boolean);
                        await Promise.all(updates);
                        setAllocationEdits({});
                        const [cats, sum] = await Promise.all([
                          distributionApi.listCategories(selectedEvent!.id),
                          distributionApi.getEventSummary(selectedEvent!.id),
                        ]);
                        setCategories(cats);
                        setSummary(sum);
                        setToast({ message: t('distribution.allocation_saved'), type: 'success' });
                      } catch {
                        setToast({ message: t('distribution.allocation_save_error'), type: 'error' });
                      } finally {
                        setSavingAllocations(false);
                      }
                    }}
                    disabled={Object.keys(allocationEdits).length === 0 || savingAllocations}
                    className="px-4 py-1.5 bg-emerald-700 text-white rounded-lg text-sm hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >{savingAllocations ? t('common.saving') : t('common.save')}</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'members' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-lg font-semibold text-stone-900">{t('distribution.member_registration')}</h2>
              <p className="text-sm text-stone-500 mt-1">{memberRegistrations.length} {t('distribution.registered')}</p>
            </div>
            <button
              onClick={() => setShowPersonSearch(true)}
              className="px-3 py-1.5 bg-emerald-700 text-white rounded-lg text-sm hover:bg-emerald-800"
            >
              {t('distribution.register_member')}
            </button>
          </div>

          {showPersonSearch && (
            <div className="bg-white rounded-lg shadow p-4 mb-4">
              <label className="block text-sm font-medium text-stone-700 mb-1">{t('distribution.select_person')}</label>
              <input
                type="text"
                value={personSearchQuery}
                onChange={e => searchPersons(e.target.value)}
                placeholder={t('distribution.search_member')}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
              {personSearchResults.length > 0 && (
                <ul className="mt-2 border border-stone-200 rounded-lg max-h-48 overflow-y-auto">
                  {personSearchResults.map(p => (
                    <li
                      key={p.id}
                      className={`px-3 py-2 hover:bg-emerald-50 cursor-pointer text-sm ${selectedPerson?.id === p.id ? 'bg-emerald-50 font-medium' : ''}`}
                      onClick={() => setSelectedPerson(p)}
                    >
                      {p.firstName} {p.lastName} {p.email ? `(${p.email})` : ''}
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex justify-end gap-3 mt-4">
                <button onClick={() => { setShowPersonSearch(false); setSelectedPerson(null); setPersonSearchQuery(''); setPersonSearchResults([]); }} className="px-3 py-1.5 text-stone-600 hover:text-stone-800 text-sm">{t('common.cancel')}</button>
                <button onClick={handleRegisterMember} disabled={!selectedPerson} className="px-3 py-1.5 bg-emerald-700 text-white rounded-lg text-sm hover:bg-emerald-800 disabled:opacity-50">{t('distribution.register_member')}</button>
              </div>
            </div>
          )}

          {memberRegistrations.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <input
                type="text"
                value={memberSearchQuery}
                onChange={e => setMemberSearchQuery(e.target.value)}
                placeholder={t('distribution.search_by_name')}
                className="px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 w-64"
              />
              <select
                value={memberStatusFilter}
                onChange={e => setMemberStatusFilter(e.target.value)}
                className="px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="">{t('distribution.all_statuses')}</option>
                <option value="REGISTERED">{t('distribution.status_registered')}</option>
                <option value="COLLECTED">{t('distribution.status_collected')}</option>
              </select>
              {(memberSearchQuery || memberStatusFilter) && (
                <button
                  onClick={() => { setMemberSearchQuery(''); setMemberStatusFilter(''); }}
                  className="text-sm text-emerald-700 hover:text-emerald-800 underline"
                >{t('distribution.clear_filters')}</button>
              )}
            </div>
          )}

          {(() => {
            const filtered = memberRegistrations.filter(reg => {
              const matchesSearch = !memberSearchQuery || (reg.personName || '').toLowerCase().includes(memberSearchQuery.toLowerCase());
              const matchesStatus = !memberStatusFilter || reg.status === memberStatusFilter;
              return matchesSearch && matchesStatus;
            });
            if (memberRegistrations.length === 0) {
              return <p className="text-center py-8 text-stone-500">{t('distribution.no_member_registrations')}</p>;
            }
            if (filtered.length === 0) {
              return <p className="text-center py-8 text-stone-500">{t('distribution.no_matching_registrations')}</p>;
            }
            return (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-stone-200">
                  <thead className="bg-stone-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase">{t('distribution.recipient_name')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase">{t('distribution.event_status')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase">{t('distribution.registered')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200">
                    {filtered.map(reg => (
                      <tr key={reg.id}>
                        <td className="px-6 py-4 text-sm font-medium text-stone-900">{reg.personName}</td>
                        <td className="px-6 py-4">{statusBadge(reg.status)}</td>
                        <td className="px-6 py-4 text-sm text-stone-500">{reg.registeredAt ? new Date(reg.registeredAt).toLocaleString() : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="bg-stone-50 px-6 py-3 text-xs text-stone-500">
                  {filtered.length} / {memberRegistrations.length} {t('distribution.registered')}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {activeTab === 'non-members' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-lg font-semibold text-stone-900">{t('distribution.non_member_registration')}</h2>
              {summary && summary.nonMemberAllocation > 0 ? (
                <div className="mt-1">
                  <p className={`text-sm ${nonMembers.length >= summary.nonMemberAllocation ? 'text-red-600 font-medium' : 'text-stone-700'}`}>
                    {nonMembers.length} / {summary.nonMemberAllocation} {t('distribution.registered')}
                    {nonMembers.length >= summary.nonMemberAllocation && ` — ${t('distribution.capacity_reached')}`}
                  </p>
                  <p className="text-xs text-stone-400 mt-0.5">
                    {t('distribution.allocation_explanation', { count: summary.nonMemberAllocation })}
                  </p>
                </div>
              ) : (
                <p className="text-sm mt-1 text-amber-600">{t('distribution.set_allocation_first')}</p>
              )}
            </div>
            <button
              onClick={() => setShowNonMemberForm(true)}
              disabled={!summary || summary.nonMemberAllocation <= 0}
              className="px-3 py-1.5 bg-emerald-700 text-white rounded-lg text-sm hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('distribution.register_non_member')}
            </button>
          </div>

          {showNonMemberForm && (
            <div className="bg-white rounded-lg shadow p-4 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">{t('distribution.recipient_name')}</label>
                  <input type="text" value={nonMemberForm.name} onChange={e => setNonMemberForm({ ...nonMemberForm, name: e.target.value })} className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">{t('distribution.id_number')}</label>
                  <input type="text" value={nonMemberForm.idNumber || ''} onChange={e => setNonMemberForm({ ...nonMemberForm, idNumber: e.target.value || undefined })} className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">{t('distribution.phone_number')}</label>
                  <input type="text" value={nonMemberForm.phoneNumber || ''} onChange={e => setNonMemberForm({ ...nonMemberForm, phoneNumber: e.target.value || undefined })} className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button onClick={() => { setShowNonMemberForm(false); setNonMemberForm({ distributionEventId: 0, name: '' }); }} className="px-3 py-1.5 text-stone-600 hover:text-stone-800 text-sm">{t('common.cancel')}</button>
                <button onClick={handleRegisterNonMember} disabled={!nonMemberForm.name} className="px-3 py-1.5 bg-emerald-700 text-white rounded-lg text-sm hover:bg-emerald-800 disabled:opacity-50">{t('distribution.register_non_member')}</button>
              </div>
            </div>
          )}

          {nonMembers.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <input
                type="text"
                value={nonMemberSearchQuery}
                onChange={e => setNonMemberSearchQuery(e.target.value)}
                placeholder={t('distribution.search_by_name_or_number')}
                className="px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 w-64"
              />
              <select
                value={nonMemberStatusFilter}
                onChange={e => setNonMemberStatusFilter(e.target.value)}
                className="px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="">{t('distribution.all_statuses')}</option>
                <option value="REGISTERED">{t('distribution.status_registered')}</option>
                <option value="COLLECTED">{t('distribution.status_collected')}</option>
              </select>
              {(nonMemberSearchQuery || nonMemberStatusFilter) && (
                <button
                  onClick={() => { setNonMemberSearchQuery(''); setNonMemberStatusFilter(''); }}
                  className="text-sm text-emerald-700 hover:text-emerald-800 underline"
                >{t('distribution.clear_filters')}</button>
              )}
            </div>
          )}

          {(() => {
            const filtered = nonMembers.filter(nm => {
              const q = nonMemberSearchQuery.toLowerCase();
              const matchesSearch = !nonMemberSearchQuery || (nm.name || '').toLowerCase().includes(q) || (nm.distributionNumber || '').toLowerCase().includes(q) || (nm.idNumber || '').toLowerCase().includes(q) || (nm.phoneNumber || '').toLowerCase().includes(q);
              const matchesStatus = !nonMemberStatusFilter || nm.status === nonMemberStatusFilter;
              return matchesSearch && matchesStatus;
            });
            if (nonMembers.length === 0) {
              return <p className="text-center py-8 text-stone-500">{t('distribution.no_non_member_registrations')}</p>;
            }
            if (filtered.length === 0) {
              return <p className="text-center py-8 text-stone-500">{t('distribution.no_matching_registrations')}</p>;
            }
            return (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-stone-200">
                  <thead className="bg-stone-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase">{t('distribution.distribution_number')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase">{t('distribution.recipient_name')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase">{t('distribution.id_number')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase">{t('distribution.phone_number')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase">{t('distribution.event_status')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200">
                    {filtered.map(nm => (
                      <tr key={nm.id}>
                        <td className="px-6 py-4 text-sm font-medium text-stone-900">{nm.distributionNumber}</td>
                        <td className="px-6 py-4 text-sm text-stone-900">{nm.name}</td>
                        <td className="px-6 py-4 text-sm text-stone-500">{nm.idNumber || '—'}</td>
                        <td className="px-6 py-4 text-sm text-stone-500">{nm.phoneNumber || '—'}</td>
                        <td className="px-6 py-4">{statusBadge(nm.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="bg-stone-50 px-6 py-3 text-xs text-stone-500">
                  {filtered.length} / {nonMembers.length} {t('distribution.registered')}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {activeTab === 'distribute' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-stone-900">{t('distribution.distribute_parcels')}</h2>
            {distQueue.length > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-stone-500">
                  {distQueueIndex < distQueue.length
                    ? `${distQueueIndex + 1} / ${distQueue.length}`
                    : t('distribution.queue_complete')}
                  {skippedItems.length > 0 && ` · ${skippedItems.length} ${t('distribution.skipped')}`}
                </span>
                <button
                  onClick={() => { setDistQueue([]); setDistNextGroup([]); setDistQueueIndex(0); setDistGroupNumber(0); setSkippedItems([]); setDistCategoryAmounts({}); }}
                  className="px-3 py-1.5 text-stone-600 hover:text-stone-800 text-sm border border-stone-300 rounded-lg"
                >
                  {t('distribution.restart_queue')}
                </button>
              </div>
            )}
          </div>

          {selectedEvent.status !== 'ACTIVE' && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-amber-700">{t('distribution.activate_to_distribute')}</p>
            </div>
          )}

          {distQueue.length === 0 && selectedEvent.status === 'ACTIVE' && (
            <div className="bg-white rounded-lg shadow p-8 max-w-md mx-auto">
              <p className="text-stone-700 font-medium text-center mb-4">{t('distribution.start_with')}</p>
              <div className="flex gap-3 mb-6">
                <button
                  onClick={() => setQueueStartWith('NON_MEMBER')}
                  className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium border-2 transition-colors ${
                    queueStartWith === 'NON_MEMBER'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                      : 'border-stone-200 text-stone-600 hover:border-stone-300'
                  }`}
                >
                  {t('distribution.non_members_first')}
                </button>
                <button
                  onClick={() => setQueueStartWith('MEMBER')}
                  className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium border-2 transition-colors ${
                    queueStartWith === 'MEMBER'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                      : 'border-stone-200 text-stone-600 hover:border-stone-300'
                  }`}
                >
                  {t('distribution.members_first')}
                </button>
              </div>
              <button
                onClick={() => buildDistQueue(queueStartWith)}
                className="w-full px-4 py-3 bg-emerald-700 text-white rounded-lg text-sm font-medium hover:bg-emerald-800 transition-colors"
              >
                {t('distribution.start_distribution')}
              </button>
            </div>
          )}

          {distQueue.length > 0 && distQueueIndex < distQueue.length && currentQueueItem && (
            <div className="max-w-2xl">
              {/* Current person card */}
              <div className="bg-white rounded-lg shadow-lg border-2 border-emerald-200 p-6 mb-4">
                <div className="flex items-center justify-between mb-4">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${currentQueueItem.type === 'MEMBER' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                    {currentQueueItem.type === 'MEMBER' ? t('distribution.member') : t('distribution.non_member')}
                  </span>
                  <span className="text-sm text-stone-400">{distQueueIndex + 1} / {distQueue.length}</span>
                </div>
                <h3 className="text-2xl font-bold text-stone-900 mb-6">{currentQueueItem.label}</h3>

                {/* Category amounts */}
                <div className="space-y-4">
                  <p className="text-base font-semibold text-stone-700">{t('distribution.parcels_to_give')}</p>
                  {categories.filter(c => c.remainingParcels > 0).map(cat => {
                    const amt = distCategoryAmounts[cat.id] || 0;
                    return (
                      <div key={cat.id} className="flex items-center justify-between gap-6 py-4 border-b border-stone-100 last:border-0">
                        <div className="flex-1 min-w-0">
                          <p className="text-lg font-semibold text-stone-900">{cat.name}</p>
                          <p className="text-sm text-stone-500 mt-0.5">{cat.remainingParcels} {t('distribution.category_remaining').toLowerCase()}</p>
                        </div>
                        <div className="flex items-center">
                          <button
                            type="button"
                            onClick={() => setDistCategoryAmounts(prev => ({ ...prev, [cat.id]: Math.max(0, amt - 1) }))}
                            disabled={amt <= 0}
                            className="w-14 h-14 flex items-center justify-center bg-stone-100 hover:bg-stone-200 active:bg-stone-300 disabled:opacity-30 disabled:hover:bg-stone-100 rounded-l-xl border border-stone-300 text-2xl font-bold text-stone-700 transition-colors select-none"
                          >
                            −
                          </button>
                          <input
                            type="number"
                            min={0}
                            max={cat.remainingParcels}
                            value={amt}
                            onChange={e => {
                              const val = Math.min(Math.max(0, parseInt(e.target.value) || 0), cat.remainingParcels);
                              setDistCategoryAmounts(prev => ({ ...prev, [cat.id]: val }));
                            }}
                            style={{ MozAppearance: 'textfield', WebkitAppearance: 'none', appearance: 'textfield' }}
                            className="w-20 h-14 border-y border-stone-300 text-center text-2xl font-bold focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:z-10 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <button
                            type="button"
                            onClick={() => setDistCategoryAmounts(prev => ({ ...prev, [cat.id]: Math.min(cat.remainingParcels, amt + 1) }))}
                            disabled={amt >= cat.remainingParcels}
                            className="w-14 h-14 flex items-center justify-center bg-stone-100 hover:bg-stone-200 active:bg-stone-300 disabled:opacity-30 disabled:hover:bg-stone-100 rounded-r-xl border border-stone-300 text-2xl font-bold text-stone-700 transition-colors select-none"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {categories.every(c => c.remainingParcels <= 0) && (
                    <p className="text-base text-red-600 py-2 font-medium">{t('distribution.no_parcels_left')}</p>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex gap-3 mt-8">
                  <button
                    onClick={handleQueueSkip}
                    className="flex-1 px-4 py-4 border-2 border-stone-300 text-stone-700 rounded-xl hover:bg-stone-50 text-base font-semibold transition-colors"
                  >
                    {t('distribution.skip')}
                  </button>
                  <button
                    onClick={handleQueueDistribute}
                    disabled={distributing || Object.values(distCategoryAmounts).every(v => !v || v <= 0)}
                    className="flex-[2] px-4 py-4 bg-emerald-700 text-white rounded-xl hover:bg-emerald-800 disabled:opacity-50 text-lg font-bold transition-colors"
                  >
                    {distributing
                      ? t('common.saving')
                      : `${t('distribution.give_parcels')} (${Object.values(distCategoryAmounts).reduce((s, v) => s + (v || 0), 0)})`
                    }
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Group done / Skipped list */}
          {isGroupDone && (
            <div className="max-w-2xl">
              {skippedItems.length > 0 ? (
                <div>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                    <p className="text-base font-semibold text-amber-800">
                      {t('distribution.skipped_remaining', { count: skippedItems.length })}
                    </p>
                    <p className="text-sm text-amber-600 mt-1">{t('distribution.skipped_remaining_desc')}</p>
                  </div>
                  <div className="bg-white rounded-lg shadow overflow-hidden mb-4">
                    {skippedItems.map((item, i) => (
                      <div key={`${item.type}-${item.id}-${i}`} className="flex items-center justify-between px-6 py-4 border-b border-stone-100 last:border-0">
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${item.type === 'MEMBER' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                            {item.type === 'MEMBER' ? t('distribution.member') : t('distribution.non_member')}
                          </span>
                          <span className="text-base font-medium text-stone-900">{item.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleCancelSkipped(item)}
                            className="px-4 py-2 border border-stone-300 text-stone-600 rounded-lg text-sm font-medium hover:bg-stone-50"
                          >
                            {t('distribution.person_left')}
                          </button>
                          <button
                            onClick={() => handleReturnToSkipped(item)}
                            className="px-4 py-2 bg-emerald-700 text-white rounded-lg text-sm font-medium hover:bg-emerald-800"
                          >
                            {t('distribution.distribute_now')}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {hasNextGroup && (
                    <button
                      onClick={handleContinueToNextGroup}
                      className="w-full px-4 py-3 border-2 border-emerald-600 text-emerald-700 rounded-xl text-base font-semibold hover:bg-emerald-50 transition-colors"
                    >
                      {t('distribution.continue_to_next', { group: nextGroupLabel })}
                    </button>
                  )}
                </div>
              ) : (
                <div>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-8 text-center mb-4">
                    <svg className="w-12 h-12 mx-auto text-emerald-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    <p className="text-lg font-semibold text-emerald-800">
                      {hasNextGroup ? t('distribution.group_done') : t('distribution.all_done')}
                    </p>
                    <p className="text-sm text-emerald-600 mt-1">
                      {hasNextGroup ? t('distribution.group_done_desc') : t('distribution.all_done_desc')}
                    </p>
                  </div>
                  {hasNextGroup && (
                    <button
                      onClick={handleContinueToNextGroup}
                      className="w-full px-4 py-4 bg-emerald-700 text-white rounded-xl text-lg font-bold hover:bg-emerald-800 transition-colors"
                    >
                      {t('distribution.continue_to_next', { group: nextGroupLabel })}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'log' && (
        <div>
          <h2 className="text-lg font-semibold text-stone-900 mb-4">{t('distribution.distributions')}</h2>

          {/* Filters */}
          {distributions.length > 0 && (
            <div className="flex flex-wrap gap-3 mb-4">
              <input
                type="text"
                placeholder={t('distribution.search_recipient')}
                value={logSearchQuery}
                onChange={e => setLogSearchQuery(e.target.value)}
                className="px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 w-64"
              />
              <select
                value={logTypeFilter}
                onChange={e => setLogTypeFilter(e.target.value)}
                className="px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="">{t('distribution.all_types')}</option>
                <option value="MEMBER">{t('distribution.member')}</option>
                <option value="NON_MEMBER">{t('distribution.non_member')}</option>
              </select>
              <select
                value={logCategoryFilter}
                onChange={e => setLogCategoryFilter(e.target.value)}
                className="px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="">{t('distribution.all_categories')}</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
              </select>
              {(logSearchQuery || logTypeFilter || logCategoryFilter) && (
                <button
                  onClick={() => { setLogSearchQuery(''); setLogTypeFilter(''); setLogCategoryFilter(''); }}
                  className="px-3 py-2 text-sm text-stone-500 hover:text-stone-700"
                >
                  {t('distribution.clear_filters')}
                </button>
              )}
            </div>
          )}

          {distributions.length === 0 ? (
            <p className="text-center py-8 text-stone-500">{t('distribution.no_distributions')}</p>
          ) : (() => {
            const filtered = distributions.filter(d => {
              if (logSearchQuery && !(d.recipientName || '').toLowerCase().includes(logSearchQuery.toLowerCase())) return false;
              if (logTypeFilter && d.recipientType !== logTypeFilter) return false;
              if (logCategoryFilter && d.parcelCategoryName !== logCategoryFilter) return false;
              return true;
            });
            return filtered.length === 0 ? (
              <p className="text-center py-8 text-stone-500">{t('distribution.no_matching_distributions')}</p>
            ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-stone-200">
                <thead className="bg-stone-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase">{t('distribution.recipient')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase">{t('distribution.recipient_type')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase">{t('distribution.parcel_category')}</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-stone-500 uppercase">{t('distribution.parcel_count')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase">{t('distribution.distributed_by')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase">{t('distribution.event_date')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {filtered.map(d => (
                    <tr key={d.id}>
                      <td className="px-6 py-4 text-sm font-medium text-stone-900">{d.recipientName || `#${d.recipientId}`}</td>
                      <td className="px-6 py-4 text-sm text-stone-500">{d.recipientType === 'MEMBER' ? t('distribution.member') : t('distribution.non_member')}</td>
                      <td className="px-6 py-4 text-sm text-stone-500">{d.parcelCategoryName}</td>
                      <td className="px-6 py-4 text-sm text-right text-stone-900">{d.parcelCount}</td>
                      <td className="px-6 py-4 text-sm text-stone-500">{d.distributedBy || '—'}</td>
                      <td className="px-6 py-4 text-sm text-stone-500">{d.distributedAt ? new Date(d.distributedAt).toLocaleString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-stone-50">
                  <tr>
                    <td colSpan={3} className="px-6 py-3 text-sm font-medium text-stone-700">
                      {t('common.total')}: {filtered.length} {t('distribution.distributions').toLowerCase()}
                    </td>
                    <td className="px-6 py-3 text-sm font-bold text-right text-stone-900">
                      {filtered.reduce((sum, d) => sum + d.parcelCount, 0)}
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
            );
          })()}
        </div>
      )}

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
    </div>
  );
}
