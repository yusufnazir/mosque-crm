import { ApiClient } from './api';

export interface UserDTO {
  id: number;
  username: string;
  email: string | null;
  accountEnabled: boolean;
  accountLocked: boolean;
  createdAt: string;
  lastLogin: string | null;
  mosqueId: number | null;
  mosqueName: string | null;
  roles: string[];
  personId: number | null;
  personName: string | null;
  currentUser: boolean;
}

export interface CreateUserRequest {
  username: string;
  password: string;
  email?: string;
  mosqueId?: number | null;
  roles?: string[];
}

export interface UpdateUserRequest {
  email?: string;
  password?: string;
  accountEnabled?: boolean;
  accountLocked?: boolean;
  mosqueId?: number | null;
  roles?: string[];
}

export const userApi = {
  getAll: () => ApiClient.get<UserDTO[]>('/admin/users'),
  getById: (id: number) => ApiClient.get<UserDTO>(`/admin/users/${id}`),
  create: (data: CreateUserRequest) => ApiClient.post<UserDTO>('/admin/users', data),
  update: (id: number, data: UpdateUserRequest) => ApiClient.put<UserDTO>(`/admin/users/${id}`, data),
  toggleEnabled: (id: number) => ApiClient.put<UserDTO>(`/admin/users/${id}/toggle-enabled`, {}),
  delete: (id: number) => ApiClient.delete(`/admin/users/${id}`),
};
