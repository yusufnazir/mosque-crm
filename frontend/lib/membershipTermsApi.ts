import { ApiClient } from './api';

export interface MembershipTermsVersionDTO {
  id: number;
  versionNumber: number;
  title: string;
  content: string;
  titleNl?: string | null;
  contentNl?: string | null;
  renderedContent: string;
  renderedContentNl?: string | null;
  active: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  availablePlaceholders: string[];
}

export interface MembershipTermsVersionCreateDTO {
  title: string;
  content: string;
  titleNl?: string;
  contentNl?: string;
}

export interface MembershipTermsDraftDTO {
  title?: string | null;
  titleNl?: string | null;
  content?: string | null;
  contentNl?: string | null;
  lastSavedAt?: number | null;
  lastSavedAtNl?: number | null;
  locale?: 'en' | 'nl';
}

export const membershipTermsApi = {
  getAll: () => ApiClient.get<MembershipTermsVersionDTO[]>('/membership-terms'),
  getCurrent: () => ApiClient.get<MembershipTermsVersionDTO | null>('/membership-terms/current'),
  getCurrentPublic: (orgHandle: string) =>
    ApiClient.get<MembershipTermsVersionDTO>(`/membership-terms/public/${encodeURIComponent(orgHandle)}/current`),
  publish: (data: MembershipTermsVersionCreateDTO) =>
    ApiClient.post<MembershipTermsVersionDTO>('/membership-terms', data),
  getDraft: () => ApiClient.get<MembershipTermsDraftDTO>('/membership-terms/draft'),
  saveDraft: (data: MembershipTermsDraftDTO) =>
    ApiClient.put<MembershipTermsDraftDTO>('/membership-terms/draft', data),
  isEnabled: () => ApiClient.get<{ enabled: boolean }>('/membership-terms/enabled'),
  setEnabled: (enabled: boolean) =>
    ApiClient.post<{ enabled: boolean }>('/membership-terms/enabled', { enabled }),
};