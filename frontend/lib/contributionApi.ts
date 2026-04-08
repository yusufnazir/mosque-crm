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
  contributionTypeName?: string;
  amount: number;
  paymentDate: string;
  periodFrom?: string;
  periodTo?: string;
  reference?: string;
  notes?: string;
  createdBy?: number;
  createdAt?: string;
  currencyId?: number;
  currencyCode?: string;
  currencySymbol?: string;
  isReversal?: boolean;
  reversedPaymentId?: number;
  paymentGroupId?: string;
  documentCount?: number;
}

export interface MemberPaymentCreate {
  personId: number | string;
  contributionTypeId: number;
  amount: number;
  paymentDate: string;
  periodFrom?: string;
  periodTo?: string;
  reference?: string;
  notes?: string;
  currencyId?: number;
  paymentGroupId?: string;
}

// ===== Pagination types =====

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number; // 0-based page index
  size: number;
  first: boolean;
  last: boolean;
}

export interface PaginationParams {
  page: number;
  size: number;
  sort?: string[];  // e.g. ["person.firstName,asc", "periodFrom,asc"]
  year?: number;
  personId?: number;
  contributionTypeId?: number;
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

  getAllPaginated: (params: PaginationParams): Promise<PageResponse<MemberPayment>> => {
    const searchParams = new URLSearchParams();
    searchParams.set('page', String(params.page));
    searchParams.set('size', String(params.size));
    if (params.sort) {
      params.sort.forEach(s => searchParams.append('sort', s));
    }
    if (params.year != null) {
      searchParams.set('year', String(params.year));
    }
    if (params.personId != null) {
      searchParams.set('personId', String(params.personId));
    }
    if (params.contributionTypeId != null) {
      searchParams.set('contributionTypeId', String(params.contributionTypeId));
    }
    return ApiClient.get(`/contributions/payments?${searchParams.toString()}`);
  },

  getById: (id: number): Promise<MemberPayment> =>
    ApiClient.get(`/contributions/payments/${id}`),

  getByPerson: (personId: number | string): Promise<MemberPayment[]> =>
    ApiClient.get(`/contributions/payments/by-person/${personId}`),

  getByPersonPaginated: (personId: number | string, params: PaginationParams): Promise<PageResponse<MemberPayment>> => {
    const searchParams = new URLSearchParams();
    searchParams.set('page', String(params.page));
    searchParams.set('size', String(params.size));
    if (params.sort) {
      params.sort.forEach(s => searchParams.append('sort', s));
    }
    if (params.year != null) {
      searchParams.set('year', String(params.year));
    }
    return ApiClient.get(`/contributions/payments/by-person/${personId}?${searchParams.toString()}`);
  },

  getByType: (typeId: number): Promise<MemberPayment[]> =>
    ApiClient.get(`/contributions/payments/by-type/${typeId}`),

  // Get current user's payments (enforced server-side)
  getCurrentUserPayments: (params: PaginationParams): Promise<PageResponse<MemberPayment> | MemberPayment[]> => {
    const searchParams = new URLSearchParams();
    if (params.page != null) {
      searchParams.set('page', String(params.page));
      searchParams.set('size', String(params.size));
    }
    if (params.sort) {
      params.sort.forEach(s => searchParams.append('sort', s));
    }
    if (params.year != null) {
      searchParams.set('year', String(params.year));
    }
    const query = searchParams.toString();
    return ApiClient.get(`/contributions/payments/my${query ? '?' + query : ''}`);
  },

  create: (data: MemberPaymentCreate): Promise<MemberPayment> =>
    ApiClient.post('/contributions/payments', data),

  update: (id: number, data: MemberPaymentCreate): Promise<MemberPayment> =>
    ApiClient.put(`/contributions/payments/${id}`, data),

  delete: (id: number): Promise<void> =>
    ApiClient.delete(`/contributions/payments/${id}`),

  reverse: (id: number): Promise<MemberPayment> =>
    ApiClient.post(`/contributions/payments/${id}/reverse`, {}),
};

/**
 * Result of a periodic payment creation, including skip info.
 */
export interface PeriodicPaymentResult {
  created: MemberPayment[];
  skippedCount: number;
  skippedPeriods: string[]; // human-readable labels like "Jan 2026", "Feb 2026"
}

/**
 * Check whether a period is already covered by an existing payment.
 * Matches on same person + same contribution type + overlapping period range.
 */
function isPeriodAlreadyPaid(
  personId: number | string,
  contributionTypeId: number,
  periodFrom: string,
  periodTo: string,
  existingPayments: MemberPayment[]
): boolean {
  return existingPayments.some(
    (p) =>
      p.personId === personId &&
      p.contributionTypeId === contributionTypeId &&
      p.periodFrom &&
      p.periodTo &&
      p.periodFrom <= periodTo &&
      p.periodTo >= periodFrom
  );
}

