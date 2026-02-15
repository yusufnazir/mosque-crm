import { ApiClient } from './api';

// ==================== Types ====================

export interface CurrencyDTO {
  id: number;
  code: string;
  name: string;
  symbol: string;
  decimalPlaces: number;
}

export interface MosqueCurrencyDTO {
  id: number;
  currencyId: number;
  currencyCode: string;
  currencyName: string;
  currencySymbol: string;
  decimalPlaces: number;
  isPrimary: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface MosqueCurrencyCreateDTO {
  currencyId: number;
  isPrimary?: boolean;
  isActive?: boolean;
}

export interface ExchangeRateDTO {
  id: number;
  fromCurrencyId: number;
  fromCurrencyCode: string;
  fromCurrencyName: string;
  toCurrencyId: number;
  toCurrencyCode: string;
  toCurrencyName: string;
  rate: number;
  effectiveDate: string;
  createdAt: string;
}

export interface ExchangeRateCreateDTO {
  fromCurrencyId: number;
  toCurrencyId: number;
  rate: number;
  effectiveDate: string;
}

// ==================== API Functions ====================

export const currencyApi = {
  // Global currencies (reference data)
  getAllCurrencies: () => ApiClient.get<CurrencyDTO[]>('/currencies'),
  getCurrencyById: (id: number) => ApiClient.get<CurrencyDTO>(`/currencies/${id}`),
  getCurrencyByCode: (code: string) => ApiClient.get<CurrencyDTO>(`/currencies/code/${code}`),

  // Per-mosque currencies
  getMosqueCurrencies: () => ApiClient.get<MosqueCurrencyDTO[]>('/mosque-currencies'),
  getActiveMosqueCurrencies: () => ApiClient.get<MosqueCurrencyDTO[]>('/mosque-currencies/active'),
  addMosqueCurrency: (data: MosqueCurrencyCreateDTO) => ApiClient.post<MosqueCurrencyDTO>('/mosque-currencies', data),
  updateMosqueCurrency: (id: number, data: MosqueCurrencyCreateDTO) => ApiClient.put<MosqueCurrencyDTO>(`/mosque-currencies/${id}`, data),
  setPrimaryCurrency: (id: number) => ApiClient.put<MosqueCurrencyDTO>(`/mosque-currencies/${id}/primary`, {}),
  removeMosqueCurrency: (id: number) => ApiClient.delete(`/mosque-currencies/${id}`),

  // Exchange rates
  getExchangeRates: () => ApiClient.get<ExchangeRateDTO[]>('/exchange-rates'),
  getRatesByCurrencyPair: (fromId: number, toId: number) =>
    ApiClient.get<ExchangeRateDTO[]>(`/exchange-rates/pair?fromCurrencyId=${fromId}&toCurrencyId=${toId}`),
  createExchangeRate: (data: ExchangeRateCreateDTO) => ApiClient.post<ExchangeRateDTO>('/exchange-rates', data),
  updateExchangeRate: (id: number, data: ExchangeRateCreateDTO) => ApiClient.put<ExchangeRateDTO>(`/exchange-rates/${id}`, data),
  deleteExchangeRate: (id: number) => ApiClient.delete(`/exchange-rates/${id}`),
};
