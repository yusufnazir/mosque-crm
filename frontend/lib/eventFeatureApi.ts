import { ApiClient } from './api';

export type EventKind = 'GENERAL' | 'DISTRIBUTION';

export type EventResourceAssignmentStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export interface EventResourceCategory {
  id: number;
  eventKind: string;
  eventId: number;
  name: string;
  description?: string;
  sortOrder?: number;
}

export interface EventResourceCategoryCreate {
  name: string;
  description?: string;
  sortOrder?: number;
}

export interface EventResourceType {
  id: number;
  categoryId: number;
  name: string;
  description?: string;
  sortOrder?: number;
}

export interface EventResourceTypeCreate {
  name: string;
  description?: string;
  sortOrder?: number;
}

export interface EventResource {
  id: number;
  resourceTypeId: number;
  name: string;
  description?: string;
  assignable: boolean;
  activeAssignmentStatus?: string;
  activeAssignmentId?: number;
  assignedPersonId?: number;
  assignedPersonName?: string;
}

export interface EventResourceCreate {
  name: string;
  description?: string;
  assignable?: boolean;
}

export interface EventResourceAssignment {
  id: number;
  resourceId: number;
  resourceName?: string;
  personId: number;
  personName?: string;
  status: EventResourceAssignmentStatus;
  assignedAt?: string;
  completedAt?: string;
  notes?: string;
}

export interface EventResourceAssignmentCreate {
  personId: number;
  notes?: string;
}

export interface EventRole {
  id: number;
  eventKind: string;
  eventId: number;
  name: string;
  description?: string;
  sortOrder?: number;
  maxMembers?: number;
  memberCount?: number;
}

export interface EventRoleCreate {
  name: string;
  description?: string;
  sortOrder?: number;
  maxMembers?: number;
}

export interface EventMemberGroup {
  id: number;
  eventKind: string;
  eventId: number;
  name: string;
  description?: string;
  memberCount?: number;
}

export interface EventMemberGroupCreate {
  name: string;
  description?: string;
}

export interface EventMemberGroupMember {
  id: number;
  groupId: number;
  personId: number;
  personName?: string;
  eventRoleId: number;
  eventRoleName?: string;
}

export interface EventMemberGroupMemberCreate {
  personId: number;
  eventRoleId: number;
}

function basePath(eventKind: EventKind, eventId: number) {
  return `/event-features/${eventKind}/${eventId}`;
}

