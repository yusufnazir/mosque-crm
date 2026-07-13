import { ApiClient, PageResponse } from './api';

export interface BusinessListingDTO {
  id: number;
  organizationId: number;
  businessId: number;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'PUBLISHED' | 'SUSPENDED';
  visibility: 'LOCAL_ONLY' | 'SHARED_WITH_FEDERATION';
  publishedAt?: string;
  submittedAt?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  federationHidden?: boolean;
  federationHiddenReason?: string;
  publicVisible?: boolean;
  suspensionReason?: string;
  suspendedAt?: string;
}

export interface BusinessDTO {
  id: number;
  organizationId: number;
  ownerPersonId?: number;
  ownerPersonName?: string;
  name: string;
  category?: string;
  description?: string;
  email?: string;
  phone?: string;
  website?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  tiktokUrl?: string;
  youtubeUrl?: string;
  linkedinUrl?: string;
  whatsappUrl?: string;
  address?: string;
  city?: string;
  country?: string;
  logoUrl?: string;
  listing?: BusinessListingDTO;
  createdAt?: string;
  updatedAt?: string;
}

export interface FederatedBusinessListingDTO extends BusinessDTO {
  listingId?: number;
  listedByOrganizationName?: string;
  listedByOrganizationHandle?: string;
  publishedAt?: string;
}

export interface PublicBusinessDTO {
  id: number;
  name: string;
  category?: string;
  description?: string;
  email?: string;
  phone?: string;
  website?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  tiktokUrl?: string;
  youtubeUrl?: string;
  linkedinUrl?: string;
  whatsappUrl?: string;
  city?: string;
  country?: string;
  logoUrl?: string;
  listedByOrganizationName?: string;
  listedByOrganizationHandle?: string;
}

export interface PublicBusinessDirectoryResponse {
  enabled: boolean;
  organizationName?: string;
  includesFederationListings?: boolean;
  businesses: PublicBusinessDTO[];
  page?: number;
  size?: number;
  totalElements?: number;
  totalPages?: number;
  first?: boolean;
  last?: boolean;
  availableCategories?: string[];
}

export interface BusinessDirectoryPageResponse<T> extends PageResponse<T> {
  availableCategories?: string[];
}

export type DirectoryBrowseParams = {
  page?: number;
  size?: number;
  search?: string;
  category?: string;
};

function browseQuery(params: DirectoryBrowseParams = {}): string {
  const searchParams = new URLSearchParams();
  searchParams.set('page', String(params.page ?? 0));
  searchParams.set('size', String(params.size ?? 12));
  if (params.search?.trim()) searchParams.set('search', params.search.trim());
  if (params.category?.trim()) searchParams.set('category', params.category.trim());
  return searchParams.toString();
}

export interface BusinessDirectoryUsage {
  count: number;
  limit: number | null;
}

export const businessDirectoryApi = {
  listLocal: () => ApiClient.get<BusinessDTO[]>('/business-directory'),

  getUsage: () => ApiClient.get<BusinessDirectoryUsage>('/business-directory/usage'),

  listPublished: () => ApiClient.get<BusinessDTO[]>('/business-directory/published'),

  listPublishedPage: (params?: DirectoryBrowseParams) =>
    ApiClient.get<BusinessDirectoryPageResponse<BusinessDTO>>(
      `/business-directory/published/page?${browseQuery(params)}`
    ),

  listMy: () => ApiClient.get<BusinessDTO[]>('/business-directory/my'),

  listPendingApproval: () => ApiClient.get<BusinessDTO[]>('/business-directory/pending-approval'),

  listFederation: () => ApiClient.get<FederatedBusinessListingDTO[]>('/business-directory/federation'),

  listFederationPage: (params?: DirectoryBrowseParams) =>
    ApiClient.get<BusinessDirectoryPageResponse<FederatedBusinessListingDTO>>(
      `/business-directory/federation/page?${browseQuery(params)}`
    ),

  getPublic: (orgHandle: string, params?: DirectoryBrowseParams) =>
    ApiClient.get<PublicBusinessDirectoryResponse>(
      `/business-directory/public/${encodeURIComponent(orgHandle)}?${browseQuery(params)}`
    ),

  getPublicBusiness: (orgHandle: string, id: number) =>
    ApiClient.get<PublicBusinessDTO>(
      `/business-directory/public/${encodeURIComponent(orgHandle)}/${id}`
    ),

  getById: (id: number) => ApiClient.get<BusinessDTO>(`/business-directory/${id}`),

  create: (data: Partial<BusinessDTO>) => ApiClient.post<BusinessDTO>('/business-directory', data),

  createMy: (data: Partial<BusinessDTO>) => ApiClient.post<BusinessDTO>('/business-directory/my', data),

  updateMy: (id: number, data: Partial<BusinessDTO>) =>
    ApiClient.put<BusinessDTO>(`/business-directory/my/${id}`, data),

  submitMy: (id: number) => ApiClient.post<BusinessDTO>(`/business-directory/my/${id}/submit`, {}),

  deleteMy: (id: number) => ApiClient.delete(`/business-directory/my/${id}`),

  updateMyListing: (id: number, data: Partial<BusinessListingDTO>) =>
    ApiClient.put<BusinessListingDTO>(`/business-directory/my/${id}/listing`, data),

  approve: (id: number) => ApiClient.post<BusinessDTO>(`/business-directory/${id}/approve`, {}),

  reject: (id: number, reason?: string) =>
    ApiClient.post<BusinessDTO>(`/business-directory/${id}/reject`, { reason }),

  suspend: (id: number, reason: string) =>
    ApiClient.post<BusinessDTO>(`/business-directory/${id}/suspend`, { reason }),

  hideFromFederation: (listingId: number, reason?: string) =>
    ApiClient.post<FederatedBusinessListingDTO>(`/business-directory/federation/${listingId}/hide`, { reason }),

  unhideFromFederation: (listingId: number) =>
    ApiClient.post<FederatedBusinessListingDTO>(`/business-directory/federation/${listingId}/unhide`, {}),

  update: (id: number, data: Partial<BusinessDTO>) =>
    ApiClient.put<BusinessDTO>(`/business-directory/${id}`, data),

  delete: (id: number) => ApiClient.delete(`/business-directory/${id}`),

  updateListing: (id: number, data: Partial<BusinessListingDTO>) =>
    ApiClient.put<BusinessListingDTO>(`/business-directory/${id}/listing`, data),

  uploadMyLogo: (id: number, file: File) =>
    ApiClient.uploadFile<{ message: string; imageUrl: string }>(`/business-directory/my/${id}/logo`, file),

  deleteMyLogo: (id: number) => ApiClient.delete(`/business-directory/my/${id}/logo`),

  uploadLogo: (id: number, file: File) =>
    ApiClient.uploadFile<{ message: string; imageUrl: string }>(`/business-directory/${id}/logo`, file),

  deleteLogo: (id: number) => ApiClient.delete(`/business-directory/${id}/logo`),
};
