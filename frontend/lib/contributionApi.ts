import { ApiClient } from './api';

// ===== TypeScript types for Contributions module =====

export interface ContributionTypeTranslation {
  id?: number;
  locale: string;
  name: string;
  description?: string;
}

export interface ContributionObligation {
  id?: number;
  contributionTypeId: number;
  contributionTypeCode?: string;
  amount: number;
  frequency: 'MONTHLY' | 'YEARLY';
  startDate: string;
  currencyId?: number;
  currencyCode?: string;
  currencySymbol?: string;
}

export interface ContributionType {
  id: number;
  code: string;
  isRequired: boolean;
  isActive: boolean;
  createdAt?: string;
  translations: ContributionTypeTranslation[];
  obligations?: ContributionObligation[];
}

export interface ContributionTypeCreate {
  code: string;
  isRequired: boolean;
  isActive?: boolean;
  translations?: ContributionTypeTranslation[];
}

export interface ContributionObligationCreate {
  contributionTypeId: number;
  amount: number;
  frequency: string;
  startDate: string;
  currencyId?: number;
}

export interface MemberPayment {
  id: number;
  personId: number;
  personName: string;
  contributionTypeId: number;
  contributionTypeCode: string;
  amount: number;
  paymentDate: string;
  reference?: string;
  notes?: string;
  createdBy?: number;
  createdAt?: string;
  currencyId?: number;
  currencyCode?: string;
  currencySymbol?: string;
}

export interface MemberPaymentCreate {
  personId: number;
  contributionTypeId: number;
  amount: number;
  paymentDate: string;
  reference?: string;
  notes?: string;
  currencyId?: number;
}

// ===== API functions =====

export const contributionTypeApi = {
  getAll: (): Promise<ContributionType[]> =>
    ApiClient.get('/contributions/types'),

  getActive: (): Promise<ContributionType[]> =>
    ApiClient.get('/contributions/types/active'),

  getById: (id: number): Promise<ContributionType> =>
    ApiClient.get(`/contributions/types/${id}`),

  create: (data: ContributionTypeCreate): Promise<ContributionType> =>
    ApiClient.post('/contributions/types', data),

  update: (id: number, data: ContributionTypeCreate): Promise<ContributionType> =>
    ApiClient.put(`/contributions/types/${id}`, data),

  deactivate: (id: number): Promise<void> =>
    ApiClient.delete(`/contributions/types/${id}`),

  activate: (id: number): Promise<void> =>
    ApiClient.put(`/contributions/types/${id}/activate`, {}),
};

export const contributionObligationApi = {
  getAll: (): Promise<ContributionObligation[]> =>
    ApiClient.get('/contributions/obligations'),

  getById: (id: number): Promise<ContributionObligation> =>
    ApiClient.get(`/contributions/obligations/${id}`),

  getByTypeId: (typeId: number): Promise<ContributionObligation> =>
    ApiClient.get(`/contributions/obligations/by-type/${typeId}`),

  create: (data: ContributionObligationCreate): Promise<ContributionObligation> =>
    ApiClient.post('/contributions/obligations', data),

  update: (id: number, data: ContributionObligationCreate): Promise<ContributionObligation> =>
    ApiClient.put(`/contributions/obligations/${id}`, data),

  delete: (id: number): Promise<void> =>
    ApiClient.delete(`/contributions/obligations/${id}`),
};

export const memberPaymentApi = {
  getAll: (): Promise<MemberPayment[]> =>
    ApiClient.get('/contributions/payments'),

  getById: (id: number): Promise<MemberPayment> =>
    ApiClient.get(`/contributions/payments/${id}`),

  getByPerson: (personId: number): Promise<MemberPayment[]> =>
    ApiClient.get(`/contributions/payments/by-person/${personId}`),

  getByType: (typeId: number): Promise<MemberPayment[]> =>
    ApiClient.get(`/contributions/payments/by-type/${typeId}`),

  create: (data: MemberPaymentCreate): Promise<MemberPayment> =>
    ApiClient.post('/contributions/payments', data),

  update: (id: number, data: MemberPaymentCreate): Promise<MemberPayment> =>
    ApiClient.put(`/contributions/payments/${id}`, data),

  delete: (id: number): Promise<void> =>
    ApiClient.delete(`/contributions/payments/${id}`),
};
