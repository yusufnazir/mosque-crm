
'use client';
import React from 'react';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { useAuth, OrganizationOption } from '@/lib/auth/AuthContext';
import { useSubscription } from '@/lib/subscription/SubscriptionContext';
import { useAppName } from '@/lib/AppNameContext';
import { organizationApi, Organization } from '@/lib/organizationApi';
import { messageApi } from '@/lib/messageApi';
import { joinRequestApi } from '@/lib/joinRequestApi';

interface NavItem {
  name: string;
  href: string;
  icon: React.ReactNode;
  /** Permission code required to see this item. If undefined the item is always visible. */
  permission?: string;
  /** Subscription entitlement key. If the feature is disabled on the plan, the item is hidden. */
  entitlement?: string;
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
    name: 'Member Requests',
    href: '/member-requests',
    permission: 'join_request.view',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    )
  },
  { 
    name: 'Family Tree', 
    href: '/family-tree', 
    permission: 'family.view',
    entitlement: 'family.tree',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ) 
  },
  { 
    name: 'Groups',
    href: '/groups',
    permission: 'group.view',
    entitlement: 'member.grouping',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M12 12a4 4 0 100-8 4 4 0 000 8zm-6 8h6v-1a6 6 0 00-6-6v7zM7 12a4 4 0 110-8 4 4 0 010 8z" />
      </svg>
    )
  },
  {
    name: 'Communications',
    href: '/communications',
    permission: 'communication.view',
    entitlement: 'communication.tools',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    )
  },
  {
    name: 'Documents',
    href: '/documents',
    permission: 'document.view',
    entitlement: 'document.management',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    )
  },

  { 
    name: 'Contributions', 
    href: '/contributions/types', 
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
    entitlement: 'finance.multi_currency',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ) 
  },
  { 
    name: 'Reports', 
    href: '/reports', 
    permission: 'report.view',
    entitlement: 'reports.advanced',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ) 
  },
  { 
    name: 'Events', 
    href: '/events', 
    permission: 'event.view',
    entitlement: 'events.max',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ) 
  },
  { 
    name: 'Import', 
    href: '/import', 
    permission: 'import.execute',
    entitlement: 'import.excel',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
    ) 
  },
  {
    name: 'Export',
    href: '/export',
    permission: 'export.view',
    entitlement: 'data.export',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 11l3 3m0 0l3-3m-3 3V8" />
      </svg>
    )
  },
  { 
    name: 'My Profile', 
    href: '/profile', 
    permission: 'profile.view',
    entitlement: 'member.portal',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ) 
  },
  {
    name: 'Inbox',
    href: '/inbox',
    permission: 'messaging.view',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
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
    permission: 'role.view',
    entitlement: 'roles.permissions',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ) 
  },
  { 
    name: 'Privileges', 
    href: '/privileges', 
    permission: 'privilege.view',
    entitlement: 'roles.permissions',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ) 
  },
  {
    name: 'Role Templates',
    href: '/role-templates',
    permission: 'superadmin.manage',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h10M7 12h10M7 17h6M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" />
      </svg>
    )
  },
  { 
    name: 'Organizations', 
    href: '/organizations', 
    permission: 'organization.manage',
      icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ) 
  },
    { 
      name: 'Billing', 
      href: '/billing', 
      permission: 'subscription.view',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
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
  { 
    name: 'Tenant Settings', 
    href: '/tenant-settings', 
    permission: 'tenant_settings.view',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
      </svg>
    ) 
  },
];

interface NavGroup {
  labelKey: string | undefined;
  hrefs: string[];
}

const NAV_GROUPS: NavGroup[] = [
  { labelKey: undefined, hrefs: ['/dashboard'] },
  { labelKey: 'sidebar.group_members', hrefs: ['/members', '/member-requests', '/groups'] },
  { labelKey: 'sidebar.group_finance', hrefs: ['/contributions/types', '/currencies'] },
  { labelKey: 'sidebar.group_operations', hrefs: ['/reports', '/events', '/import', '/export', '/communications', '/documents'] },
  { labelKey: 'sidebar.group_personal', hrefs: ['/profile', '/inbox'] },
  { labelKey: 'sidebar.group_administration', hrefs: ['/users', '/roles', '/privileges', '/role-templates', '/organizations', '/billing', '/settings', '/tenant-settings'] },
];

