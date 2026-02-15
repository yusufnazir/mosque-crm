'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ApiClient } from '@/lib/api';

export interface MosqueOption {
  id: number;
  name: string;
  shortName?: string;
}

export interface CurrentUser {
  id: number;
  username: string;
  email?: string;
  mosqueId?: number;
  mosqueName?: string;
  superAdmin: boolean;
  personId?: string;
  permissions: string[];
  roles: string[];
  selectedMosqueId?: number;
  selectedMosqueName?: string;
  preferences?: {
    language?: string;
    theme?: string;
    timezone?: string;
    calendar?: string;
  };
}

interface AuthContextValue {
  /** The current user fetched from /api/me, null while loading or when not logged in */
  user: CurrentUser | null;
  /** Shorthand: returns true when the user has the given permission code */
  can: (permission: string) => boolean;
  /** Returns true if the user holds ANY of the listed permissions */
  canAny: (...permissions: string[]) => boolean;
  /** Whether the user is a super admin (no mosque scope, sees all data) */
  isSuperAdmin: boolean;
  /** Whether the initial /api/me fetch is still in progress */
  loading: boolean;
  /** Re-fetch user from /api/me (e.g. after role change) */
  refresh: () => Promise<void>;
  /** Clear local auth state (call on logout) */
  clearAuth: () => void;
  /** The currently selected mosque for super admins (null = all mosques) */
  selectedMosque: MosqueOption | null;
  /** Select a mosque to scope data to (super admin only) */
  selectMosque: (mosque: MosqueOption | null) => void;
  /** The display name showing which mosque the user is viewing */
  activeMosqueName: string | null;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  can: () => false,
  canAny: () => false,
  isSuperAdmin: false,
  loading: true,
  refresh: async () => {},
  clearAuth: () => {},
  selectedMosque: null,
  selectMosque: () => {},
  activeMosqueName: null,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [permissionSet, setPermissionSet] = useState<Set<string>>(new Set());
  const [selectedMosque, setSelectedMosque] = useState<MosqueOption | null>(null);

  const fetchCurrentUser = useCallback(async () => {
    try {
      // With BFF pattern, the JWT is in an httpOnly cookie.
      // We call /api/me directly (not through ApiClient.handleResponse) so that
      // 401/403 from "not logged in" are handled silently — no console errors,
      // no redirect loops on the login page.
      const mosqueId = typeof window !== 'undefined' ? localStorage.getItem('selectedMosqueId') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (mosqueId) headers['X-Mosque-Id'] = mosqueId;

      const response = await fetch('/api/me', { headers });

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

      // Restore super admin's persisted mosque selection from backend
      if (data.superAdmin && data.selectedMosqueId && data.selectedMosqueName) {
        const restoredMosque: MosqueOption = {
          id: data.selectedMosqueId,
          name: data.selectedMosqueName,
        };
        setSelectedMosque(restoredMosque);
        localStorage.setItem('selectedMosque', JSON.stringify(restoredMosque));
        localStorage.setItem('selectedMosqueId', String(data.selectedMosqueId));
      } else if (data.superAdmin) {
        // Super admin with no selection = "All Mosques"
        setSelectedMosque(null);
        localStorage.removeItem('selectedMosque');
        localStorage.removeItem('selectedMosqueId');
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

  const can = useCallback(
    (permission: string): boolean => permissionSet.has(permission),
    [permissionSet],
  );

  const canAny = useCallback(
    (...permissions: string[]): boolean => permissions.some((p) => permissionSet.has(p)),
    [permissionSet],
  );

  const clearAuth = useCallback(() => {
    setUser(null);
    setPermissionSet(new Set());
    setSelectedMosque(null);
    setLoading(false);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('selectedMosque');
      localStorage.removeItem('selectedMosqueId');
    }
  }, []);

  const selectMosque = useCallback((mosque: MosqueOption | null) => {
    setSelectedMosque(mosque);
    if (typeof window !== 'undefined') {
      if (mosque) {
        localStorage.setItem('selectedMosque', JSON.stringify(mosque));
        localStorage.setItem('selectedMosqueId', String(mosque.id));
      } else {
        localStorage.removeItem('selectedMosque');
        localStorage.removeItem('selectedMosqueId');
      }
    }
    // Persist to backend so the selection survives across devices
    ApiClient.put('/me/selected-mosque', { mosqueId: mosque?.id ?? null }).catch((err) =>
      console.error('Failed to persist mosque selection:', err),
    );
  }, []);

  const isSuperAdmin = user?.superAdmin === true;

  // Determine the active mosque name for display
  const activeMosqueName = isSuperAdmin
    ? (selectedMosque?.name ?? null)
    : (user?.mosqueName ?? null);

  return (
    <AuthContext.Provider
      value={{ user, can, canAny, isSuperAdmin, loading, refresh: fetchCurrentUser, clearAuth, selectedMosque, selectMosque, activeMosqueName }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/** Hook to access the current user and permission helpers */
export function useAuth() {
  return useContext(AuthContext);
}
