'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import LanguageSelector from '@/components/LanguageSelector';
import { authApi } from '@/lib/api';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { buildTenantUrl } from '@/lib/auth/AuthContext';
import { useAppName } from '@/lib/AppNameContext';

export default function LoginPage() {
  const router = useRouter();
  const { syncLanguageWithBackend, t } = useTranslation();
  const { appName } = useAppName();
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
      if (response.appBaseDomain) {
        localStorage.setItem('appBaseDomain', String(response.appBaseDomain));
      }
      
      // Initialize language from backend preferences
      if (response.preferences?.language) {
        localStorage.setItem('lang', response.preferences.language);
      }
      
      // Sync language preference from backend (DB is source of truth after login)
      await syncLanguageWithBackend();
      
      // Check if user must set their password on first login
      if (response.mustChangePassword) {
        // Hard navigation — AuthContext will re-hydrate on the new page automatically.
        window.location.href = '/set-password';
        return;
      }

      // Navigate to the tenant subdomain (or /dashboard in single-origin mode).
      // Always use hard navigation so the browser fires DOMContentLoaded and
      // AuthContext re-hydrates cleanly (avoids SPA pushState timing issues).
      if (response.organizationHandle) {
        window.location.href = buildTenantUrl(response.organizationHandle, '/dashboard');
      } else {
        window.location.href = '/dashboard';
      }
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
    <div className="min-h-screen flex overflow-hidden">

      {/* ══════════════════════════════════════════
          LEFT PANEL — Branded hero (hidden on mobile)
         ══════════════════════════════════════════ */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col items-center justify-center p-12 overflow-hidden">

        {/* Deep navy gradient */}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(160deg, #081825 0%, #0F2A3E 35%, #163550 65%, #183E58 100%)' }}
        />

        {/* Geometric pattern */}
        <div className="absolute inset-0 geometric-pattern opacity-40" />

        {/* Floating orbs */}
        <div
          className="absolute -top-24 -left-24 w-80 h-80 rounded-full blur-3xl opacity-25 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #D4AF37 0%, transparent 70%)' }}
        />
        <div
          className="absolute -bottom-32 -right-20 w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #3C74C5 0%, transparent 70%)' }}
        />
        <div
          className="absolute top-1/2 left-1/3 w-56 h-56 rounded-full blur-2xl opacity-15 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #D4AF37 0%, transparent 70%)' }}
        />

        {/* Content */}
        <div className="relative z-10 max-w-sm text-center animate-fade-in-up">
          {/* Logo badge */}
          <div
            className="inline-flex items-center justify-center w-24 h-24 rounded-3xl mb-8 mx-auto"
            style={{
              background: 'rgba(255,255,255,0.08)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255,255,255,0.15)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            }}
          >
            <img src="/memberflow-icon-light.svg" alt="MemberFlow" className="w-14 h-14" />
          </div>

          <h1
            className="text-4xl font-bold text-white mb-3 leading-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {appName}
          </h1>

          {/* Gold accent line */}
          <div className="w-12 h-0.5 rounded-full mx-auto mb-5" style={{ background: '#D4AF37' }} />

          {/* Hero tagline */}
          <p className="text-lg font-semibold mb-3" style={{ color: 'rgba(255,255,255,0.95)', fontFamily: 'var(--font-display)' }}>
            {t('login.hero_tagline')}
          </p>

          {/* Description */}
          <p className="text-sm leading-relaxed mb-8" style={{ color: 'rgba(255,255,255,0.55)' }}>
            {t('login.hero_description')}
          </p>

          {/* Feature highlights */}
          <div className="space-y-3 text-left">
            {[
              { icon: '👥', text: t('login.feature_members') },
              { icon: '💳', text: t('login.feature_finance') },
              { icon: '🗓️', text: t('login.feature_events') },
              { icon: '📨', text: t('login.feature_comms') },
            ].map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-4 py-3 rounded-xl"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <span className="text-lg">{item.icon}</span>
                <span className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom copyright */}
        <p className="absolute bottom-6 text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
          © {new Date().getFullYear()} {appName}
        </p>
      </div>

      {/* ══════════════════════════════════════════
          RIGHT PANEL — Glassmorphism login form
         ══════════════════════════════════════════ */}
      <div
        className="w-full lg:w-1/2 relative flex items-center justify-center p-6 md:p-12 overflow-hidden"
      >
        {/* Right panel background — slightly lighter navy */}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(160deg, #0F2A3E 0%, #163550 50%, #1e4d70 100%)' }}
        />

        {/* Subtle pattern on right too */}
        <div className="absolute inset-0 geometric-pattern opacity-20" />

        {/* Orb bottom-left of right panel */}
        <div
          className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #D4AF37 0%, transparent 70%)' }}
        />
        <div
          className="absolute -top-16 -right-16 w-64 h-64 rounded-full blur-3xl opacity-15 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #3C74C5 0%, transparent 70%)' }}
        />

        {/* Mobile-only logo */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2 lg:hidden flex flex-col items-center">
          <img src="/memberflow-icon-light.svg" alt="MemberFlow" className="w-10 h-10 mb-1" />
          <span className="text-white font-bold text-sm">{appName}</span>
        </div>

        {/* ── Glassmorphism card ── */}
        <div className="relative z-10 w-full max-w-sm animate-fade-in-up mt-16 lg:mt-0">
          <div
            className="rounded-3xl p-8"
            style={{
              background: 'rgba(255,255,255,0.07)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: '1px solid rgba(255,255,255,0.13)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
            }}
          >
          {/* Card header row */}
          <div className="flex items-center justify-between mb-7">
            <div>
              <h2 className="text-xl font-semibold text-white">{t('login.sign_in')}</h2>
              {/* Gold underline accent */}
              <div className="mt-1 h-0.5 w-8 rounded-full" style={{ background: '#D4AF37' }} />
            </div>
            <div className="[&_select]:text-white [&_select]:bg-transparent [&_svg]:text-white/70">
              <LanguageSelector />
            </div>
          </div>

          {/* Error banner */}
          {error && (
            <div
              className="mb-5 p-4 rounded-xl flex items-start gap-3"
              style={{
                background: 'rgba(239,68,68,0.15)',
                border: '1px solid rgba(239,68,68,0.35)',
              }}
            >
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#f87171' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div>
                <p className="text-sm font-medium" style={{ color: '#fca5a5' }}>{error.message}</p>
                {(error.code === 'account_disabled' || error.code === 'account_locked') && (
                  <p className="text-xs mt-1" style={{ color: '#f87171' }}>{t('login.errors.contact_admin')}</p>
                )}
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="username" className="block text-sm font-medium mb-2" style={{ color: 'rgba(255,255,255,0.8)' }}>
                {t('login.username')}
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-xl outline-none transition-all text-white placeholder:text-white/30"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.15)',
                }}
                onFocus={(e) => { e.currentTarget.style.border = '1px solid rgba(212,175,55,0.7)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(212,175,55,0.15)'; }}
                onBlur={(e) => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.15)'; e.currentTarget.style.boxShadow = 'none'; }}
                placeholder={t('login.username_placeholder')}
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2" style={{ color: 'rgba(255,255,255,0.8)' }}>
                {t('login.password')}
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl outline-none transition-all text-white placeholder:text-white/30"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.15)',
                }}
                onFocus={(e) => { e.currentTarget.style.border = '1px solid rgba(212,175,55,0.7)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(212,175,55,0.15)'; }}
                onBlur={(e) => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.15)'; e.currentTarget.style.boxShadow = 'none'; }}
                placeholder={t('login.password_placeholder')}
                required
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-6 rounded-xl font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: loading ? 'rgba(212,175,55,0.5)' : 'linear-gradient(135deg, #D4AF37 0%, #e6cc7a 100%)',
                color: '#081825',
                boxShadow: loading ? 'none' : '0 4px 15px rgba(212,175,55,0.35)',
              }}
              onMouseEnter={(e) => { if (!loading) e.currentTarget.style.boxShadow = '0 6px 20px rgba(212,175,55,0.5)'; }}
              onMouseLeave={(e) => { if (!loading) e.currentTarget.style.boxShadow = '0 4px 15px rgba(212,175,55,0.35)'; }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                  </svg>
                  {t('login.signing_in')}
                </span>
              ) : t('login.sign_in_button')}
            </button>
          </form>

          {/* Divider */}
          <div className="my-5 flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.1)' }} />
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.1)' }} />
          </div>

          {/* Footer links */}
          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={() => router.push('/forgot-password')}
              className="transition-colors"
              style={{ color: 'rgba(255,255,255,0.55)' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#D4AF37'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.55)'; }}
            >
              {t('login.forgot_password')}
            </button>
            <div>
              <span style={{ color: 'rgba(255,255,255,0.4)' }}>{t('login.no_account')}</span>{' '}
              <button
                type="button"
                onClick={() => router.push('/register')}
                className="font-medium transition-colors"
                style={{ color: '#D4AF37' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#e6cc7a'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#D4AF37'; }}
              >
                {t('login.register_link')}
              </button>
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
