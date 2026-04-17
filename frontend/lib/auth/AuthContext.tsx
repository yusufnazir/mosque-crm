'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ApiClient } from '@/lib/api';

export interface OrganizationOption {
  id: number;
  name: string;
  shortName?: string;
}

export interface CurrentUser {
  id: number;
  username: string;
  email?: string;
  organizationId?: number;
  organizationName?: string;
  organizationHandle?: string;
  superAdmin: boolean;
  personId?: string;
  permissions: string[];
  roles: string[];
  selectedOrganizationId?: number;
  selectedOrganizationName?: string;
  mustChangePassword?: boolean;
  preferences?: {
    language?: string;
    theme?: string;
    timezone?: string;
    calendar?: string;
  };
}

const RUNTIME_BASE_DOMAIN_KEY = 'appBaseDomain';

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return decodeURIComponent(parts.pop()!.split(';').shift() || '');
  return null;
}

function inferBaseDomainFromHostname(hostname: string): string | null {
  const host = hostname.split(':')[0].trim().toLowerCase();
  if (!host || host === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(host)) return null;
  const parts = host.split('.').filter(Boolean);
  if (parts.length < 3) return null;
  return `${parts[parts.length - 2]}.${parts[parts.length - 1]}`;
}

export function getConfiguredBaseDomain(): string | null {
  if (typeof window === 'undefined') return null;

  // The current browser host is the most reliable runtime source.
  const inferred = inferBaseDomainFromHostname(window.location.hostname);
  if (inferred) return inferred;

  const fromStorage = localStorage.getItem(RUNTIME_BASE_DOMAIN_KEY);
  if (fromStorage && fromStorage.trim().length > 0) return fromStorage.trim();

  const fromCookie = readCookie('app_base_domain');
  if (fromCookie && fromCookie.trim().length > 0) return fromCookie.trim();

  const envBaseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN;
  return envBaseDomain && envBaseDomain.trim().length > 0 ? envBaseDomain.trim() : null;
}

// ── Subdomain helpers ──────────────────────────────────────────────────────────

/**
 * Build the full URL for a tenant's subdomain.
 * Falls back to same-origin /dashboard when BASE_DOMAIN is not configured.
 */
export function buildTenantUrl(handle: string, path = '/'): string {
  if (typeof window === 'undefined') return path;
  const baseDomain = getConfiguredBaseDomain();
  if (!baseDomain) return path;
  const { protocol, port } = window.location;
  const portStr = port ? `:${port}` : '';
  return `${protocol}//${handle}.${baseDomain}${portStr}${path}`;
}

/**
 * Build the login URL on the auth subdomain.
 * Falls back to /login when BASE_DOMAIN is not configured.
 */
export function buildAuthUrl(path = '/login'): string {
  if (typeof window === 'undefined') return path;
  const baseDomain = getConfiguredBaseDomain();
  if (!baseDomain) return path;
  const { protocol, port } = window.location;
  const portStr = port ? `:${port}` : '';
  return `${protocol}//auth.${baseDomain}${portStr}${path}`;
}

// ── Context types ──────────────────────────────────────────────────────────────

interface AuthContextValue {
  /** The current user fetched from /api/me, null while loading or when not logged in */
  user: CurrentUser | null;
  /** Shorthand: returns true when the user has the given permission code */
  can: (permission: string) => boolean;
  /** Returns true if the user holds ANY of the listed permissions */
  canAny: (...permissions: string[]) => boolean;
  /** Whether the user is a super admin (no organization scope, sees all data) */
  isSuperAdmin: boolean;
  /** Whether the initial /api/me fetch is still in progress */
  loading: boolean;
  /** Re-fetch user from /api/me (e.g. after role change) */
  refresh: () => Promise<void>;
  /** Clear local auth state (call on logout) */
  clearAuth: () => void;
  /** The currently selected organization for super admins (null = all organizations) */
  selectedOrganization: OrganizationOption | null;
  /** Select a organization to scope data to (super admin only) */
  selectOrganization: (organization: OrganizationOption | null) => void;
  /** The display name showing which organization the user is viewing */
  activeOrganizationName: string | null;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  can: () => false,
  canAny: () => false,
  isSuperAdmin: false,
  loading: true,
  refresh: async () => {},
  clearAuth: () => {},
  selectedOrganization: null,
  selectOrganization: () => {},
  activeOrganizationName: null,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [permissionSet, setPermissionSet] = useState<Set<string>>(new Set());
  const [selectedOrganization, setSelectedOrganization] = useState<OrganizationOption | null>(null);

