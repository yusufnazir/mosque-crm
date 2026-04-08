'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/Button';
import LanguageSelector from '@/components/LanguageSelector';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { useAuth } from '@/lib/auth/AuthContext';
import { useAppName } from '@/lib/AppNameContext';

/** Convert a display name to a URL-safe slug */
function generateSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s\-]/g, '')
    .replace(/[\s]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '');
}

export default function RegisterPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { refresh: refreshAuth } = useAuth();
  const { appName } = useAppName();
  const [organizationName, setOrganizationName] = useState('');
  const [handle, setHandle] = useState('');
  const [handleManuallyEdited, setHandleManuallyEdited] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleOrgNameChange = (value: string) => {
    setOrganizationName(value);
    // Auto-generate handle only if user has not manually edited it
    if (!handleManuallyEdited) {
      setHandle(generateSlug(value));
    }
  };

  const handleHandleChange = (value: string) => {
    // Allow only lowercase letters, numbers, hyphens
    const sanitized = value.toLowerCase().replace(/[^a-z0-9\-]/g, '');
    setHandle(sanitized);
    setHandleManuallyEdited(sanitized !== '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (handle && !/^[a-z0-9\-]+$/.test(handle)) {
      setError(t('register.errors.handle_invalid'));
      return;
    }
    if (password.length < 6) {
      setError(t('register.errors.password_too_short'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('register.errors.password_mismatch'));
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationName: organizationName.trim(),
          handle: handle.trim() || null,
          username: username.trim(),
          email: email.trim() || null,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const msg = data.message || t('register.errors.registration_failed');
        setError(msg);
        return;
      }

      // Registration successful — JWT cookie is set by BFF
      await refreshAuth();
      router.push('/dashboard');
    } catch {
      setError(t('register.errors.registration_failed'));
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
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-charcoal mb-2">{appName}</h1>
          <p className="text-gray-600">{t('register.subtitle')}</p>
        </div>

        {/* Registration Form */}
        <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-charcoal">{t('register.title')}</h2>
            <LanguageSelector />
          </div>

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
              <label htmlFor="organizationName" className="block text-sm font-medium text-charcoal mb-2">
                {t('register.organization_name')}
              </label>
              <input
                id="organizationName"
                type="text"
                value={organizationName}
                onChange={(e) => handleOrgNameChange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                placeholder={t('register.organization_name_placeholder')}
                required
              />
            </div>

            <div>
              <label htmlFor="handle" className="block text-sm font-medium text-charcoal mb-2">
                {t('register.handle')}
                <span className="text-gray-400 font-normal ml-1">({t('register.optional')})</span>
              </label>
              <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-emerald-500 transition-all">
                <input
                  id="handle"
                  type="text"
                  value={handle}
                  onChange={(e) => handleHandleChange(e.target.value)}
                  className="flex-1 px-3 py-2 outline-none bg-white text-sm"
                  placeholder={t('register.handle_placeholder')}
                />
                <span className="px-3 py-2 bg-gray-50 text-gray-400 text-sm border-l border-gray-300 select-none whitespace-nowrap">
                  {t('register.handle_suffix')}
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-400">{t('register.handle_hint')}</p>
            </div>

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-charcoal mb-2">
                {t('register.username')}
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                placeholder={t('register.username_placeholder')}
                required
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-charcoal mb-2">
                {t('register.email')}
                <span className="text-gray-400 font-normal ml-1">({t('register.optional')})</span>
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                placeholder={t('register.email_placeholder')}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-charcoal mb-2">
                {t('register.password')}
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                placeholder={t('register.password_placeholder')}
                required
                minLength={6}
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-charcoal mb-2">
                {t('register.confirm_password')}
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                placeholder={t('register.confirm_password_placeholder')}
                required
                minLength={6}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t('register.registering') : t('register.register_button')}
            </Button>
          </form>

          {/* Free plan note */}
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
            <p className="text-xs text-emerald-700 text-center">{t('register.free_plan_note')}</p>
          </div>

          {/* Login link */}
          <div className="mt-4 text-center">
            <span className="text-sm text-gray-600">{t('register.already_have_account')}</span>
            {' '}
            <button
              type="button"
              onClick={() => router.push('/login')}
              className="text-sm text-emerald-700 hover:text-emerald-800 hover:underline font-medium"
            >
              {t('register.sign_in')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
