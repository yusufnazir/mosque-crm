import { ApiClient } from './api';

export interface CommunicationMessageDTO {
  id?: number;
  subject: string;
  bodyHtml: string;
  recipientType: string;
  recipientFilterJson?: string;
  totalRecipients?: number;
  status?: string;
  sentAt?: string;
  templateId?: number;
  createdBy?: number;
  organizationId?: number;
  createdAt?: string;
}

export interface CommunicationTemplateDTO {
  id?: number;
  name: string;
  subject: string;
  bodyHtml: string;
  category?: string;
  isDefault?: boolean;
  createdBy?: number;
  organizationId?: number;
  createdAt?: string;
}

export interface SendMessageRequest {
  subject: string;
  bodyHtml: string;
  recipientType: string;
  templateId?: number;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export const communicationApi = {
  // Messages
  send: (data: SendMessageRequest): Promise<CommunicationMessageDTO> =>
    ApiClient.post('/communications/send', data),

  listMessages: (page = 0, size = 20): Promise<PageResponse<CommunicationMessageDTO>> =>
    ApiClient.get(`/communications/messages?page=${page}&size=${size}`),

  getRecentMessages: (): Promise<CommunicationMessageDTO[]> =>
    ApiClient.get('/communications/messages/recent'),

  getMessage: (id: number): Promise<CommunicationMessageDTO> =>
    ApiClient.get(`/communications/messages/${id}`),

  // Templates
  listTemplates: (): Promise<CommunicationTemplateDTO[]> =>
    ApiClient.get('/communications/templates'),

  getTemplate: (id: number): Promise<CommunicationTemplateDTO> =>
    ApiClient.get(`/communications/templates/${id}`),

  createTemplate: (data: CommunicationTemplateDTO): Promise<CommunicationTemplateDTO> =>
    ApiClient.post('/communications/templates', data),

  updateTemplate: (id: number, data: CommunicationTemplateDTO): Promise<CommunicationTemplateDTO> =>
    ApiClient.put(`/communications/templates/${id}`, data),

  deleteTemplate: (id: number): Promise<void> =>
    ApiClient.delete(`/communications/templates/${id}`),
};
