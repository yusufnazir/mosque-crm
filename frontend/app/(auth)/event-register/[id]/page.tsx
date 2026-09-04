'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import LanguageSelector from '@/components/LanguageSelector';
import { buildAuthUrl, useAuth } from '@/lib/auth/AuthContext';
import { useAppName } from '@/lib/AppNameContext';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import RegistrationQuestionAnswers, {
  createAnswersForQuestions,
  missingRequiredAnswers,
} from '@/components/RegistrationQuestionAnswers';
import {
  generalEventApi,
  PublicGeneralEvent,
  GeneralEventRegistration,
  GeneralEventQuestionAnswer,
} from '@/lib/generalEventApi';
import { parseApiErrorBody } from '@/lib/api';
import { copyToClipboard } from '@/lib/utils';

function extractOrgHandle(): string {
  if (typeof window === 'undefined') return '';
  const parts = window.location.hostname.split('.').filter(Boolean);
  if (parts.length > 1) {
    const sub = parts[0];
    if (!['www', 'auth', 'admin', 'api', 'app', 'mail', 'login'].includes(sub)) {
      return sub;
    }
  }
  return '';
}

export default function EventRegisterPage() {
  const params = useParams();
  const eventId = Number(params.id);
  const { t, language } = useTranslation();
  const { appName } = useAppName();
  const { user, loading: authLoading } = useAuth();

  const [orgHandle, setOrgHandle] = useState('');
  const [event, setEvent] = useState<PublicGeneralEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<GeneralEventRegistration | null>(null);
  // Avoid SSR/client mismatch: buildAuthUrl() needs window (auth.lvh.me vs /login)
  const [mounted, setMounted] = useState(false);
  const [loginHref, setLoginHref] = useState('/login');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [partySize, setPartySize] = useState(1);
  const [specialRequests, setSpecialRequests] = useState('');
  const [questionAnswers, setQuestionAnswers] = useState<GeneralEventQuestionAnswer[]>([]);
  const [copiedManageLink, setCopiedManageLink] = useState(false);

  useEffect(() => {
    setMounted(true);
    setLoginHref(buildAuthUrl('/login'));
    setOrgHandle(extractOrgHandle());
  }, []);

  useEffect(() => {
    if (!orgHandle || !eventId || Number.isNaN(eventId)) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    generalEventApi
      .getPublicEvent(orgHandle, eventId)
      .then((data) => {
        if (cancelled) return;
        setEvent(data);
        setQuestionAnswers(
          data.registrationQuestions && data.registrationQuestions.length
            ? createAnswersForQuestions(data.registrationQuestions)
            : []
        );
      })
      .catch((err) => {
        if (cancelled) return;
        const body = parseApiErrorBody(err);
        setError(body?.error || t('general_events.public_registration.event_not_found'));
        setEvent(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [orgHandle, eventId, t, user?.personId]);

  const mapError = (err: unknown): string => {
    const body = parseApiErrorBody(err);
    const msg = (body?.error || (err instanceof Error ? err.message : '')).toLowerCase();
    if (msg.includes('already registered')) return t('general_events.public_registration.error_already_registered');
    if (msg.includes('email is already')) return t('general_events.public_registration.error_email_taken');
    if (msg.includes('not open')) return t('general_events.public_registration.error_closed');
    if (msg.includes('full')) return t('general_events.public_registration.error_full');
    if (msg.includes('members only')) return t('general_events.public_registration.error_members_only');
    if (msg.includes('logged in')) return t('general_events.public_registration.error_login_required');
    if (msg.includes('first name is required')) return t('general_events.public_registration.error_first_name');
    if (msg.includes('last name is required')) return t('general_events.public_registration.error_last_name');
    if (msg.includes('name is required')) return t('general_events.public_registration.error_name');
    if (msg.includes('email is required')) return t('general_events.public_registration.error_email');
    return body?.error || t('general_events.public_registration.error_generic');
  };

  const handleOptIn = async () => {
    if (!orgHandle || !eventId) return;
    setSubmitting(true);
    setError('');
    try {
      const reg = await generalEventApi.selfRegister(orgHandle, eventId, { optIn: true });
      setResult(reg);
    } catch (err) {
      setError(mapError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!orgHandle || !eventId) return;
    const questions = event?.registrationQuestions ?? [];
    const missing = missingRequiredAnswers(questions, questionAnswers);
    if (missing.length > 0) {
      setError(t('general_events.public_registration.error_required_questions', {
        questions: missing.join(', '),
      }));
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const reg = await generalEventApi.selfRegister(orgHandle, eventId, {
        optIn: false,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phoneNumber: event?.publicFormShowPhone !== false ? (phoneNumber.trim() || undefined) : undefined,
        partySize: event?.publicFormShowPartySize === true ? partySize : 1,
        specialRequests: event?.publicFormShowSpecialRequests !== false
          ? (specialRequests.trim() || undefined)
          : undefined,
        email: email.trim(),
        answers: questionAnswers,
      });
      setResult(reg);
    } catch (err) {
      setError(mapError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (iso: string | null | undefined) => {
    if (!iso) return '';
    try {
      return new Date(iso + (iso.length === 10 ? 'T00:00:00' : '')).toLocaleDateString(
        language === 'nl' ? 'nl-NL' : 'en-GB',
        { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
      );
    } catch {
      return iso;
    }
  };

  if (result) {
    const isWaitlist = result.rsvpStatus === 'WAITLIST';
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-cream flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isWaitlist ? 'bg-amber-100' : 'bg-emerald-100'}`}>
            <svg className={`w-8 h-8 ${isWaitlist ? 'text-amber-600' : 'text-emerald-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-charcoal mb-2">
            {isWaitlist
              ? t('general_events.public_registration.waitlist_title')
              : t('general_events.public_registration.success_title')}
          </h2>
          <p className="text-gray-600 mb-2">
            {isWaitlist
              ? t('general_events.public_registration.waitlist_message')
              : t('general_events.public_registration.success_message')}
          </p>
          {result.registrantType === 'MEMBER' && (
            <p className="text-sm text-emerald-700 font-medium mb-4">
              {t('general_events.public_registration.flagged_member')}
            </p>
          )}
          {event && <p className="text-sm text-stone-500 mb-4">{event.name}</p>}
          {result.editToken && (
            <div className="rounded-xl bg-stone-50 border border-stone-200 p-4 text-left">
              <p className="text-xs text-stone-600 mb-2">{t('general_events.manage_registration.save_link_hint')}</p>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={`${window.location.origin}/registration/${result.editToken}`}
                  className="flex-1 min-w-0 px-3 py-2 border border-stone-300 rounded-lg bg-white text-stone-700 text-xs select-all"
                />
                <button
                  type="button"
                  onClick={async () => {
                    const ok = await copyToClipboard(`${window.location.origin}/registration/${result.editToken}`);
                    if (ok) {
                      setCopiedManageLink(true);
                      setTimeout(() => setCopiedManageLink(false), 2000);
                    }
                  }}
                  className="shrink-0 px-3 py-2 bg-emerald-700 text-white rounded-lg text-xs font-medium hover:bg-emerald-800"
                >
                  {copiedManageLink
                    ? t('general_events.public_link.copied')
                    : t('general_events.manage_registration.copy_button')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-cream flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-sm text-emerald-700 font-medium">{appName || 'MemberFlow'}</p>
            {event?.organizationName && (
              <p className="text-xs text-stone-500">{event.organizationName}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <LanguageSelector variant="public" />
            {mounted && !user && (
              <Link href={loginHref} className="text-sm font-medium text-emerald-700 hover:underline">
                {t('general_events.public_registration.login')}
              </Link>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
          {loading || authLoading ? (
            <div className="flex justify-center py-12">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-100 border-t-primary-600" />
            </div>
          ) : !event ? (
            <div className="text-center py-8">
              <h1 className="text-xl font-bold text-charcoal mb-2">{t('general_events.public_registration.event_not_found')}</h1>
              <p className="text-sm text-stone-500">{error || t('general_events.public_registration.event_not_found_hint')}</p>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-charcoal mb-1">{event.name}</h1>
              <p className="text-sm text-stone-500 mb-4">
                {event.customTypeLabel
                  || (event.generalEventType
                    ? t(`general_events.types.${event.generalEventType}`)
                    : '')}
              </p>

              <dl className="space-y-2 text-sm mb-6 border-b border-stone-100 pb-6">
                <div className="flex justify-between gap-4">
                  <dt className="text-stone-500">{t('general_events.start_date')}</dt>
                  <dd className="font-medium text-stone-800 text-right">{formatDate(event.startDate)}</dd>
                </div>
                {event.startTime && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-stone-500">{t('general_events.start_time')}</dt>
                    <dd className="font-medium text-stone-800">
                      {event.startTime}{event.endTime ? ` – ${event.endTime}` : ''}
                    </dd>
                  </div>
                )}
                {event.location && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-stone-500">{t('general_events.location')}</dt>
                    <dd className="font-medium text-stone-800 text-right">{event.location}</dd>
                  </div>
                )}
                {event.spotsRemaining != null && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-stone-500">{t('general_events.public_registration.spots_remaining')}</dt>
                    <dd className="font-medium text-stone-800">{event.spotsRemaining}</dd>
                  </div>
                )}
              </dl>

              {event.description && (
                <p className="text-sm text-stone-600 whitespace-pre-wrap mb-6">{event.description}</p>
              )}

              {error && (
                <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">
                  {error}
                </div>
              )}

              {event.alreadyRegistered ? (
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm px-4 py-3">
                  {t('general_events.public_registration.already_registered')}
                </div>
              ) : !event.registrationOpen ? (
                <div className="rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3">
                  {t('general_events.public_registration.registration_closed')}
                </div>
              ) : (
                <>
                  {event.canOptIn && !(event.registrationQuestions && event.registrationQuestions.length > 0) && (
                    <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
                      <p className="text-sm text-stone-700 mb-1">
                        {t('general_events.public_registration.opt_in_greeting', {
                          name: event.optInDisplayName || user?.username || '',
                        })}
                      </p>
                      <p className="text-xs text-stone-500 mb-3">
                        {t('general_events.public_registration.opt_in_hint')}
                      </p>
                      <button
                        type="button"
                        onClick={handleOptIn}
                        disabled={submitting}
                        className="w-full bg-emerald-700 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-emerald-800 disabled:opacity-50"
                      >
                        {submitting
                          ? t('general_events.public_registration.submitting')
                          : t('general_events.public_registration.opt_in_button')}
                      </button>
                      <p className="text-center text-xs text-stone-400 mt-3">
                        {t('general_events.public_registration.or_fill_form')}
                      </p>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1">
                          {t('general_events.registrations.first_name')} *
                        </label>
                        <input
                          required
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          autoComplete="given-name"
                          className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1">
                          {t('general_events.registrations.last_name')} *
                        </label>
                        <input
                          required
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          autoComplete="family-name"
                          className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">
                        {t('general_events.registrations.email')} *
                      </label>
                      <input
                        required
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
                        className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      />
                    </div>
                    {(event.publicFormShowPhone !== false) && (
                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1">
                          {t('general_events.registrations.phone')}
                        </label>
                        <input
                          type="tel"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </div>
                    )}
                    {event.publicFormShowPartySize === true && (
                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1">
                          {t('general_events.registrations.party_size')}
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={50}
                          value={partySize}
                          onChange={(e) => setPartySize(Math.max(1, Number(e.target.value) || 1))}
                          className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </div>
                    )}
                    {(event.publicFormShowSpecialRequests !== false) && (
                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1">
                          {t('general_events.registrations.special_requests')}
                        </label>
                        <textarea
                          rows={2}
                          value={specialRequests}
                          onChange={(e) => setSpecialRequests(e.target.value)}
                          className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </div>
                    )}
                    {event.registrationQuestions && event.registrationQuestions.length > 0 && (
                      <div className="rounded-xl border border-stone-200 bg-stone-50/60 p-4">
                        <p className="text-sm font-semibold text-stone-700 mb-3">
                          {t('general_events.questions.answer_heading')}
                        </p>
                        <RegistrationQuestionAnswers
                          questions={event.registrationQuestions}
                          answers={questionAnswers}
                          onChange={setQuestionAnswers}
                        />
                      </div>
                    )}
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full bg-emerald-700 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-emerald-800 disabled:opacity-50"
                    >
                      {submitting
                        ? t('general_events.public_registration.submitting')
                        : t('general_events.public_registration.submit')}
                    </button>
                  </form>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
