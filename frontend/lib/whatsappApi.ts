import { ApiClient } from './api';

export interface WhatsAppMessageDTO {
  id: number;
  campaignId?: string;
  /** The number this message was queued for (resolved once, at enqueue time). */
  channelId?: number;
  channelLabel?: string;
  channelSession?: string;
  recipientPhone: string;
  recipientName?: string;
  body: string;
  profile: 'COLD' | 'CONVERSATION';
  status: 'QUEUED' | 'SENDING' | 'SENT' | 'FAILED' | 'CANCELLED' | 'SKIPPED';
  attemptCount: number;
  nextAttemptAt?: string;
  lastError?: string;
  waMessageId?: string;
  createdAt: string;
  sentAt?: string;
}

/** One WhatsApp number as configured in Settings → WhatsApp. */
export interface WhatsAppChannelDTO {
  id: number;
  label: string;
  purpose?: string | null;
  wahaSession: string;
  displayNumber?: string | null;
  meId?: string | null;
  enabled: boolean;
  isDefault: boolean;
  webhookTokenSet: boolean;
  webhookToken?: string | null;
  webhookUrl?: string | null;
  webhookEvents?: string | null;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface WhatsAppChannelRequest {
  label?: string;
  purpose?: string | null;
  wahaSession: string;
  enabled?: boolean;
  isDefault?: boolean;
  /** null keeps the stored token, '' clears it, any other value replaces it. */
  webhookToken?: string | null;
  webhookUrl?: string | null;
  webhookEvents?: string | null;
}

/** A session WAHA actually reports (the source for the "add channel" dropdown). */
export interface WahaAvailableSession {
  name: string;
  status: string;
  meId: string;
}

/** Per-number counters shown on the WhatsApp screen. */
export interface WhatsAppChannelStatsDTO {
  id: number;
  label: string;
  wahaSession: string;
  displayNumber?: string | null;
  enabled: boolean;
  isDefault: boolean;
  status: string;
  queued: number;
  sentToday: number;
  sentTotal: number;
}

export interface WhatsAppReplyDTO {
  id: number;
  fromPhone: string;
  contactName?: string;
  body?: string;
  optOut: boolean;
  receivedAt: string;
}

export interface WhatsAppStatsDTO {
  queued: number;
  sending: number;
  sent: number;
  failed: number;
  cancelled: number;
  optOuts: number;
  sessionStatus: string;
  sessionName: string;
  sentLastHour: number;
  sentToday: number;
  hourlyCap: number;
  dailyCap: number;
  effectiveDailyCap: number;
  warmupDay: number;
  quietHours: boolean;
  quietHoursEnd?: string;
  quietHoursStart: number;
  quietHoursEndHour: number;
  timezone: string;
  coldDelayMinSeconds: number;
  coldDelayMaxSeconds: number;
  conversationDelayMinSeconds: number;
  conversationDelayMaxSeconds: number;
  typingSimulationEnabled: boolean;
  recentReplies: WhatsAppReplyDTO[];
  /** One entry per configured number. */
  channels: WhatsAppChannelStatsDTO[];
}

export interface WhatsAppOptOutDTO {
  id: number;
  channelId?: number | null;
  channelLabel?: string | null;
  phoneE164: string;
  keyword?: string;
  reason?: string;
  source: 'REPLY' | 'MANUAL';
  createdAt: string;
}

export interface WhatsAppEnqueueRequest {
  recipientType: 'CUSTOM' | 'ALL_MEMBERS' | 'ACTIVE_MEMBERS';
  phones?: string[];
  template: string;
  /** Which number sends this batch; omitted means the configured default. */
  channelId?: number;
  profile?: 'COLD' | 'CONVERSATION';
  defaultCountryCode?: string;
  scheduledAt?: string;
}

export interface WhatsAppEnqueueResultDTO {
  campaignId: string;
  queued: number;
  skippedOptOut: number;
  skippedInvalid: number;
  /** Members with no phone number on file at all. */
  skippedNoPhone: number;
  skippedDuplicate: number;
  /** Total skipped (may be larger than the length of `skipped`). */
  skippedTotal: number;
  skippedTruncated: boolean;
  /** Who was skipped and why, so the admin can fix the data (capped server-side). */
  skipped: WhatsAppSkippedRecipientDTO[];
}

export type WhatsAppSkipReason =
  | 'NO_PHONE'
  | 'INVALID_FORMAT'
  | 'OPT_OUT'
  | 'DUPLICATE'
  | 'ALREADY_QUEUED';

export interface WhatsAppSkippedRecipientDTO {
  /** Member name; null for hand-typed recipients. */
  name?: string | null;
  /** The value as stored on the member / typed in the compose box (not normalized). */
  phone?: string | null;
  reason: WhatsAppSkipReason | string;
  detail?: string | null;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export const whatsappApi = {
  stats: () => ApiClient.get<WhatsAppStatsDTO>('/whatsapp/stats'),

  messages: (params: { status?: string; campaignId?: string; page?: number; size?: number } = {}) => {
    const query = new URLSearchParams();
    if (params.status) query.set('status', params.status);
    if (params.campaignId) query.set('campaignId', params.campaignId);
    query.set('page', String(params.page ?? 0));
    query.set('size', String(params.size ?? 20));
    return ApiClient.get<PageResponse<WhatsAppMessageDTO>>(`/whatsapp/messages?${query.toString()}`);
  },

  enqueue: (request: WhatsAppEnqueueRequest) =>
    ApiClient.post<WhatsAppEnqueueResultDTO>('/whatsapp/messages', request),

  cancel: (id: number) =>
    ApiClient.post<WhatsAppMessageDTO>(`/whatsapp/messages/${id}/cancel`),

  deleteMessage: (id: number) =>
    ApiClient.delete(`/whatsapp/messages/${id}`),

  optOuts: () => ApiClient.get<WhatsAppOptOutDTO[]>('/whatsapp/opt-outs'),

  addOptOut: (phone: string, reason?: string, channelId?: number) =>
    ApiClient.post<WhatsAppOptOutDTO>('/whatsapp/opt-outs', {
      phone,
      reason,
      channelId: channelId == null ? undefined : String(channelId),
    }),

  removeOptOut: (id: number) => ApiClient.delete(`/whatsapp/opt-outs/${id}`),

  // ─── Channels (one row per WhatsApp number) ───

  channels: () => ApiClient.get<WhatsAppChannelDTO[]>('/whatsapp/channels'),

  /** Live session list from WAHA — the only valid source for a channel's session name. */
  availableSessions: () =>
    ApiClient.get<WahaAvailableSession[]>('/whatsapp/channels/available-sessions'),

  createChannel: (request: WhatsAppChannelRequest) =>
    ApiClient.post<WhatsAppChannelDTO>('/whatsapp/channels', request),

  updateChannel: (id: number, request: WhatsAppChannelRequest) =>
    ApiClient.put<WhatsAppChannelDTO>(`/whatsapp/channels/${id}`, request),

  setDefaultChannel: (id: number) =>
    ApiClient.post<WhatsAppChannelDTO>(`/whatsapp/channels/${id}/default`),

  rotateChannelToken: (id: number) =>
    ApiClient.post<WhatsAppChannelDTO>(`/whatsapp/channels/${id}/token`),

  deleteChannel: (id: number) => ApiClient.delete(`/whatsapp/channels/${id}`),

  testChannel: (id: number, phone: string, text?: string) =>
    ApiClient.post<{ status: string; waMessageId: string }>(`/whatsapp/channels/${id}/test`, { phone, text }),

  channelWebhookConfig: (id: number) =>
    ApiClient.get<Record<string, unknown>>(`/whatsapp/channels/${id}/webhook-config`),
};
