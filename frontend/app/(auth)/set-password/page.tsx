'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { useAppName } from '@/lib/AppNameContext';
import LanguageSelector from '@/components/LanguageSelector';

export default function SetPasswordPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { appName } = useAppName();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const validatePassword = () => {
    if (newPassword.length < 6) {
      setError(t('setPassword.passwordTooShort'));
      return false;
    }
    if (newPassword !== confirmPassword) {
      setError(t('setPassword.passwordMismatch'));
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validatePassword()) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/set-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ newPassword }),
      });

      if (response.ok) {
        router.push('/dashboard');
      } else {
        const data = await response.json();
        setError(data.message || t('setPassword.error'));
      }
    } catch {
      setError(t('setPassword.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Header */}
        <div className="text-center mb-4 md:mb-8">
          <div className="inline-block p-4 bg-emerald-600 rounded-full mb-4">
            <svg
              className="w-12 h-12 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-charcoal mb-2">{appName}</h1>
          <p className="text-gray-600">{t('setPassword.subtitle')}</p>
        </div>

        {/* Set Password Form */}
        <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-charcoal">{t('setPassword.title')}</h2>
            <LanguageSelector />
          </div>

          <p className="text-sm text-gray-600 mb-6">
            {t('setPassword.description')}
          </p>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-charcoal mb-2">
                {t('setPassword.newPassword')}
              </label>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                placeholder={t('setPassword.newPasswordPlaceholder')}
                required
                minLength={6}
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-charcoal mb-2">
                {t('setPassword.confirmPassword')}
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                placeholder={t('setPassword.confirmPasswordPlaceholder')}
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-700 text-white py-3 rounded-lg font-semibold hover:bg-emerald-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? t('setPassword.setting') : t('setPassword.submit')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
