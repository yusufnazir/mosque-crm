'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { subscriptionApi, OrganizationSubscriptionDTO, PlanEntitlementDTO, SUBSCRIPTION_INACTIVE_EVENT } from '@/lib/api';
import { useAuth } from '@/lib/auth/AuthContext';

type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'grace' | 'read_only' | 'locked' | 'inactive' | 'loading';

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
  const [blocked, setBlocked] = useState(false);

  const fetchSubscription = useCallback(async () => {
    // Unauthenticated users skip subscription checks
    if (!user) {
      setSubscription(null);
      setLoading(false);
      return;
    }
    try {
      const data = await subscriptionApi.getCurrent();
      setSubscription(data);
      setBlocked(false);
    } catch {
      // No active subscription or network error — treat as no subscription
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  }, [user, isSuperAdmin]);

  useEffect(() => {
    if (!authLoading) {
      fetchSubscription();
    }
  }, [authLoading, fetchSubscription]);

  // Listen for 402 events from ApiClient to detect subscription enforcement
  useEffect(() => {
    const handler = () => setBlocked(true);
    window.addEventListener(SUBSCRIPTION_INACTIVE_EVENT, handler);
    return () => window.removeEventListener(SUBSCRIPTION_INACTIVE_EVENT, handler);
  }, []);

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
    if (blocked) return 'inactive';
    if (!subscription) return 'inactive';
    const s = subscription.status;
    if (s === 'ACTIVE') return 'active';
    if (s === 'TRIALING') return 'trialing';
    if (s === 'PAST_DUE') return 'past_due';
    if (s === 'GRACE') return 'grace';
    if (s === 'READ_ONLY') return 'read_only';
    if (s === 'LOCKED') return 'locked';
    return 'inactive';
  }, [loading, isSuperAdmin, blocked, subscription]);

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