  const fetchCurrentUser = useCallback(async () => {
    try {
      // With BFF pattern, the JWT is in an httpOnly cookie.
      // We call /api/me directly (not through ApiClient.handleResponse) so that
      // 401/403 from "not logged in" are handled silently — no console errors,
      // no redirect loops on the login page.
      const organizationId = typeof window !== 'undefined' ? localStorage.getItem('selectedOrganizationId') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (organizationId) headers['X-Organization-Id'] = organizationId;

      // Try the standard proxy first; on cross-subdomain navigation the proxy
      // cookie forwarding may already handle it. If not authenticated, also try
      // /api/auth/me which reads the httpOnly cookie directly (handles the case
      // where localStorage is empty after a subdomain hop).
      let response = await fetch('/api/me', { headers });

      if (!response.ok && response.status === 401) {
        // Cross-subdomain hydration: try the dedicated auth/me route
        response = await fetch('/api/auth/me', { headers });
      }

      if (!response.ok) {
        // 401/403 = not authenticated — silently set user to null
        setUser(null);
        setPermissionSet(new Set());
        setLoading(false);
        return;
      }

      const data: CurrentUser = await response.json();
      setUser(data);
      setPermissionSet(new Set(data.permissions ?? []));

      // Restore super admin's persisted organization selection from backend
      if (data.superAdmin && data.selectedOrganizationId && data.selectedOrganizationName) {
        const restoredOrganization: OrganizationOption = {
          id: data.selectedOrganizationId,
          name: data.selectedOrganizationName,
        };
        setSelectedOrganization(restoredOrganization);
        localStorage.setItem('selectedOrganization', JSON.stringify(restoredOrganization));
        localStorage.setItem('selectedOrganizationId', String(data.selectedOrganizationId));
      } else if (data.superAdmin) {
        // Super admin with no selection = "All Organizations"
        setSelectedOrganization(null);
        localStorage.removeItem('selectedOrganization');
        localStorage.removeItem('selectedOrganizationId');
      }
    } catch {
      // Network error or unexpected failure — user stays null
      setUser(null);
      setPermissionSet(new Set());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  const isSuperAdmin = user?.superAdmin === true;

  const can = useCallback(
    (permission: string): boolean => isSuperAdmin || permissionSet.has(permission),
    [isSuperAdmin, permissionSet],
  );

  const canAny = useCallback(
    (...permissions: string[]): boolean => isSuperAdmin || permissions.some((p) => permissionSet.has(p)),
    [isSuperAdmin, permissionSet],
  );

  const clearAuth = useCallback(() => {
    setUser(null);
    setPermissionSet(new Set());
    setSelectedOrganization(null);
    setLoading(false);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('selectedOrganization');
      localStorage.removeItem('selectedOrganizationId');
    }
  }, []);

  const selectOrganization = useCallback((organization: OrganizationOption | null) => {
    setSelectedOrganization(organization);
    if (typeof window !== 'undefined') {
      if (organization) {
        localStorage.setItem('selectedOrganization', JSON.stringify(organization));
        localStorage.setItem('selectedOrganizationId', String(organization.id));
      } else {
        localStorage.removeItem('selectedOrganization');
        localStorage.removeItem('selectedOrganizationId');
      }
    }
    // Persist to backend so the selection survives across devices,
    // then reload the page so every view re-fetches data for the new organization.
    ApiClient.put('/me/selected-organization', { organizationId: organization?.id ?? null })
      .then(() => {
        if (typeof window !== 'undefined') {
          window.location.reload();
        }
      })
      .catch((err) => console.error('Failed to persist organization selection:', err));
  }, []);

  // Determine the active organization name for display
  const activeOrganizationName = isSuperAdmin
    ? (selectedOrganization?.name ?? null)
    : (user?.organizationName ?? null);

  return (
    <AuthContext.Provider
      value={{ user, can, canAny, isSuperAdmin, loading, refresh: fetchCurrentUser, clearAuth, selectedOrganization, selectOrganization, activeOrganizationName }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/** Hook to access the current user and permission helpers */
export function useAuth() {
  return useContext(AuthContext);
}
