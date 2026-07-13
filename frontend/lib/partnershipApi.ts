import { ApiClient } from './api';

export interface OrganizationShareSettingDTO {
  id: number;
  partnershipId: number;
  moduleKey: string;
  enabled: boolean;
  shareLevel: 'PARENT_ONLY' | 'SIBLINGS' | 'PUBLIC';
}

export interface OrganizationPartnershipDTO {
  id: number;
  parentOrganizationId: number;
  parentOrganizationName?: string;
  parentOrganizationHandle?: string;
  memberOrganizationId: number;
  memberOrganizationName?: string;
  memberOrganizationHandle?: string;
  status: 'PENDING_INVITE' | 'PENDING_REQUEST' | 'ACTIVE' | 'SUSPENDED' | 'ENDED';
  initiatedBy: 'PARENT' | 'MEMBER';
  message?: string;
  endedReason?: string;
  initiatedAt: string;
  acceptedAt?: string;
  endedAt?: string;
  shareSettings?: OrganizationShareSettingDTO[];
}

export interface OrganizationDiscoveryDTO {
  id: number;
  name: string;
  handle: string;
  city?: string;
  country?: string;
}

export interface PartnershipOrgHandleRequest {
  orgHandle?: string;
  inviteCode?: string;
  message?: string;
}

export interface FederationInviteCodeDTO {
  inviteCode: string;
}

export interface UpdateShareSettingRequest {
  enabled: boolean;
  shareLevel?: 'PARENT_ONLY' | 'SIBLINGS' | 'PUBLIC';
}

export const partnershipApi = {
  list: () => ApiClient.get<OrganizationPartnershipDTO[]>('/partnerships'),

  discover: (q: string) =>
    ApiClient.get<OrganizationDiscoveryDTO[]>(`/partnerships/discover?q=${encodeURIComponent(q)}`),

  getInviteCode: () => ApiClient.get<FederationInviteCodeDTO>('/partnerships/invite-code'),

  regenerateInviteCode: () =>
    ApiClient.post<FederationInviteCodeDTO>('/partnerships/invite-code/regenerate', {}),

  getById: (id: number) => ApiClient.get<OrganizationPartnershipDTO>(`/partnerships/${id}`),

  invite: (data: PartnershipOrgHandleRequest) =>
    ApiClient.post<OrganizationPartnershipDTO>('/partnerships/invite', data),

  requestToJoin: (data: PartnershipOrgHandleRequest) =>
    ApiClient.post<OrganizationPartnershipDTO>('/partnerships/request', data),

  accept: (id: number) => ApiClient.post<OrganizationPartnershipDTO>(`/partnerships/${id}/accept`, {}),

  resendNotification: (id: number) =>
    ApiClient.post<OrganizationPartnershipDTO>(`/partnerships/${id}/resend-notification`, {}),

  approve: (id: number) => ApiClient.post<OrganizationPartnershipDTO>(`/partnerships/${id}/approve`, {}),

  reject: (id: number, reason?: string) =>
    ApiClient.post<OrganizationPartnershipDTO>(`/partnerships/${id}/reject`, { reason }),

  suspend: (id: number, reason?: string) =>
    ApiClient.post<OrganizationPartnershipDTO>(`/partnerships/${id}/suspend`, { reason }),

  reactivate: (id: number) =>
    ApiClient.post<OrganizationPartnershipDTO>(`/partnerships/${id}/reactivate`, {}),

  end: (id: number, reason?: string) =>
    ApiClient.post<OrganizationPartnershipDTO>(`/partnerships/${id}/end`, { reason }),

  getShareSettings: (id: number) =>
    ApiClient.get<OrganizationShareSettingDTO[]>(`/partnerships/${id}/share-settings`),

  updateShareSetting: (id: number, moduleKey: string, data: UpdateShareSettingRequest) =>
    ApiClient.put<OrganizationShareSettingDTO>(`/partnerships/${id}/share-settings/${moduleKey}`, data),
};