/**
 * Format a month period label like "Jan 2026".
 */
function monthLabel(year: number, month: number): string {
  const d = new Date(year, month - 1, 1);
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

/**
 * Split a multi-period payment into individual per-period records.
 * For MONTHLY: one record per calendar month in the range.
 * For YEARLY: one record per calendar year in the range.
 * For single-period or no-frequency payments, creates one record as-is.
 *
 * When existingPayments is provided, periods already covered for the same
 * person + contribution type are automatically skipped.
 */
export async function createPeriodicPayments(
  data: MemberPaymentCreate,
  frequency: 'MONTHLY' | 'YEARLY' | undefined,
  perUnitAmount: number | undefined,
  existingPayments?: MemberPayment[]
): Promise<PeriodicPaymentResult> {
  const existing = existingPayments ?? [];
  // Generate a shared group ID so all records in this batch are linked
  const groupId = crypto.randomUUID();

  if (!frequency || !data.periodFrom || !data.periodTo) {
    // No frequency or no period — single payment
    const result = await memberPaymentApi.create({ ...data, paymentGroupId: groupId });
    return { created: [result], skippedCount: 0, skippedPeriods: [] };
  }

  if (frequency === 'MONTHLY') {
    const [fy, fm] = data.periodFrom.substring(0, 7).split('-').map(Number);
    const [ty, tm] = data.periodTo.substring(0, 7).split('-').map(Number);
    const periodCount = Math.max(1, (ty - fy) * 12 + (tm - fm) + 1);

    if (periodCount <= 1) {
      // Single month — still check for overlap
      if (isPeriodAlreadyPaid(data.personId, data.contributionTypeId, data.periodFrom, data.periodTo, existing)) {
        return { created: [], skippedCount: 1, skippedPeriods: [monthLabel(fy, fm)] };
      }
      const result = await memberPaymentApi.create({ ...data, paymentGroupId: groupId });
      return { created: [result], skippedCount: 0, skippedPeriods: [] };
    }

    // The entered amount is the per-period amount, not the total
    const unitAmount = perUnitAmount ?? data.amount;
    const results: MemberPayment[] = [];
    const skippedPeriods: string[] = [];
    let year = fy;
    let month = fm;

    for (let i = 0; i < periodCount; i++) {
      const lastDay = new Date(year, month, 0).getDate();
      const pFrom = `${year}-${String(month).padStart(2, '0')}-01`;
      const pTo = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      if (isPeriodAlreadyPaid(data.personId, data.contributionTypeId, pFrom, pTo, existing)) {
        skippedPeriods.push(monthLabel(year, month));
      } else {
        const result = await memberPaymentApi.create({
          ...data,
          amount: parseFloat(unitAmount.toFixed(2)),
          periodFrom: pFrom,
          periodTo: pTo,
          paymentGroupId: groupId,
        });
        results.push(result);
      }
      month++;
      if (month > 12) { month = 1; year++; }
    }
    return { created: results, skippedCount: skippedPeriods.length, skippedPeriods };
  }

  if (frequency === 'YEARLY') {
    const fy = new Date(data.periodFrom).getFullYear();
    const ty = new Date(data.periodTo).getFullYear();
    const periodCount = Math.max(1, ty - fy + 1);

    if (periodCount <= 1) {
      if (isPeriodAlreadyPaid(data.personId, data.contributionTypeId, data.periodFrom, data.periodTo, existing)) {
        return { created: [], skippedCount: 1, skippedPeriods: [String(fy)] };
      }
      const result = await memberPaymentApi.create({ ...data, paymentGroupId: groupId });
      return { created: [result], skippedCount: 0, skippedPeriods: [] };
    }

    // The entered amount is the per-period amount, not the total
    const unitAmount = perUnitAmount ?? data.amount;
    const results: MemberPayment[] = [];
    const skippedPeriods: string[] = [];

    for (let y = fy; y <= ty; y++) {
      const pFrom = `${y}-01-01`;
      const pTo = `${y}-12-31`;

      if (isPeriodAlreadyPaid(data.personId, data.contributionTypeId, pFrom, pTo, existing)) {
        skippedPeriods.push(String(y));
      } else {
        const result = await memberPaymentApi.create({
          ...data,
          amount: parseFloat(unitAmount.toFixed(2)),
          periodFrom: pFrom,
          periodTo: pTo,
          paymentGroupId: groupId,
        });
        results.push(result);
      }
    }
    return { created: results, skippedCount: skippedPeriods.length, skippedPeriods };
  }

  // Fallback
  const result = await memberPaymentApi.create({ ...data, paymentGroupId: groupId });
  return { created: [result], skippedCount: 0, skippedPeriods: [] };
}

// ===== Assignments =====

export interface MemberContributionAssignment {
  id: number;
  personId: number;
  personName: string;
  contributionTypeId: number;
  contributionTypeCode: string;
  startDate: string;
  endDate?: string;
  isActive: boolean;
  notes?: string;
}

export interface MemberContributionAssignmentCreate {
  contributionTypeId: number;
  personId?: number;
  personIds?: number[];
  startDate: string;
  endDate?: string;
  notes?: string;
}

// ===== Payment Documents =====

export interface PaymentDocument {
  id: number;
  paymentGroupId: string;
  fileName: string;
  contentType?: string;
  fileSize?: number;
  uploadedBy?: number;
  createdAt?: string;
}

export const paymentDocumentApi = {
  /** Upload a document for a payment group */
  upload: (groupId: string, file: File): Promise<PaymentDocument> =>
    ApiClient.uploadFile<PaymentDocument>(`/payment-documents/groups/${groupId}`, file),
  /** List all documents for a payment group */
  list: (groupId: string): Promise<PaymentDocument[]> =>
    ApiClient.get<PaymentDocument[]>(`/payment-documents/groups/${groupId}`),
  /** Get the download URL for a document (to open in new tab or trigger download) */
  downloadUrl: (documentId: number): string =>
    `/api/payment-documents/${documentId}/download`,
  /** Delete a document */
  delete: (documentId: number): Promise<void> =>
    ApiClient.delete(`/payment-documents/${documentId}`),
};

export const contributionAssignmentApi = {
  getAll: (): Promise<MemberContributionAssignment[]> =>
    ApiClient.get('/contributions/assignments'),

  getByPerson: (personId: number | string): Promise<MemberContributionAssignment[]> =>
    ApiClient.get(`/contributions/assignments/by-person/${personId}`),

  getActiveByPerson: (personId: number | string): Promise<MemberContributionAssignment[]> =>
    ApiClient.get(`/contributions/assignments/by-person/${personId}/active`),

  getByType: (typeId: number): Promise<MemberContributionAssignment[]> =>
    ApiClient.get(`/contributions/assignments/by-type/${typeId}`),

  create: (data: MemberContributionAssignmentCreate): Promise<MemberContributionAssignment[]> =>
    ApiClient.post('/contributions/assignments', data),

  update: (id: number, data: MemberContributionAssignmentCreate): Promise<MemberContributionAssignment> =>
    ApiClient.put(`/contributions/assignments/${id}`, data),

  toggleActive: (id: number): Promise<MemberContributionAssignment> =>
    ApiClient.patch(`/contributions/assignments/${id}/toggle`),

  delete: (id: number): Promise<void> =>
    ApiClient.delete(`/contributions/assignments/${id}`),
};

// ===== Exemptions =====

export interface MemberContributionExemption {
  id: number;
  personId: number;
  personName: string;
  contributionTypeId: number;
  contributionTypeCode: string;
  exemptionType: 'FULL' | 'FIXED_AMOUNT' | 'DISCOUNT_AMOUNT' | 'DISCOUNT_PERCENTAGE';
  amount?: number;
  reason?: string;
  startDate: string;
  endDate?: string;
  isActive: boolean;
}

export interface MemberContributionExemptionCreate {
  personId: number | string;
  contributionTypeId: number;
  exemptionType: string;
  amount?: number;
  reason?: string;
  startDate: string;
  endDate?: string;
  isActive?: boolean;
}

export const exemptionApi = {
  getAll: (): Promise<MemberContributionExemption[]> =>
    ApiClient.get('/contributions/exemptions'),

  getById: (id: number): Promise<MemberContributionExemption> =>
    ApiClient.get(`/contributions/exemptions/${id}`),

  getActive: (personId: number | string, contributionTypeId: number): Promise<MemberContributionExemption[]> =>
    ApiClient.get(`/contributions/exemptions/active?personId=${personId}&contributionTypeId=${contributionTypeId}`),

  create: (data: MemberContributionExemptionCreate): Promise<MemberContributionExemption> =>
    ApiClient.post('/contributions/exemptions', data),

  update: (id: number, data: MemberContributionExemptionCreate): Promise<MemberContributionExemption> =>
    ApiClient.put(`/contributions/exemptions/${id}`, data),

  delete: (id: number): Promise<void> =>
    ApiClient.delete(`/contributions/exemptions/${id}`),
};
