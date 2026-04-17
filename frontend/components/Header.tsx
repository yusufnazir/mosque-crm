'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { usePageHeader, BreadcrumbItem } from '@/lib/page-header';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { authApi } from '@/lib/api';
import { messageApi } from '@/lib/messageApi';
import { logoutClient } from '@/lib/auth/logout';
import ChangePasswordModal from './ChangePasswordModal';

/** Maps first path segment → sidebar i18n key */
const SEGMENT_TO_KEY: Record<string, string> = {
  dashboard: 'sidebar.dashboard',
  members: 'sidebar.members',
  'family-tree': 'sidebar.family_tree',
  groups: 'sidebar.groups',
  contributions: 'sidebar.contributions',
  currencies: 'sidebar.currencies',
  reports: 'sidebar.reports',
  import: 'sidebar.import',
  profile: 'sidebar.my_profile',
  users: 'sidebar.users',
  roles: 'sidebar.roles',
  privileges: 'sidebar.privileges',
  'role-templates': 'sidebar.role_templates',
  organizations: 'sidebar.organizations',
  subscription: 'sidebar.subscription',
  settings: 'sidebar.settings',
  account: 'sidebar.account',
  persons: 'sidebar.members',
  'member-requests': 'sidebar.member_requests',
  inbox: 'sidebar.inbox',
  distribution: 'sidebar.events',
  events: 'sidebar.events',
  'general-events': 'sidebar.events',
};

/** Sub-path labels for deeper routes */
const SUB_LABELS: Record<string, string> = {
  add: 'common.add',
  edit: 'common.edit',
  genealogy: 'sidebar.family_tree',
  family: 'sidebar.family_tree',
};

interface HeaderProps {
  onMenuToggle?: () => void;
}

export default function Header({ onMenuToggle }: HeaderProps) {
  const { user, isSuperAdmin, activeOrganizationName } = useAuth();
  const { breadcrumbs: contextBreadcrumbs } = usePageHeader();
  const { t, language, setLanguage } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // Auto-generate breadcrumbs from pathname when none are set via context
  const breadcrumbs = useMemo<BreadcrumbItem[]>(() => {
    if (contextBreadcrumbs.length > 0) return contextBreadcrumbs;

    const segments = pathname.split('/').filter(Boolean);
    if (segments.length === 0) return [];

    const items: BreadcrumbItem[] = [];
    let pathSoFar = '';

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      pathSoFar += '/' + seg;
      const isLast = i === segments.length - 1;

      // Skip numeric IDs and UUID-like segments in breadcrumb labels
      if (/^\d+$/.test(seg) || /^[0-9a-f-]{20,}$/i.test(seg)) continue;

      const key = i === 0 ? SEGMENT_TO_KEY[seg] : SUB_LABELS[seg];
      const label = key ? t(key) : seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, ' ');

      items.push({
        label,
        href: isLast ? undefined : pathSoFar,
      });
    }

    return items;
  }, [pathname, contextBreadcrumbs, t]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  // Poll unread message count every 60 seconds + refresh on inbox:read event
  useEffect(() => {
    if (!user) return;
    const fetchUnread = () => {
      messageApi.getUnreadCount().then((r) => setUnreadCount(r?.count ?? 0)).catch(() => {});
    };
    fetchUnread();
    const timer = setInterval(fetchUnread, 60_000);
    window.addEventListener('inbox:read', fetchUnread);
    return () => { clearInterval(timer); window.removeEventListener('inbox:read', fetchUnread); };
  }, [user]);

  const handleLogout = async () => {
    await logoutClient();
  };

  const handlePasswordChangeSubmit = async (oldPassword: string, newPassword: string) => {
    await authApi.changePassword({ oldPassword, newPassword });
  };

  const initials = user
    ? (user.username?.[0] || 'U').toUpperCase()
    : 'U';

  // Determine role display
  const primaryRole = user?.roles?.[0] || '';

  return (
    <>
      <header className="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6 shrink-0">
        {/* Left: hamburger (mobile) + breadcrumbs (desktop) */}
        <div className="flex items-center gap-3 overflow-hidden">
          <button
            onClick={onMenuToggle}
            className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 lg:hidden"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Breadcrumbs — desktop only */}
          {breadcrumbs.length > 0 && (
            <nav className="hidden items-center gap-1.5 text-sm lg:flex">
              <Link href="/dashboard" className="text-gray-400 transition-colors hover:text-primary-600">
                {/* Home icon */}
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </Link>
              {breadcrumbs.map((item, idx) => (
                <span key={idx} className="flex items-center gap-1.5">
                  {/* Chevron separator */}
                  <svg className="h-3.5 w-3.5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  {item.href ? (
                    <Link href={item.href} className="text-gray-400 transition-colors hover:text-primary-600">
                      {item.label}
                    </Link>
                  ) : (
                    <span className="font-medium text-gray-700">{item.label}</span>
                  )}
                </span>
              ))}
            </nav>
          )}
        </div>

        {/* Right: bell icon + user dropdown */}
        <div className="flex items-center gap-2">
          {/* Bell / Inbox icon */}
          <Link
            href="/inbox"
            className="relative rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
            aria-label="Inbox"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white ring-2 ring-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-3 rounded-xl px-3 py-2 transition-colors duration-150 hover:bg-gray-50"
            >
              {/* Avatar circle */}
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-800">
                {initials}
              </div>
              {/* User info — hidden on small screens */}
              <div className="hidden text-left sm:block">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-800">
                    {user?.username ?? 'User'}
                  </p>
                  {isSuperAdmin && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                      {/* Shield icon */}
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      Super Admin
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400">
                  {activeOrganizationName || primaryRole || ''}
                </p>
              </div>
              {/* Chevron */}
              <svg
                className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${menuOpen ? 'rotate-180' : ''}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Dropdown */}
            {menuOpen && (
              <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-gray-100 bg-white py-1.5 shadow-lg">
                {/* Mobile-only: show user info in dropdown */}
                <div className="border-b border-gray-100 px-4 py-2.5 sm:hidden">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-800">{user?.username ?? 'User'}</p>
                    {isSuperAdmin && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                        Super Admin
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">{activeOrganizationName || primaryRole || ''}</p>
                </div>

                {/* Account */}
                <button
                  onClick={() => { router.push('/account'); setMenuOpen(false); }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-800"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  {t('sidebar.account')}
                </button>

                {/* Change Password */}
                <button
                  onClick={() => { setShowChangePasswordModal(true); setMenuOpen(false); }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-800"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                  {t('common.change_password')}
                </button>

                {/* Language */}
                <div className="px-4 py-2.5">
                  <label className="mb-1 block text-xs font-medium text-gray-400">{t('common.language')}</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as 'en' | 'nl')}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-700 focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
                  >
                    <option value="en">🇬🇧 English</option>
                    <option value="nl">🇳🇱 Nederlands</option>
                  </select>
                </div>

                <div className="my-1 border-t border-gray-100" />

                {/* Logout */}
                <button
                  onClick={() => { setMenuOpen(false); handleLogout(); }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-500 transition-colors hover:bg-red-50 hover:text-red-600"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  {t('common.logout')}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <ChangePasswordModal
        isOpen={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
        onSubmit={handlePasswordChangeSubmit}
      />
    </>
  );
}
