'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import LanguageSelector from '@/components/LanguageSelector';
import DateInput from '@/components/DateInput';
import TermsContentRenderer from '@/components/TermsContentRenderer';
import CountrySelectWithFlags from '@/components/CountrySelectWithFlags';
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input';
import type { Country, Labels } from 'react-phone-number-input';
import phoneLabelsEn from 'react-phone-number-input/locale/en.json';
import phoneLabelsNl from 'react-phone-number-input/locale/nl.json';
import { joinRequestApi, JoinRequestCreateDTO } from '@/lib/joinRequestApi';
import { membershipTermsApi, MembershipTermsVersionDTO } from '@/lib/membershipTermsApi';
import { countryApi, CountryDTO } from '@/lib/countryApi';
import { useAppName } from '@/lib/AppNameContext';

function RegisterMemberContent() {
  const { t, language } = useTranslation();
  const { appName } = useAppName();

  const searchParams = useSearchParams();
  const [orgHandle, setOrgHandle] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countries, setCountries] = useState<CountryDTO[]>([]);
  const [terms, setTerms] = useState<MembershipTermsVersionDTO | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const localizedTermsTitle = terms?.title || '';

  const localizedTermsContent = terms
    ? (language === 'nl' ? (terms.renderedContentNl?.trim() || terms.renderedContent) : terms.renderedContent)
    : '';

  const [form, setForm] = useState<Omit<JoinRequestCreateDTO, 'orgHandle'>>({
    firstName: '',
    lastName: '',
    email: searchParams.get('email') ?? '',
    phone: '',
    gender: '',
    dateOfBirth: '',
    address: '',
    city: '',
    country: '',
    postalCode: '',
    idNumber: '',
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const parts = hostname.split('.');
      // Extract subdomain (e.g., "mosque1" from "mosque1.lvh.me")
      if (parts.length > 1) {
        setOrgHandle(parts[0]);
      }
    }
  }, []);

  useEffect(() => {
    if (!orgHandle) return;
    membershipTermsApi.getCurrentPublic(orgHandle)
      .then((data) => {
        setTerms(data);
        setTermsAccepted(false);
      })
      .catch(() => {
        setTerms(null);
        setTermsAccepted(false);
      });
  }, [orgHandle]);

  useEffect(() => {
    const loadCountries = async () => {
      try {
        const data = await countryApi.getAll(language);
        setCountries(Array.isArray(data) ? data : []);
      } catch {
        setCountries([]);
      }
    };
    loadCountries();
  }, [language]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // Country names for the phone selector: the library's built-in translations,
  // overlaid with the localized names from our own countries table when available.
  const phoneLabels = useMemo<Labels>(() => {
    const labels: Record<string, string> = {
      ...(language === 'nl' ? phoneLabelsNl : phoneLabelsEn),
      country: t('register_member.country_select'),
      phone: t('register_member.phone'),
      ZZ: t('register_member.country_select'),
    };
    countries.forEach((country) => {
      labels[country.isoCode] = country.name;
    });
    return labels as Labels;
  }, [countries, language, t]);

  // Preselect the dial code from the address country the applicant picked
  const defaultPhoneCountry = useMemo<Country | undefined>(() => {
    if (!form.country) return undefined;
    const match = countries.find((country) => country.name === form.country);
    return match ? (match.isoCode as Country) : undefined;
  }, [form.country, countries]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (terms && !termsAccepted) {
      setError(t('register_member.terms_required'));
      return;
    }

    const phone = form.phone?.trim() ? form.phone : '';
    const email = form.email?.trim() ? form.email.trim() : '';

    // The phone number doubles as the login when no email is given
    if (phone && !isValidPhoneNumber(phone)) {
      setError(t('register_member.phone_invalid'));
      return;
    }

    if (!email && !phone) {
      setError(t('register_member.contact_required'));
      return;
    }

    setLoading(true);

    try {
      await joinRequestApi.apply({ orgHandle, ...form, email, phone, acceptedTermsVersionId: terms?.id });
      setSubmitted(true);
    } catch (err) {
      const rawMessage = err instanceof Error ? err.message : '';

      let backendMessage = rawMessage;
      try {
        const parsed = JSON.parse(rawMessage);
        if (parsed?.error && typeof parsed.error === 'string') {
          backendMessage = parsed.error;
        }
      } catch {
        // message is plain text
      }

      const normalized = backendMessage.toLowerCase();
      if (normalized.includes('either an email address or a phone number')) {
        setError(t('register_member.contact_required'));
      } else if (normalized.includes('already has a registration request')) {
        setError(t('register_member.error_email_pending'));
      } else if (normalized.includes('already registered in this organization')) {
        setError(t('register_member.error_email_registered'));
      } else if (normalized.includes('organization not found')) {
        setError(t('register_member.error_org_not_found'));
      } else if (normalized.includes('latest membership terms')) {
        setError(t('register_member.terms_required'));
      } else {
        setError(t('register_member.error'));
      }
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-cream flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-charcoal mb-2">{t('register_member.success_title')}</h2>
          <p className="text-gray-600">
            {form.email?.trim()
              ? t('register_member.success_message')
              : t('register_member.success_message_no_email')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-cream flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-charcoal">{t('register_member.title')}</h1>
              {appName && <p className="text-emerald-700 font-medium mt-0.5">{appName}</p>}
            </div>
            <LanguageSelector />
          </div>
          <p className="text-gray-600 mb-6">{t('register_member.subtitle')}</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1">
                  {t('register_member.first_name')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={form.firstName}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                  placeholder={t('register_member.first_name_placeholder')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1">
                  {t('register_member.last_name')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={form.lastName}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                  placeholder={t('register_member.last_name_placeholder')}
                />
              </div>
            </div>

            {/* Email (optional) */}
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">
                {t('register_member.email')}
              </label>
              <input
                type="email"
                name="email"
                value={form.email ?? ''}
                onChange={handleChange}
                readOnly={!!searchParams.get('email')}
                className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition ${searchParams.get('email') ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''}`}
                placeholder={t('register_member.email_placeholder')}
              />
              <p className="mt-1 text-xs text-gray-500">{t('register_member.email_hint')}</p>
            </div>

            {/* Phone + Gender */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1">
                  {t('register_member.phone')}
                </label>
                <PhoneInput
                  international
                  name="phone"
                  value={form.phone || undefined}
                  onChange={(value) => setForm((prev) => ({ ...prev, phone: value ?? '' }))}
                  defaultCountry={defaultPhoneCountry}
                  labels={phoneLabels}
                  countrySelectComponent={CountrySelectWithFlags}
                  countrySelectProps={{
                    searchPlaceholder: t('register_member.phone_country_search'),
                    noResultsLabel: t('register_member.phone_country_empty'),
                  }}
                  placeholder={t('register_member.phone_placeholder')}
                  className="phone-field w-full px-4 py-2.5 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-transparent transition"
                />
                <p className="mt-1 text-xs text-gray-500">{t('register_member.phone_hint')}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1">
                  {t('register_member.gender')} <span className="text-red-500">*</span>
                </label>
                <select
                  name="gender"
                  value={form.gender}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition bg-white"
                >
                  <option value="">{t('register_member.gender_select')}</option>
                  <option value="MALE">{t('register_member.gender_male')}</option>
                  <option value="FEMALE">{t('register_member.gender_female')}</option>
                </select>
              </div>
            </div>

            {/* Date of Birth + ID Number */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1">
                  {t('register_member.date_of_birth')} <span className="text-red-500">*</span>
                </label>
                <DateInput
                  name="dateOfBirth"
                  value={form.dateOfBirth ?? ''}
                  onChange={(iso) => setForm(prev => ({ ...prev, dateOfBirth: iso }))}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1">
                  {t('register_member.id_number')}
                </label>
                <input
                  type="text"
                  name="idNumber"
                  value={form.idNumber}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                  placeholder={t('register_member.id_number_placeholder')}
                />
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">
                {t('register_member.address')}
              </label>
              <input
                type="text"
                name="address"
                value={form.address}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                placeholder={t('register_member.address_placeholder')}
              />
            </div>

            {/* City + Country */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1">
                  {t('register_member.city')}
                </label>
                <input
                  type="text"
                  name="city"
                  value={form.city}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                  placeholder={t('register_member.city_placeholder')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1">
                  {t('register_member.country')}
                </label>
                <select
                  name="country"
                  value={form.country}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition bg-white"
                >
                  <option value="">{t('register_member.country_select')}</option>
                  {countries.map((country) => (
                    <option key={country.isoCode} value={country.name}>{country.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {terms && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-semibold text-charcoal">{localizedTermsTitle}</h2>
                  <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                    {t('register_member.terms_version_badge', { version: String(terms.versionNumber) })}
                  </span>
                </div>
                <TermsContentRenderer
                  content={localizedTermsContent}
                  className="max-h-64 overflow-y-auto rounded-lg border border-emerald-100 bg-white p-4 text-sm leading-6 text-gray-700"
                />
                <label className="mt-4 flex items-start gap-3 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-emerald-700 focus:ring-emerald-500"
                  />
                  <span>{t('register_member.terms_accept_label', { version: String(terms.versionNumber) })}</span>
                </label>
              </div>
            )}

            {error && (
              <div className="p-4 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading || (!!terms && !termsAccepted)}
              className="w-full bg-emerald-700 text-white py-3 rounded-lg font-semibold hover:bg-emerald-800 transition disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? t('register_member.submitting') : t('register_member.submit')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function RegisterMemberPage() {
  return (
    <Suspense>
      <RegisterMemberContent />
    </Suspense>
  );
}
