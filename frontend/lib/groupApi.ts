import { ApiClient, PageResponse } from './api';

export interface GroupTranslationDTO {
  id?: number;
  locale: string;
  name: string;
  description?: string;
}

export interface GroupRoleTranslationDTO {
  id?: number;
  locale: string;
  name: string;
}

export interface GroupRoleDTO {
  id?: number;
  groupId?: number;
  name: string;
  sortOrder?: number;
  maxMembers?: number;
  isActive?: boolean;
  organizationId?: number;
  createdAt?: string;
  translations?: GroupRoleTranslationDTO[];
}

export interface GroupDTO {
  id?: number;
  name: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
  createdBy?: number;
  organizationId?: number;
  createdAt?: string;
  translations?: GroupTranslationDTO[];
  memberCount?: number;
}

export interface GroupMemberDTO {
  id?: number;
  groupId: number;
  personId: number;
  startDate?: string;
  endDate?: string;
  roleInGroup?: string;
  groupRoleId?: number;
  roleName?: string;
  createdBy?: number;
  organizationId?: number;
  createdAt?: string;
  personFirstName?: string;
  personLastName?: string;
}

export const groupApi = {
  list: (): Promise<GroupDTO[]> => ApiClient.get('/groups'),
  get: (id: number): Promise<GroupDTO> => ApiClient.get(`/groups/${id}`),
  create: (data: GroupDTO): Promise<GroupDTO> => ApiClient.post('/groups', data),
  update: (id: number, data: GroupDTO): Promise<GroupDTO> => ApiClient.put(`/groups/${id}`, data),
  delete: (id: number): Promise<void> => ApiClient.delete(`/groups/${id}`),

  // members
  addMember: (data: GroupMemberDTO): Promise<GroupMemberDTO> => ApiClient.post('/groups/members', data),
  listMembers: (groupId: number): Promise<GroupMemberDTO[]> => ApiClient.get(`/groups/${groupId}/members`),
  updateMember: (memberId: number, data: Partial<GroupMemberDTO>): Promise<GroupMemberDTO> => ApiClient.put(`/groups/members/${memberId}`, data),
  removeMember: (memberId: number): Promise<void> => ApiClient.delete(`/groups/members/${memberId}`),

  // roles
  listRoles: (groupId: number): Promise<GroupRoleDTO[]> => ApiClient.get(`/groups/${groupId}/roles`),
  createRole: (groupId: number, data: GroupRoleDTO): Promise<GroupRoleDTO> => ApiClient.post(`/groups/${groupId}/roles`, data),
  updateRole: (roleId: number, data: GroupRoleDTO): Promise<GroupRoleDTO> => ApiClient.put(`/groups/roles/${roleId}`, data),
  deleteRole: (roleId: number): Promise<void> => ApiClient.delete(`/groups/roles/${roleId}`),
};
