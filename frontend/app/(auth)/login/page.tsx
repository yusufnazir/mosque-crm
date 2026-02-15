'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/Button';
import LanguageSelector from '@/components/LanguageSelector';
import { authApi } from '@/lib/api';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { useAuth } from '@/lib/auth/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { syncLanguageWithBackend, t } = useTranslation();
  const { refresh: refreshAuth } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response: any = await authApi.login({ username, password });

      // With BFF pattern, the JWT is stored as an httpOnly cookie by the server.
      // The response no longer contains a token — just user data.

      // Store personId if it exists (for member profile access)
      if (response.personId) {
        localStorage.setItem('personId', response.personId.toString());
      }
      if (response.memberId) {
        localStorage.setItem('memberId', response.memberId.toString());
      }
      
      // Initialize language from backend preferences
      if (response.preferences?.language) {
        localStorage.setItem('lang', response.preferences.language);
      }
      
      // Sync language preference from backend (DB is source of truth after login)
      await syncLanguageWithBackend();
      
      // Refresh AuthContext so /api/me is fetched with the new session cookie
      await refreshAuth();
      
      // Redirect to dashboard for all users
      router.push('/dashboard');
    } catch (err: any) {
      const code = err.code || 'login_failed';
      // Use translated message if available, otherwise fall back to server message
      const translationKey = `login.errors.${code}`;
      const translated = t(translationKey);
      const message = translated !== translationKey ? translated : (err.message || t('login.errors.login_failed'));
      setError({ code, message });
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
          <h1 className="text-2xl md:text-3xl font-bold text-charcoal mb-2">{t('login.title')}</h1>
          <p className="text-gray-600">{t('login.subtitle')}</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-charcoal">{t('login.sign_in')}</h2>
            <LanguageSelector />
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-red-800">{error.message}</p>
                {error.code === 'account_disabled' && (
                  <p className="text-xs text-red-600 mt-1">{t('login.errors.contact_admin')}</p>
                )}
                {error.code === 'account_locked' && (
                  <p className="text-xs text-red-600 mt-1">{t('login.errors.contact_admin')}</p>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-charcoal mb-2">
                {t('login.username')}
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                placeholder={t('login.username_placeholder')}
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-charcoal mb-2">
                {t('login.password')}
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                placeholder={t('login.password_placeholder')}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t('login.signing_in') : t('login.sign_in_button')}
            </Button>
          </form>

          {/* Forgot Password Link */}
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => router.push('/forgot-password')}
              className="text-sm text-emerald-700 hover:text-emerald-800 hover:underline"
            >
              {t('login.forgot_password')}
            </button>
          </div>

          {/* Demo Credentials */}
          <div className="mt-6 p-4 bg-emerald-50 rounded-lg text-sm">
            <p className="font-medium text-emerald-800 mb-2">Demo Credentials:</p>
            <div className="space-y-1 text-emerald-700">
              <p>
                <strong>Admin:</strong> admin / admin123
              </p>
              <p>
                <strong>Member:</strong> ahmed / password123
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
