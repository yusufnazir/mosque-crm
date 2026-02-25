import { RelationshipResponse } from '../types';

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
    const mosqueId = typeof window !== 'undefined' ? localStorage.getItem('selectedMosqueId') : null;
    return {
      'Content-Type': 'application/json',
      ...(mosqueId ? { 'X-Mosque-Id': mosqueId } : {}),
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

      if (response.status === 404) {
        const errorText = await response.text();
        throw new Error(errorText || 'Resource not found');
      }

      const errorText = await response.text();
      throw new Error(errorText || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
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
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  }

  static async patch<T>(endpoint: string, data?: any): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: data != null ? JSON.stringify(data) : undefined,
    });
    return this.handleResponse<T>(response);
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
  search: (keyword: string) => ApiClient.get(`/persons/search?q=${encodeURIComponent(keyword)}`),
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

