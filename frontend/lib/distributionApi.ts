import { ApiClient } from './api';

export const distributionApi = {
  // Distribution Events
  listEvents: (): Promise<DistributionEvent[]> => ApiClient.get('/distribution/events'),
  getEvent: (id: number): Promise<DistributionEvent> => ApiClient.get(`/distribution/events/${id}`),
  createEvent: (data: DistributionEventCreate): Promise<DistributionEvent> => ApiClient.post('/distribution/events', data),
  updateEvent: (id: number, data: DistributionEventCreate): Promise<DistributionEvent> => ApiClient.put(`/distribution/events/${id}`, data),
  updateEventStatus: (id: number, status: string): Promise<DistributionEvent> => ApiClient.put(`/distribution/events/${id}/status`, { status }),
  deleteEvent: (id: number): Promise<void> => ApiClient.delete(`/distribution/events/${id}`),
  getEventSummary: (eventId: number): Promise<DistributionSummary> => ApiClient.get(`/distribution/events/${eventId}/summary`),

  // Parcel Categories
  listCategories: (eventId: number): Promise<ParcelCategory[]> => ApiClient.get(`/distribution/categories?eventId=${eventId}`),
  getCategory: (id: number): Promise<ParcelCategory> => ApiClient.get(`/distribution/categories/${id}`),
  createCategory: (data: ParcelCategoryCreate): Promise<ParcelCategory> => ApiClient.post('/distribution/categories', data),
  updateCategory: (id: number, data: ParcelCategoryCreate): Promise<ParcelCategory> => ApiClient.put(`/distribution/categories/${id}`, data),

  // Non-Member Recipients
  listNonMembers: (eventId: number): Promise<NonMemberRecipient[]> => ApiClient.get(`/distribution/non-members?eventId=${eventId}`),
  getNonMember: (id: number): Promise<NonMemberRecipient> => ApiClient.get(`/distribution/non-members/${id}`),
  createNonMember: (data: NonMemberRecipientCreate): Promise<NonMemberRecipient> => ApiClient.post('/distribution/non-members', data),
  findNonMemberByNumber: (eventId: number, number: string): Promise<NonMemberRecipient> =>
    ApiClient.get(`/distribution/non-members/search?eventId=${eventId}&number=${encodeURIComponent(number)}`),

  // Member Registrations
  listMemberRegistrations: (eventId: number): Promise<MemberRegistration[]> => ApiClient.get(`/distribution/member-registrations?eventId=${eventId}`),
  getMemberRegistration: (id: number): Promise<MemberRegistration> => ApiClient.get(`/distribution/member-registrations/${id}`),
  createMemberRegistration: (data: MemberRegistrationCreate): Promise<MemberRegistration> => ApiClient.post('/distribution/member-registrations', data),

  // Parcel Distribution
  listDistributions: (eventId: number): Promise<ParcelDistribution[]> => ApiClient.get(`/distribution/distributions?eventId=${eventId}`),
  getDistribution: (id: number): Promise<ParcelDistribution> => ApiClient.get(`/distribution/distributions/${id}`),
  distribute: (data: ParcelDistributionCreate): Promise<ParcelDistribution> => ApiClient.post('/distribution/distribute', data),
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
}

export interface DistributionEventCreate {
  year: number;
  name: string;
  eventDate?: string;
  location?: string;
  eventType?: 'EID_UL_ADHA_DISTRIBUTION' | 'GENERAL';
  memberCapacity?: number;
  nonMemberCapacity?: number;
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

export interface MemberRegistration {
  id: number;
  distributionEventId: number;
  personId: number;
  personName: string;
  status: 'REGISTERED' | 'COLLECTED';
  registeredAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface MemberRegistrationCreate {
  distributionEventId: number;
  personId: number;
}

export interface ParcelDistribution {
  id: number;
  distributionEventId: number;
  recipientType: 'MEMBER' | 'NON_MEMBER';
  recipientId: number;
  recipientName: string;
  parcelCategoryId: number;
  parcelCategoryName: string;
  parcelCount: number;
  distributedBy: string | null;
  distributedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ParcelDistributionCreate {
  distributionEventId: number;
  recipientType: 'MEMBER' | 'NON_MEMBER';
  recipientId: number;
  parcelCategoryId: number;
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
}
