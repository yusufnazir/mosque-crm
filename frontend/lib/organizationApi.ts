import { ApiClient } from './api';

export interface Organization {
  id: number;
  name: string;
  shortName?: string;
  address?: string;
  city?: string;
  country?: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  website?: string;
  handle?: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export const organizationApi = {
  getAll: () => ApiClient.get<Organization[]>('/organizations'),
  getActive: () => ApiClient.get<Organization[]>('/organizations/active'),
  getById: (id: number) => ApiClient.get<Organization>(`/organizations/${id}`),
  create: (organization: Partial<Organization>) => ApiClient.post<Organization>('/organizations', organization),
  update: (id: number, organization: Partial<Organization>) => ApiClient.put<Organization>(`/organizations/${id}`, organization),
  remove: (id: number) => ApiClient.delete(`/organizations/${id}`),
  checkHandle: (handle: string, excludeId?: number) =>
    ApiClient.get<{ available: boolean }>(`/organizations/check-handle?handle=${encodeURIComponent(handle)}${excludeId !== undefined ? `&excludeId=${excludeId}` : ''}`),
  getMyOrganization: () => ApiClient.get<Organization>('/organizations/my'),
  updateMyHandle: (handle: string) => ApiClient.put<Organization>('/organizations/my/handle', { handle }),
};
