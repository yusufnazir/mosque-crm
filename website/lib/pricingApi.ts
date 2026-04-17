export interface PlanEntitlement {
  featureKey: string;
  enabled: boolean;
  limitValue: number | null;
  displayLabel?: string;
  sortOrder?: number;
}

export interface SubscriptionPlan {
  id: number;
  code: string;
  name: string;
  description: string;
  monthlyPrice: number | null;
  yearlyPrice: number | null;
  isActive: boolean;
  entitlements: PlanEntitlement[];
}

export interface FeatureDefinition {
  featureKey: string;
  displayLabel: string;
  sortOrder: number;
  featureType: 'ALWAYS_ON' | 'BOOLEAN' | 'LIMIT' | 'PRO_ONLY';
}

export async function fetchPlans(): Promise<SubscriptionPlan[]> {
  const baseUrl = process.env.BACKEND_URL;
  if (!baseUrl) {
    throw new Error('BACKEND_URL is not set');
  }

  const res = await fetch(`${baseUrl}/subscription/plans`, {
    next: { revalidate: 300 }, // cache for 5 minutes
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch pricing plans: ${res.status}`);
  }

  return res.json();
}

export async function fetchFeatureDefinitions(): Promise<FeatureDefinition[]> {
  const baseUrl = process.env.BACKEND_URL;
  if (!baseUrl) {
    throw new Error('BACKEND_URL is not set');
  }

  const res = await fetch(`${baseUrl}/subscription/features`, {
    next: { revalidate: 300 }, // cache for 5 minutes
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch feature definitions: ${res.status}`);
  }

  return res.json();
}
