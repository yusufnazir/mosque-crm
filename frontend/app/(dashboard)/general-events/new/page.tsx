'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { generalEventApi, GeneralEventCreate, GeneralEventType, GeneralEventStatus } from '@/lib/generalEventApi';
import { distributionApi, DistributionEventCreate } from '@/lib/distributionApi';
import { isPlanRestriction, parsePlanRestrictionFromError } from '@/lib/api';
import { useSubscription } from '@/lib/subscription/SubscriptionContext';
import ToastNotification from '@/components/ToastNotification';

const GENERAL_EVENT_TYPES: GeneralEventType[] = [
  'LECTURE', 'FUNDRAISER', 'IFTAR', 'NIKAH', 'YOUTH_PROGRAM',
  'SPORTS_DAY', 'QURAN_COMPETITION', 'GRADUATION', 'OTHER',
];

const STATUSES: GeneralEventStatus[] = ['DRAFT', 'PUBLISHED', 'ACTIVE'];

type EventCategory = 'GENERAL' | 'EID_UL_ADHA_DISTRIBUTION';

export default function NewGeneralEventPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { getLimit } = useSubscription();
  const eventsLimit = getLimit('events.max');
  const [currentEventCount, setCurrentEventCount] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([
      generalEventApi.listEvents().catch(() => [] as unknown[]),
      distributionApi.listEvents().catch(() => [] as unknown[]),
    ]).then(([ge, de]) => {
      setCurrentEventCount((ge as unknown[]).length + (de as unknown[]).length);
    });
  }, []);

  const [eventCategory, setEventCategory] = useState<EventCategory>('GENERAL');

  const [form, setForm] = useState<GeneralEventCreate>({
    name: '',
    generalEventType: 'LECTURE',
    startDate: '',
    status: 'DRAFT',
    visibility: 'MEMBERS_ONLY',
    isOnline: false,
    requiresRegistration: false,
    acceptNonMembers: true,
    waitlistEnabled: false,
    ticketingType: 'NONE',
    requiresCheckIn: false,
    memberCapacity: 0,
    nonMemberCapacity: 0,
    currency: 'EUR',
  });

  const [distForm, setDistForm] = useState<DistributionEventCreate>({
    name: '',
    year: new Date().getFullYear(),
    eventType: 'EID_UL_ADHA_DISTRIBUTION',
  });

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; action?: { label: string; href: string } } | null>(null);

  const set = (key: keyof GeneralEventCreate, value: GeneralEventCreate[keyof GeneralEventCreate]) => {
    setForm(f => ({ ...f, [key]: value }));
  };

  const setDist = (key: keyof DistributionEventCreate, value: DistributionEventCreate[keyof DistributionEventCreate]) => {
    setDistForm(f => ({ ...f, [key]: value }));
  };

  const handleCategoryChange = (value: string) => {
    if (value === 'EID_UL_ADHA_DISTRIBUTION') {
      setEventCategory('EID_UL_ADHA_DISTRIBUTION');
      setDistForm(f => ({ ...f, name: form.name }));
    } else {
      setEventCategory('GENERAL');
      setForm(f => ({ ...f, generalEventType: value as GeneralEventType, name: distForm.name || f.name }));
    }
  };

  const planLimitAction = { label: t('plan.upgrade_button'), href: '/billing' };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (eventCategory === 'EID_UL_ADHA_DISTRIBUTION') {
        const result = await distributionApi.createEvent(distForm);
        if (isPlanRestriction(result)) {
          const limit = result.limit;
          const msg = limit != null
            ? t('plan.events_limit_reached', { limit: String(limit) })
            : t('plan.limit_reached');
          setToast({ message: msg, type: 'error', action: planLimitAction });
          setSaving(false);
          return;
        }
        setToast({ message: t('general_events.toast.created'), type: 'success' });
        setTimeout(() => router.push('/events'), 800);
      } else {
        const created = await generalEventApi.createEvent(form);
        if (isPlanRestriction(created)) {
          const limit = created.limit;
          const msg = limit != null
            ? t('plan.events_limit_reached', { limit: String(limit) })
            : t('plan.limit_reached');
          setToast({ message: msg, type: 'error', action: planLimitAction });
          setSaving(false);
          return;
        }
        setToast({ message: t('general_events.toast.created'), type: 'success' });
        setTimeout(() => router.push(`/general-events/${created.id}`), 800);
      }
    } catch (err: unknown) {
      const planRestriction = parsePlanRestrictionFromError(err);
      if (planRestriction) {
        const limit = planRestriction.limit;
        const msg = limit != null
          ? t('plan.events_limit_reached', { limit: String(limit) })
          : t('plan.limit_reached');
        setToast({ message: msg, type: 'error', action: planLimitAction });
      } else {
        setToast({ message: err instanceof Error ? err.message : t('general_events.toast.error'), type: 'error' });
      }
      setSaving(false);
    }
  };

  const atLimit = eventsLimit != null && eventsLimit > 0 && currentEventCount != null && currentEventCount >= eventsLimit;

  return (
    <div className="p-8 max-w-3xl">
      {toast && (
        <ToastNotification message={toast.message} type={toast.type} action={toast.action} onClose={() => setToast(null)} />
      )}

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
        <h1 className="text-2xl font-bold text-stone-800">{t('general_events.new_event')}</h1>
      </div>

      {atLimit && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-5 py-4">
          <svg className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800">{t('plan.events_limit_reached', { limit: String(eventsLimit) })}</p>
            <p className="text-sm text-amber-700 mt-0.5">{t('plan.upgrade_prompt')}</p>
          </div>
          <a href="/billing" className="shrink-0 text-sm font-medium text-amber-700 underline hover:text-amber-900">{t('plan.upgrade_button')} →</a>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white border border-stone-200 rounded-xl p-6">
          <h2 className="font-semibold text-stone-700 mb-4 text-sm uppercase tracking-wide">Basic Information</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-stone-600 mb-1 block">{t('general_events.name')} *</label>
              <input
                type="text"
                required
                value={eventCategory === 'EID_UL_ADHA_DISTRIBUTION' ? distForm.name : form.name}
                onChange={e => eventCategory === 'EID_UL_ADHA_DISTRIBUTION' ? setDist('name', e.target.value) : set('name', e.target.value)}
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-stone-600 mb-1 block">{t('general_events.event_type')} *</label>
                <select
                  required
                  value={eventCategory === 'EID_UL_ADHA_DISTRIBUTION' ? 'EID_UL_ADHA_DISTRIBUTION' : form.generalEventType}
                  onChange={e => handleCategoryChange(e.target.value)}
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="EID_UL_ADHA_DISTRIBUTION">{t('distribution.type_eid_ul_adha')}</option>
                  {GENERAL_EVENT_TYPES.map(tp => (
                    <option key={tp} value={tp}>{t(`general_events.types.${tp}`)}</option>
                  ))}
                </select>
              </div>
              {eventCategory !== 'EID_UL_ADHA_DISTRIBUTION' && (
                <div>
                  <label className="text-sm font-medium text-stone-600 mb-1 block">{t('general_events.status')}</label>
                  <select
                    value={form.status}
                    onChange={e => set('status', e.target.value as GeneralEventStatus)}
                    className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {STATUSES.map(s => (
                      <option key={s} value={s}>{t(`general_events.statuses.${s}`)}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {eventCategory !== 'EID_UL_ADHA_DISTRIBUTION' && form.generalEventType === 'OTHER' && (
              <div>
                <label className="text-sm font-medium text-stone-600 mb-1 block">{t('general_events.custom_type_label')}</label>
                <input
                  type="text"
                  value={form.customTypeLabel ?? ''}
                  onChange={e => set('customTypeLabel', e.target.value)}
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            )}

            {eventCategory !== 'EID_UL_ADHA_DISTRIBUTION' && (
              <div>
                <label className="text-sm font-medium text-stone-600 mb-1 block">{t('general_events.description')}</label>
                <textarea
                  rows={3}
                  value={form.description ?? ''}
                  onChange={e => set('description', e.target.value)}
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            )}
          </div>
        </div>

        {/* ===== EID UL ADHA DISTRIBUTION FORM ===== */}
        {eventCategory === 'EID_UL_ADHA_DISTRIBUTION' && (
          <div className="bg-white border border-stone-200 rounded-xl p-6">
            <h2 className="font-semibold text-stone-700 mb-4 text-sm uppercase tracking-wide">{t('distribution.event_details') || 'Event Details'}</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-stone-600 mb-1 block">{t('distribution.event_year')} *</label>
                  <input
                    type="number"
                    required
                    min={2000}
                    value={distForm.year}
                    onChange={e => setDist('year', parseInt(e.target.value))}
                    className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-stone-600 mb-1 block">{t('distribution.event_date')}</label>
                  <input
                    type="date"
                    value={distForm.eventDate ?? ''}
                    onChange={e => setDist('eventDate', e.target.value || undefined)}
                    className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-stone-600 mb-1 block">{t('distribution.event_location')}</label>
                <input
                  type="text"
                  value={distForm.location ?? ''}
                  onChange={e => setDist('location', e.target.value || undefined)}
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* ===== GENERAL EVENT SECTIONS (hidden for Eid ul Adha) ===== */}
        {eventCategory !== 'EID_UL_ADHA_DISTRIBUTION' && (
        <>
        {/* Date & Location */}
        <div className="bg-white border border-stone-200 rounded-xl p-6">
          <h2 className="font-semibold text-stone-700 mb-4 text-sm uppercase tracking-wide">Date & Location</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-stone-600 mb-1 block">{t('general_events.start_date')} *</label>
                <input
                  type="date"
                  required
                  value={form.startDate}
                  onChange={e => set('startDate', e.target.value)}
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-stone-600 mb-1 block">{t('general_events.end_date')}</label>
                <input
                  type="date"
                  value={form.endDate ?? ''}
                  min={form.startDate}
                  onChange={e => set('endDate', e.target.value || undefined)}
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-xs text-stone-400 mt-1">{t('general_events.end_date_hint')}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-stone-600 mb-1 block">{t('general_events.start_time')}</label>
                <input
                  type="time"
                  value={form.startTime ?? ''}
                  onChange={e => set('startTime', e.target.value)}
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-stone-600 mb-1 block">{t('general_events.end_time')}</label>
                <input
                  type="time"
                  value={form.endTime ?? ''}
                  onChange={e => set('endTime', e.target.value)}
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="is_online"
                checked={form.isOnline ?? false}
                onChange={e => set('isOnline', e.target.checked)}
                className="rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
              />
              <label htmlFor="is_online" className="text-sm text-stone-700">{t('general_events.is_online')}</label>
            </div>

            {!form.isOnline && (
              <div>
                <label className="text-sm font-medium text-stone-600 mb-1 block">{t('general_events.location')}</label>
                <input
                  type="text"
                  value={form.location ?? ''}
                  onChange={e => set('location', e.target.value)}
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            )}

            {form.isOnline && (
              <div>
                <label className="text-sm font-medium text-stone-600 mb-1 block">{t('general_events.meeting_url')}</label>
                <input
                  type="url"
                  value={form.meetingUrl ?? ''}
                  onChange={e => set('meetingUrl', e.target.value)}
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            )}
          </div>
        </div>

        {/* Registration Settings */}
        <div className="bg-white border border-stone-200 rounded-xl p-6">
          <h2 className="font-semibold text-stone-700 mb-4 text-sm uppercase tracking-wide">Registration</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="requires_registration"
                checked={form.requiresRegistration ?? false}
                onChange={e => set('requiresRegistration', e.target.checked)}
                className="rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
              />
              <label htmlFor="requires_registration" className="text-sm text-stone-700">{t('general_events.requires_registration')}</label>
            </div>

            {form.requiresRegistration && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-stone-600 mb-1 block">{t('general_events.registration_open_date')}</label>
                    <input
                      type="date"
                      value={form.registrationOpenDate ?? ''}
                      onChange={e => set('registrationOpenDate', e.target.value)}
                      className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-stone-600 mb-1 block">{t('general_events.registration_close_date')}</label>
                    <input
                      type="date"
                      value={form.registrationCloseDate ?? ''}
                      onChange={e => set('registrationCloseDate', e.target.value)}
                      className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-stone-600 mb-1 block">{t('general_events.member_capacity')} <span className="text-stone-400 font-normal">(0 = unlimited)</span></label>
                    <input
                      type="number"
                      min={0}
                      value={form.memberCapacity ?? 0}
                      onChange={e => set('memberCapacity', Number(e.target.value))}
                      className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 mt-6">
                      <input
                        type="checkbox"
                        id="accept_non_members"
                        checked={form.acceptNonMembers ?? true}
                        onChange={e => set('acceptNonMembers', e.target.checked)}
                        className="rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <label htmlFor="accept_non_members" className="text-sm text-stone-700">{t('general_events.accept_non_members')}</label>
                    </div>
                    {form.acceptNonMembers && (
                      <input
                        type="number"
                        min={0}
                        value={form.nonMemberCapacity ?? 0}
                        onChange={e => set('nonMemberCapacity', Number(e.target.value))}
                        placeholder={t('general_events.non_member_capacity')}
                        className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="waitlist_enabled"
                    checked={form.waitlistEnabled ?? false}
                    onChange={e => set('waitlistEnabled', e.target.checked)}
                    className="rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <label htmlFor="waitlist_enabled" className="text-sm text-stone-700">{t('general_events.waitlist_enabled')}</label>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Ticketing */}
        <div className="bg-white border border-stone-200 rounded-xl p-6">
          <h2 className="font-semibold text-stone-700 mb-4 text-sm uppercase tracking-wide">Ticketing</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-stone-600 mb-1 block">{t('general_events.ticketing_type')}</label>
              <select
                value={form.ticketingType ?? 'NONE'}
                onChange={e => set('ticketingType', e.target.value as 'NONE' | 'SINGLE_PRICE')}
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="NONE">Free / No ticketing</option>
                <option value="SINGLE_PRICE">Single price</option>
              </select>
            </div>
            {form.ticketingType === 'SINGLE_PRICE' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-stone-600 mb-1 block">{t('general_events.ticket_price')}</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.ticketPrice ?? ''}
                    onChange={e => set('ticketPrice', Number(e.target.value))}
                    className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-stone-600 mb-1 block">{t('general_events.currency')}</label>
                  <input
                    type="text"
                    value={form.currency ?? 'EUR'}
                    onChange={e => set('currency', e.target.value)}
                    className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Extra Options */}
        <div className="bg-white border border-stone-200 rounded-xl p-6">
          <h2 className="font-semibold text-stone-700 mb-4 text-sm uppercase tracking-wide">Options</h2>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-stone-600 mb-1 block">{t('general_events.visibility')}</label>
              <select
                value={form.visibility ?? 'MEMBERS_ONLY'}
                onChange={e => set('visibility', e.target.value)}
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="MEMBERS_ONLY">Members Only</option>
                <option value="PUBLIC">Public</option>
                <option value="PRIVATE">Private</option>
              </select>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="featured"
                checked={form.featured ?? false}
                onChange={e => set('featured', e.target.checked)}
                className="rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
              />
              <label htmlFor="featured" className="text-sm text-stone-700">{t('general_events.featured')}</label>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="requires_check_in"
                checked={form.requiresCheckIn ?? false}
                onChange={e => set('requiresCheckIn', e.target.checked)}
                className="rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
              />
              <label htmlFor="requires_check_in" className="text-sm text-stone-700">{t('general_events.requires_check_in')}</label>
            </div>
          </div>
        </div>
        </> /* end general-event-only sections */
        )}

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.push('/events')}
            className="px-5 py-2.5 text-sm text-stone-600 hover:text-stone-800 border border-stone-300 rounded-lg"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            disabled={saving || atLimit}
            className="bg-emerald-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-emerald-800 disabled:opacity-50 flex items-center gap-2"
          >
            {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {t('general_events.save_event')}
          </button>
        </div>
      </form>
    </div>
  );
}
