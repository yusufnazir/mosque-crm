import { ApiClient } from './api';

export interface MessageDTO {
  id: number;
  organizationId: number;
  senderId?: number;
  senderName: string;
  recipientId: number;
  recipientName: string;
  subject: string;
  body: string;
  read: boolean;
  replyToId?: number;
  createdAt: string;
}

export interface ConversationSummaryDTO {
  otherUserId: number;
  otherUserName: string;
  baseSubject: string;
  lastMessage: MessageDTO;
  unreadCount: number;
}

export interface InboxPageDTO {
  content: ConversationSummaryDTO[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}

export interface SendMessageDTO {
  recipientId: number;
  subject: string;
  body: string;
  replyToId?: number;
}

export interface ThreadKey {
  otherUserId: number;
  baseSubject: string;
}

export const messageApi = {
  /** Get paginated inbox conversation list. */
  getInbox: (page = 0, size = 20) =>
    ApiClient.get<InboxPageDTO>(`/messages/inbox?page=${page}&size=${size}`),

  /** Get all messages in a conversation with another user, optionally filtered by subject thread. */
  getConversation: (otherUserId: number, subject?: string) => {
    const params = subject ? `?subject=${encodeURIComponent(subject)}` : '';
    return ApiClient.get<MessageDTO[]>(`/messages/conversation/${otherUserId}${params}`);
  },

  /** Send a new message. */
  send: (data: SendMessageDTO) => ApiClient.post<MessageDTO>('/messages', data),

  /** Get total unread message count for the current user. */
  getUnreadCount: () => ApiClient.get<{ count: number }>('/messages/unread-count'),

  /** Mark a specific message as read. */
  markRead: (id: number) => ApiClient.put<void>(`/messages/${id}/read`, {}),

  /** Mark a thread as read. */
  markThreadAsRead: (otherUserId: number, subject: string) =>
    ApiClient.put<void>(`/messages/thread/read?otherUserId=${otherUserId}&subject=${encodeURIComponent(subject)}`, {}),

  /** Delete a thread. */
  deleteThread: (otherUserId: number, subject: string) =>
    ApiClient.delete(`/messages/thread?otherUserId=${otherUserId}&subject=${encodeURIComponent(subject)}`),

  /** Batch mark threads as read. */
  batchMarkAsRead: (threads: ThreadKey[]) =>
    ApiClient.post<void>('/messages/batch/read', { threads }),

  /** Batch delete threads. */
  batchDelete: (threads: ThreadKey[]) =>
    ApiClient.post<void>('/messages/batch/delete', { threads }),
};
