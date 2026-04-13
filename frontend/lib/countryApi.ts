import { ApiClient } from './api';

export interface CountryDTO {
  id: number;
  isoCode: string;
  name: string;
}

export const countryApi = {
  getAll: (locale: 'en' | 'nl' = 'en') =>
    ApiClient.get<CountryDTO[]>(`/countries?locale=${locale}`),
};
