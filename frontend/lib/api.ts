import { RelationshipResponse, PersonSearchResult } from '../types';

/**
 * Returned instead of throwing when the backend rejects a request due to
 * plan entitlement / limit restrictions.  Callers can check with
 * `isPlanRestriction(result)` before using the data.
 */
export interface PlanRestriction {
  __planRestriction: true;
  code: 'PLAN_ENTITLEMENT_REQUIRED' | 'PLAN_LIMIT_EXCEEDED';
  featureKey?: string;
  message: string;
  limit?: number;
  current?: number;
}

export function isPlanRestriction(value: unknown): value is PlanRestriction {
  return typeof value === 'object' && value !== null && (value as any).__planRestriction === true;
}

/**
 * Returned when the backend responds with 402 because the tenant's
 * subscription is inactive (canceled, expired, or missing).
 * The SubscriptionContext listens for this via a custom event.
 */
export interface SubscriptionInactive {
  __subscriptionInactive: true;
  code: string;
  message: string;
}

export function isSubscriptionInactive(value: unknown): value is SubscriptionInactive {
  return typeof value === 'object' && value !== null && (value as any).__subscriptionInactive === true;
}

/** Custom event fired when a 402 is received so the layout can show the overlay */
export const SUBSCRIPTION_INACTIVE_EVENT = 'subscription:inactive';

/**
 * BFF API Client.
 *
 * All requests go to /api/* on the SAME ORIGIN (Next.js server).
 * The Next.js API proxy handles:
 *  - Forwarding to Spring Boot on localhost:8080
 *  - Attaching the JWT from the httpOnly session cookie
 *
 * The browser never sees or stores the JWT — it's all in httpOnly cookies.
 * No CORS issues — everything is same-origin.
 */

const API_BASE_URL = '/api';

export class ApiClient {
  private static getHeaders(): HeadersInit {
    const organizationId = typeof window !== 'undefined' ? localStorage.getItem('selectedOrganizationId') : null;
    return {
      'Content-Type': 'application/json',
      ...(organizationId ? { 'X-Organization-Id': organizationId } : {}),
    };
  }

  private static async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      // 401 = session expired or not authenticated
      if (response.status === 401) {
        if (typeof window !== 'undefined') {
          // Redirect to login — the httpOnly cookie has already been cleared by the proxy
          setTimeout(() => {
            window.location.href = '/login';
          }, 100);
        }
        throw new Error('Authentication required. Please login again.');
      }