export const eventFeatureApi = {
  listCategories: (eventKind: EventKind, eventId: number) =>
    ApiClient.get<EventResourceCategory[]>(`${basePath(eventKind, eventId)}/resource-categories`),
  createCategory: (eventKind: EventKind, eventId: number, data: EventResourceCategoryCreate) =>
    ApiClient.post<EventResourceCategory>(`${basePath(eventKind, eventId)}/resource-categories`, data),
  updateCategory: (eventKind: EventKind, eventId: number, id: number, data: EventResourceCategoryCreate) =>
    ApiClient.put<EventResourceCategory>(`${basePath(eventKind, eventId)}/resource-categories/${id}`, data),
  deleteCategory: (eventKind: EventKind, eventId: number, id: number) =>
    ApiClient.delete(`${basePath(eventKind, eventId)}/resource-categories/${id}`),

  listTypes: (eventKind: EventKind, eventId: number, categoryId: number) =>
    ApiClient.get<EventResourceType[]>(`${basePath(eventKind, eventId)}/resource-categories/${categoryId}/types`),
  createType: (eventKind: EventKind, eventId: number, categoryId: number, data: EventResourceTypeCreate) =>
    ApiClient.post<EventResourceType>(`${basePath(eventKind, eventId)}/resource-categories/${categoryId}/types`, data),
  updateType: (eventKind: EventKind, eventId: number, id: number, data: EventResourceTypeCreate) =>
    ApiClient.put<EventResourceType>(`${basePath(eventKind, eventId)}/resource-types/${id}`, data),
  deleteType: (eventKind: EventKind, eventId: number, id: number) =>
    ApiClient.delete(`${basePath(eventKind, eventId)}/resource-types/${id}`),

  listResources: (eventKind: EventKind, eventId: number, typeId: number) =>
    ApiClient.get<EventResource[]>(`${basePath(eventKind, eventId)}/resource-types/${typeId}/resources`),
  createResource: (eventKind: EventKind, eventId: number, typeId: number, data: EventResourceCreate) =>
    ApiClient.post<EventResource>(`${basePath(eventKind, eventId)}/resource-types/${typeId}/resources`, data),
  updateResource: (eventKind: EventKind, eventId: number, id: number, data: EventResourceCreate) =>
    ApiClient.put<EventResource>(`${basePath(eventKind, eventId)}/resources/${id}`, data),
  deleteResource: (eventKind: EventKind, eventId: number, id: number) =>
    ApiClient.delete(`${basePath(eventKind, eventId)}/resources/${id}`),

  listAssignments: (eventKind: EventKind, eventId: number) =>
    ApiClient.get<EventResourceAssignment[]>(`${basePath(eventKind, eventId)}/assignments`),
  createAssignment: (eventKind: EventKind, eventId: number, resourceId: number, data: EventResourceAssignmentCreate) =>
    ApiClient.post<EventResourceAssignment>(`${basePath(eventKind, eventId)}/resources/${resourceId}/assignments`, data),
  completeAssignment: (eventKind: EventKind, eventId: number, assignmentId: number) =>
    ApiClient.put<EventResourceAssignment>(`${basePath(eventKind, eventId)}/assignments/${assignmentId}/complete`, {}),
  cancelAssignment: (eventKind: EventKind, eventId: number, assignmentId: number) =>
    ApiClient.put<EventResourceAssignment>(`${basePath(eventKind, eventId)}/assignments/${assignmentId}/cancel`, {}),

  listRoles: (eventKind: EventKind, eventId: number) =>
    ApiClient.get<EventRole[]>(`${basePath(eventKind, eventId)}/roles`),
  createRole: (eventKind: EventKind, eventId: number, data: EventRoleCreate) =>
    ApiClient.post<EventRole>(`${basePath(eventKind, eventId)}/roles`, data),
  updateRole: (eventKind: EventKind, eventId: number, id: number, data: EventRoleCreate) =>
    ApiClient.put<EventRole>(`${basePath(eventKind, eventId)}/roles/${id}`, data),
  deleteRole: (eventKind: EventKind, eventId: number, id: number) =>
    ApiClient.delete(`${basePath(eventKind, eventId)}/roles/${id}`),

  listMemberGroups: (eventKind: EventKind, eventId: number) =>
    ApiClient.get<EventMemberGroup[]>(`${basePath(eventKind, eventId)}/member-groups`),
  createMemberGroup: (eventKind: EventKind, eventId: number, data: EventMemberGroupCreate) =>
    ApiClient.post<EventMemberGroup>(`${basePath(eventKind, eventId)}/member-groups`, data),
  updateMemberGroup: (eventKind: EventKind, eventId: number, id: number, data: EventMemberGroupCreate) =>
    ApiClient.put<EventMemberGroup>(`${basePath(eventKind, eventId)}/member-groups/${id}`, data),
  deleteMemberGroup: (eventKind: EventKind, eventId: number, id: number) =>
    ApiClient.delete(`${basePath(eventKind, eventId)}/member-groups/${id}`),

  listGroupMembers: (eventKind: EventKind, eventId: number, groupId: number) =>
    ApiClient.get<EventMemberGroupMember[]>(`${basePath(eventKind, eventId)}/member-groups/${groupId}/members`),
  addGroupMember: (eventKind: EventKind, eventId: number, groupId: number, data: EventMemberGroupMemberCreate) =>
    ApiClient.post<EventMemberGroupMember>(`${basePath(eventKind, eventId)}/member-groups/${groupId}/members`, data),
  updateGroupMember: (eventKind: EventKind, eventId: number, groupId: number, memberId: number, data: EventMemberGroupMemberCreate) =>
    ApiClient.put<EventMemberGroupMember>(`${basePath(eventKind, eventId)}/member-groups/${groupId}/members/${memberId}`, data),
  removeGroupMember: (eventKind: EventKind, eventId: number, groupId: number, memberId: number) =>
    ApiClient.delete(`${basePath(eventKind, eventId)}/member-groups/${groupId}/members/${memberId}`),

  listSacrificeAnimals: (eventKind: EventKind, eventId: number) =>
    ApiClient.get<EventSacrificeAnimal[]>(`${basePath(eventKind, eventId)}/sacrifice-animals`),
  getSacrificeSummary: (eventKind: EventKind, eventId: number) =>
    ApiClient.get<EventSacrificeSummary>(`${basePath(eventKind, eventId)}/sacrifice-animals/summary`),
  getSacrificeAnimal: (eventKind: EventKind, eventId: number, id: number) =>
    ApiClient.get<EventSacrificeAnimal>(`${basePath(eventKind, eventId)}/sacrifice-animals/${id}`),
  createSacrificeAnimal: (eventKind: EventKind, eventId: number, data: EventSacrificeAnimalCreate) =>
    ApiClient.post<EventSacrificeAnimal>(`${basePath(eventKind, eventId)}/sacrifice-animals`, data),
  updateSacrificeAnimal: (eventKind: EventKind, eventId: number, id: number, data: EventSacrificeAnimalUpdate) =>
    ApiClient.put<EventSacrificeAnimal>(`${basePath(eventKind, eventId)}/sacrifice-animals/${id}`, data),
  deleteSacrificeAnimal: (eventKind: EventKind, eventId: number, id: number) =>
    ApiClient.delete(`${basePath(eventKind, eventId)}/sacrifice-animals/${id}`),
  addSacrificeShare: (eventKind: EventKind, eventId: number, animalId: number, data: EventSacrificeAnimalShareCreate) =>
    ApiClient.post<EventSacrificeAnimalShare>(`${basePath(eventKind, eventId)}/sacrifice-animals/${animalId}/shares`, data),
  updateSacrificeShare: (eventKind: EventKind, eventId: number, animalId: number, shareId: number, data: EventSacrificeAnimalShareCreate) =>
    ApiClient.put<EventSacrificeAnimalShare>(`${basePath(eventKind, eventId)}/sacrifice-animals/${animalId}/shares/${shareId}`, data),
  deleteSacrificeShare: (eventKind: EventKind, eventId: number, animalId: number, shareId: number) =>
    ApiClient.delete(`${basePath(eventKind, eventId)}/sacrifice-animals/${animalId}/shares/${shareId}`),
  markSacrificeShareEntitlementReceived: (eventKind: EventKind, eventId: number, animalId: number, shareId: number) =>
    ApiClient.post<EventSacrificeAnimalShare>(
      `${basePath(eventKind, eventId)}/sacrifice-animals/${animalId}/shares/${shareId}/mark-entitlement-received`,
      {},
    ),
};

