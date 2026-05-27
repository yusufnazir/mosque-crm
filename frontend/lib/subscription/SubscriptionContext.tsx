'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { subscriptionApi, OrganizationSubscriptionDTO, PlanEntitlementDTO, SUBSCRIPTION_INACTIVE_EVENT } from '@/lib/api';
import { useAuth } from '@/lib/auth/AuthContext';

type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'grace' | 'read_only' | 'locked' | 'inactive' | 'loading';

const USABLE_STATUSES = new Set(['ACTIVE', 'TRIALING', 'PAST_DUE', 'GRACE', 'READ_ONLY']);

function isTransientFetchError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes('BACKEND_UNAVAILABLE') ||
    msg.includes('temporarily unavailable') ||
    msg.includes('503') ||
    msg.includes('fetch failed') ||
    msg.includes('Failed to fetch')
  );
}

function isNoActiveSubscriptionError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes('NO_ACTIVE_SUBSCRIPTION') || msg.includes('No active subscription');
}

interface SubscriptionContextValue {
  /** The active subscription for the current organization, null if none */
  subscription: OrganizationSubscriptionDTO | null;
  /** Whether the subscription data is still loading */
  loading: boolean;
  /** High-level subscription status for UI enforcement */
  status: SubscriptionStatus;
  /** Check if a feature is enabled on the current plan */
  hasFeature: (featureKey: string) => boolean;
  /** Get the numeric limit for a feature (null = unlimited, undefined = not found) */
  getLimit: (featureKey: string) => number | null | undefined;
  /** Re-fetch subscription data */
  refresh: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextValue>({
  subscription: null,
  loading: true,
  status: 'loading',
  hasFeature: () => true,
  getLimit: () => null,
  refresh: async () => {},
});

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user, isSuperAdmin, loading: authLoading } = useAuth();
  const [subscription, setSubscription] = useState<OrganizationSubscriptionDTO | null>(null);
  const [loading, setLoading] = useState(true);
  /** True only when we have confirmed there is no usable subscription for this org */
  const [enforceInactive, setEnforceInactive] = useState(false);
  /** True when the latest fetch failed for transient reasons (backend down, network, etc.) */
  const [fetchError, setFetchError] = useState(false);

  const fetchSubscription = useCallback(async () => {
    // Unauthenticated users skip subscription checks
    if (!user) {
      setSubscription(null);
      setEnforceInactive(false);
      setFetchError(false);
      setLoading(false);
      return;
    }
    try {
      const data = await subscriptionApi.getCurrent();
      setFetchError(false);
      if (data) {
        setSubscription(data);
        setEnforceInactive(!USABLE_STATUSES.has(data.status));
      } else {
        // 204 No Content — super admin without org scope, or tenant with no org in JWT
        setSubscription(null);
        setEnforceInactive(!isSuperAdmin);
      }
    } catch (err) {
      if (isNoActiveSubscriptionError(err)) {
        setSubscription(null);
        setEnforceInactive(!isSuperAdmin);
        setFetchError(false);
      } else if (isTransientFetchError(err)) {
        // Do not clear subscription or show the inactive overlay when the API is unreachable
        setFetchError(true);
      } else {
        // Unknown error — avoid falsely blocking the app
        setFetchError(true);
      }
    } finally {
      setLoading(false);
    }
  }, [user, isSuperAdmin]);

  useEffect(() => {
    if (!authLoading) {
      fetchSubscription();
    }
  }, [authLoading, fetchSubscription]);

  // Re-verify subscription when another API returns 402 (that endpoint is enforced;
  // /subscription/current is excluded and is the source of truth).
  useEffect(() => {
    const handler = () => {
      void fetchSubscription();
    };
    window.addEventListener(SUBSCRIPTION_INACTIVE_EVENT, handler);
    return () => window.removeEventListener(SUBSCRIPTION_INACTIVE_EVENT, handler);
  }, [fetchSubscription]);

  // Re-fetch subscription when tab becomes visible (catches plan changes made elsewhere)
  useEffect(() => {
    if (!user) return;
    const handler = () => {
      if (document.visibilityState === 'visible') {
        fetchSubscription();
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [user, fetchSubscription]);

  // Periodic refresh every 5 minutes to stay in sync with backend plan changes
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => fetchSubscription(), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user, fetchSubscription]);

  const status: SubscriptionStatus = useMemo(() => {
    if (loading) return 'loading';
    if (isSuperAdmin) return 'active';
    // Backend unreachable — do not show the inactive overlay
    if (fetchError) return 'loading';
    if (enforceInactive) return 'inactive';
    if (!subscription) return 'inactive';
    const s = subscription.status;
    if (s === 'ACTIVE') return 'active';
    if (s === 'TRIALING') return 'trialing';
    if (s === 'PAST_DUE') return 'past_due';
    if (s === 'GRACE') return 'grace';
    if (s === 'READ_ONLY') return 'read_only';
    if (s === 'LOCKED') return 'locked';
    return 'inactive';
  }, [loading, isSuperAdmin, enforceInactive, fetchError, subscription]);

  const entitlementMap = useMemo(() => {
    const map = new Map<string, PlanEntitlementDTO>();
    if (subscription?.plan?.entitlements) {
      for (const e of subscription.plan.entitlements) {
        map.set(e.featureKey, e);
      }
    }
    return map;
  }, [subscription]);

  const hasFeature = useCallback(
    (featureKey: string): boolean => {
      // Super admins bypass all plan checks
      if (isSuperAdmin) return true;
      // No subscription = features are blocked (enforcement active)
      if (!subscription) return false;
      const entitlement = entitlementMap.get(featureKey);
      if (!entitlement) return true; // Feature not in plan = not gated
      return entitlement.enabled;
    },
    [isSuperAdmin, subscription, entitlementMap],
  );

  const getLimit = useCallback(
    (featureKey: string): number | null | undefined => {
      if (!subscription) return null;
      const entitlement = entitlementMap.get(featureKey);
      if (!entitlement) return undefined;
      return entitlement.limitValue;
    },
    [isSuperAdmin, subscription, entitlementMap],
  );

  return (
    <SubscriptionContext.Provider
      value={{ subscription, loading, status, hasFeature, getLimit, refresh: fetchSubscription }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

/** Hook to access subscription entitlements for the current organization */
export function useSubscription() {
  return useContext(SubscriptionContext);
}
