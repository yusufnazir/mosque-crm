import { ApiClient } from './api';

// ===== TypeScript types for Expenses module =====

export interface ExpenseTagDTO {
  id: number;
  name: string;
  organizationId?: number;
}

export interface ExpenseDTO {
  id: number;
  expenseDate: string;
  amount: number;
  currencyId: number;
  currencyCode?: string;
  currencySymbol?: string;
  title: string;
  notes?: string;
  tags: ExpenseTagDTO[];
  deleted: boolean;
  deletionReason?: string;
  deletedAt?: string;
  deletedBy?: number;
  createdBy?: number;
  createdAt?: string;
  updatedBy?: number;
  updatedAt?: string;
}

export interface ExpenseCreateDTO {
  expenseDate: string;
  amount: number;
  currencyId: number;
  title: string;
  notes?: string;
  tagIds: number[];
}

export interface ExpenseDeleteDTO {
  reason: string;
}

export interface ExpenseTagCreateDTO {
  name: string;
}

export interface ExpenseAuditEventDTO {
  id: number;
  expenseId: number;
  eventType: string;
  userId?: number;
  actorName?: string;
  detail?: string;
  occurredAt?: string;
}

export interface ExpenseAuditLogPageDTO {
  content: ExpenseAuditEventDTO[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
}

export interface ExpenseListParams {
  dateFrom?: string;
  dateTo?: string;
  tagIds?: number[];
  includeDeleted?: boolean;
}

export interface ExpenseAuditLogParams {
  page?: number;
  size?: number;
}

export interface ExpenseMonthlySummaryDTO {
  month: string;        // "yyyy-MM", e.g. "2026-01"
  currencyCode: string; // e.g. "SRD"
  total: number;
}

// ===== API client functions =====

function buildQueryString(params: Record<string, unknown>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '');
  if (!entries.length) return '';
  const parts = entries.flatMap(([k, v]) =>
    Array.isArray(v)
      ? v.map((item) => `${encodeURIComponent(k)}=${encodeURIComponent(String(item))}`)
      : [`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`]
  );
  return '?' + parts.join('&');
}

export const expenseApi = {
  list: (params?: ExpenseListParams): Promise<ExpenseDTO[]> => {
    const qs = params ? buildQueryString(params as Record<string, unknown>) : '';
    return ApiClient.get<ExpenseDTO[]>(`/expenses${qs}`);
  },

  getById: (id: number): Promise<ExpenseDTO> =>
    ApiClient.get<ExpenseDTO>(`/expenses/${id}`),

  create: (data: ExpenseCreateDTO): Promise<ExpenseDTO> =>
    ApiClient.post<ExpenseDTO>('/expenses', data),

  update: (id: number, data: ExpenseCreateDTO): Promise<ExpenseDTO> =>
    ApiClient.put<ExpenseDTO>(`/expenses/${id}`, data),

  softDelete: (id: number, reason: string): Promise<void> =>
    ApiClient.post<void>(`/expenses/${id}/delete`, { reason }),

  restore: (id: number): Promise<ExpenseDTO> =>
    ApiClient.post<ExpenseDTO>(`/expenses/${id}/restore`, {}),

  listTags: (): Promise<ExpenseTagDTO[]> =>
    ApiClient.get<ExpenseTagDTO[]>('/expenses/tags'),

  createTag: (name: string): Promise<ExpenseTagDTO> =>
    ApiClient.post<ExpenseTagDTO>('/expenses/tags', { name }),

  getAuditLog: (id: number, params?: ExpenseAuditLogParams): Promise<ExpenseAuditLogPageDTO> => {
    const qs = params ? buildQueryString(params as Record<string, unknown>) : '';
    return ApiClient.get<ExpenseAuditLogPageDTO>(`/expenses/${id}/audit${qs}`);
  },

  getMonthlySummary: (year: number): Promise<ExpenseMonthlySummaryDTO[]> =>
    ApiClient.get<ExpenseMonthlySummaryDTO[]>(`/expenses/monthly-summary?year=${year}`),
};