interface SidebarProps {
  onNavigate?: () => void;
}

export default function Sidebar({ onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const { t } = useTranslation();
  const { can, canAny, user, isSuperAdmin, selectedOrganization, selectOrganization } = useAuth();
  const { hasFeature } = useSubscription();
  const { appName } = useAppName();
  const [organizationList, setOrganizationList] = useState<Organization[]>([]);
  const [isOrganizationSelectorOpen, setIsOrganizationSelectorOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const organizationSelectorRef = useRef<HTMLDivElement>(null);
  const [inboxUnread, setInboxUnread] = useState(0);
  const [pendingRequests, setPendingRequests] = useState(0);

  // Load organization list for super admin
  useEffect(() => {
    if (isSuperAdmin) {
      organizationApi.getActive().then(setOrganizationList).catch(() => {});
    }
  }, [isSuperAdmin]);

  // Close organization selector on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (organizationSelectorRef.current && !organizationSelectorRef.current.contains(event.target as Node)) {
        setIsOrganizationSelectorOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Poll unread inbox count every 60 seconds + refresh on inbox:read event
  useEffect(() => {
    if (!user) return;
    const fetchUnread = () => {
      messageApi.getUnreadCount().then((r) => setInboxUnread(r?.count ?? 0)).catch(() => {});
    };
    fetchUnread();
    const timer = setInterval(fetchUnread, 60_000);
    window.addEventListener('inbox:read', fetchUnread);
    return () => { clearInterval(timer); window.removeEventListener('inbox:read', fetchUnread); };
  }, [user]);

  // Poll pending member request count every 60 seconds + refresh on requests:updated event
  useEffect(() => {
    if (!user) return;
    const fetchPending = () => {
      joinRequestApi.getPendingCount().then((r) => setPendingRequests(r?.count ?? 0)).catch(() => {});
    };
    fetchPending();
    const timer = setInterval(fetchPending, 60_000);
    window.addEventListener('requests:updated', fetchPending);
    return () => { clearInterval(timer); window.removeEventListener('requests:updated', fetchPending); };
  }, [user]);

  // Restore collapsed/expanded group state from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('sidebarGroups');
      if (stored) setExpandedGroups(JSON.parse(stored));
    } catch {}
  }, []);

  const toggleGroup = (labelKey: string) => {
    setExpandedGroups(prev => {
      const currentlyExpanded = prev[labelKey] !== false;
      const updated = { ...prev, [labelKey]: !currentlyExpanded };
      try { localStorage.setItem('sidebarGroups', JSON.stringify(updated)); } catch {}
      return updated;
    });
  };

  // Filter nav items by permission and subscription entitlement.
  // Super admins see all items.
  const filteredItems = allNavItems.filter((item) => {
    if (!item.permission) return true;
    if (isSuperAdmin) return true;
    if (!can(item.permission)) return false;
    if (item.entitlement && !hasFeature(item.entitlement)) return false;
    return true;
  });

  const navGroups = NAV_GROUPS.map(group => ({
    ...group,
    items: group.hrefs
      .map(href => filteredItems.find(item => item.href === href))
      .filter((item): item is NavItem => item !== undefined),
  })).filter(group => group.items.length > 0);

  // Determine panel label based on permissions rather than role string
  const isAdminPanel = canAny('member.create', 'member.edit', 'settings.manage', 'user.manage');

  return (
    <div className="h-full w-64 bg-primary-800 text-white flex flex-col">
      {/* Logo + Mobile close */}
      <div className="p-6 border-b border-primary-700">
        <div className="flex items-center justify-between">
          <div>
            <img src="/memberflow-logo-light.svg" alt="MemberFlow" className="h-7 mb-1" />
            <p className="text-primary-200 text-sm">
              {isAdminPanel ? t('common.admin_panel') : t('common.member_portal')}
            </p>
          </div>
          {/* Close button on mobile */}
          <button
            onClick={onNavigate}
            className="lg:hidden text-primary-200 hover:text-white p-1"
            aria-label="Close menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {/* Organization context indicator / selector */}
        {user && (
          <div className="mt-2">
            {isSuperAdmin ? (
              <div ref={organizationSelectorRef} className="relative">
                <button
                  onClick={() => setIsOrganizationSelectorOpen(!isOrganizationSelectorOpen)}
                  className="w-full flex items-center justify-between gap-1 px-2 py-1.5 bg-primary-700/50 hover:bg-primary-700 rounded text-xs text-primary-200 transition-all cursor-pointer"
                >
                  <span className="flex items-center gap-1 truncate">
                    <svg className="w-3 h-3 text-primary-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span className="truncate">
                      {selectedOrganization ? selectedOrganization.name : t('sidebar.all_organizations')}
                    </span>
                  </span>
                  <svg className={`w-3 h-3 flex-shrink-0 transition-transform ${isOrganizationSelectorOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown */}
                {isOrganizationSelectorOpen && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-primary-700 rounded-lg shadow-lg overflow-hidden max-h-60 overflow-y-auto">
                    {/* All Organizations option */}
                    <button
                      onClick={() => { selectOrganization(null); setIsOrganizationSelectorOpen(false); }}
                      className={`w-full text-left px-3 py-2 text-xs transition-all flex items-center gap-2 ${
                        !selectedOrganization ? 'bg-primary-600 text-white' : 'text-primary-200 hover:bg-primary-600'
                      }`}
                    >
                      <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {t('sidebar.all_organizations')}
                    </button>
                    <hr className="border-primary-600" />
                    {organizationList.map((organization) => (
                      <button
                        key={organization.id}
                        onClick={() => { selectOrganization({ id: organization.id, name: organization.name, shortName: organization.shortName }); setIsOrganizationSelectorOpen(false); }}
                        className={`w-full text-left px-3 py-2 text-xs transition-all truncate ${
                          selectedOrganization?.id === organization.id ? 'bg-primary-600 text-white' : 'text-primary-200 hover:bg-primary-600'
                        }`}
                      >
                        {organization.name}
                      </button>
                    ))}
                    {organizationList.length === 0 && (
                      <div className="px-3 py-2 text-xs text-primary-300 italic">
                        {t('sidebar.no_organizations_found')}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="px-2 py-1.5 bg-primary-700/50 rounded text-xs text-primary-200 truncate">
                <span className="flex items-center gap-1">
                  <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <span className="truncate" title={user.organizationName || ''}>
                    {user.organizationName || t('sidebar.no_organization')}
                  </span>
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav data-testid="sidebar-nav" className="flex-1 min-h-0 p-4 overflow-y-auto">
        {navGroups.map((group, groupIndex) => {
          const isExpanded = group.labelKey === undefined || expandedGroups[group.labelKey] !== false;
          return (
            <div key={group.labelKey ?? `group-${groupIndex}`} className="mb-1">
              {group.labelKey && (
                <button
                  onClick={() => toggleGroup(group.labelKey!)}
                  className="w-full flex items-center justify-between py-1.5 mt-2 text-xs font-semibold text-primary-400 uppercase tracking-wider hover:text-primary-200 transition-colors"
                >
                  <span>{t(group.labelKey)}</span>
                  <svg
                    className={`w-3 h-3 transition-transform ${isExpanded ? '' : '-rotate-90'}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              )}
              {isExpanded && (
                <div className="space-y-1 mt-1">
                  {group.items.map((item) => {
                    const baseHref = '/' + item.href.split('/').filter(Boolean)[0];
                    const isActive = pathname === item.href || pathname.startsWith(baseHref + '/');
                    const translationKey = item.name.toLowerCase().replace(/ /g, '_');
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onNavigate}
                        className={`
                          flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all
                          ${
                            isActive
                              ? 'bg-primary-600 text-white shadow-md'
                              : 'text-primary-100 hover:bg-primary-700/50'
                          }
                        `}
                      >
                        <span>{item.icon}</span>
                        <span className="font-medium text-sm flex-1">{t(`sidebar.${translationKey}`)}</span>
                        {item.href === '/inbox' && inboxUnread > 0 && (
                          <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-semibold text-white">
                            {inboxUnread > 9 ? '9+' : inboxUnread}
                          </span>
                        )}
                        {item.href === '/member-requests' && pendingRequests > 0 && (
                          <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-semibold text-white">
                            {pendingRequests > 9 ? '9+' : pendingRequests}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

    </div>
  );
}