      // 402 = subscription inactive (canceled, expired, or missing)
      if (response.status === 402) {
        const errorText = await response.text();
        let code = 'SUBSCRIPTION_INACTIVE';
        let message = 'Your subscription is inactive.';
        try {
          const body = JSON.parse(errorText);
          code = body.code || code;
          message = body.message || message;
        } catch { /* not JSON */ }
        // Fire a global event so the layout can show the blocking overlay
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent(SUBSCRIPTION_INACTIVE_EVENT, { detail: { code, message } }));
        }
        return {
          __subscriptionInactive: true,
          code,
          message,
        } as unknown as T;
      }

      if (response.status === 403) {
        const errorText = await response.text();
        try {
          const body = JSON.parse(errorText);
          if (body.code === 'PLAN_ENTITLEMENT_REQUIRED' || body.code === 'PLAN_LIMIT_EXCEEDED') {
            return {
              __planRestriction: true,
              code: body.code,
              featureKey: body.featureKey,
              message: body.message || 'Feature not available on your plan',
              ...(body.limit !== undefined ? { limit: body.limit } : {}),
              ...(body.current !== undefined ? { current: body.current } : {}),
            } as unknown as T;
          }
        } catch {
          // not JSON, fall through
        }
        throw new Error(errorText || 'Access denied');
      }

      if (response.status === 404) {
        const errorText = await response.text();
        throw new Error(errorText || 'Resource not found');
      }

      const errorText = await response.text();
      throw new Error(errorText || `HTTP ${response.status}: ${response.statusText}`);
    }

    const text = await response.text();
    if (!text) return undefined as unknown as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      return text as unknown as T;
    }
  }

  static async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return this.handleResponse<T>(response);
  }

  static async post<T>(endpoint: string, data?: any): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<T>(response);
  }

  static async put<T>(endpoint: string, data: any): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<T>(response);
  }

  static async delete(endpoint: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    await this.handleResponse<void>(response);
  }

  static async patch<T>(endpoint: string, data?: any): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: data != null ? JSON.stringify(data) : undefined,
    });
    return this.handleResponse<T>(response);
  }

  /**
   * Upload a file via multipart/form-data.
   * Do NOT set Content-Type — the browser will generate the boundary automatically.
   */
  static async uploadFile<T>(endpoint: string, file: File, fieldName = 'file'): Promise<T> {
    const organizationId = typeof window !== 'undefined' ? localStorage.getItem('selectedOrganizationId') : null;
    const formData = new FormData();
    formData.append(fieldName, file);

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        ...(organizationId ? { 'X-Organization-Id': organizationId } : {}),
      },
      body: formData,
    });
    return this.handleResponse<T>(response);
  }

  /**
   * Fetch a binary resource (e.g. PDF) and return it as a Blob.
   */
  static async getBlob(endpoint: string): Promise<Blob> {
    const organizationId = typeof window !== 'undefined' ? localStorage.getItem('selectedOrganizationId') : null;
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: {
        ...(organizationId ? { 'X-Organization-Id': organizationId } : {}),
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: failed to download file`);
    }
    return response.blob();
  }
}

// Auth API
export const authApi = {
  login: async (credentials: { username: string; password: string }) => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    if (!response.ok) {
      // Parse structured JSON error from backend
      try {
        const error = await response.json();
        throw { code: error.code || 'login_failed', message: error.message || 'Login failed' };
      } catch (e: any) {
        if (e.code) throw e; // Already parsed
        throw { code: 'login_failed', message: 'Login failed. Please try again.' };
      }
    }
    return response.json();
  },
  changePassword: (data: { oldPassword: string; newPassword: string }) =>
    ApiClient.post('/auth/change-password', data),
};

// User Preferences API
export const preferencesApi = {
  get: () => ApiClient.get('/me/preferences'),
  updateLanguage: (language: string) => ApiClient.put('/me/preferences/language', { language }),
};

// Member API (backed by person+membership domain)

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export interface AgeGenderBucket {
  bucket: string;
  gender: string;
  count: number;
}

export const memberApi = {
  getAll: (queryParams?: string) => {
    const url = queryParams ? `/persons?${queryParams}` : '/persons';
    return ApiClient.get(url);
  },
  getPaged: (params: { page?: number; size?: number; search?: string; sortBy?: string; direction?: string }) => {
    const searchParams = new URLSearchParams();
    if (params.page !== undefined) searchParams.set('page', String(params.page));
    if (params.size !== undefined) searchParams.set('size', String(params.size));
    if (params.search) searchParams.set('search', params.search);
    if (params.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params.direction) searchParams.set('direction', params.direction);
    return ApiClient.get<PageResponse<PersonSearchResult>>(`/persons/page?${searchParams.toString()}`);
  },
  getStats: () => ApiClient.get<{ total: number; active: number }>('/persons/stats'),
  getById: (id: string) => ApiClient.get(`/persons/${id}`),
  search: (keyword: string) => ApiClient.get<any[]>(`/persons/search?q=${encodeURIComponent(keyword)}`),
  create: (data: any) => ApiClient.post('/persons', data),
  update: (id: string, data: any) => ApiClient.put(`/admin/members/${id}`, data),
  delete: (id: string) => ApiClient.delete(`/persons/${id}`),
  getAgeDistribution: () => ApiClient.get('/genealogy/age-distribution'),
  getGenderDistribution: () => ApiClient.get('/genealogy/gender-breakdown'),
  getAgeGenderDistribution: (): Promise<AgeGenderBucket[]> => ApiClient.get('/genealogy/age-gender-distribution'),
};

// Payment Statistics API (for dashboard charts)
export const paymentStatsApi = {
  getIncomeByType: (year: number): Promise<Record<string, number>> =>
    ApiClient.get(`/contributions/payments/stats/income-by-type?year=${year}`),
  getPaymentYears: (): Promise<number[]> =>
    ApiClient.get('/contributions/payments/stats/years'),
};

// Member Portal API
export const portalApi = {
  getProfile: () => ApiClient.get('/member/profile'),
};

// Profile Image API — all images served through backend (no direct MinIO URLs)
export const profileImageApi = {
  /** Upload (or replace) the current user's own profile image */
  uploadMy: (file: File) =>
    ApiClient.uploadFile<{ message: string; imageUrl: string }>('/profile-image/me', file),
  /** Get the URL path for the current user's profile image */
  getMyUrl: () => '/api/profile-image/me',
  /** Delete the current user's profile image */
  deleteMy: () => ApiClient.delete('/profile-image/me'),
  /** Admin: upload profile image for any person */
  uploadForPerson: (personId: string | number, file: File) =>
    ApiClient.uploadFile<{ message: string; imageUrl: string }>(`/profile-image/persons/${personId}`, file),
  /** Get the URL path for any person's profile image */
  getPersonUrl: (personId: string | number) => `/api/profile-image/persons/${personId}`,
  /** Admin: delete profile image for any person */
  deleteForPerson: (personId: string | number) => ApiClient.delete(`/profile-image/persons/${personId}`),
};

// Genealogy/Relationship API
export const relationshipApi = {
  searchPersons: (query: string) => ApiClient.get(`/persons/search?q=${encodeURIComponent(query)}`),
  getRelationships: async (personId: number): Promise<RelationshipResponse[]> => {
    const response = await fetch(`${API_BASE_URL}/genealogy/persons/${personId}/relationships`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      throw new Error('Failed to fetch relationships');
    }
    return response.json();
  },
  addRelationship: (personId: string, data: any) => ApiClient.post(`/genealogy/persons/${personId}/relationships`, data),
  removeRelationship: (personId: string, relationshipId: string) => ApiClient.delete(`/genealogy/persons/${personId}/relationships/${relationshipId}`),
};

// Person API
export const personApi = {
  markAsDeceased: (personId: string, data: { dateOfDeath: string }) => 
    ApiClient.put(`/persons/${personId}/deceased`, data),
};

// ── Report types ──────────────────────────────────────────────────
export interface CurrencyAmount {
  currencyCode: string;
  currencySymbol: string;
  amount: number;
}

export interface ContributionTypeColumn {
  id: number;
  code: string;
  name: string;
}

export interface PersonPaymentRow {
  personId: number;
  lastName: string;
  firstName: string;
  /** contributionTypeId → list of CurrencyAmount */
  amounts: Record<number, CurrencyAmount[]>;
  totals: CurrencyAmount[];
}

export interface PaymentSummaryReport {
  year: number;
  contributionTypes: ContributionTypeColumn[];
  rows: PersonPaymentRow[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface ContributionTotalRow {
  contributionTypeId: number;
  contributionTypeCode: string;
  contributionTypeName: string;
  totals: { currencyCode: string; amount: number }[];
}

export interface ContributionTotalReport {
  year: number;
  currencies: string[];
  rows: ContributionTotalRow[];
  grandTotals: { currencyCode: string; amount: number }[];
}

// Report API
export const reportApi = {
  getPaymentSummary: (year: number, locale: string = 'en', page: number = 0, size: number = 20): Promise<PaymentSummaryReport> =>
    ApiClient.get(`/reports/payment-summary?year=${year}&locale=${encodeURIComponent(locale)}&page=${page}&size=${size}`),
  /** Fetch ALL rows (no pagination) for export purposes */
  getPaymentSummaryAll: (year: number, locale: string = 'en'): Promise<PaymentSummaryReport> =>
    ApiClient.get(`/reports/payment-summary?year=${year}&locale=${encodeURIComponent(locale)}&page=0&size=0`),
  getContributionTotals: (year: number, locale: string = 'en'): Promise<ContributionTotalReport> =>
    ApiClient.get(`/reports/contribution-totals?year=${year}&locale=${encodeURIComponent(locale)}`),
};

// ── Subscription / Plan types ──────────────────────────────────────────────
export interface PlanEntitlementDTO {
  id?: number;
  featureKey: string;
  enabled: boolean;
  limitValue: number | null;
}

export interface SubscriptionPlanDTO {
  id: number;
  code: string;
  name: string;
  description: string | null;
  monthlyPrice: number;
  yearlyPrice: number;
  isActive: boolean;
  entitlements: PlanEntitlementDTO[];
}

export interface OrganizationSubscriptionDTO {
  id: number;
  organizationId: number;
  plan: SubscriptionPlanDTO;
  status: string;
  billingCycle: string;
  startsAt: string;
  endsAt: string | null;
  canceledAt: string | null;
  nextDueDate: string | null;
  graceEndDate: string | null;
  readOnlyDate: string | null;
  lockDate: string | null;
  lastPaymentDate: string | null;
  billingEnabled?: boolean;
}

export interface SubscriptionInvoiceDTO {
  id: number;
  organizationId: number;
  organizationName?: string;
  subscriptionId: number;
  planName?: string;
  amount: number;
  currency: string;
  issueDate: string;
  dueDate: string;
  periodStart: string;
  periodEnd: string;
  status: 'PENDING' | 'PAID' | 'OVERDUE';
  paidAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionPaymentDTO {
  id: number;
  organizationId: number;
  invoiceId: number;
  amount: number;
  currency: string;
  paymentDate: string;
  paymentMethod: string | null;
  reference: string | null;
  createdAt: string;
}

export interface RecordSubscriptionPaymentRequest {
  amount: number;
  currency?: string;
  paymentMethod?: string;
  reference?: string;
}

export interface CreateSubscriptionRequest {
  organizationId: number;
  planCode: string;
  billingCycle: string;
  startsAt?: string;
  endsAt?: string;
  autoRenew?: boolean;
  billingEnabled?: boolean;
}

export interface CreateSubscriptionPlanEntitlementInput {
  featureKey: string;
  enabled: boolean;
  limitValue?: number | null;
}

export interface CreateSubscriptionPlanRequest {
  code: string;
  name: string;
  description?: string;
  monthlyPrice: number;
  yearlyPrice: number;
  isActive?: boolean;
  entitlements?: CreateSubscriptionPlanEntitlementInput[];
}

export interface UpdateSubscriptionPlanRequest {
  name: string;
  description?: string;
  monthlyPrice: number;
  yearlyPrice: number;
  isActive: boolean;
  entitlements?: CreateSubscriptionPlanEntitlementInput[];
}

export interface ChangeSubscriptionPlanRequest {
  planCode: string;
}

export interface ChangeSubscriptionPlanResultDTO {
  action: 'UPGRADE_IMMEDIATE' | 'DOWNGRADE_SCHEDULED' | 'UPGRADE_PREVIEW' | 'DOWNGRADE_PREVIEW';
  message: string;
  amountDueNow: number;
  remainingDays: number;
  effectiveAt: string;
  subscription: OrganizationSubscriptionDTO;
}

// Subscription API
export const subscriptionApi = {
  getCurrent: (): Promise<OrganizationSubscriptionDTO | null> =>
    ApiClient.get('/subscription/current'),
  getPlans: (): Promise<SubscriptionPlanDTO[]> =>
    ApiClient.get('/subscription/plans'),
  getPlanByCode: (code: string): Promise<SubscriptionPlanDTO> =>
    ApiClient.get(`/subscription/plans/${code}`),
  createPlan: (data: CreateSubscriptionPlanRequest): Promise<SubscriptionPlanDTO> =>
    ApiClient.post('/admin/subscription/plans', data),
  updatePlan: (code: string, data: UpdateSubscriptionPlanRequest): Promise<SubscriptionPlanDTO> =>
    ApiClient.put(`/admin/subscription/plans/${code}`, data),
  deletePlan: (code: string): Promise<SubscriptionPlanDTO> =>
    ApiClient.put(`/admin/subscription/plans/${code}/deactivate`, {}),
  assign: (data: CreateSubscriptionRequest): Promise<OrganizationSubscriptionDTO> =>
    ApiClient.post('/admin/subscription', data),
  assignSimple: (data: { organizationId: number; planCode: string; billingCycle?: 'MONTHLY' | 'YEARLY' }): Promise<OrganizationSubscriptionDTO> =>
    ApiClient.post('/admin/subscription', {
      organizationId: data.organizationId,
      planCode: data.planCode,
      billingCycle: data.billingCycle ?? 'MONTHLY',
      autoRenew: true,
    }),
  changePlan: (data: ChangeSubscriptionPlanRequest): Promise<ChangeSubscriptionPlanResultDTO> =>
    ApiClient.post('/subscription/change-plan', data),
  choosePlan: (data: ChangeSubscriptionPlanRequest): Promise<OrganizationSubscriptionDTO> =>
    ApiClient.post('/subscription/choose-plan', data),
  previewPlanChange: (data: ChangeSubscriptionPlanRequest): Promise<ChangeSubscriptionPlanResultDTO> =>
    ApiClient.post('/subscription/change-plan/preview', data),
  updateStatus: (id: number, status: string): Promise<OrganizationSubscriptionDTO> =>
    ApiClient.put(`/admin/subscription/${id}/status`, { status }),
  updateBillingEnabled: (id: number, billingEnabled: boolean): Promise<OrganizationSubscriptionDTO> =>
    ApiClient.patch(`/admin/subscription/${id}/billing-enabled`, { billingEnabled }),
  getInvoices: (): Promise<SubscriptionInvoiceDTO[]> =>
    ApiClient.get('/subscription/invoices'),
  getInvoice: (id: number): Promise<SubscriptionInvoiceDTO> =>
    ApiClient.get(`/subscription/invoices/${id}`),
  downloadInvoicePdf: async (id: number): Promise<void> => {
    const blob = await ApiClient.getBlob(`/subscription/invoices/${id}/pdf`);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-${id}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
  recordPayment: (invoiceId: number, data: RecordSubscriptionPaymentRequest): Promise<SubscriptionPaymentDTO> =>
    ApiClient.post(`/admin/subscription/invoices/${invoiceId}/payment`, data),
  deleteInvoice: (invoiceId: number): Promise<void> =>
    ApiClient.delete(`/admin/subscription/invoices/${invoiceId}`),
};

