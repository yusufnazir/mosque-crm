import { ApiClient } from './api';

// ============================================================
// Types
// ============================================================

export type DocumentType = 'FILE' | 'RICH_TEXT';
export type DocumentStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | 'TRASHED';
export type DocumentVisibility = 'PRIVATE' | 'ORGANIZATION' | 'SHARED';
export type DocumentShareType = 'USER' | 'ROLE' | 'ORGANIZATION';
export type DocumentAccessLevel = 'VIEW' | 'COMMENT' | 'EDIT' | 'MANAGE';
export type DocumentLinkedEntityType = 'MEMBER' | 'EVENT' | 'CONTRIBUTION' | 'GROUP' | 'MEMBERSHIP';
export type FolderVisibility = 'PRIVATE' | 'ORGANIZATION' | 'SHARED';

export interface DocumentFolder {
  id: number;
  organizationId: number;
  name: string;
  description?: string;
  parentFolderId?: number;
  ownerUserId?: number;
  visibility: FolderVisibility;
  maxFileSizeMb?: number;
  allowedMimeTypes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DocumentFolderCreateDTO {
  name: string;
  description?: string;
  parentFolderId?: number;
  visibility?: FolderVisibility;
  maxFileSizeMb?: number;
  allowedMimeTypes?: string;
}

export interface DocumentDTO {
  id: number;
  organizationId: number;
  folderId?: number;
  title: string;
  description?: string;
  documentType: DocumentType;
  mimeType?: string;
  fileSize: number;
  originalFilename?: string;
  status: DocumentStatus;
  visibility: DocumentVisibility;
  ownerUserId?: number;
  versionCount: number;
  expiresAt?: string;
  expiryNotificationSent?: boolean;
  deletedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DocumentVersionDTO {
  id: number;
  documentId: number;
  versionNumber: number;
  fileSize?: number;
  changeNote?: string;
  changedByUserId?: number;
  createdAt?: string;
}

export interface DocumentShareDTO {
  id: number;
  documentId: number;
  shareType: DocumentShareType;
  targetUserId?: number;
  targetRoleId?: number;
  accessLevel: DocumentAccessLevel;
  sharedByUserId?: number;
  expiresAt?: string;
  sharedAt?: string;
}

export interface DocumentShareCreateDTO {
  shareType: DocumentShareType;
  targetUserId?: number;
  targetRoleId?: number;
  accessLevel: DocumentAccessLevel;
  expiresAt?: string;
}

export interface DocumentCommentDTO {
  id: number;
  documentId: number;
  content: string;
  authorUserId?: number;
  parentCommentId?: number;
  resolved: boolean;
  resolvedByUserId?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface DocumentCommentCreateDTO {
  content: string;
  parentCommentId?: number;
}

export interface DocumentDetailDTO extends DocumentDTO {
  contentHtml?: string;
  versions?: DocumentVersionDTO[];
  shares?: DocumentShareDTO[];
  comments?: DocumentCommentDTO[];
}

export interface DocumentLinkDTO {
  id: number;
  documentId: number;
  entityType: DocumentLinkedEntityType;
  entityId: number;
  accessLevelOverride?: DocumentAccessLevel;
  linkedByUserId?: number;
  note?: string;
  linkedAt?: string;
  document?: DocumentDTO;
}

export interface DocumentLinkCreateDTO {
  documentId: number;
  entityType: DocumentLinkedEntityType;
  entityId: number;
  accessLevelOverride?: DocumentAccessLevel;
  note?: string;
}

export interface DocumentQuotaDTO {
  organizationId: number;
  storageUsedBytes: number;
  storageLimitBytes: number;
  bandwidthUsedBytes: number;
  bandwidthLimitBytes: number;
  bandwidthResetDate?: string;
  addonStorageBytes: number;
  addonBandwidthBytes: number;
  totalStorageLimitBytes: number;
  totalBandwidthLimitBytes: number;
}

export interface DocumentAuditEventDTO {
  id: number;
  documentId: number;
  eventType: string;
  userId?: number;
  detail?: string;
  occurredAt?: string;
}

export interface DocumentDownloadUrlDTO {
  documentId: number;
  downloadUrl: string;
  filename?: string;
  mimeType?: string;
  fileSize?: number;
}

export interface RichTextDocumentSaveDTO {
  contentHtml: string;
  changeNote?: string;
}

// ============================================================
// Folder API
// ============================================================

export const DocumentFolderApi = {
  listRoot: () => ApiClient.get<DocumentFolder[]>('/document-folders'),
  listSubFolders: (id: number) => ApiClient.get<DocumentFolder[]>(`/document-folders/${id}/subfolders`),
  create: (dto: DocumentFolderCreateDTO) => ApiClient.post<DocumentFolder>('/document-folders', dto),
  update: (id: number, dto: DocumentFolderCreateDTO) => ApiClient.put<DocumentFolder>(`/document-folders/${id}`, dto),
  delete: (id: number) => ApiClient.delete(`/document-folders/${id}`),
};

// ============================================================
// Document API
// ============================================================

export const DocumentApi = {
  list: (folderId?: number) =>
    ApiClient.get<DocumentDTO[]>(`/documents${folderId != null ? `?folderId=${folderId}` : ''}`),
  listTrash: () => ApiClient.get<DocumentDTO[]>('/documents/trash'),
  get: (id: number) => ApiClient.get<DocumentDetailDTO>(`/documents/${id}`),

  uploadFile: (file: File, meta: { title?: string; description?: string; folderId?: number; visibility?: DocumentVisibility }) => {
    const formData = new FormData();
    formData.append('file', file);
    if (meta.title) formData.append('title', meta.title);
    if (meta.description) formData.append('description', meta.description);
    if (meta.folderId != null) formData.append('folderId', String(meta.folderId));
    if (meta.visibility) formData.append('visibility', meta.visibility);
    return ApiClient.postMultipart<DocumentDTO>('/documents/upload', formData);
  },

  createRichText: (dto: { title: string; description?: string; folderId?: number; visibility?: DocumentVisibility }) =>
    ApiClient.post<DocumentDTO>('/documents/rich-text', dto),

  saveContent: (id: number, dto: RichTextDocumentSaveDTO) =>
    ApiClient.post<DocumentDTO>(`/documents/${id}/content`, dto),

  update: (id: number, dto: Partial<{ title: string; description: string; visibility: DocumentVisibility; folderId: number; expiresAt: string }>) =>
    ApiClient.put<DocumentDTO>(`/documents/${id}`, dto),

  trash: (id: number) => ApiClient.post<void>(`/documents/${id}/trash`),
  restore: (id: number) => ApiClient.post<void>(`/documents/${id}/restore`),
  permanentDelete: (id: number) => ApiClient.delete(`/documents/${id}`),

  getDownloadUrl: (id: number) => ApiClient.get<DocumentDownloadUrlDTO>(`/documents/${id}/download`),

  uploadNewVersion: (id: number, file: File, changeNote?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (changeNote) formData.append('changeNote', changeNote);
    return ApiClient.postMultipart<DocumentDTO>(`/documents/${id}/versions`, formData);
  },

  addShare: (id: number, dto: DocumentShareCreateDTO) =>
    ApiClient.post<DocumentShareDTO>(`/documents/${id}/shares`, dto),
  removeShare: (docId: number, shareId: number) =>
    ApiClient.delete(`/documents/${docId}/shares/${shareId}`),

  addComment: (id: number, dto: DocumentCommentCreateDTO) =>
    ApiClient.post<DocumentCommentDTO>(`/documents/${id}/comments`, dto),
  resolveComment: (docId: number, commentId: number) =>
    ApiClient.post<DocumentCommentDTO>(`/documents/${docId}/comments/${commentId}/resolve`),

  getAuditLog: (id: number) =>
    ApiClient.get<DocumentAuditEventDTO[]>(`/documents/${id}/audit`),
};

// ============================================================
// Record Attachment API
// ============================================================

export const RecordAttachmentApi = {
  getLinksForEntity: (entityType: DocumentLinkedEntityType, entityId: number) =>
    ApiClient.get<DocumentLinkDTO[]>(`/record-attachments?entityType=${entityType}&entityId=${entityId}`),
  link: (dto: DocumentLinkCreateDTO) =>
    ApiClient.post<DocumentLinkDTO>('/record-attachments', dto),
  unlink: (linkId: number) => ApiClient.delete(`/record-attachments/${linkId}`),
  getQuota: () => ApiClient.get<DocumentQuotaDTO>('/record-attachments/quota'),
};
