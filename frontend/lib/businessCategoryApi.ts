import { ApiClient } from './api';

export interface BusinessCategoryDTO {
  id: number;
  code: string;
  name: string;
  sortOrder?: number;
}

export const businessCategoryApi = {
  listActive: (locale: 'en' | 'nl' = 'en') =>
    ApiClient.get<BusinessCategoryDTO[]>(`/business-categories?locale=${locale}`),
};
