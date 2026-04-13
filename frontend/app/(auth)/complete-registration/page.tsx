'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import LanguageSelector from '@/components/LanguageSelector';
import { joinRequestApi, ValidateTokenResponse } from '@/lib/joinRequestApi';
import { buildTenantUrl } from '@/lib/auth/AuthContext';
import { useAppName } from '@/lib/AppNameContext';

function CompleteRegistrationContent() {
  const { t } = useTranslation();
  const { appName } = useAppName();
  const searchParams = useSearchParams();

  const [token, setToken] = useState('');
  const [tokenData, setTokenData] = useState<ValidateTokenResponse | null>(null);
  const [tokenError, setTokenError] = useState('');
  const [validating, setValidating] = useState(true);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [orgHandle, setOrgHandle] = useState('');

  useEffect(() => {
    const t = searchParams.get('token');
    if (!t) {
      setTokenError('complete_registration.no_token');
      setValidating(false);
      return;
    }
    setToken(t);
    joinRequestApi
      .validateToken(t)
      .then((data) => {
        setTokenData(data);
        setValidating(false);
      })
      .catch(() => {
        setTokenError('complete_registration.invalid_token');
        setValidating(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError(t('complete_registration.password_too_short'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('complete_registration.password_mismatch'));
      return;
    }

    setLoading(true);
    try {
      const response = await joinRequestApi.completeRegistration({ token, password });
      setOrgHandle(response.orgHandle);
      setSuccess(true);
    } catch {
      setError(t('complete_registration.error'));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    const loginUrl = buildTenantUrl(orgHandle, '/login');
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-cream flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-charcoal mb-2">{t('complete_registration.success_title')}</h2>
          <p className="text-gray-600 mb-6">{t('complete_registration.success_message')}</p>
          <a
            href={loginUrl}
            className="inline-block bg-emerald-700 text-white px-6 py-3 rounded-lg font-semibold hover:bg-emerald-800 transition"
          >
            {t('complete_registration.go_to_login')}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-cream flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-2xl font-bold text-charcoal">{t('complete_registration.title')}</h1>
              {appName && <p className="text-emerald-700 font-medium mt-0.5">{appName}</p>}
            </div>
            <LanguageSelector />
          </div>

          {validating ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-700" />
            </div>
          ) : tokenError ? (
            <div className="p-4 rounded-lg bg-red-50 text-red-700 mt-4">{t(tokenError)}</div>
          ) : tokenData ? (
            <>
              {/* Pre-filled info (read-only) */}
              <div className="space-y-2 mt-4 mb-6 p-4 bg-gray-50 rounded-lg text-sm">
                <div className="flex gap-2">
                  <span className="font-medium text-gray-700 w-24">{t('complete_registration.name')}:</span>
                  <span className="text-gray-900">{tokenData.firstName} {tokenData.lastName}</span>
                </div>
                <div className="flex gap-2">
                  <span className="font-medium text-gray-700 w-24">{t('complete_registration.email')}:</span>
                  <span className="text-gray-900">{tokenData.email}</span>
                </div>
              </div>

              <p className="text-gray-600 text-sm mb-4">{t('complete_registration.set_password_instruction')}</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-charcoal mb-1">
                    {t('complete_registration.password')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                    placeholder={t('complete_registration.password_placeholder')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-charcoal mb-1">
                    {t('complete_registration.confirm_password')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                    placeholder={t('complete_registration.confirm_password_placeholder')}
                  />
                </div>

                {error && (
                  <div className="p-4 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-emerald-700 text-white py-3 rounded-lg font-semibold hover:bg-emerald-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? t('complete_registration.activating') : t('complete_registration.submit')}
                </button>
              </form>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function CompleteRegistrationPage() {
  return (
    <Suspense>
      <CompleteRegistrationContent />
    </Suspense>
  );
}
