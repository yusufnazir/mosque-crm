import { ApiClient } from './api';

export const generalEventApi = {
  // Events
  listEvents: (): Promise<GeneralEvent[]> => ApiClient.get('/general-events'),
  getEvent: (id: number): Promise<GeneralEvent> => ApiClient.get(`/general-events/${id}`),
  createEvent: (data: GeneralEventCreate): Promise<GeneralEvent> => ApiClient.post('/general-events', data),
  updateEvent: (id: number, data: GeneralEventCreate): Promise<GeneralEvent> => ApiClient.put(`/general-events/${id}`, data),
  updateEventStatus: (id: number, status: string): Promise<GeneralEvent> => ApiClient.put(`/general-events/${id}/status`, { status }),
  deleteEvent: (id: number): Promise<void> => ApiClient.delete(`/general-events/${id}`),
  getReport: (id: number): Promise<GeneralEventReport> => ApiClient.get(`/general-events/${id}/report`),

  // Registrations
  listRegistrations: (eventId: number): Promise<GeneralEventRegistration[]> => ApiClient.get(`/general-events/${eventId}/registrations`),
  addRegistration: (eventId: number, data: GeneralEventRegistrationCreate): Promise<GeneralEventRegistration> =>
    ApiClient.post(`/general-events/${eventId}/registrations`, data),
  updateRegistration: (eventId: number, regId: number, data: GeneralEventRegistrationCreate): Promise<GeneralEventRegistration> =>
    ApiClient.put(`/general-events/${eventId}/registrations/${regId}`, data),
  checkIn: (eventId: number, regId: number): Promise<GeneralEventRegistration> =>
    ApiClient.put(`/general-events/${eventId}/registrations/${regId}/check-in`, {}),
  deleteRegistration: (eventId: number, regId: number): Promise<void> =>
    ApiClient.delete(`/general-events/${eventId}/registrations/${regId}`),

  // Volunteers
  listVolunteers: (eventId: number): Promise<GeneralEventVolunteer[]> => ApiClient.get(`/general-events/${eventId}/volunteers`),
  addVolunteer: (eventId: number, data: GeneralEventVolunteerCreate): Promise<GeneralEventVolunteer> =>
    ApiClient.post(`/general-events/${eventId}/volunteers`, data),
  updateVolunteer: (eventId: number, volId: number, data: GeneralEventVolunteerCreate): Promise<GeneralEventVolunteer> =>
    ApiClient.put(`/general-events/${eventId}/volunteers/${volId}`, data),
  deleteVolunteer: (eventId: number, volId: number): Promise<void> =>
    ApiClient.delete(`/general-events/${eventId}/volunteers/${volId}`),

  // Sessions
  listSessions: (eventId: number): Promise<GeneralEventSession[]> => ApiClient.get(`/general-events/${eventId}/sessions`),
  createSession: (eventId: number, data: GeneralEventSessionCreate): Promise<GeneralEventSession> =>
    ApiClient.post(`/general-events/${eventId}/sessions`, data),
  updateSession: (eventId: number, sessionId: number, data: GeneralEventSessionCreate): Promise<GeneralEventSession> =>
    ApiClient.put(`/general-events/${eventId}/sessions/${sessionId}`, data),
  deleteSession: (eventId: number, sessionId: number): Promise<void> =>
    ApiClient.delete(`/general-events/${eventId}/sessions/${sessionId}`),

  // Attendance
  listAttendance: (eventId: number, sessionId: number): Promise<GeneralEventAttendance[]> =>
    ApiClient.get(`/general-events/${eventId}/sessions/${sessionId}/attendance`),
  prepopulateAttendance: (eventId: number, sessionId: number): Promise<{ created: number }> =>
    ApiClient.post(`/general-events/${eventId}/sessions/${sessionId}/attendance/prepopulate`, {}),
  markAttendance: (eventId: number, sessionId: number, data: GeneralEventAttendanceCreate): Promise<GeneralEventAttendance> =>
    ApiClient.post(`/general-events/${eventId}/sessions/${sessionId}/attendance`, data),
  bulkMarkAttendance: (eventId: number, sessionId: number, items: GeneralEventAttendanceCreate[]): Promise<{ updated: number }> =>
    ApiClient.post(`/general-events/${eventId}/sessions/${sessionId}/attendance/bulk`, items),
  deleteAttendance: (eventId: number, sessionId: number, attId: number): Promise<void> =>
    ApiClient.delete(`/general-events/${eventId}/sessions/${sessionId}/attendance/${attId}`),

  // Documents
  listDocuments: (eventId: number, sessionId?: number): Promise<GeneralEventDocument[]> => {
    const url = sessionId
      ? `/general-events/${eventId}/documents?sessionId=${sessionId}`
      : `/general-events/${eventId}/documents`;
    return ApiClient.get(url);
  },
  uploadDocument: (eventId: number, formData: FormData): Promise<GeneralEventDocument> =>
    ApiClient.postMultipart(`/general-events/${eventId}/documents`, formData),
  downloadDocumentUrl: (eventId: number, docId: number): string =>
    `/api/general-events/${eventId}/documents/${docId}/download`,
  deleteDocument: (eventId: number, docId: number): Promise<void> =>
    ApiClient.delete(`/general-events/${eventId}/documents/${docId}`),
};

// Types

