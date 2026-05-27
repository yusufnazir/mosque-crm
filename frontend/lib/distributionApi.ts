import { ApiClient } from './api';

export const distributionApi = {
  // Distribution Events
  listEvents: (): Promise<DistributionEvent[]> => ApiClient.get('/events/events'),
  getEvent: (id: number): Promise<DistributionEvent> => ApiClient.get(`/events/events/${id}`),
  createEvent: (data: DistributionEventCreate): Promise<DistributionEvent> => ApiClient.post('/events/events', data),
  updateEvent: (id: number, data: DistributionEventCreate): Promise<DistributionEvent> => ApiClient.put(`/events/events/${id}`, data),
  updateEventStatus: (id: number, status: string): Promise<DistributionEvent> => ApiClient.put(`/events/events/${id}/status`, { status }),
  deleteEvent: (id: number): Promise<void> => ApiClient.delete(`/events/events/${id}`),
  getEventSummary: (eventId: number): Promise<DistributionSummary> => ApiClient.get(`/events/events/${eventId}/summary`),

  // Parcel Categories
  listCategories: (eventId: number): Promise<ParcelCategory[]> => ApiClient.get(`/events/categories?eventId=${eventId}`),
  getCategory: (id: number): Promise<ParcelCategory> => ApiClient.get(`/events/categories/${id}`),
  createCategory: (data: ParcelCategoryCreate): Promise<ParcelCategory> => ApiClient.post('/events/categories', data),
  updateCategory: (id: number, data: ParcelCategoryCreate): Promise<ParcelCategory> => ApiClient.put(`/events/categories/${id}`, data),

  // Non-Member Recipients
  listNonMembers: (eventId: number): Promise<NonMemberRecipient[]> => ApiClient.get(`/events/non-members?eventId=${eventId}`),
  getNonMember: (id: number): Promise<NonMemberRecipient> => ApiClient.get(`/events/non-members/${id}`),
  createNonMember: (data: NonMemberRecipientCreate): Promise<NonMemberRecipient> => ApiClient.post('/events/non-members', data),
  updateNonMember: (id: number, data: NonMemberRecipientUpdate): Promise<NonMemberRecipient> =>
    ApiClient.put(`/events/non-members/${id}`, data),
  deleteNonMember: (id: number): Promise<void> => ApiClient.delete(`/events/non-members/${id}`),
  findNonMemberByNumber: (eventId: number, number: string): Promise<NonMemberRecipient> =>
    ApiClient.get(`/events/non-members/search?eventId=${eventId}&number=${encodeURIComponent(number)}`),

  // Member Registrations
  listMemberRegistrations: (eventId: number): Promise<MemberRegistration[]> => ApiClient.get(`/events/member-registrations?eventId=${eventId}`),
  getMemberRegistration: (id: number): Promise<MemberRegistration> => ApiClient.get(`/events/member-registrations/${id}`),
  createMemberRegistration: (data: MemberRegistrationCreate): Promise<MemberRegistration> => ApiClient.post('/events/member-registrations', data),
  deleteMemberRegistration: (id: number): Promise<void> => ApiClient.delete(`/events/member-registrations/${id}`),

  // Parcel Distribution
  listDistributions: (eventId: number): Promise<ParcelDistribution[]> => ApiClient.get(`/events/distributions?eventId=${eventId}`),
  getDistribution: (id: number): Promise<ParcelDistribution> => ApiClient.get(`/events/distributions/${id}`),
  distribute: (data: ParcelDistributionCreate): Promise<ParcelDistribution> => ApiClient.post('/events/distribute', data),

  listRegistrationTypes: (eventId: number): Promise<DistributionRegistrationType[]> =>
    ApiClient.get(`/events/events/${eventId}/registration-types`),
  createRegistrationType: (eventId: number, data: DistributionRegistrationTypeCreate) =>
    ApiClient.post<DistributionRegistrationType>(`/events/events/${eventId}/registration-types`, data),
  updateRegistrationType: (id: number, data: DistributionRegistrationTypeCreate) =>
    ApiClient.put<DistributionRegistrationType>(`/events/registration-types/${id}`, data),
  deleteRegistrationType: (id: number): Promise<void> => ApiClient.delete(`/events/registration-types/${id}`),

  listRegistrations: (eventId: number): Promise<DistributionRegistration[]> =>
    ApiClient.get(`/events/events/${eventId}/registrations`),
  listQueueRegistrations: (eventId: number): Promise<DistributionRegistration[]> =>
    ApiClient.get(`/events/events/${eventId}/registrations/queue`),
  createRegistration: (data: DistributionRegistrationCreate): Promise<DistributionRegistration> =>
    ApiClient.post('/events/registrations', data),
  updateRegistration: (id: number, data: DistributionRegistrationUpdate): Promise<DistributionRegistration> =>
    ApiClient.put(`/events/registrations/${id}`, data),
  markRegistrationCollected: (id: number): Promise<DistributionRegistration> =>
    ApiClient.post(`/events/registrations/${id}/mark-collected`, {}),
  deleteRegistration: (id: number): Promise<void> => ApiClient.delete(`/events/registrations/${id}`),
};

