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

// Fee API
export const feeApi = {
  getAll: () => ApiClient.get('/admin/fees'),
  getById: (id: string) => ApiClient.get(`/admin/fees/${id}`),
  getByMember: (memberId: string) => ApiClient.get(`/admin/fees/member/${memberId}`),
  getOverdue: () => ApiClient.get('/admin/fees/overdue'),
  create: (data: any) => ApiClient.post('/admin/fees', data),
  update: (id: string, data: any) => ApiClient.put(`/admin/fees/${id}`, data),
  delete: (id: string) => ApiClient.delete(`/admin/fees/${id}`),
  /**
   * Returns monthly expected and realized fee income for the current year.
   * Each item: { month: number (1-12), expected: number, realized: number }
   */
  getMonthlyStats: () => ApiClient.get<{ month: number; expected: number; realized: number }[]>(
    '/admin/fees/monthly-stats'
  ),
};

// Member Portal API
export const portalApi = {
  getProfile: () => ApiClient.get('/member/profile'),
  getFees: () => ApiClient.get('/member/fees'),
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

