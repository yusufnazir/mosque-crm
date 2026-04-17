'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { useDateFormat } from '@/lib/DateFormatContext';
import { memberApi } from '@/lib/api';
import { PersonSearchResult } from '@/types';
import {
  generalEventApi,
  GeneralEvent,
  GeneralEventRegistration,
  GeneralEventRegistrationCreate,
  GeneralEventVolunteer,
  GeneralEventVolunteerCreate,
  GeneralEventReport,
  GeneralEventStatus,
  RsvpStatus,
  CheckInStatus,
  VolunteerStatus,
  GeneralEventSession,
  GeneralEventSessionCreate,
  GeneralEventAttendance,
  GeneralEventAttendanceCreate,
  AttendanceStatus,
  GeneralEventDocument,
} from '@/lib/generalEventApi';
import ToastNotification from '@/components/ToastNotification';
import ConfirmDialog from '@/components/ConfirmDialog';

type Tab = 'overview' | 'registrations' | 'volunteers' | 'sessions' | 'attendance' | 'documents' | 'report';

const STATUS_COLORS: Record<GeneralEventStatus, string> = {
  DRAFT: 'bg-stone-100 text-stone-700',
  PUBLISHED: 'bg-blue-100 text-blue-700',
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  CLOSED: 'bg-amber-100 text-amber-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

const RSVP_COLORS: Record<RsvpStatus, string> = {
  CONFIRMED: 'bg-emerald-100 text-emerald-700',
  DECLINED: 'bg-red-100 text-red-700',
  WAITLIST: 'bg-amber-100 text-amber-700',
};

const CHECKIN_COLORS: Record<CheckInStatus, string> = {
  NOT_CHECKED_IN: 'bg-stone-100 text-stone-600',
  CHECKED_IN: 'bg-emerald-100 text-emerald-700',
  ABSENT: 'bg-red-100 text-red-700',
};

const VOLUNTEER_STATUS_COLORS: Record<VolunteerStatus, string> = {
  INVITED: 'bg-blue-100 text-blue-700',
  ACCEPTED: 'bg-emerald-100 text-emerald-700',
  DECLINED: 'bg-red-100 text-red-700',
  COMPLETED: 'bg-stone-100 text-stone-700',
  NO_SHOW: 'bg-amber-100 text-amber-700',
};

const ATTENDANCE_STATUS_COLORS: Record<AttendanceStatus, string> = {
  ABSENT: 'bg-red-100 text-red-700',
  PRESENT: 'bg-emerald-100 text-emerald-700',
  LATE: 'bg-amber-100 text-amber-700',
  EXCUSED: 'bg-blue-100 text-blue-700',
};

export default function GeneralEventDetailPage() {
  const { t } = useTranslation();
  const { formatDate } = useDateFormat();
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  const [event, setEvent] = useState<GeneralEvent | null>(null);
  const [registrations, setRegistrations] = useState<GeneralEventRegistration[]>([]);
  const [volunteers, setVolunteers] = useState<GeneralEventVolunteer[]>([]);
  const [report, setReport] = useState<GeneralEventReport | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Registration form state
  const [showRegForm, setShowRegForm] = useState(false);
  const [editReg, setEditReg] = useState<GeneralEventRegistration | null>(null);
  const [regForm, setRegForm] = useState<GeneralEventRegistrationCreate>({
    registrantType: 'MEMBER',
    name: '',
    email: '',
    phoneNumber: '',
    partySize: 1,
  });
  const [deleteRegTarget, setDeleteRegTarget] = useState<GeneralEventRegistration | null>(null);

  // Member autocomplete state (for registration form)
  const [memberQuery, setMemberQuery] = useState('');
  const [memberResults, setMemberResults] = useState<PersonSearchResult[]>([]);
  const [memberSearchLoading, setMemberSearchLoading] = useState(false);
  const [selectedMember, setSelectedMember] = useState<PersonSearchResult | null>(null);
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  const memberSearchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Volunteer form state
  const [showVolForm, setShowVolForm] = useState(false);
  const [editVol, setEditVol] = useState<GeneralEventVolunteer | null>(null);
  const [volForm, setVolForm] = useState<GeneralEventVolunteerCreate>({
    personId: 0,
    role: '',
  });
  const [deleteVolTarget, setDeleteVolTarget] = useState<GeneralEventVolunteer | null>(null);

  // Status change
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  // Session state
  const [sessions, setSessions] = useState<GeneralEventSession[]>([]);
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [editSession, setEditSession] = useState<GeneralEventSession | null>(null);
  const [sessionForm, setSessionForm] = useState<GeneralEventSessionCreate>({ sessionName: '', sessionDate: '' });
  const [deleteSessionTarget, setDeleteSessionTarget] = useState<GeneralEventSession | null>(null);
  const [loadingSessions, setLoadingSessions] = useState(false);

  // Attendance state
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [attendance, setAttendance] = useState<GeneralEventAttendance[]>([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [showWalkInForm, setShowWalkInForm] = useState(false);
  const [walkInForm, setWalkInForm] = useState<GeneralEventAttendanceCreate>({ status: 'PRESENT' });
  const [editingCheckedInId, setEditingCheckedInId] = useState<number | null>(null);
  const [walkInQuery, setWalkInQuery] = useState('');
  const [walkInResults, setWalkInResults] = useState<PersonSearchResult[]>([]);
  const [walkInSearchLoading, setWalkInSearchLoading] = useState(false);
  const [walkInSelectedMember, setWalkInSelectedMember] = useState<PersonSearchResult | null>(null);
  const walkInSearchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Documents state
  const [documents, setDocuments] = useState<GeneralEventDocument[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadFileObj, setUploadFileObj] = useState<File | null>(null);
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadSessionId, setUploadSessionId] = useState<number | ''>('');
  const [uploading, setUploading] = useState(false);
  const [deleteDocTarget, setDeleteDocTarget] = useState<GeneralEventDocument | null>(null);
  const [docFilterSessionId, setDocFilterSessionId] = useState<number | ''>('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [ev, regs, vols] = await Promise.all([
        generalEventApi.getEvent(id),
        generalEventApi.listRegistrations(id),
        generalEventApi.listVolunteers(id),
      ]);
      setEvent(ev);
      setRegistrations(regs);
      setVolunteers(vols);
    } catch {
      setToast({ message: t('general_events.toast.error'), type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  const loadReport = useCallback(async () => {
    try {
      const r = await generalEventApi.getReport(id);
      setReport(r);
    } catch {
      setToast({ message: t('general_events.toast.error'), type: 'error' });
    }
  }, [id, t]);

  const loadSessions = useCallback(async () => {
    setLoadingSessions(true);
    try {
      const s = await generalEventApi.listSessions(id);
      setSessions(s);
    } catch {
      setToast({ message: t('general_events.toast.error'), type: 'error' });
    } finally {
      setLoadingSessions(false);
    }
  }, [id, t]);

  const loadAttendance = useCallback(async (sessionId: number) => {
    setLoadingAttendance(true);
    try {
      const a = await generalEventApi.listAttendance(id, sessionId);
      setAttendance(a);
    } catch {
      setToast({ message: t('general_events.toast.error'), type: 'error' });
    } finally {
      setLoadingAttendance(false);
    }
  }, [id, t]);

  const loadDocuments = useCallback(async (sessionId?: number) => {
    setLoadingDocuments(true);
    try {
      const docs = await generalEventApi.listDocuments(id, sessionId);
      setDocuments(docs);
    } catch {
      setToast({ message: t('general_events.toast.error'), type: 'error' });
    } finally {
      setLoadingDocuments(false);
    }
  }, [id, t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (activeTab === 'report') {
      loadReport();
    }
  }, [activeTab, loadReport]);

  useEffect(() => {
    if (activeTab === 'sessions' || activeTab === 'attendance') {
      loadSessions();
    }
  }, [activeTab, loadSessions]);

  useEffect(() => {
    if (activeTab === 'documents') {
      loadDocuments();
      if (sessions.length === 0) loadSessions();
    }
  }, [activeTab, loadDocuments, loadSessions, sessions.length]);

  useEffect(() => {
    if (activeTab === 'documents') {
      loadDocuments(docFilterSessionId ? Number(docFilterSessionId) : undefined);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docFilterSessionId]);

  useEffect(() => {
    if (selectedSessionId) {
      loadAttendance(selectedSessionId);
    }
  }, [selectedSessionId, loadAttendance]);

  // Status update
  const handleStatusChange = async (status: GeneralEventStatus) => {
    try {
      const updated = await generalEventApi.updateEventStatus(id, status);
      setEvent(updated);
      setShowStatusMenu(false);
      setToast({ message: t('general_events.toast.status_updated'), type: 'success' });
    } catch {
      setToast({ message: t('general_events.toast.error'), type: 'error' });
    }
  };

  // Member autocomplete handler
  const handleMemberQueryChange = (val: string) => {
    setMemberQuery(val);
    setShowMemberDropdown(true);
    if (memberSearchTimeout.current) clearTimeout(memberSearchTimeout.current);
    if (val.length < 2) {
      setMemberResults([]);
      return;
    }
    memberSearchTimeout.current = setTimeout(async () => {
      setMemberSearchLoading(true);
      try {
        const results: PersonSearchResult[] = await memberApi.search(val);
        setMemberResults(results);
      } catch {
        setMemberResults([]);
      } finally {
        setMemberSearchLoading(false);
      }
    }, 300);
  };

  const handleSelectMember = (person: PersonSearchResult) => {
    setSelectedMember(person);
    setMemberQuery(`${person.firstName}${person.lastName ? ' ' + person.lastName : ''}`);
    setShowMemberDropdown(false);
    setMemberResults([]);
    setRegForm(f => ({
      ...f,
      personId: Number(person.id),
      name: `${person.firstName}${person.lastName ? ' ' + person.lastName : ''}`,
      email: person.email ?? '',
      phoneNumber: person.phone ?? '',
    }));
  };

  const resetMemberSearch = () => {
    setMemberQuery('');
    setMemberResults([]);
    setSelectedMember(null);
    setShowMemberDropdown(false);
  };

  // Registration CRUD
  const openAddReg = () => {
    setEditReg(null);
    setRegForm({ registrantType: 'MEMBER', name: '', email: '', phoneNumber: '', partySize: 1 });
    resetMemberSearch();
    setShowRegForm(true);
  };

  const openEditReg = (reg: GeneralEventRegistration) => {
    setEditReg(reg);
    setRegForm({
      registrantType: reg.registrantType,
      name: reg.name,
      email: reg.email ?? '',
      phoneNumber: reg.phoneNumber ?? '',
      partySize: reg.partySize,
      rsvpStatus: reg.rsvpStatus,
      specialRequests: reg.specialRequests ?? '',
    });
    // When editing a member registration, pre-fill the query with their name
    resetMemberSearch();
    if (reg.registrantType === 'MEMBER') {
      setMemberQuery(reg.name);
    }
    setShowRegForm(true);
  };

  const handleSaveReg = async () => {
    try {
      if (editReg) {
        await generalEventApi.updateRegistration(id, editReg.id, regForm);
        setToast({ message: t('general_events.toast.registration_updated'), type: 'success' });
      } else {
        await generalEventApi.addRegistration(id, regForm);
        setToast({ message: t('general_events.toast.registration_added'), type: 'success' });
      }
      setShowRegForm(false);
      loadData();
    } catch {
      setToast({ message: t('general_events.toast.error'), type: 'error' });
    }
  };

  const handleDeleteReg = async () => {
    if (!deleteRegTarget) return;
    try {
      await generalEventApi.deleteRegistration(id, deleteRegTarget.id);
      setToast({ message: t('general_events.toast.registration_deleted'), type: 'success' });
      setDeleteRegTarget(null);
      loadData();
    } catch {
      setToast({ message: t('general_events.toast.error'), type: 'error' });
    }
  };

  const handleCheckIn = async (regId: number) => {
    try {
      await generalEventApi.checkIn(id, regId);
      setToast({ message: t('general_events.toast.checked_in'), type: 'success' });
      loadData();
    } catch {
      setToast({ message: t('general_events.toast.error'), type: 'error' });
    }
  };

  // Volunteer CRUD
  const openAddVol = () => {
    setEditVol(null);
    setVolForm({ personId: 0, role: '' });
    setShowVolForm(true);
  };

  const openEditVol = (vol: GeneralEventVolunteer) => {
    setEditVol(vol);
    setVolForm({ personId: vol.personId, role: vol.role, roleDescription: vol.roleDescription ?? '', status: vol.status });
    setShowVolForm(true);
  };

  const handleSaveVol = async () => {
    try {
      if (editVol) {
        await generalEventApi.updateVolunteer(id, editVol.id, volForm);
        setToast({ message: t('general_events.toast.volunteer_updated'), type: 'success' });
      } else {
        await generalEventApi.addVolunteer(id, volForm);
        setToast({ message: t('general_events.toast.volunteer_added'), type: 'success' });
      }
      setShowVolForm(false);
      loadData();
    } catch {
      setToast({ message: t('general_events.toast.error'), type: 'error' });
    }
  };

  const handleDeleteVol = async () => {
    if (!deleteVolTarget) return;
    try {
      await generalEventApi.deleteVolunteer(id, deleteVolTarget.id);
      setToast({ message: t('general_events.toast.volunteer_deleted'), type: 'success' });
      setDeleteVolTarget(null);
      loadData();
    } catch {
      setToast({ message: t('general_events.toast.error'), type: 'error' });
    }
  };

  // Session CRUD
  const openAddSession = () => {
    setEditSession(null);
    setSessionForm({ sessionName: '', sessionDate: event?.startDate ?? '' });
    setShowSessionForm(true);
  };

  const openEditSession = (s: GeneralEventSession) => {
    setEditSession(s);
    setSessionForm({
      sessionName: s.sessionName,
      sessionDate: s.sessionDate,
      startTime: s.startTime ?? '',
      endTime: s.endTime ?? '',
      location: s.location ?? '',
      description: s.description ?? '',
      capacity: s.capacity ?? undefined,
      sessionOrder: s.sessionOrder,
    });
    setShowSessionForm(true);
  };

  const handleSaveSession = async () => {
    try {
      if (editSession) {
        await generalEventApi.updateSession(id, editSession.id, sessionForm);
        setToast({ message: t('general_events.toast.updated'), type: 'success' });
      } else {
        await generalEventApi.createSession(id, sessionForm);
        setToast({ message: t('general_events.toast.created'), type: 'success' });
      }
      setShowSessionForm(false);
      loadSessions();
    } catch {
      setToast({ message: t('general_events.toast.error'), type: 'error' });
    }
  };

  const handleDeleteSession = async () => {
    if (!deleteSessionTarget) return;
    try {
      await generalEventApi.deleteSession(id, deleteSessionTarget.id);
      setToast({ message: t('general_events.toast.deleted'), type: 'success' });
      setDeleteSessionTarget(null);
      loadSessions();
    } catch {
      setToast({ message: t('general_events.toast.error'), type: 'error' });
    }
  };

  // Attendance handlers
  const handlePrepopulate = async (sessionId: number) => {
    try {
      const result = await generalEventApi.prepopulateAttendance(id, sessionId);
      setToast({ message: `${result.created} attendance record(s) created`, type: 'success' });
      loadAttendance(sessionId);
    } catch {
      setToast({ message: t('general_events.toast.error'), type: 'error' });
    }
  };

  const handleMarkStatus = async (sessionId: number, attRow: GeneralEventAttendance, status: AttendanceStatus) => {
    try {
      await generalEventApi.markAttendance(id, sessionId, {
        registrationId: attRow.registrationId ?? undefined,
        status,
        notes: attRow.notes ?? undefined,
        checkedInAt: attRow.checkedInAt ?? undefined,
      });
      loadAttendance(sessionId);
    } catch {
      setToast({ message: t('general_events.toast.error'), type: 'error' });
    }
  };

  const handleUpdateCheckedIn = async (sessionId: number, attRow: GeneralEventAttendance, isoString: string) => {
    setEditingCheckedInId(null);
    if (!isoString) return;
    try {
      await generalEventApi.markAttendance(id, sessionId, {
        registrationId: attRow.registrationId ?? undefined,
        status: attRow.status,
        notes: attRow.notes ?? undefined,
        checkedInAt: isoString,
      });
      loadAttendance(sessionId);
    } catch {
      setToast({ message: t('general_events.toast.error'), type: 'error' });
    }
  };

  const handleWalkInQueryChange = (val: string) => {
    setWalkInQuery(val);
    setWalkInSelectedMember(null);
    setWalkInForm(f => ({ ...f, walkInName: val, personId: undefined }));
    if (walkInSearchTimeout.current) clearTimeout(walkInSearchTimeout.current);
    if (val.trim().length < 2) { setWalkInResults([]); return; }
    setWalkInSearchLoading(true);
    walkInSearchTimeout.current = setTimeout(async () => {
      try {
        const results = await memberApi.search(val);
        setWalkInResults(results);
      } catch {
        setWalkInResults([]);
      } finally {
        setWalkInSearchLoading(false);
      }
    }, 300);
  };

  const handleWalkInSelectMember = (person: PersonSearchResult) => {
    const name = `${person.firstName}${person.lastName ? ' ' + person.lastName : ''}`;
    setWalkInSelectedMember(person);
    setWalkInQuery(name);
    setWalkInResults([]);
    setWalkInForm(f => ({ ...f, walkInName: name, personId: Number(person.id) }));
  };

  const handleAddWalkIn = async (sessionId: number) => {
    if (!walkInForm.walkInName?.trim()) return;
    try {
      await generalEventApi.markAttendance(id, sessionId, walkInForm);
      setToast({ message: t('general_events.attendance.walk_in_added'), type: 'success' });
      setShowWalkInForm(false);
      setWalkInForm({ status: 'PRESENT' });
      setWalkInQuery('');
      setWalkInResults([]);
      setWalkInSelectedMember(null);
      loadAttendance(sessionId);
    } catch {
      setToast({ message: t('general_events.toast.error'), type: 'error' });
    }
  };

  const handleDeleteAttendance = async (sessionId: number, attId: number) => {
    try {
      await generalEventApi.deleteAttendance(id, sessionId, attId);
      loadAttendance(sessionId);
    } catch {
      setToast({ message: t('general_events.toast.error'), type: 'error' });
    }
  };

  // Document handlers
  const handleUploadDocument = async () => {
    if (!uploadFileObj) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFileObj);
      if (uploadDescription.trim()) formData.append('description', uploadDescription.trim());
      if (uploadSessionId) formData.append('sessionId', String(uploadSessionId));
      await generalEventApi.uploadDocument(id, formData);
      setToast({ message: t('general_events.toast.document_uploaded'), type: 'success' });
      setShowUploadForm(false);
      setUploadFileObj(null);
      setUploadDescription('');
      setUploadSessionId('');
      loadDocuments(docFilterSessionId ? Number(docFilterSessionId) : undefined);
    } catch {
      setToast({ message: t('general_events.toast.error'), type: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDoc = async () => {
    if (!deleteDocTarget) return;
    try {
      await generalEventApi.deleteDocument(id, deleteDocTarget.id);
      setToast({ message: t('general_events.toast.document_deleted'), type: 'success' });
      setDeleteDocTarget(null);
      loadDocuments(docFilterSessionId ? Number(docFilterSessionId) : undefined);
    } catch {
      setToast({ message: t('general_events.toast.error'), type: 'error' });
    }
  };

  const formatFileSize = (bytes: number | null): string => {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center pt-16">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="p-8 text-center text-stone-500">Event not found.</div>
    );
  }

  const STATUSES: GeneralEventStatus[] = ['DRAFT', 'PUBLISHED', 'ACTIVE', 'CLOSED', 'CANCELLED'];

  return (
    <div className="p-8">
      {toast && (
        <ToastNotification message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      <ConfirmDialog
        open={!!deleteRegTarget}
        title={t('general_events.registrations.delete')}
        message={`Remove registration for "${deleteRegTarget?.name}"?`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleDeleteReg}
        onCancel={() => setDeleteRegTarget(null)}
      />

      <ConfirmDialog
        open={!!deleteVolTarget}
        title={t('general_events.volunteers.delete')}
        message={`Remove volunteer "${deleteVolTarget?.personName}"?`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleDeleteVol}
        onCancel={() => setDeleteVolTarget(null)}
      />

      <ConfirmDialog
        open={!!deleteSessionTarget}
        title={t('general_events.sessions.delete')}
        message={`Delete session "${deleteSessionTarget?.sessionName}"? All attendance records for this session will also be deleted.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleDeleteSession}
        onCancel={() => setDeleteSessionTarget(null)}
      />

      <ConfirmDialog
        open={!!deleteDocTarget}
        title={t('general_events.documents.delete_confirm_title')}
        message={t('general_events.documents.delete_confirm_message')}
        confirmLabel={t('general_events.documents.delete')}
        cancelLabel={t('general_events.documents.cancel_button')}
        variant="danger"
        onConfirm={handleDeleteDoc}
        onCancel={() => setDeleteDocTarget(null)}
      />

      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push('/events')}
          className="text-sm text-stone-500 hover:text-stone-700 flex items-center gap-1 mb-3"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {t('sidebar.events')}
        </button>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-stone-800">{event.name}</h1>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[event.status]}`}>
                {t(`general_events.statuses.${event.status}`)}
              </span>
              {event.featured && (
                <span className="text-xs bg-amber-100 text-amber-700 font-semibold px-2.5 py-1 rounded-full">★ Featured</span>
              )}
            </div>
            <p className="text-stone-500 text-sm">
              {t(`general_events.types.${event.generalEventType}`)}
              {event.customTypeLabel ? ` · ${event.customTypeLabel}` : ''}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Status dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowStatusMenu(v => !v)}
                className="border border-stone-300 text-stone-700 px-3 py-2 rounded-lg text-sm hover:bg-stone-50 flex items-center gap-1"
              >
                Change Status
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showStatusMenu && (
                <div className="absolute right-0 mt-1 bg-white border border-stone-200 rounded-lg shadow-lg z-10 min-w-[150px]">
                  {STATUSES.map(s => (
                    <button
                      key={s}
                      onClick={() => handleStatusChange(s)}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-stone-50 ${s === event.status ? 'font-semibold text-emerald-700' : 'text-stone-700'}`}
                    >
                      {t(`general_events.statuses.${s}`)}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => router.push(`/general-events/${id}/edit`)}
              className="bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-800"
            >
              {t('general_events.edit')}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-stone-200 mb-6">
        <div className="flex gap-1">
          {(['overview', 'registrations', 'volunteers', 'sessions', 'attendance', 'documents', 'report'] as Tab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-stone-500 hover:text-stone-700'
              }`}
            >
              {t(`general_events.tabs.${tab}`)}
              {tab === 'registrations' && (
                <span className="ml-1.5 bg-stone-100 text-stone-600 text-xs px-1.5 py-0.5 rounded-full">
                  {registrations.length}
                </span>
              )}
              {tab === 'volunteers' && (
                <span className="ml-1.5 bg-stone-100 text-stone-600 text-xs px-1.5 py-0.5 rounded-full">
                  {volunteers.length}
                </span>
              )}
              {tab === 'sessions' && (
                <span className="ml-1.5 bg-stone-100 text-stone-600 text-xs px-1.5 py-0.5 rounded-full">
                  {sessions.length}
                </span>
              )}
              {tab === 'documents' && (
                <span className="ml-1.5 bg-stone-100 text-stone-600 text-xs px-1.5 py-0.5 rounded-full">
                  {documents.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-stone-200 rounded-xl p-5">
            <h3 className="font-semibold text-stone-700 mb-4 text-sm uppercase tracking-wide">Event Details</h3>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-stone-500">{t('general_events.start_date')}</dt>
                <dd className="font-medium text-stone-800">{formatDate(event.startDate)}</dd>
              </div>
              {event.endDate && (
                <div className="flex justify-between">
                  <dt className="text-stone-500">{t('general_events.end_date')}</dt>
                  <dd className="font-medium text-stone-800">{formatDate(event.endDate)}</dd>
                </div>
              )}
              {event.startTime && (
                <div className="flex justify-between">
                  <dt className="text-stone-500">{t('general_events.start_time')}</dt>
                  <dd className="font-medium text-stone-800">{event.startTime}{event.endTime ? ` – ${event.endTime}` : ''}</dd>
                </div>
              )}
              {event.location && (
                <div className="flex justify-between">
                  <dt className="text-stone-500">{t('general_events.location')}</dt>
                  <dd className="font-medium text-stone-800">{event.location}</dd>
                </div>
              )}
              {event.isOnline && (
                <div className="flex justify-between">
                  <dt className="text-stone-500">Format</dt>
                  <dd className="font-medium text-stone-800">Online</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-stone-500">{t('general_events.visibility')}</dt>
                <dd className="font-medium text-stone-800">
                  {event.visibility === 'PUBLIC' ? t('general_events.visibility_public')
                    : event.visibility === 'MEMBERS_ONLY' ? t('general_events.visibility_members_only')
                    : event.visibility === 'INTERNAL_ONLY' ? t('general_events.visibility_internal_only')
                    : event.visibility}
                </dd>
              </div>
            </dl>
          </div>

          <div className="bg-white border border-stone-200 rounded-xl p-5">
            <h3 className="font-semibold text-stone-700 mb-4 text-sm uppercase tracking-wide">Registration</h3>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-stone-500">{t('general_events.requires_registration')}</dt>
                <dd className="font-medium text-stone-800">{event.requiresRegistration ? 'Yes' : 'No'}</dd>
              </div>
              {event.requiresRegistration && (
                <>
                  <div className="flex justify-between">
                    <dt className="text-stone-500">{t('general_events.member_capacity')}</dt>
                    <dd className="font-medium text-stone-800">{event.memberCapacity || 'Unlimited'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-stone-500">{t('general_events.accept_non_members')}</dt>
                    <dd className="font-medium text-stone-800">{event.acceptNonMembers ? 'Yes' : 'No'}</dd>
                  </div>
                  {event.acceptNonMembers && (
                    <div className="flex justify-between">
                      <dt className="text-stone-500">{t('general_events.non_member_capacity')}</dt>
                      <dd className="font-medium text-stone-800">{event.nonMemberCapacity || 'Unlimited'}</dd>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <dt className="text-stone-500">{t('general_events.waitlist_enabled')}</dt>
                    <dd className="font-medium text-stone-800">{event.waitlistEnabled ? 'Yes' : 'No'}</dd>
                  </div>
                </>
              )}
              {event.ticketingType === 'SINGLE_PRICE' && event.ticketPrice != null && (
                <div className="flex justify-between">
                  <dt className="text-stone-500">{t('general_events.ticket_price')}</dt>
                  <dd className="font-medium text-stone-800">{event.ticketPrice} {event.currency}</dd>
                </div>
              )}
              {event.requiresCheckIn && event.checkInCode && (
                <div className="flex justify-between">
                  <dt className="text-stone-500">{t('general_events.check_in_code')}</dt>
                  <dd className="font-mono font-bold text-emerald-700">{event.checkInCode}</dd>
                </div>
              )}
            </dl>
          </div>

          {event.description && (
            <div className="bg-white border border-stone-200 rounded-xl p-5 md:col-span-2">
              <h3 className="font-semibold text-stone-700 mb-2 text-sm uppercase tracking-wide">{t('general_events.description')}</h3>
              <p className="text-stone-600 text-sm whitespace-pre-wrap">{event.description}</p>
            </div>
          )}
        </div>
      )}

      {/* Registrations Tab */}
      {activeTab === 'registrations' && (
        <div>
          <div className="flex justify-end mb-4">
            <button
              onClick={openAddReg}
              className="bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-800"
            >
              + {t('general_events.registrations.add')}
            </button>
          </div>

          {/* Registration Form Modal */}
          {showRegForm && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg mx-4">
                <h3 className="font-semibold text-stone-800 mb-4">
                  {editReg ? t('general_events.registrations.edit') : t('general_events.registrations.add')}
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-stone-600 mb-1 block">{t('general_events.registrations.registrant_type')}</label>
                    <select
                      value={regForm.registrantType}
                      onChange={e => {
                        const newType = e.target.value as 'MEMBER' | 'NON_MEMBER';
                        setRegForm(f => ({ ...f, registrantType: newType, personId: undefined, name: '', email: '', phoneNumber: '' }));
                        resetMemberSearch();
                      }}
                      className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="MEMBER">Member</option>
                      <option value="NON_MEMBER">Non-Member</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-stone-600 mb-1 block">{t('general_events.registrations.name')} *</label>
                    {regForm.registrantType === 'MEMBER' ? (
                      <div className="relative">
                        <input
                          type="text"
                          value={memberQuery}
                          onChange={e => {
                            handleMemberQueryChange(e.target.value);
                            if (selectedMember) {
                              setSelectedMember(null);
                              setRegForm(f => ({ ...f, personId: undefined, name: e.target.value }));
                            }
                          }}
                          onFocus={() => { if (memberResults.length > 0) setShowMemberDropdown(true); }}
                          onBlur={() => setTimeout(() => setShowMemberDropdown(false), 150)}
                          placeholder="Search member by name..."
                          className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        {memberSearchLoading && (
                          <span className="absolute right-3 top-2.5 text-xs text-stone-400">...</span>
                        )}
                        {showMemberDropdown && memberResults.length > 0 && (
                          <ul className="absolute z-10 w-full mt-1 bg-white border border-stone-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                            {memberResults.map(p => (
                              <li
                                key={p.id}
                                onMouseDown={() => handleSelectMember(p)}
                                className="px-3 py-2 text-sm hover:bg-emerald-50 cursor-pointer"
                              >
                                <span className="font-medium text-stone-800">{p.firstName}{p.lastName ? ' ' + p.lastName : ''}</span>
                                {p.email && <span className="text-stone-400 ml-2 text-xs">{p.email}</span>}
                              </li>
                            ))}
                          </ul>
                        )}
                        {selectedMember && (
                          <p className="text-xs text-emerald-700 mt-1">Member selected — contact details auto-filled</p>
                        )}
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={regForm.name}
                        onChange={e => setRegForm(f => ({ ...f, name: e.target.value }))}
                        className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-stone-600 mb-1 block">{t('general_events.registrations.email')}</label>
                      <input
                        type="email"
                        value={regForm.email ?? ''}
                        onChange={e => setRegForm(f => ({ ...f, email: e.target.value }))}
                        className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-stone-600 mb-1 block">{t('general_events.registrations.phone')}</label>
                      <input
                        type="text"
                        value={regForm.phoneNumber ?? ''}
                        onChange={e => setRegForm(f => ({ ...f, phoneNumber: e.target.value }))}
                        className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-stone-600 mb-1 block">{t('general_events.registrations.party_size')}</label>
                      <input
                        type="number"
                        min={1}
                        value={regForm.partySize ?? 1}
                        onChange={e => setRegForm(f => ({ ...f, partySize: Number(e.target.value) }))}
                        className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-stone-600 mb-1 block">{t('general_events.registrations.rsvp_status')}</label>
                      <select
                        value={regForm.rsvpStatus ?? 'CONFIRMED'}
                        onChange={e => setRegForm(f => ({ ...f, rsvpStatus: e.target.value as RsvpStatus }))}
                        className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="CONFIRMED">Confirmed</option>
                        <option value="DECLINED">Declined</option>
                        <option value="WAITLIST">Waitlist</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-stone-600 mb-1 block">{t('general_events.registrations.special_requests')}</label>
                    <textarea
                      value={regForm.specialRequests ?? ''}
                      onChange={e => setRegForm(f => ({ ...f, specialRequests: e.target.value }))}
                      rows={2}
                      className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-5">
                  <button onClick={() => { setShowRegForm(false); resetMemberSearch(); }} className="text-sm text-stone-600 hover:text-stone-800 px-4 py-2">Cancel</button>
                  <button
                    onClick={handleSaveReg}
                    disabled={!regForm.name && !memberQuery}
                    className="bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-800 disabled:opacity-50"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}

          {registrations.length === 0 ? (
            <p className="text-stone-400 text-sm text-center py-8">{t('general_events.registrations.no_registrations')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-200">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-stone-500 uppercase tracking-wide">{t('general_events.registrations.name')}</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-stone-500 uppercase tracking-wide">{t('general_events.registrations.registrant_type')}</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-stone-500 uppercase tracking-wide">{t('general_events.registrations.party_size')}</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-stone-500 uppercase tracking-wide">{t('general_events.registrations.rsvp_status')}</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-stone-500 uppercase tracking-wide">{t('general_events.registrations.check_in_status')}</th>
                    <th className="text-right py-3 px-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {registrations.map(reg => (
                    <tr key={reg.id} className="border-b border-stone-100 hover:bg-stone-50">
                      <td className="py-3 px-4">
                        <div className="font-medium text-stone-800">{reg.name}</div>
                        {reg.email && <div className="text-xs text-stone-400">{reg.email}</div>}
                      </td>
                      <td className="py-3 px-4 text-stone-600">{reg.registrantType === 'MEMBER' ? 'Member' : 'Non-Member'}</td>
                      <td className="py-3 px-4 text-stone-600">{reg.partySize}</td>
                      <td className="py-3 px-4">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${RSVP_COLORS[reg.rsvpStatus]}`}>
                          {reg.rsvpStatus}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CHECKIN_COLORS[reg.checkInStatus]}`}>
                          {reg.checkInStatus.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {event.requiresCheckIn && reg.checkInStatus === 'NOT_CHECKED_IN' && (
                            <button
                              onClick={() => handleCheckIn(reg.id)}
                              className="text-xs text-emerald-700 hover:underline font-medium"
                            >
                              {t('general_events.registrations.check_in')}
                            </button>
                          )}
                          <button onClick={() => openEditReg(reg)} className="text-xs text-stone-500 hover:text-stone-700">Edit</button>
                          <button onClick={() => setDeleteRegTarget(reg)} className="text-xs text-red-500 hover:text-red-700">Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Volunteers Tab */}
      {activeTab === 'volunteers' && (
        <div>
          <div className="flex justify-end mb-4">
            <button
              onClick={openAddVol}
              className="bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-800"
            >
              + {t('general_events.volunteers.add')}
            </button>
          </div>

          {/* Volunteer Form Modal */}
          {showVolForm && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
                <h3 className="font-semibold text-stone-800 mb-4">
                  {editVol ? t('general_events.volunteers.edit') : t('general_events.volunteers.add')}
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-stone-600 mb-1 block">Person ID *</label>
                    <input
                      type="number"
                      value={volForm.personId || ''}
                      onChange={e => setVolForm(f => ({ ...f, personId: Number(e.target.value) }))}
                      placeholder="Enter person ID"
                      className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-stone-600 mb-1 block">{t('general_events.volunteers.role')} *</label>
                    <input
                      type="text"
                      value={volForm.role}
                      onChange={e => setVolForm(f => ({ ...f, role: e.target.value }))}
                      placeholder="e.g. Setup crew, Registration desk"
                      className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-stone-600 mb-1 block">{t('general_events.volunteers.role_description')}</label>
                    <textarea
                      value={volForm.roleDescription ?? ''}
                      onChange={e => setVolForm(f => ({ ...f, roleDescription: e.target.value }))}
                      rows={2}
                      className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  {editVol && (
                    <div>
                      <label className="text-xs font-medium text-stone-600 mb-1 block">{t('general_events.volunteers.status')}</label>
                      <select
                        value={volForm.status ?? 'INVITED'}
                        onChange={e => setVolForm(f => ({ ...f, status: e.target.value as VolunteerStatus }))}
                        className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        {(['INVITED', 'ACCEPTED', 'DECLINED', 'COMPLETED', 'NO_SHOW'] as VolunteerStatus[]).map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-3 mt-5">
                  <button onClick={() => setShowVolForm(false)} className="text-sm text-stone-600 hover:text-stone-800 px-4 py-2">Cancel</button>
                  <button
                    onClick={handleSaveVol}
                    disabled={!volForm.personId || !volForm.role}
                    className="bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-800 disabled:opacity-50"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}

          {volunteers.length === 0 ? (
            <p className="text-stone-400 text-sm text-center py-8">{t('general_events.volunteers.no_volunteers')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-200">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-stone-500 uppercase tracking-wide">{t('general_events.volunteers.person')}</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-stone-500 uppercase tracking-wide">{t('general_events.volunteers.role')}</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-stone-500 uppercase tracking-wide">{t('general_events.volunteers.status')}</th>
                    <th className="text-right py-3 px-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {volunteers.map(vol => (
                    <tr key={vol.id} className="border-b border-stone-100 hover:bg-stone-50">
                      <td className="py-3 px-4 font-medium text-stone-800">{vol.personName}</td>
                      <td className="py-3 px-4 text-stone-600">
                        <div>{vol.role}</div>
                        {vol.roleDescription && <div className="text-xs text-stone-400">{vol.roleDescription}</div>}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${VOLUNTEER_STATUS_COLORS[vol.status]}`}>
                          {vol.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => openEditVol(vol)} className="text-xs text-stone-500 hover:text-stone-700">Edit</button>
                          <button onClick={() => setDeleteVolTarget(vol)} className="text-xs text-red-500 hover:text-red-700">Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Sessions Tab */}
      {activeTab === 'sessions' && (
        <div>
          <div className="flex justify-end mb-4">
            <button
              onClick={openAddSession}
              className="bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-800"
            >
              + {t('general_events.sessions.add')}
            </button>
          </div>

          {/* Session Form Modal */}
          {showSessionForm && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg mx-4">
                <h3 className="font-semibold text-stone-800 mb-4">
                  {editSession ? t('general_events.sessions.edit') : t('general_events.sessions.add')}
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-stone-600 mb-1 block">{t('general_events.sessions.name')} *</label>
                    <input
                      type="text"
                      value={sessionForm.sessionName}
                      onChange={e => setSessionForm(f => ({ ...f, sessionName: e.target.value }))}
                      placeholder="e.g. Day 1, Morning Session"
                      className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-stone-600 mb-1 block">{t('general_events.sessions.date')} *</label>
                      <input
                        type="date"
                        value={sessionForm.sessionDate}
                        min={event.startDate}
                        max={event.endDate ?? undefined}
                        onChange={e => setSessionForm(f => ({ ...f, sessionDate: e.target.value }))}
                        className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-stone-600 mb-1 block">{t('general_events.sessions.order')}</label>
                      <input
                        type="number"
                        min={1}
                        value={sessionForm.sessionOrder ?? 1}
                        onChange={e => setSessionForm(f => ({ ...f, sessionOrder: Number(e.target.value) }))}
                        className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-stone-600 mb-1 block">{t('general_events.start_time')}</label>
                      <input
                        type="time"
                        value={sessionForm.startTime ?? ''}
                        onChange={e => setSessionForm(f => ({ ...f, startTime: e.target.value }))}
                        className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-stone-600 mb-1 block">{t('general_events.end_time')}</label>
                      <input
                        type="time"
                        value={sessionForm.endTime ?? ''}
                        onChange={e => setSessionForm(f => ({ ...f, endTime: e.target.value }))}
                        className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-stone-600 mb-1 block">{t('general_events.location')}</label>
                    <input
                      type="text"
                      value={sessionForm.location ?? ''}
                      onChange={e => setSessionForm(f => ({ ...f, location: e.target.value }))}
                      className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-stone-600 mb-1 block">{t('general_events.sessions.capacity')}</label>
                    <input
                      type="number"
                      min={0}
                      value={sessionForm.capacity ?? ''}
                      onChange={e => setSessionForm(f => ({ ...f, capacity: e.target.value ? Number(e.target.value) : undefined }))}
                      placeholder="Leave empty for unlimited"
                      className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-5">
                  <button onClick={() => setShowSessionForm(false)} className="text-sm text-stone-600 hover:text-stone-800 px-4 py-2">Cancel</button>
                  <button
                    onClick={handleSaveSession}
                    disabled={!sessionForm.sessionName || !sessionForm.sessionDate}
                    className="bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-800 disabled:opacity-50"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}

          {loadingSessions ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-stone-400 text-sm text-center py-8">{t('general_events.sessions.no_sessions')}</p>
          ) : (
            <div className="space-y-3">
              {sessions.map(s => (
                <div key={s.id} className="bg-white border border-stone-200 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-medium text-stone-800">{s.sessionName}</div>
                    <div className="text-xs text-stone-500 mt-0.5">
                      {formatDate(s.sessionDate)}
                      {s.startTime ? ` · ${s.startTime}${s.endTime ? `–${s.endTime}` : ''}` : ''}
                      {s.location ? ` · ${s.location}` : ''}
                    </div>
                    <div className="flex gap-3 mt-2">
                      <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                        {s.presentCount} {t('general_events.attendance.present')}
                      </span>
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                        {s.absentCount} {t('general_events.attendance.absent')}
                      </span>
                      <span className="text-xs bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full font-medium">
                        {s.totalAttendance} {t('general_events.attendance.total')}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => { setSelectedSessionId(s.id); setActiveTab('attendance'); }}
                      className="text-xs text-emerald-700 hover:underline font-medium"
                    >
                      {t('general_events.sessions.view_attendance')}
                    </button>
                    <button onClick={() => openEditSession(s)} className="text-xs text-stone-500 hover:text-stone-700">Edit</button>
                    <button onClick={() => setDeleteSessionTarget(s)} className="text-xs text-red-500 hover:text-red-700">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Attendance Tab */}
      {activeTab === 'attendance' && (
        <div>
          {/* Session Selector */}
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1">
              <select
                value={selectedSessionId ?? ''}
                onChange={e => setSelectedSessionId(e.target.value ? Number(e.target.value) : null)}
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">{t('general_events.attendance.select_session')}</option>
                {sessions.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.sessionName} · {formatDate(s.sessionDate)}
                  </option>
                ))}
              </select>
            </div>
            {selectedSessionId && (
              <div className="flex gap-2">
                <button
                  onClick={() => handlePrepopulate(selectedSessionId)}
                  className="border border-emerald-600 text-emerald-700 px-3 py-2 rounded-lg text-sm hover:bg-emerald-50"
                >
                  {t('general_events.attendance.prepopulate')}
                </button>
                <button
                  onClick={() => setShowWalkInForm(true)}
                  className="bg-emerald-700 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-emerald-800"
                >
                  + {t('general_events.attendance.add_walk_in')}
                </button>
              </div>
            )}
          </div>

          {/* Walk-in Form Modal */}
          {showWalkInForm && selectedSessionId && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
                <h3 className="font-semibold text-stone-800 mb-4">{t('general_events.attendance.add_walk_in')}</h3>
                <div className="space-y-3">
                  <div className="relative">
                    <label className="text-xs font-medium text-stone-600 mb-1 block">{t('general_events.attendance.walk_in_name')} *</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={walkInQuery}
                        onChange={e => handleWalkInQueryChange(e.target.value)}
                        placeholder="Type name or search member..."
                        className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      {walkInSearchLoading && (
                        <div className="absolute right-2 top-2.5 w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                      )}
                    </div>
                    {walkInResults.length > 0 && (
                      <ul className="absolute z-10 w-full bg-white border border-stone-200 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                        {walkInResults.map(p => (
                          <li
                            key={p.id}
                            className="px-3 py-2 hover:bg-emerald-50 cursor-pointer text-sm"
                            onMouseDown={() => handleWalkInSelectMember(p)}
                          >
                            <span className="font-medium text-stone-800">{p.firstName} {p.lastName}</span>
                            {p.email && <span className="text-stone-400 text-xs ml-2">{p.email}</span>}
                          </li>
                        ))}
                      </ul>
                    )}
                    {walkInSelectedMember && (
                      <p className="text-xs text-emerald-700 mt-1">✓ Linked to member record</p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-medium text-stone-600 mb-1 block">{t('general_events.attendance.status')}</label>
                    <select
                      value={walkInForm.status ?? 'PRESENT'}
                      onChange={e => setWalkInForm(f => ({ ...f, status: e.target.value as AttendanceStatus }))}
                      className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {(['PRESENT', 'LATE', 'ABSENT', 'EXCUSED'] as AttendanceStatus[]).map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-stone-600 mb-1 block">{t('general_events.attendance.notes')}</label>
                    <textarea
                      value={walkInForm.notes ?? ''}
                      onChange={e => setWalkInForm(f => ({ ...f, notes: e.target.value }))}
                      rows={2}
                      className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-5">
                  <button onClick={() => { setShowWalkInForm(false); setWalkInQuery(''); setWalkInResults([]); setWalkInSelectedMember(null); setWalkInForm({ status: 'PRESENT' }); }} className="text-sm text-stone-600 hover:text-stone-800 px-4 py-2">Cancel</button>
                  <button
                    onClick={() => handleAddWalkIn(selectedSessionId)}
                    disabled={!walkInForm.walkInName?.trim()}
                    className="bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-800 disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          )}

          {!selectedSessionId ? (
            <p className="text-stone-400 text-sm text-center py-8">{t('general_events.attendance.select_session_hint')}</p>
          ) : loadingAttendance ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : attendance.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-stone-400 text-sm">{t('general_events.attendance.no_records')}</p>
              <button
                onClick={() => handlePrepopulate(selectedSessionId)}
                className="mt-3 border border-emerald-600 text-emerald-700 px-4 py-2 rounded-lg text-sm hover:bg-emerald-50"
              >
                {t('general_events.attendance.prepopulate')}
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-200">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-stone-500 uppercase tracking-wide">{t('general_events.attendance.person')}</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-stone-500 uppercase tracking-wide">{t('general_events.attendance.type')}</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-stone-500 uppercase tracking-wide">{t('general_events.attendance.status')}</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-stone-500 uppercase tracking-wide">{t('general_events.attendance.checked_in_at')}</th>
                    <th className="text-right py-3 px-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.map(row => (
                    <tr key={row.id} className="border-b border-stone-100 hover:bg-stone-50">
                      <td className="py-3 px-4 font-medium text-stone-800">
                        {row.personName ?? row.walkInName ?? '—'}
                      </td>
                      <td className="py-3 px-4">
                        {row.registrationId ? (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Registered</span>
                        ) : (
                          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Walk-in</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {row.registrationId ? (
                          <select
                            value={row.status}
                            onChange={e => handleMarkStatus(selectedSessionId, row, e.target.value as AttendanceStatus)}
                            className={`text-xs font-medium px-2 py-0.5 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500 ${ATTENDANCE_STATUS_COLORS[row.status]}`}
                          >
                            {(['PRESENT', 'LATE', 'ABSENT', 'EXCUSED'] as AttendanceStatus[]).map(s => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        ) : (
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ATTENDANCE_STATUS_COLORS[row.status]}`}>
                            {row.status}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-stone-500 text-xs">
                        {editingCheckedInId === row.id ? (
                          <input
                            type="text"
                            autoFocus
                            placeholder="HH:MM"
                            maxLength={5}
                            defaultValue={row.checkedInAt ? new Date(row.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : ''}
                            className="border border-emerald-400 rounded px-1.5 py-0.5 text-xs text-stone-700 w-16 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            onBlur={e => {
                              const val = e.target.value.trim();
                              if (!val) { setEditingCheckedInId(null); return; }
                              const match = val.match(/^(\d{1,2}):(\d{2})$/);
                              if (!match) { setEditingCheckedInId(null); return; }
                              const base = row.checkedInAt ? new Date(row.checkedInAt) : new Date();
                              base.setHours(parseInt(match[1]), parseInt(match[2]), 0, 0);
                              // Send local wall-clock time (no UTC conversion) so backend stores what the user typed
                              const pad = (n: number) => String(n).padStart(2, '0');
                              const localISO = `${base.getFullYear()}-${pad(base.getMonth()+1)}-${pad(base.getDate())}T${pad(base.getHours())}:${pad(base.getMinutes())}:00`;
                              handleUpdateCheckedIn(selectedSessionId, row, localISO);
                            }}
                            onKeyDown={e => {
                              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                              if (e.key === 'Escape') setEditingCheckedInId(null);
                            }}
                          />
                        ) : (
                          <span
                            className="cursor-pointer hover:text-emerald-700 hover:underline"
                            title="Click to edit"
                            onClick={() => setEditingCheckedInId(row.id)}
                          >
                            {row.checkedInAt ? new Date(row.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '—'}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleDeleteAttendance(selectedSessionId, row.id)}
                          className="text-xs text-red-500 hover:text-red-700"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Documents Tab */}
      {activeTab === 'documents' && (
        <div>
          {/* Upload modal */}
          {showUploadForm && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg mx-4">
                <h3 className="font-semibold text-stone-800 mb-4">{t('general_events.documents.upload_modal_title')}</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-stone-600 mb-1 block">{t('general_events.documents.file_name')} *</label>
                    <input
                      type="file"
                      onChange={e => setUploadFileObj(e.target.files?.[0] ?? null)}
                      className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 file:mr-3 file:text-sm file:font-medium file:bg-emerald-50 file:text-emerald-700 file:border-0 file:rounded file:cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-stone-600 mb-1 block">{t('general_events.documents.description')}</label>
                    <input
                      type="text"
                      value={uploadDescription}
                      onChange={e => setUploadDescription(e.target.value)}
                      placeholder={t('general_events.documents.description_placeholder')}
                      className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-stone-600 mb-1 block">{t('general_events.documents.select_session')}</label>
                    <select
                      value={uploadSessionId}
                      onChange={e => setUploadSessionId(e.target.value ? Number(e.target.value) : '')}
                      className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">{t('general_events.documents.all_sessions')}</option>
                      {sessions.map(s => (
                        <option key={s.id} value={s.id}>{s.sessionName} · {formatDate(s.sessionDate)}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-5">
                  <button
                    onClick={() => { setShowUploadForm(false); setUploadFileObj(null); setUploadDescription(''); setUploadSessionId(''); }}
                    className="text-sm text-stone-600 hover:text-stone-800 px-4 py-2"
                  >
                    {t('general_events.documents.cancel_button')}
                  </button>
                  <button
                    onClick={handleUploadDocument}
                    disabled={!uploadFileObj || uploading}
                    className="bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-800 disabled:opacity-50 flex items-center gap-2"
                  >
                    {uploading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                    {uploading ? t('general_events.documents.uploading') : t('general_events.documents.upload_button')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Toolbar */}
          <div className="flex items-center gap-3 mb-4">
            <select
              value={docFilterSessionId}
              onChange={e => setDocFilterSessionId(e.target.value ? Number(e.target.value) : '')}
              className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">{t('general_events.documents.all_sessions')}</option>
              {sessions.map(s => (
                <option key={s.id} value={s.id}>{s.sessionName}</option>
              ))}
            </select>
            <div className="flex-1" />
            <button
              onClick={() => setShowUploadForm(true)}
              className="bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-800"
            >
              + {t('general_events.documents.add')}
            </button>
          </div>

          {loadingDocuments ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto mb-3 w-10 h-10 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-stone-400 text-sm">{t('general_events.documents.no_documents')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-200">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-stone-500 uppercase tracking-wide">{t('general_events.documents.file_name')}</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-stone-500 uppercase tracking-wide">{t('general_events.documents.description')}</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-stone-500 uppercase tracking-wide">{t('general_events.documents.session')}</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-stone-500 uppercase tracking-wide">{t('general_events.documents.file_size')}</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-stone-500 uppercase tracking-wide">{t('general_events.documents.uploaded_at')}</th>
                    <th className="text-right py-3 px-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map(doc => (
                    <tr key={doc.id} className="border-b border-stone-100 hover:bg-stone-50">
                      <td className="py-3 px-4">
                        <a
                          href={generalEventApi.downloadDocumentUrl(id, doc.id)}
                          download={doc.fileName}
                          className="text-emerald-700 hover:underline font-medium flex items-center gap-1.5"
                        >
                          <svg className="w-4 h-4 flex-shrink-0 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          {doc.fileName}
                        </a>
                      </td>
                      <td className="py-3 px-4 text-stone-600">{doc.description ?? '—'}</td>
                      <td className="py-3 px-4">
                        {doc.sessionName ? (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">{doc.sessionName}</span>
                        ) : (
                          <span className="text-xs text-stone-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-stone-500">{formatFileSize(doc.fileSize)}</td>
                      <td className="py-3 px-4 text-stone-500 text-xs">{formatDate(doc.createdAt)}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setDeleteDocTarget(doc)}
                          className="text-xs text-red-500 hover:text-red-700"
                        >
                          {t('general_events.documents.delete')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Report Tab */}
      {activeTab === 'report' && (
        <div>
          {!report ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {[
                { label: t('general_events.report.total_registrations'), value: report.totalRegistrations },
                { label: t('general_events.report.confirmed'), value: report.confirmed },
                { label: t('general_events.report.declined'), value: report.declined },
                { label: t('general_events.report.waitlist'), value: report.waitlist },
                { label: t('general_events.report.checked_in'), value: report.checkedIn },
                { label: t('general_events.report.absent'), value: report.absent },
                { label: t('general_events.report.members'), value: report.memberCount },
                { label: t('general_events.report.non_members'), value: report.nonMemberCount },
                { label: t('general_events.report.total_party_size'), value: report.totalPartySize },
                { label: t('general_events.report.volunteers'), value: report.volunteerCount },
              ].map(({ label, value }) => (
                <div key={label} className="bg-white border border-stone-200 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-emerald-700">{value}</div>
                  <div className="text-xs text-stone-500 mt-1">{label}</div>
                </div>
              ))}
              {report.totalRevenue > 0 && (
                <div className="bg-white border border-stone-200 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-amber-600">{report.totalRevenue.toFixed(2)}</div>
                  <div className="text-xs text-stone-500 mt-1">{t('general_events.report.total_revenue')}</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
