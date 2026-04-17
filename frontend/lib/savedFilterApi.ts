import { ApiClient } from './api';
import type { MemberFilterCriteria } from './api';

export interface SavedMemberFilter {
  id: number;
  name: string;
  filterJson: string;
  isDefault: boolean;
  createdAt: string;
}

export interface SavedMemberFilterRequest {
  name: string;
  filterJson: string;
}

export const savedFilterApi = {
  list: (): Promise<SavedMemberFilter[]> =>
    ApiClient.get<SavedMemberFilter[]>('/members/filters'),

  create: (request: SavedMemberFilterRequest): Promise<SavedMemberFilter> =>
    ApiClient.post<SavedMemberFilter>('/members/filters', request),

  update: (id: number, request: SavedMemberFilterRequest): Promise<SavedMemberFilter> =>
    ApiClient.put<SavedMemberFilter>(`/members/filters/${id}`, request),

  delete: (id: number): Promise<void> =>
    ApiClient.delete(`/members/filters/${id}`),

  setDefault: (id: number): Promise<SavedMemberFilter> =>
    ApiClient.post<SavedMemberFilter>(`/members/filters/${id}/set-default`, {}),
};

/**
 * Parse a SavedMemberFilter's filterJson string into a MemberFilterCriteria object.
 * Returns an empty criteria object if parsing fails.
 */
export function parseFilterJson(filterJson: string): MemberFilterCriteria {
  try {
    return JSON.parse(filterJson) as MemberFilterCriteria;
  } catch {
    return {};
  }
}

/**
 * Serialize a MemberFilterCriteria object to a JSON string.
 */
export function serializeFilterCriteria(criteria: MemberFilterCriteria): string {
  return JSON.stringify(criteria);
}
