
'use client';
import React from 'react';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import ChangePasswordModal from './ChangePasswordModal';
import LanguageSelector from './LanguageSelector';
import { authApi } from '@/lib/api';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { useAuth, MosqueOption } from '@/lib/auth/AuthContext';
import { mosqueApi, Mosque } from '@/lib/mosqueApi';

interface NavItem {
  name: string;
  href: string;
  icon: React.ReactNode;
  /** Permission code required to see this item. If undefined the item is always visible. */
  permission?: string;
  /** If true, show a divider above this item */
  divider?: boolean;
}

/**
 * All navigable items. Visibility is controlled by the `permission` field.
 * Items without a permission are visible to every authenticated user.
 */
const allNavItems: NavItem[] = [
  { 
    name: 'Dashboard', 
    href: '/dashboard', 
    permission: 'dashboard.view',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ) 
  },
  { 
    name: 'Members', 
    href: '/members', 
    permission: 'member.view',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ) 
  },
  { 
    name: 'Family Tree', 
    href: '/family-tree', 
    permission: 'family.view',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ) 
  },
  { 
    name: 'Fees', 
    href: '/fees', 
    permission: 'finance.view',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ) 
  },
  { 
    name: 'Contributions', 
    href: '/contributions', 
    permission: 'contribution.view',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ) 
  },
  { 
    name: 'Currencies', 
    href: '/currencies', 
    permission: 'currency.view',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ) 
  },
  { 
    name: 'Import', 
    href: '/import', 
    permission: 'import.execute',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
    ) 
  },
  { 
    name: 'My Profile', 
    href: '/profile', 
    permission: 'profile.view',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ) 
  },
  { 
    name: 'Users', 
    href: '/users', 
    permission: 'user.view',
    divider: true,
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ) 
  },
  { 
    name: 'Roles', 
    href: '/roles', 
    permission: 'user.manage',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ) 
  },
  { 
    name: 'Mosques', 
    href: '/mosques', 
    permission: 'mosque.manage',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ) 
  },
  { 
    name: 'settings', 
    href: '/settings', 
    permission: 'settings.view',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ) 
  },
];

interface SidebarProps {
  onNavigate?: () => void;
}

