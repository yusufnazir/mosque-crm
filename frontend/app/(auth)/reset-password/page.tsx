'use client';


import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import LanguageSelector from '@/components/LanguageSelector';


function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const tokenFromUrl = searchParams.get('token');
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
    } else {
      setError(t('resetPassword.noToken'));
    }
  }, [searchParams, t]);

  const validatePassword = () => {
    if (newPassword.length < 6) {
      setError(t('resetPassword.passwordTooShort'));
      return false;
    }
    if (newPassword !== confirmPassword) {
      setError(t('resetPassword.passwordMismatch'));
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!validatePassword()) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message || t('resetPassword.success'));
        // Redirect to login after 2 seconds
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      } else {
        setError(data.message || t('resetPassword.error'));
      }
    } catch {
      setError(t('resetPassword.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-cream flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl md:text-3xl font-bold text-charcoal">
              {t('resetPassword.title')}
            </h1>
            <LanguageSelector />
          </div>
          <p className="text-gray-600 mb-8">
            {t('resetPassword.subtitle')}
          </p>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-charcoal mb-2">
                {t('resetPassword.newPassword')}
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                placeholder={t('resetPassword.newPasswordPlaceholder')}
                required
                disabled={loading || !token}
                minLength={6}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-charcoal mb-2">
                {t('resetPassword.confirmPassword')}
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                placeholder={t('resetPassword.confirmPasswordPlaceholder')}
                required
                disabled={loading || !token}
                minLength={6}
              />
            </div>

            {error && (
              <div className="p-4 rounded-lg bg-red-50 text-red-700">
                {error}
              </div>
            )}

            {message && (
              <div className="p-4 rounded-lg bg-emerald-50 text-emerald-700">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !token}
              className="w-full bg-emerald-700 text-white py-3 rounded-lg font-semibold hover:bg-emerald-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? t('resetPassword.resetting') : t('resetPassword.submit')}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => router.push('/login')}
                className="text-emerald-700 hover:underline"
              >
                {t('resetPassword.backToLogin')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordContent />
    </Suspense>
  );
}
