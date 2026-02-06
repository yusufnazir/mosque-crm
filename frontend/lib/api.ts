import { RelationshipResponse } from '../types';
import { getToken } from './utils';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

export class ApiClient {
  private static getHeaders(): HeadersInit {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  private static async handleResponse<T>(response: Response): Promise<T> {
    // Log all API calls
    console.log('=== API Call ===');
    console.log('URL:', response.url);
    console.log('Status:', response.status, response.statusText);
    console.log('Headers:', {
      'content-type': response.headers.get('content-type'),
      'authorization': response.headers.get('authorization') ? 'Bearer [TOKEN]' : 'none'
    });

    if (!response.ok) {
      // Only handle 401 Unauthorized by redirecting to login
      // 401 means token is invalid or expired
      if (response.status === 401) {
        console.error('401 Unauthorized - redirecting to login');
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          // Add a small delay to prevent multiple redirects
          setTimeout(() => {
            window.location.href = '/login';
          }, 100);
        }
        throw new Error('Authentication required. Please login again.');
      }
      
      // Handle 404 gracefully - don't log as error
      if (response.status === 404) {
        const errorText = await response.text();
        console.log('404 Not Found:', errorText);
        throw new Error(errorText || 'Resource not found');
      }
      
      // Don't redirect on 403 (Forbidden) or other errors
      // 403 means authenticated but not authorized for that resource
      const errorText = await response.text();
      const errorMessage = errorText || `HTTP ${response.status}: ${response.statusText}`;
      
      console.error('API Error Response:', {
        status: response.status,
        statusText: response.statusText,
        url: response.url,
        errorBody: errorText,
        token: typeof window !== 'undefined' ? (localStorage.getItem('token') ? 'EXISTS' : 'MISSING') : 'N/A',
        user: typeof window !== 'undefined' ? localStorage.getItem('user') : 'N/A'
      });
      
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log('Response Data:', data);
    console.log('================');
    return data;
  }

  static async get<T>(endpoint: string): Promise<T> {
    console.log('=== GET Request ===');
    console.log('Endpoint:', endpoint);
    console.log('Full URL:', `${API_BASE_URL}${endpoint}`);
    console.log('Headers:', this.getHeaders());
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return this.handleResponse<T>(response);
  }

  static async post<T>(endpoint: string, data?: any): Promise<T> {
    console.log('=== POST Request ===');
    console.log('Endpoint:', endpoint);
    console.log('Full URL:', `${API_BASE_URL}${endpoint}`);
    console.log('Headers:', this.getHeaders());
    console.log('Body:', data);
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<T>(response);
  }

  static async put<T>(endpoint: string, data: any): Promise<T> {
    console.log('=== PUT Request ===');
    console.log('Endpoint:', endpoint);
    console.log('Full URL:', `${API_BASE_URL}${endpoint}`);
    console.log('Headers:', this.getHeaders());
    console.log('Body:', data);
    
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
  login: (credentials: { username: string; password: string }) =>
    ApiClient.post('/auth/login', credentials),
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
  // Only use the async fetch version for getRelationships
  getRelationships: async (personId: number): Promise<RelationshipResponse[]> => {
    console.log('relationshipApi.getRelationships TOP-LEVEL DEBUG: called with', personId);
    const token = getToken();
    console.log('relationshipApi.getRelationships: calling', `${API_BASE_URL}/genealogy/persons/${personId}/relationships`);
    const response = await fetch(`${API_BASE_URL}/genealogy/persons/${personId}/relationships`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    console.log('relationshipApi.getRelationships: response status', response.status);
    if (!response.ok) {
      throw new Error('Failed to fetch relationships');
    }
    const data = await response.json();
    console.log('relationshipApi.getRelationships: response data', data);
    return data;
  },
  addRelationship: (personId: string, data: any) => ApiClient.post(`/genealogy/persons/${personId}/relationships`, data),
  removeRelationship: (personId: string, relationshipId: string) => ApiClient.delete(`/genealogy/persons/${personId}/relationships/${relationshipId}`),
};

// Person API
export const personApi = {
  markAsDeceased: (personId: string, data: { dateOfDeath: string }) => 
    ApiClient.put(`/persons/${personId}/deceased`, data),
};