export default function Sidebar({ onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const { t } = useTranslation();
  const { can, canAny, user, isSuperAdmin, selectedMosque, selectMosque, activeMosqueName } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [mosqueList, setMosqueList] = useState<Mosque[]>([]);
  const [isMosqueSelectorOpen, setIsMosqueSelectorOpen] = useState(false);
  const mosqueSelectorRef = useRef<HTMLDivElement>(null);

  // Load mosque list for super admin
  useEffect(() => {
    if (isSuperAdmin) {
      mosqueApi.getActive().then(setMosqueList).catch(() => {});
    }
  }, [isSuperAdmin]);

  // Close mosque selector on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (mosqueSelectorRef.current && !mosqueSelectorRef.current.contains(event.target as Node)) {
        setIsMosqueSelectorOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter nav items by permission
  const navItems = allNavItems.filter((item) => {
    if (!item.permission) return true;
    return can(item.permission);
  });

  // Determine panel label based on permissions rather than role string
  const isAdminPanel = canAny('member.create', 'member.edit', 'settings.manage', 'user.manage');

  const handleLogout = async () => {
    // Clear local state first
    localStorage.removeItem('personId');
    localStorage.removeItem('memberId');
    localStorage.removeItem('selectedMosque');
    localStorage.removeItem('selectedMosqueId');
    localStorage.removeItem('lang');
    // Navigate directly to the logout endpoint — the server clears the httpOnly
    // cookie and redirects to /login. Direct navigation is more reliable than
    // fetch() for cookie deletion on mobile browsers.
    window.location.href = '/api/auth/logout';
  };

  const handleChangePassword = () => {
    setShowChangePasswordModal(true);
  };

  const handlePasswordChangeSubmit = async (oldPassword: string, newPassword: string) => {
    await authApi.changePassword({ oldPassword, newPassword });
  };

  return (
    <div className="h-full w-64 bg-emerald-800 text-white flex flex-col">
      {/* Logo + Mobile close */}
      <div className="p-6 border-b border-emerald-700">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gold">{t('common.mosque_crm')}</h1>
            <p className="text-emerald-200 text-sm mt-1">
              {isAdminPanel ? t('common.admin_panel') : t('common.member_portal')}
            </p>
          </div>
          {/* Close button on mobile */}
          <button
            onClick={onNavigate}
            className="lg:hidden text-emerald-200 hover:text-white p-1"
            aria-label="Close menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {/* Mosque context indicator / selector */}
        {user && (
          <div className="mt-2">
            {isSuperAdmin ? (
              <div ref={mosqueSelectorRef} className="relative">
                <button
                  onClick={() => setIsMosqueSelectorOpen(!isMosqueSelectorOpen)}
                  className="w-full flex items-center justify-between gap-1 px-2 py-1.5 bg-emerald-700/50 hover:bg-emerald-700 rounded text-xs text-emerald-200 transition-all cursor-pointer"
                >
                  <span className="flex items-center gap-1 truncate">
                    <svg className="w-3 h-3 text-gold flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span className="truncate">
                      {selectedMosque ? selectedMosque.name : t('sidebar.all_mosques')}
                    </span>
                  </span>
                  <svg className={`w-3 h-3 flex-shrink-0 transition-transform ${isMosqueSelectorOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown */}
                {isMosqueSelectorOpen && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-emerald-700 rounded-lg shadow-lg overflow-hidden max-h-60 overflow-y-auto">
                    {/* All Mosques option */}
                    <button
                      onClick={() => { selectMosque(null); setIsMosqueSelectorOpen(false); }}
                      className={`w-full text-left px-3 py-2 text-xs transition-all flex items-center gap-2 ${
                        !selectedMosque ? 'bg-emerald-600 text-white' : 'text-emerald-200 hover:bg-emerald-600'
                      }`}
                    >
                      <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {t('sidebar.all_mosques')}
                    </button>
                    <hr className="border-emerald-600" />
                    {mosqueList.map((mosque) => (
                      <button
                        key={mosque.id}
                        onClick={() => { selectMosque({ id: mosque.id, name: mosque.name, shortName: mosque.shortName }); setIsMosqueSelectorOpen(false); }}
                        className={`w-full text-left px-3 py-2 text-xs transition-all truncate ${
                          selectedMosque?.id === mosque.id ? 'bg-emerald-600 text-white' : 'text-emerald-200 hover:bg-emerald-600'
                        }`}
                      >
                        {mosque.name}
                      </button>
                    ))}
                    {mosqueList.length === 0 && (
                      <div className="px-3 py-2 text-xs text-emerald-400 italic">
                        {t('sidebar.no_mosques_found')}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="px-2 py-1.5 bg-emerald-700/50 rounded text-xs text-emerald-200 truncate">
                <span className="flex items-center gap-1">
                  <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <span className="truncate" title={user.mosqueName || ''}>
                    {user.mosqueName || t('sidebar.no_mosque')}
                  </span>
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 min-h-0 p-4 space-y-2 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const translationKey = item.name.toLowerCase().replace(/ /g, '_');
          return (
            <React.Fragment key={item.href}>
              {item.divider && (
                <hr className="my-3 border-emerald-700 opacity-60" />
              )}
              <Link
                href={item.href}
                onClick={onNavigate}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-lg transition-all
                  ${
                    isActive
                      ? 'bg-emerald-700 text-white shadow-md'
                      : 'text-emerald-100 hover:bg-emerald-700/50'
                  }
                `}
              >
                <span>{item.icon}</span>
                <span className="font-medium">{t(`sidebar.${translationKey}`)}</span>
              </Link>
            </React.Fragment>
          );
        })}
      </nav>

      {/* Language Selector */}
      <div className="px-4 pb-4">
        <LanguageSelector />
      </div>

      {/* User Section */}
      <div className="p-4 border-t border-emerald-700">
        <div className="relative">
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg text-emerald-100 hover:bg-emerald-700/50 transition-all"
          >
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="font-medium">{t('user_menu.title')}</span>
            </div>
            <svg 
              className={`w-4 h-4 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Dropdown Menu */}
          {isUserMenuOpen && (
            <div className="absolute bottom-full left-0 right-0 mb-2 bg-emerald-700 rounded-lg shadow-lg overflow-hidden">
              <Link
                href="/account"
                onClick={() => setIsUserMenuOpen(false)}
                className="w-full flex items-center gap-3 px-4 py-3 text-emerald-100 hover:bg-emerald-600 transition-all text-left"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="font-medium">{t('sidebar.account')}</span>
              </Link>
              <button
                onClick={() => {
                  setIsUserMenuOpen(false);
                  handleChangePassword();
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-emerald-100 hover:bg-emerald-600 transition-all text-left"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                <span className="font-medium">{t('common.change_password')}</span>
              </button>
              <button
                onClick={() => {
                  setIsUserMenuOpen(false);
                  handleLogout();
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-emerald-100 hover:bg-emerald-600 transition-all text-left"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="font-medium">{t('common.logout')}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
        onSubmit={handlePasswordChangeSubmit}
      />
    </div>
  );
}