export type SacrificeAnimalSize = 'SMALL' | 'LARGE';

export interface EventSacrificeSummary {
  totalMeatKg: number;
  totalShareEntitlementKg: number;
  totalReceivedEntitlementKg: number;
  availableMeatKg: number;
  totalDistributedParcels: number;
  totalDistributedWeightKg: number;
}

export interface EventSacrificeAnimal {
  id: number;
  eventKind: string;
  eventId: number;
  animalNumber: string;
  size: SacrificeAnimalSize;
  maxShares: number;
  allocatedShares: number;
  remainingShares: number;
  weightKg?: number | null;
  meatKg?: number | null;
  totalMeatEntitlementKg?: number | null;
  shares: EventSacrificeAnimalShare[];
}

export interface EventSacrificeAnimalCreate {
  animalNumber: string;
  size: SacrificeAnimalSize;
}

export interface EventSacrificeAnimalUpdate {
  animalNumber: string;
  size: SacrificeAnimalSize;
  weightKg?: number | null;
  meatKg?: number | null;
}

export interface EventSacrificeAnimalShare {
  id: number;
  animalId: number;
  personId?: number | null;
  personName: string;
  member: boolean;
  shareCount: number;
  meatEntitlementKg?: number | null;
  entitlementReceived?: boolean;
  entitlementReceivedAt?: string | null;
}

export interface EventSacrificeAnimalShareCreate {
  personId?: number | null;
  personName: string;
  member: boolean;
  shareCount: number;
  meatEntitlementKg?: number | null;
}
