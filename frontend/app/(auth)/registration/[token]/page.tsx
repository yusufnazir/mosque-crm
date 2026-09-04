'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import LanguageSelector from '@/components/LanguageSelector';
import { useAppName } from '@/lib/AppNameContext';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import RegistrationQuestionAnswers, {
  answersFromRegistration,
  missingRequiredAnswers,
} from '@/components/RegistrationQuestionAnswers';
import {
  generalEventApi,
  PublicRegistrationManage,
  GeneralEventQuestionAnswer,
} from '@/lib/generalEventApi';
import { parseApiErrorBody } from '@/lib/api';

export default function RegistrationManagePage() {
  const params = useParams();
  const token = Array.isArray(params.token) ? params.token[0] : params.token;
  const { t, language } = useTranslation();
  const { appName } = useAppName();

  const [data, setData] = useState<PublicRegistrationManage | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [partySize, setPartySize] = useState(1);
  const [specialRequests, setSpecialRequests] = useState('');
  const [questionAnswers, setQuestionAnswers] = useState<GeneralEventQuestionAnswer[]>([]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    generalEventApi
      .getRegistrationManage(token)
      .then((d) => {
        if (cancelled) return;
        setData(d);
        setName(d.name || '');
        setEmail(d.email || '');
        setPhoneNumber(d.phoneNumber || '');
        setPartySize(d.partySize || 1);
        setSpecialRequests(d.specialRequests || '');
        setQuestionAnswers(
          d.event.registrationQuestions && d.event.registrationQuestions.length
            ? answersFromRegistration(d.event.registrationQuestions, d.answers)
            : []
        );
      })
      .catch((err) => {
        if (cancelled) return;
        const body = parseApiErrorBody(err);
        setError(body?.error || t('general_events.manage_registration.not_found'));
        setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, t]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data || !token) return;
    const questions = data.event.registrationQuestions ?? [];
    const missing = missingRequiredAnswers(questions, questionAnswers);
    if (missing.length > 0) {
      setError(t('general_events.public_registration.error_required_questions', {
        questions: missing.join(', '),
      }));
      return;
    }
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const updated = await generalEventApi.updateRegistrationManage(token, {
        name: name.trim(),
        email: email.trim(),
        phoneNumber: data.event.publicFormShowPhone !== false ? (phoneNumber.trim() || undefined) : undefined,
        partySize: data.event.publicFormShowPartySize === true ? (partySize > 0 ? partySize : 1) : undefined,
        specialRequests: data.event.publicFormShowSpecialRequests !== false
          ? (specialRequests.trim() || undefined)
          : undefined,
        answers: questionAnswers,
      });
      setData(updated);
      setSaved(true);
    } catch (err) {
      const body = parseApiErrorBody(err);
      const msg = (body?.error || (err instanceof Error ? err.message : '')).toLowerCase();
      if (msg.includes('closed')) setError(t('general_events.manage_registration.closed_error'));
      else if (msg.includes('email is already')) setError(t('general_events.public_registration.error_email_taken'));
      else setError(body?.error || t('general_events.manage_registration.error_generic'));
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    'w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500';
  const labelClass = 'block text-sm font-medium text-stone-700 mb-1';

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-cream flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-sm text-emerald-700 font-medium">{appName || 'MemberFlow'}</p>
            {data?.event.organizationName && (
              <p className="text-xs text-stone-500">{data.event.organizationName}</p>
            )}
          </div>
          <LanguageSelector variant="public" />
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-100 border-t-primary-600" />
            </div>
          ) : !data ? (
            <div className="text-center py-8">
              <h1 className="text-xl font-bold text-charcoal mb-2">{t('general_events.manage_registration.not_found')}</h1>
              <p className="text-sm text-stone-500">{error || t('general_events.manage_registration.not_found_hint')}</p>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-charcoal mb-1">{data.event.name}</h1>
              <p className="text-sm text-stone-500 mb-4">
                {data.event.customTypeLabel
                  || (data.event.generalEventType ? t(`general_events.types.${data.event.generalEventType}`) : '')}
              </p>
              <p className="text-sm text-stone-600 mb-4">{formatDate(data.event.startDate)}</p>

              {saved && (
                <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm px-4 py-3">
                  {t('general_events.manage_registration.updated')}
                </div>
              )}

              {error && (
                <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">
                  {error}
                </div>
              )}

              {!data.canEdit ? (
                <div className="rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3">
                  {t('general_events.manage_registration.cannot_edit')}
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className={labelClass}>{t('general_events.registrations.name')} *</label>
                    <input required value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>{t('general_events.registrations.email')} *</label>
                    <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className={inputClass} />
                  </div>
                  {data.event.publicFormShowPhone !== false && (
                    <div>
                      <label className={labelClass}>{t('general_events.registrations.phone')}</label>
                      <input type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} autoComplete="tel" className={inputClass} />
                    </div>
                  )}
                  {data.event.publicFormShowPartySize === true && (
                    <div>
                      <label className={labelClass}>{t('general_events.registrations.party_size')}</label>
                      <input
                        type="number"
                        min={1}
                        max={50}
                        value={partySize}
                        onChange={(e) => setPartySize(Math.max(1, Number(e.target.value) || 1))}
                        className={inputClass}
                      />
                    </div>
                  )}
                  {data.event.publicFormShowSpecialRequests !== false && (
                    <div>
                      <label className={labelClass}>{t('general_events.registrations.special_requests')}</label>
                      <textarea rows={2} value={specialRequests} onChange={(e) => setSpecialRequests(e.target.value)} className={inputClass} />
                    </div>
                  )}

                  {data.event.registrationQuestions && data.event.registrationQuestions.length > 0 && (
                    <div className="rounded-xl border border-stone-200 bg-stone-50/60 p-4">
                      <p className="text-sm font-semibold text-stone-700 mb-3">
                        {t('general_events.questions.answer_heading')}
                      </p>
                      <RegistrationQuestionAnswers
                        questions={data.event.registrationQuestions}
                        answers={questionAnswers}
                        onChange={setQuestionAnswers}
                      />
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full bg-emerald-700 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-emerald-800 disabled:opacity-50"
                  >
                    {saving
                      ? t('general_events.manage_registration.saving')
                      : t('general_events.manage_registration.save_button')}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
