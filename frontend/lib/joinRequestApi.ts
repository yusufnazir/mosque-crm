import { ApiClient } from './api';

export interface JoinRequestDTO {
  id: number;
  organizationId: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  gender?: string;
  dateOfBirth?: string;
  address?: string;
  city?: string;
  country?: string;
  postalCode?: string;
  idNumber?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
  personId?: number;
  submittedAt: string;
  termsVersionId?: number;
  termsVersionNumber?: number;
  termsTitle?: string;
  termsAcceptedAt?: string;
}

export interface JoinRequestCreateDTO {
  orgHandle: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  gender?: string;
  dateOfBirth?: string;
  address?: string;
  city?: string;
  country?: string;
  postalCode?: string;
  idNumber?: string;
  acceptedTermsVersionId?: number;
}

export interface ValidateTokenResponse {
  firstName: string;
  lastName: string;
  email: string;
}

export interface CompleteRegistrationRequest {
  token: string;
  password: string;
}

export interface CompleteRegistrationResponse {
  orgHandle: string;
}

export const joinRequestApi = {
  /** Public — submit a membership application. No auth required. */
  apply: (data: JoinRequestCreateDTO) =>
    ApiClient.post<JoinRequestDTO>('/join-requests/apply', data),

  /** Public — validate an approval token. No auth required. */
  validateToken: (token: string) =>
    ApiClient.get<ValidateTokenResponse>(`/join-requests/validate-token?token=${encodeURIComponent(token)}`),

  /** Public — complete registration (set password). No auth required. */
  completeRegistration: (data: CompleteRegistrationRequest) =>
    ApiClient.post<CompleteRegistrationResponse>('/join-requests/complete-registration', data),

  /** Admin — list all join requests, optionally filtered by status. */
  getAll: (status?: string) =>
    ApiClient.get<JoinRequestDTO[]>(`/join-requests${status ? `?status=${status}` : ''}`),

  /** Admin — get a join request by ID. */
  getById: (id: number) => ApiClient.get<JoinRequestDTO>(`/join-requests/${id}`),

  /** Admin — approve or reject a join request. */
  review: (id: number, action: 'approve' | 'reject', rejectionReason?: string) =>
    ApiClient.put<JoinRequestDTO>(`/join-requests/${id}/review`, { action, rejectionReason }),

  /** Admin — delete a join request. */
  remove: (id: number) =>
    ApiClient.delete<void>(`/join-requests/${id}`),

  /** Admin — send a membership invitation email to a prospective member. */
  invite: (email: string, locale = 'en') =>
    ApiClient.post<{ message: string }>('/join-requests/invite', { email, locale }),

  /** Admin — get the count of pending join requests. */
  getPendingCount: () =>
    ApiClient.get<{ count: number }>('/join-requests/pending-count'),
};
