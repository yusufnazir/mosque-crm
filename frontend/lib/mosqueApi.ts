import { ApiClient } from './api';

export interface Mosque {
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
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export const mosqueApi = {
  getAll: () => ApiClient.get<Mosque[]>('/mosques'),
  getActive: () => ApiClient.get<Mosque[]>('/mosques/active'),
  getById: (id: number) => ApiClient.get<Mosque>(`/mosques/${id}`),
  create: (mosque: Partial<Mosque>) => ApiClient.post<Mosque>('/mosques', mosque),
  update: (id: number, mosque: Partial<Mosque>) => ApiClient.put<Mosque>(`/mosques/${id}`, mosque),
};