export type GeneralEventType =
  | 'LECTURE'
  | 'FUNDRAISER'
  | 'IFTAR'
  | 'NIKAH'
  | 'YOUTH_PROGRAM'
  | 'SPORTS_DAY'
  | 'QURAN_COMPETITION'
  | 'GRADUATION'
  | 'OTHER';

export type GeneralEventStatus = 'DRAFT' | 'PUBLISHED' | 'ACTIVE' | 'CLOSED' | 'CANCELLED';
export type RegistrantType = 'MEMBER' | 'NON_MEMBER';
export type RsvpStatus = 'CONFIRMED' | 'DECLINED' | 'WAITLIST';
export type CheckInStatus = 'NOT_CHECKED_IN' | 'CHECKED_IN' | 'ABSENT';
export type VolunteerStatus = 'INVITED' | 'ACCEPTED' | 'DECLINED' | 'COMPLETED' | 'NO_SHOW';

export interface GeneralEvent {
  id: number;
  name: string;
  description: string | null;
  generalEventType: GeneralEventType;
  customTypeLabel: string | null;
  location: string | null;
  isOnline: boolean;
  meetingUrl: string | null;
  startDate: string;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  requiresRegistration: boolean;
  registrationOpenDate: string | null;
  registrationCloseDate: string | null;
  memberCapacity: number;
  nonMemberCapacity: number;
  acceptNonMembers: boolean;
  waitlistEnabled: boolean;
  ticketingType: 'NONE' | 'SINGLE_PRICE';
  ticketPrice: number | null;
  currency: string;
  status: GeneralEventStatus;
  visibility: string;
  featured: boolean;
  requiresCheckIn: boolean;
  checkInCode: string | null;
  totalRegistrations: number;
  totalVolunteers: number;
  createdAt: string;
  updatedAt: string;
}

export interface GeneralEventCreate {
  name: string;
  description?: string;
  generalEventType: GeneralEventType;
  customTypeLabel?: string;
  location?: string;
  isOnline?: boolean;
  meetingUrl?: string;
  startDate: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  requiresRegistration?: boolean;
  registrationOpenDate?: string;
  registrationCloseDate?: string;
  memberCapacity?: number;
  nonMemberCapacity?: number;
  acceptNonMembers?: boolean;
  waitlistEnabled?: boolean;
  ticketingType?: 'NONE' | 'SINGLE_PRICE';
  ticketPrice?: number;
  currency?: string;
  status?: GeneralEventStatus;
  visibility?: string;
  featured?: boolean;
  requiresCheckIn?: boolean;
}

export interface GeneralEventRegistration {
  id: number;
  generalEventId: number;
  personId: number | null;
  registrantType: RegistrantType;
  name: string;
  email: string | null;
  phoneNumber: string | null;
  partySize: number;
  rsvpStatus: RsvpStatus;
  checkInStatus: CheckInStatus;
  checkedInAt: string | null;
  specialRequests: string | null;
  amountPaid: number | null;
  registeredAt: string;
  source: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GeneralEventRegistrationCreate {
  generalEventId?: number;
  personId?: number;
  registrantType: RegistrantType;
  name: string;
  email?: string;
  phoneNumber?: string;
  partySize?: number;
  rsvpStatus?: RsvpStatus;
  specialRequests?: string;
  amountPaid?: number;
  source?: string;
}

export interface GeneralEventVolunteer {
  id: number;
  generalEventId: number;
  personId: number;
  personName: string;
  role: string;
  roleDescription: string | null;
  status: VolunteerStatus;
  checkedIn: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GeneralEventVolunteerCreate {
  generalEventId?: number;
  personId: number;
  role: string;
  roleDescription?: string;
  status?: VolunteerStatus;
}

export type AttendanceStatus = 'ABSENT' | 'PRESENT' | 'LATE' | 'EXCUSED';

export interface GeneralEventSession {
  id: number;
  generalEventId: number;
  sessionName: string;
  sessionDate: string;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  description: string | null;
  capacity: number | null;
  sessionOrder: number;
  presentCount: number;
  absentCount: number;
  totalAttendance: number;
  createdAt: string;
  updatedAt: string;
}

export interface GeneralEventSessionCreate {
  sessionName: string;
  sessionDate: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  description?: string;
  capacity?: number;
  sessionOrder?: number;
}

export interface GeneralEventAttendance {
  id: number;
  generalEventId: number;
  sessionId: number;
  sessionName: string | null;
  registrationId: number | null;
  personId: number | null;
  personName: string | null;
  walkInName: string | null;
  status: AttendanceStatus;
  checkedInAt: string | null;
  checkedInByUserId: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GeneralEventAttendanceCreate {
  registrationId?: number;
  personId?: number;
  walkInName?: string;
  status?: AttendanceStatus;
  notes?: string;
  checkedInAt?: string; // ISO datetime override — defaults to server time if not provided
}

export interface GeneralEventReport {
  totalRegistrations: number;
  confirmed: number;
  declined: number;
  waitlist: number;
  checkedIn: number;
  absent: number;
  memberCount: number;
  nonMemberCount: number;
  totalPartySize: number;
  totalRevenue: number;
  volunteerCount: number;
}

export interface GeneralEventDocument {
  id: number;
  generalEventId: number;
  sessionId: number | null;
  sessionName: string | null;
  fileName: string;
  contentType: string | null;
  fileSize: number | null;
  description: string | null;
  uploadedBy: number | null;
  createdAt: string;
}
