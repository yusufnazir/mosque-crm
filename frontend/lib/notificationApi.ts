import { ApiClient } from './api';

export interface UserNotificationDTO {
  id: number;
  type: string;
  title: string;
  body?: string;
  linkPath?: string;
  read: boolean;
  createdAt?: string;
}

export const notificationApi = {
  list: (limit = 20) =>
    ApiClient.get<UserNotificationDTO[]>(`/notifications?limit=${limit}`),

  unreadCount: () =>
    ApiClient.get<{ count: number }>('/notifications/unread-count'),

  markRead: (id: number) =>
    ApiClient.post<UserNotificationDTO>(`/notifications/${id}/read`, {}),

  markAllRead: () =>
    ApiClient.post<{ updated: number }>('/notifications/read-all', {}),
};
