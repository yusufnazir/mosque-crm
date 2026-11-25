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

export interface BusinessImageDTO {
  id: number;
  /** "full" variant (longest side ≤ 1600 px) — detail page / lightbox. */
  url: string;
  /** "thumb" variant (longest side ≤ 480 px) — cards, grids and dialogs. */
  thumbUrl: string;
  width?: number;
  height?: number;
}

/** Constraints mirror {@code BusinessImageService} on the backend. */
export const BUSINESS_IMAGE_MAX_COUNT = 5;
export const BUSINESS_IMAGE_MAX_SIZE_MB = 5;

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
  /** Gallery images, first one is the cover (max 5). */
  images?: BusinessImageDTO[];
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
  address?: string;
  city?: string;
  country?: string;
  logoUrl?: string;
  /** Gallery images, first one is the cover (max 5). */
  images?: BusinessImageDTO[];
  /** When the business joined the directory (drives the “Member since” badge). */
  createdAt?: string;
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
  /** Total matches for the search before the category filter (sidebar "All"). */
  totalAll?: number;
  /** Category code -> number of listings. */
  categoryCounts?: Record<string, number>;
}

export interface BusinessDirectoryPageResponse<T> extends PageResponse<T> {
  availableCategories?: string[];
  /** Total matches for the search before the category filter (sidebar "All"). */
  totalAll?: number;
  /** Category code -> number of listings. */
  categoryCounts?: Record<string, number>;
}

export type DirectoryBrowseParams = {
  page?: number;
  size?: number;
  search?: string;
  category?: string;
  /** Seed for a stable-but-random listing order (same seed = same pagination). */
  seed?: number;
};

function browseQuery(params: DirectoryBrowseParams = {}): string {
  const searchParams = new URLSearchParams();
  searchParams.set('page', String(params.page ?? 0));
  searchParams.set('size', String(params.size ?? 12));
  if (params.search?.trim()) searchParams.set('search', params.search.trim());
  if (params.category?.trim()) searchParams.set('category', params.category.trim());
  if (params.seed != null) searchParams.set('seed', String(params.seed));
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

  /** Owner publishes a draft listing immediately (no admin approval). */
  publishMy: (id: number) => ApiClient.post<BusinessDTO>(`/business-directory/my/${id}/publish`, {}),

  /** Owner moves a published listing back to draft. */
  unpublishMy: (id: number) => ApiClient.post<BusinessDTO>(`/business-directory/my/${id}/unpublish`, {}),

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

  uploadMyLogo: (id: number, file: File, onProgress?: (percent: number) => void) =>
    ApiClient.uploadFileWithProgress<{ message: string; imageUrl: string }>(
      `/business-directory/my/${id}/logo`,
      file,
      onProgress,
    ),

  deleteMyLogo: (id: number) => ApiClient.delete(`/business-directory/my/${id}/logo`),

  uploadLogo: (id: number, file: File, onProgress?: (percent: number) => void) =>
    ApiClient.uploadFileWithProgress<{ message: string; imageUrl: string }>(
      `/business-directory/${id}/logo`,
      file,
      onProgress,
    ),

  deleteLogo: (id: number) => ApiClient.delete(`/business-directory/${id}/logo`),

  // ----- gallery images (max 5 per business, 5 MB each) -----

  listMyImages: (id: number) =>
    ApiClient.get<{ images: BusinessImageDTO[] }>(`/business-directory/my/${id}/images`),

  uploadMyImage: (id: number, file: File, onProgress?: (percent: number) => void) =>
    ApiClient.uploadFileWithProgress<{ message: string; images: BusinessImageDTO[] }>(
      `/business-directory/my/${id}/images`,
      file,
      onProgress,
    ),

  deleteMyImage: (id: number, imageId: number) =>
    ApiClient.deleteWithResponse<{ message: string; images: BusinessImageDTO[] }>(
      `/business-directory/my/${id}/images/${imageId}`,
    ),

  reorderMyImages: (id: number, imageIds: number[]) =>
    ApiClient.put<{ images: BusinessImageDTO[] }>(`/business-directory/my/${id}/images/order`, { imageIds }),

  listImages: (id: number) =>
    ApiClient.get<{ images: BusinessImageDTO[] }>(`/business-directory/${id}/images`),

  uploadImage: (id: number, file: File, onProgress?: (percent: number) => void) =>
    ApiClient.uploadFileWithProgress<{ message: string; images: BusinessImageDTO[] }>(
      `/business-directory/${id}/images`,
      file,
      onProgress,
    ),

  deleteImage: (id: number, imageId: number) =>
    ApiClient.deleteWithResponse<{ message: string; images: BusinessImageDTO[] }>(
      `/business-directory/${id}/images/${imageId}`,
    ),

  reorderImages: (id: number, imageIds: number[]) =>
    ApiClient.put<{ images: BusinessImageDTO[] }>(`/business-directory/${id}/images/order`, { imageIds }),
};
