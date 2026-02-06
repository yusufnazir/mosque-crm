'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/Button';
import LanguageSelector from '@/components/LanguageSelector';
import { authApi } from '@/lib/api';
import { useTranslation } from '@/lib/i18n/LanguageContext';

export default function LoginPage() {
  const router = useRouter();
  const { syncLanguageWithBackend, t } = useTranslation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response: any = await authApi.login({ username, password });
      localStorage.setItem('token', response.token);
      localStorage.setItem('role', response.role);
      
      // Store personId if it exists (linked member profile)
      if (response.personId) {
        localStorage.setItem('personId', response.personId.toString());
      }

      // Backward compatibility: store memberId if provided
      if (response.memberId) {
        localStorage.setItem('memberId', response.memberId.toString());
      }
      
      // Initialize language from backend preferences
      if (response.preferences?.language) {
        localStorage.setItem('lang', response.preferences.language);
      }
      
      // Sync language preference from backend (DB is source of truth after login)
      await syncLanguageWithBackend();
      
      // Redirect to dashboard for all users
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4">
      {/* Language Selector - Top Right */}
      <div className="fixed top-8 right-8 z-50">
        <LanguageSelector />
      </div>

      <div className="w-full max-w-md">
        {/* Logo and Header */}
        <div className="text-center mb-8">
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
          <h1 className="text-3xl font-bold text-charcoal mb-2">{t('login.title')}</h1>
          <p className="text-gray-600">{t('login.subtitle')}</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-2xl font-semibold text-charcoal mb-6">{t('login.sign_in')}</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
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