// Types
export interface DistributionEvent {
  id: number;
  year: number;
  name: string;
  eventDate: string | null;
  location: string | null;
  status: 'PLANNED' | 'ACTIVE' | 'CLOSED';
  eventType: 'EID_UL_ADHA_DISTRIBUTION' | 'GENERAL';
  memberCapacity: number;
  nonMemberCapacity: number;
  createdAt: string;
  updatedAt: string;
  parcelCategories?: ParcelCategory[];
  parcelKgPerUnit?: number;
  parcelWeightUnit?: 'KG' | 'LB';
}

export interface DistributionEventCreate {
  year: number;
  name: string;
  eventDate?: string;
  location?: string;
  eventType?: 'EID_UL_ADHA_DISTRIBUTION' | 'GENERAL';
  memberCapacity?: number;
  nonMemberCapacity?: number;
  parcelKgPerUnit?: number;
  parcelWeightUnit?: 'KG' | 'LB';
}

export interface ParcelCategory {
  id: number;
  distributionEventId: number;
  name: string;
  description: string | null;
  totalParcels: number;
  distributedParcels: number;
  nonMemberAllocation: number;
  remainingParcels: number;
  createdAt: string;
  updatedAt: string;
}

export interface ParcelCategoryCreate {
  distributionEventId: number;
  name: string;
  description?: string;
  totalParcels: number;
  nonMemberAllocation?: number;
}

export interface NonMemberRecipient {
  id: number;
  distributionEventId: number;
  distributionNumber: string;
  name: string;
  idNumber: string | null;
  phoneNumber: string | null;
  status: 'REGISTERED' | 'COLLECTED' | 'CANCELLED';
  registeredAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface NonMemberRecipientCreate {
  distributionEventId: number;
  name: string;
  idNumber?: string;
  phoneNumber?: string;
}

export interface NonMemberRecipientUpdate {
  name: string;
  idNumber?: string;
  phoneNumber?: string;
}

export interface MemberRegistration {
  id: number;
  distributionEventId: number;
  personId?: number | null;
  personName: string;
  member: boolean;
  status: 'REGISTERED' | 'COLLECTED';
  registeredAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface MemberRegistrationCreate {
  distributionEventId: number;
  personId?: number | null;
  personName: string;
  member: boolean;
}

export type RegistrationFulfillmentMode = 'QUEUE' | 'ADHOC' | 'MANUAL';

export interface DistributionRegistrationType {
  id: number;
  distributionEventId: number;
  name: string;
  sortOrder: number;
  fulfillmentMode: RegistrationFulfillmentMode;
  defaultPlannedParcels: number;
  softLimit?: number | null;
  assignDistributionNumber: boolean;
  registrationCount: number;
  overSoftLimit: boolean;
}

export interface DistributionRegistrationTypeCreate {
  name: string;
  sortOrder?: number;
  fulfillmentMode: RegistrationFulfillmentMode;
  defaultPlannedParcels: number;
  softLimit?: number | null;
  assignDistributionNumber?: boolean;
}

export interface DistributionRegistration {
  id: number;
  distributionEventId: number;
  registrationTypeId: number;
  registrationTypeName: string;
  personId?: number | null;
  displayName: string;
  member: boolean;
  distributionNumber?: string | null;
  plannedParcelCount: number;
  distributedParcelCount: number;
  idNumber?: string | null;
  phoneNumber?: string | null;
  adHoc: boolean;
  status: 'REGISTERED' | 'COLLECTED';
  registeredAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface DistributionRegistrationCreate {
  distributionEventId: number;
  registrationTypeId: number;
  personId?: number | null;
  displayName: string;
  member: boolean;
  plannedParcelCount?: number;
  idNumber?: string;
  phoneNumber?: string;
  adHoc?: boolean;
}

export interface DistributionRegistrationUpdate {
  plannedParcelCount?: number;
  idNumber?: string;
  phoneNumber?: string;
}

export interface ParcelDistribution {
  id: number;
  distributionEventId: number;
  recipientType: 'MEMBER' | 'NON_MEMBER' | 'REGISTRATION';
  recipientId: number;
  recipientName: string;
  parcelCategoryId?: number | null;
  parcelCategoryName?: string | null;
  parcelCount: number;
  distributedBy: string | null;
  distributedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ParcelDistributionCreate {
  distributionEventId: number;
  recipientType: 'MEMBER' | 'NON_MEMBER' | 'REGISTRATION';
  recipientId: number;
  parcelCategoryId?: number;
  parcelCount: number;
  distributedBy?: string;
}

export interface DistributionSummary {
  totalParcels: number;
  distributedParcels: number;
  remainingParcels: number;
  totalMembers: number;
  totalNonMembers: number;
  collectedMembers: number;
  collectedNonMembers: number;
  nonMemberAllocation: number;
  totalRegistrations?: number;
  collectedRegistrations?: number;
}
