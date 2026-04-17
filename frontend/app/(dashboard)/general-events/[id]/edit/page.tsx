'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { generalEventApi, GeneralEventCreate, GeneralEventType, GeneralEventStatus } from '@/lib/generalEventApi';
import ToastNotification from '@/components/ToastNotification';

const EVENT_TYPES: GeneralEventType[] = [
  'LECTURE', 'FUNDRAISER', 'IFTAR', 'NIKAH', 'YOUTH_PROGRAM',
  'SPORTS_DAY', 'QURAN_COMPETITION', 'GRADUATION', 'OTHER',
];

const STATUSES: GeneralEventStatus[] = ['DRAFT', 'PUBLISHED', 'ACTIVE', 'CLOSED', 'CANCELLED'];

export default function EditGeneralEventPage() {
  const { t } = useTranslation();
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  const [form, setForm] = useState<GeneralEventCreate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    generalEventApi.getEvent(id).then(ev => {
      setForm({
        name: ev.name,
        description: ev.description ?? '',
        generalEventType: ev.generalEventType,
        customTypeLabel: ev.customTypeLabel ?? '',
        location: ev.location ?? '',
        isOnline: ev.isOnline,
        meetingUrl: ev.meetingUrl ?? '',
        startDate: ev.startDate,
        endDate: ev.endDate ?? '',
        startTime: ev.startTime ?? '',
        endTime: ev.endTime ?? '',
        requiresRegistration: ev.requiresRegistration,
        registrationOpenDate: ev.registrationOpenDate ?? '',
        registrationCloseDate: ev.registrationCloseDate ?? '',
        memberCapacity: ev.memberCapacity,
        nonMemberCapacity: ev.nonMemberCapacity,
        acceptNonMembers: ev.acceptNonMembers,
        waitlistEnabled: ev.waitlistEnabled,
        ticketingType: ev.ticketingType,
        ticketPrice: ev.ticketPrice ?? undefined,
        currency: ev.currency,
        status: ev.status,
        visibility: ev.visibility,
        featured: ev.featured,
        requiresCheckIn: ev.requiresCheckIn,
      });
      setLoading(false);
    }).catch(() => {
      setToast({ message: t('general_events.toast.error'), type: 'error' });
      setLoading(false);
    });
  }, [id, t]);

  const set = (key: keyof GeneralEventCreate, value: GeneralEventCreate[keyof GeneralEventCreate]) => {
    setForm(f => f ? { ...f, [key]: value } : f);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    try {
      await generalEventApi.updateEvent(id, form);
      setToast({ message: t('general_events.toast.updated'), type: 'success' });
      setTimeout(() => router.push(`/general-events/${id}`), 800);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('general_events.toast.error');
      setToast({ message, type: 'error' });
      setSaving(false);
    }
  };

  if (loading || !form) {
    return (
      <div className="p-8 flex justify-center pt-16">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl">
      {toast && (
        <ToastNotification message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      <div className="mb-6">
        <button
          onClick={() => router.push(`/general-events/${id}`)}
          className="text-sm text-stone-500 hover:text-stone-700 flex items-center gap-1 mb-3"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Event
        </button>
        <h1 className="text-2xl font-bold text-stone-800">{t('general_events.edit')}</h1>
      </div>

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
                value={form.name}
                onChange={e => set('name', e.target.value)}
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-stone-600 mb-1 block">{t('general_events.event_type')} *</label>
                <select
                  required
                  value={form.generalEventType}
                  onChange={e => set('generalEventType', e.target.value as GeneralEventType)}
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {EVENT_TYPES.map(tp => (
                    <option key={tp} value={tp}>{t(`general_events.types.${tp}`)}</option>
                  ))}
                </select>
              </div>
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
            </div>

            {form.generalEventType === 'OTHER' && (
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

            <div>
              <label className="text-sm font-medium text-stone-600 mb-1 block">{t('general_events.description')}</label>
              <textarea
                rows={3}
                value={form.description ?? ''}
                onChange={e => set('description', e.target.value)}
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

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

        {/* Options */}
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

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.push(`/general-events/${id}`)}
            className="px-5 py-2.5 text-sm text-stone-600 hover:text-stone-800 border border-stone-300 rounded-lg"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="bg-emerald-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-emerald-800 disabled:opacity-50 flex items-center gap-2"
          >
            {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}
