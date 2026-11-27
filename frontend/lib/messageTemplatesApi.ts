import { ApiClient } from './api';

export interface MessageTemplatePlaceholder {
  code: string;
  sample: string;
}

export interface MessageTemplate {
  key: string;
  name: string;
  description: string;
  category: string;
  language: string;
  channel: 'EMAIL' | 'WHATSAPP';
  subject: string;
  body: string;
  attachTerms: boolean;
  active: boolean;
  customized: boolean;
  defaultChannel: 'EMAIL' | 'WHATSAPP';
  defaultSubject: string;
  defaultBody: string;
  supportsTermsAttachment: boolean;
  placeholders: MessageTemplatePlaceholder[];
  updatedAt?: string | null;
}

export interface MessageTemplateUpdate {
  channel: 'EMAIL' | 'WHATSAPP';
  subject?: string;
  body: string;
  attachTerms: boolean;
  active: boolean;
}

export interface MessageTemplatePreviewRequest {
  language: string;
  channel: 'EMAIL' | 'WHATSAPP';
  subject?: string;
  body?: string;
  attachTerms?: boolean;
  variables?: Record<string, string>;
}

export interface MessageTemplatePreview {
  channel: 'EMAIL' | 'WHATSAPP';
  subject?: string;
  body: string;
  html?: string;
  variables: Record<string, string>;
}

export interface MessageTemplateTestRequest {
  language: string;
  channel: 'EMAIL' | 'WHATSAPP';
  subject?: string;
  body?: string;
  attachTerms?: boolean;
  toEmail?: string;
  toPhone?: string;
}

export interface MessageTemplateTestResult {
  channel: 'EMAIL' | 'WHATSAPP';
  status: 'SENT' | 'QUEUED' | 'SKIPPED' | 'NOT_CONFIGURED' | 'NO_RECIPIENT' | 'FAILED';
  delivered: boolean;
  recipient?: string;
  message: string;
}

export const messageTemplatesApi = {
  list: () => ApiClient.get<MessageTemplate[]>('/message-templates'),

  get: (templateKey: string, language: string) =>
    ApiClient.get<MessageTemplate>(
      `/message-templates/${encodeURIComponent(templateKey)}?language=${encodeURIComponent(language)}`
    ),

  update: (templateKey: string, language: string, data: MessageTemplateUpdate) =>
    ApiClient.put<MessageTemplate>(
      `/message-templates/${encodeURIComponent(templateKey)}?language=${encodeURIComponent(language)}`,
      data
    ),

  reset: (templateKey: string, language: string) =>
    ApiClient.post<MessageTemplate>(
      `/message-templates/${encodeURIComponent(templateKey)}/reset?language=${encodeURIComponent(language)}`,
      {}
    ),

  preview: (templateKey: string, data: MessageTemplatePreviewRequest) =>
    ApiClient.post<MessageTemplatePreview>(
      `/message-templates/${encodeURIComponent(templateKey)}/preview`,
      data
    ),

  sendTest: (templateKey: string, data: MessageTemplateTestRequest) =>
    ApiClient.post<MessageTemplateTestResult>(
      `/message-templates/${encodeURIComponent(templateKey)}/test`,
      data
    ),
};
