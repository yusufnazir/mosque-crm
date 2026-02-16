export interface Member {
  memberSince?: string;
  membershipStatus?: string;
  id: string;
  personId: string; // UUID from Person table
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  gender?: string;
  dateOfBirth?: string;
  address?: string;
  city?: string;
  country?: string;
  postalCode?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'DECEASED'; // membership status
  membershipType?: string;
  startDate?: string;
  endDate?: string;
  username?: string;
  roles?: string[];
  needsAccount?: boolean;
  dateOfDeath?: string;
  partnerName?: string;
  partnerId?: string;
  children?: Member[];
}


export interface UserPreferences {
  language: string;
  theme?: string;
  timezone?: string;
  calendar?: string;
}

export interface AuthResponse {
  token: string;
  username: string;
  role: string;
  memberId: string;
  personId?: string;
  mosqueId?: number;
  permissions?: string[];
  preferences?: UserPreferences;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface PersonSearchResult {
  id: string;
  firstName: string;
  lastName?: string;
  email?: string;
  status?: string;
  phone?: string;
}

export interface RelationshipResponse {
  relationshipId: string;
  relatedPersonId: string;
  relatedPersonName: string;
  relationshipType: 'FATHER' | 'MOTHER' | 'SPOUSE' | 'CHILD';
}

export interface AddRelationshipRequest {
  relatedPersonId: string;
  relationshipType: 'FATHER' | 'MOTHER' | 'SPOUSE' | 'CHILD';
}
