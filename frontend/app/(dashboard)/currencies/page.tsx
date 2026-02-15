'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import Card from '@/components/Card';
import ConfirmDialog from '@/components/ConfirmDialog';
import ToastNotification from '@/components/ToastNotification';
import {
  CurrencyDTO,
  MosqueCurrencyDTO,
  MosqueCurrencyCreateDTO,
  ExchangeRateDTO,
  ExchangeRateCreateDTO,
  currencyApi,
} from '@/lib/currencyApi';

type Tab = 'available' | 'mosque' | 'rates';

export default function CurrenciesPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>('mosque');

  // ===== Available Currencies State =====
  const [allCurrencies, setAllCurrencies] = useState<CurrencyDTO[]>([]);
  const [currenciesLoading, setCurrenciesLoading] = useState(true);
  const [currencySearch, setCurrencySearch] = useState('');

  // ===== Mosque Currencies State =====
  const [mosqueCurrencies, setMosqueCurrencies] = useState<MosqueCurrencyDTO[]>([]);
  const [mosqueLoading, setMosqueLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addSearch, setAddSearch] = useState('');

  // ===== Exchange Rates State =====
  const [exchangeRates, setExchangeRates] = useState<ExchangeRateDTO[]>([]);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [showRateModal, setShowRateModal] = useState(false);
  const [editingRate, setEditingRate] = useState<ExchangeRateDTO | null>(null);

  // ===== Confirm Dialog State =====
  const [confirmAction, setConfirmAction] = useState<{ title: string; message: string; confirmLabel?: string; variant?: 'danger' | 'warning' | 'default'; onConfirm: () => void } | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [rateForm, setRateForm] = useState<ExchangeRateCreateDTO>({
    fromCurrencyId: 0,
    toCurrencyId: 0,
    rate: 0,
    effectiveDate: new Date().toISOString().split('T')[0],
  });

  // Load data on mount
  useEffect(() => {
    loadAllCurrencies();
    loadMosqueCurrencies();
  }, []);

  useEffect(() => {
    if (activeTab === 'rates') loadExchangeRates();
  }, [activeTab]);

  // ===== Data Loading =====
  const loadAllCurrencies = async () => {
    setCurrenciesLoading(true);
    try {
      const data = await currencyApi.getAllCurrencies();
      setAllCurrencies(data);
    } catch (err) {
      console.error('Failed to load currencies:', err);
    } finally {
      setCurrenciesLoading(false);
    }
  };

  const loadMosqueCurrencies = async () => {
    setMosqueLoading(true);
    try {
      const data = await currencyApi.getMosqueCurrencies();
      setMosqueCurrencies(data);
    } catch (err) {
      console.error('Failed to load mosque currencies:', err);
    } finally {
      setMosqueLoading(false);
    }
  };

  const loadExchangeRates = async () => {
    setRatesLoading(true);
    try {
      const data = await currencyApi.getExchangeRates();
      setExchangeRates(data);
    } catch (err) {
      console.error('Failed to load exchange rates:', err);
    } finally {
      setRatesLoading(false);
    }
  };

  // ===== Mosque Currency Actions =====
  const handleAddCurrency = async (currencyId: number) => {
    try {
      const dto: MosqueCurrencyCreateDTO = {
        currencyId,
        isPrimary: mosqueCurrencies.length === 0, // First currency is automatically primary
        isActive: true,
      };
      await currencyApi.addMosqueCurrency(dto);
      await loadMosqueCurrencies();
      setShowAddModal(false);
      setAddSearch('');
      setToast({ message: t('currency.currencyAdded'), type: 'success' });
    } catch (err) {
      console.error('Failed to add currency:', err);
      setToast({ message: t('currency.addError'), type: 'error' });
    }
  };

  const handleSetPrimary = async (id: number) => {
    try {
      await currencyApi.setPrimaryCurrency(id);
      await loadMosqueCurrencies();
      setToast({ message: t('currency.primaryUpdated'), type: 'success' });
    } catch (err) {
      console.error('Failed to set primary currency:', err);
      setToast({ message: t('currency.primaryError'), type: 'error' });
    }
  };

  const handleToggleActive = async (mc: MosqueCurrencyDTO) => {
    try {
      await currencyApi.updateMosqueCurrency(mc.id, {
        currencyId: mc.currencyId,
        isActive: !mc.isActive,
      });
      await loadMosqueCurrencies();
    } catch (err) {
      console.error('Failed to toggle currency:', err);
    }
  };

  const handleRemoveCurrency = async (id: number) => {
    setConfirmAction({
      title: t('currency.removeCurrencyTitle'),
      message: t('currency.confirmRemove'),
      onConfirm: async () => {
        setConfirmAction(null);
        try {
          await currencyApi.removeMosqueCurrency(id);
          await loadMosqueCurrencies();
          setToast({ message: t('currency.currencyRemoved'), type: 'success' });
        } catch (err) {
          console.error('Failed to remove currency:', err);
          setToast({ message: t('currency.removeError'), type: 'error' });
        }
      },
    });
  };

  // ===== Exchange Rate Actions =====
  const handleSaveRate = async () => {
    try {
      if (editingRate) {
        await currencyApi.updateExchangeRate(editingRate.id, rateForm);
      } else {
        await currencyApi.createExchangeRate(rateForm);
      }
      setShowRateModal(false);
      setEditingRate(null);
      setRateForm({ fromCurrencyId: 0, toCurrencyId: 0, rate: 0, effectiveDate: new Date().toISOString().split('T')[0] });
      await loadExchangeRates();
      setToast({ message: editingRate ? t('currency.rateUpdated') : t('currency.rateCreated'), type: 'success' });
    } catch (err) {
      console.error('Failed to save exchange rate:', err);
      setToast({ message: t('currency.rateSaveError'), type: 'error' });
    }
  };

  const handleEditRate = (rate: ExchangeRateDTO) => {
    setEditingRate(rate);
    setRateForm({
      fromCurrencyId: rate.fromCurrencyId,
      toCurrencyId: rate.toCurrencyId,
      rate: rate.rate,
      effectiveDate: rate.effectiveDate,
    });
    setShowRateModal(true);
  };

  const handleDeleteRate = async (id: number) => {
    setConfirmAction({
      title: t('currency.deleteRateTitle'),
      message: t('currency.confirmDeleteRate'),
      onConfirm: async () => {
        setConfirmAction(null);
        try {
          await currencyApi.deleteExchangeRate(id);
          await loadExchangeRates();
          setToast({ message: t('currency.rateDeleted'), type: 'success' });
        } catch (err) {
          console.error('Failed to delete exchange rate:', err);
          setToast({ message: t('currency.rateDeleteError'), type: 'error' });
        }
      },
    });
  };

  // ===== Filtering =====
  const filteredCurrencies = allCurrencies.filter(
    (c) =>
      c.code.toLowerCase().includes(currencySearch.toLowerCase()) ||
      c.name.toLowerCase().includes(currencySearch.toLowerCase())
  );

  const existingCurrencyIds = new Set(mosqueCurrencies.map((mc) => mc.currencyId));
  const availableToAdd = allCurrencies.filter(
    (c) =>
      !existingCurrencyIds.has(c.id) &&
      (c.code.toLowerCase().includes(addSearch.toLowerCase()) ||
        c.name.toLowerCase().includes(addSearch.toLowerCase()))
  );

  // Active mosque currencies for exchange rate dropdowns
  const activeMosqueCurrencies = mosqueCurrencies.filter((mc) => mc.isActive);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'mosque', label: t('currency.mosqueCurrencies') },
    { key: 'rates', label: t('currency.exchangeRates') },
    { key: 'available', label: t('currency.availableCurrencies') },
  ];

  return (
    <div className="p-8">
      {toast && (
        <ToastNotification
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-900">{t('currency.title')}</h1>
        <p className="text-stone-600 mt-1">{t('currency.description')}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-stone-200 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap ${
              activeTab === tab.key
                ? 'bg-emerald-50 text-emerald-700 border-b-2 border-emerald-700'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ====== Mosque Currencies Tab ====== */}
      {activeTab === 'mosque' && (
        <Card className="p-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
            <h2 className="text-lg font-semibold text-stone-900">{t('currency.mosqueCurrencies')}</h2>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 transition-colors text-sm w-full sm:w-auto"
            >
              {t('currency.addCurrency')}
            </button>
          </div>

          {mosqueLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-700" />
            </div>
          ) : mosqueCurrencies.length === 0 ? (
            <div className="text-center py-8 text-stone-500">
              <p>{t('currency.noCurrencies')}</p>
              <p className="text-sm mt-1">{t('currency.addFirst')}</p>
            </div>
          ) : (
            <>
              {/* Mobile: Card list */}
              <div className="md:hidden divide-y divide-stone-200">
                {mosqueCurrencies.map((mc) => (
                  <div key={mc.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-mono font-bold text-white flex-shrink-0 ${mc.isActive ? 'bg-emerald-600' : 'bg-stone-400'}`}>
                          {mc.currencySymbol || mc.currencyCode.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-semibold text-stone-900">{mc.currencyCode}</span>
                            {mc.isPrimary && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                {t('currency.primary')}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-stone-500 truncate">{mc.currencyName}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleToggleActive(mc)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 mt-1 ${
                          mc.isActive ? 'bg-emerald-600' : 'bg-stone-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                            mc.isActive ? 'translate-x-4.5' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </div>
                    <div className="flex items-center justify-between mt-2 ml-13">
                      {!mc.isPrimary ? (
                        <button
                          onClick={() => handleSetPrimary(mc.id)}
                          className="text-xs text-emerald-700 hover:text-emerald-900"
                        >
                          {t('currency.setAsPrimary')}
                        </button>
                      ) : (
                        <span />
                      )}
                      {!mc.isPrimary && (
                        <button
                          onClick={() => handleRemoveCurrency(mc.id)}
                          className="text-xs text-red-600 hover:text-red-800"
                        >
                          {t('currency.remove')}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop: Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-stone-200">
                      <th className="text-left py-3 px-4 text-stone-600 font-medium">{t('currency.code')}</th>
                      <th className="text-left py-3 px-4 text-stone-600 font-medium">{t('currency.name')}</th>
                      <th className="text-left py-3 px-4 text-stone-600 font-medium">{t('currency.symbol')}</th>
                      <th className="text-center py-3 px-4 text-stone-600 font-medium">{t('currency.primary')}</th>
                      <th className="text-center py-3 px-4 text-stone-600 font-medium">{t('currency.active')}</th>
                      <th className="text-right py-3 px-4 text-stone-600 font-medium">{t('currency.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mosqueCurrencies.map((mc) => (
                      <tr key={mc.id} className="border-b border-stone-100 hover:bg-stone-50">
                        <td className="py-3 px-4 font-mono font-medium text-stone-900">{mc.currencyCode}</td>
                        <td className="py-3 px-4 text-stone-700">{mc.currencyName}</td>
                        <td className="py-3 px-4 text-stone-700">{mc.currencySymbol}</td>
                        <td className="py-3 px-4 text-center">
                          {mc.isPrimary ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                              {t('currency.primary')}
                            </span>
                          ) : (
                            <button
                              onClick={() => handleSetPrimary(mc.id)}
                              className="text-xs text-stone-500 hover:text-emerald-700"
                            >
                              {t('currency.setAsPrimary')}
                            </button>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleToggleActive(mc)}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                              mc.isActive ? 'bg-emerald-600' : 'bg-stone-300'
                            }`}
                          >
                            <span
                              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                mc.isActive ? 'translate-x-4.5' : 'translate-x-0.5'
                              }`}
                            />
                          </button>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {!mc.isPrimary && (
                            <button
                              onClick={() => handleRemoveCurrency(mc.id)}
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              {t('currency.remove')}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Card>
      )}

      {/* ====== Exchange Rates Tab ====== */}
      {activeTab === 'rates' && (
        <Card className="p-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
            <h2 className="text-lg font-semibold text-stone-900">{t('currency.exchangeRates')}</h2>
            <button
              onClick={() => {
                setEditingRate(null);
                setRateForm({
                  fromCurrencyId: activeMosqueCurrencies[0]?.currencyId || 0,
                  toCurrencyId: activeMosqueCurrencies[1]?.currencyId || 0,
                  rate: 0,
                  effectiveDate: new Date().toISOString().split('T')[0],
                });
                setShowRateModal(true);
              }}
              className="px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 transition-colors text-sm w-full sm:w-auto"
              disabled={activeMosqueCurrencies.length < 2}
            >
              {t('currency.addRate')}
            </button>
          </div>

          {activeMosqueCurrencies.length < 2 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-sm text-amber-800">
              {t('currency.needTwoCurrencies')}
            </div>
          )}

          {ratesLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-700" />
            </div>
          ) : exchangeRates.length === 0 ? (
            <div className="text-center py-8 text-stone-500">
              <p>{t('currency.noRates')}</p>
            </div>
          ) : (
            <>
              {/* Mobile: Card list */}
              <div className="md:hidden divide-y divide-stone-200">
                {exchangeRates.map((rate) => (
                  <div key={rate.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-semibold text-stone-900">{rate.fromCurrencyCode}</span>
                          <svg className="w-4 h-4 text-stone-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                          <span className="font-mono font-semibold text-stone-900">{rate.toCurrencyCode}</span>
                        </div>
                        <p className="text-xs text-stone-400 mt-0.5">{rate.fromCurrencyName} → {rate.toCurrencyName}</p>
                      </div>
                      <span className="font-mono text-lg font-semibold text-emerald-700 flex-shrink-0">
                        {Number(rate.rate).toFixed(4)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-stone-500">{rate.effectiveDate}</span>
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleEditRate(rate)}
                          className="text-xs text-emerald-700 hover:text-emerald-900"
                        >
                          {t('currency.edit')}
                        </button>
                        <button
                          onClick={() => handleDeleteRate(rate.id)}
                          className="text-xs text-red-600 hover:text-red-800"
                        >
                          {t('currency.delete')}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop: Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-stone-200">
                      <th className="text-left py-3 px-4 text-stone-600 font-medium">{t('currency.from')}</th>
                      <th className="text-left py-3 px-4 text-stone-600 font-medium">{t('currency.to')}</th>
                      <th className="text-right py-3 px-4 text-stone-600 font-medium">{t('currency.rate')}</th>
                      <th className="text-left py-3 px-4 text-stone-600 font-medium">{t('currency.effectiveDate')}</th>
                      <th className="text-right py-3 px-4 text-stone-600 font-medium">{t('currency.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exchangeRates.map((rate) => (
                      <tr key={rate.id} className="border-b border-stone-100 hover:bg-stone-50">
                        <td className="py-3 px-4">
                          <span className="font-mono font-medium">{rate.fromCurrencyCode}</span>
                          <span className="text-stone-400 ml-1 text-xs">{rate.fromCurrencyName}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono font-medium">{rate.toCurrencyCode}</span>
                          <span className="text-stone-400 ml-1 text-xs">{rate.toCurrencyName}</span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono">{Number(rate.rate).toFixed(4)}</td>
                        <td className="py-3 px-4 text-stone-700">{rate.effectiveDate}</td>
                        <td className="py-3 px-4 text-right space-x-2">
                          <button
                            onClick={() => handleEditRate(rate)}
                            className="text-emerald-700 hover:text-emerald-900 text-sm"
                          >
                            {t('currency.edit')}
                          </button>
                          <button
                            onClick={() => handleDeleteRate(rate.id)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            {t('currency.delete')}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Card>
      )}

      {/* ====== Available Currencies Tab ====== */}
      {activeTab === 'available' && (
        <Card className="p-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
            <h2 className="text-lg font-semibold text-stone-900">{t('currency.availableCurrencies')}</h2>
            <div className="relative">
              <input
                type="text"
                value={currencySearch}
                onChange={(e) => setCurrencySearch(e.target.value)}
                placeholder={t('currency.searchCurrencies')}
                className="w-full sm:w-auto pl-9 pr-4 py-2 border border-stone-300 rounded-lg text-sm focus:ring-emerald-500 focus:border-emerald-500"
              />
              <svg className="w-4 h-4 absolute left-3 top-2.5 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {currenciesLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-700" />
            </div>
          ) : (
            <>
              {/* Mobile: Card list */}
              <div className="md:hidden divide-y divide-stone-200">
                {filteredCurrencies.map((c) => {
                  const isAdded = existingCurrencyIds.has(c.id);
                  return (
                    <div key={c.id} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center font-mono font-bold text-stone-600 flex-shrink-0">
                            {c.symbol || c.code.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-semibold text-stone-900">{c.code}</span>
                              {isAdded && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                                  {t('currency.added')}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-stone-500 truncate">{c.name}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <span className="text-xs text-stone-400">{c.decimalPlaces} {t('currency.decimals')}</span>
                          {!isAdded && (
                            <button
                              onClick={() => {
                                setConfirmAction({
                                  title: t('currency.addCurrency'),
                                  message: `${t('currency.confirmAddMessage')} ${c.code} (${c.name})?`,
                                  confirmLabel: t('currency.add'),
                                  variant: 'default' as const,
                                  onConfirm: async () => {
                                    setConfirmAction(null);
                                    try {
                                      const dto: MosqueCurrencyCreateDTO = {
                                        currencyId: c.id,
                                        isPrimary: mosqueCurrencies.length === 0,
                                        isActive: true,
                                      };
                                      await currencyApi.addMosqueCurrency(dto);
                                      await loadMosqueCurrencies();
                                      setToast({ message: t('currency.currencyAdded'), type: 'success' });
                                    } catch (err) {
                                      console.error('Failed to add currency:', err);
                                      setToast({ message: t('currency.addError'), type: 'error' });
                                    }
                                  },
                                });
                              }}
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-stone-100 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 transition-colors"
                            >
                              + {t('currency.addCurrency')}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <p className="px-4 py-3 text-xs text-stone-400">
                  {t('currency.totalCurrencies')}: {allCurrencies.length}
                </p>
              </div>

              {/* Desktop: Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-stone-200">
                      <th className="text-left py-3 px-4 text-stone-600 font-medium">{t('currency.code')}</th>
                      <th className="text-left py-3 px-4 text-stone-600 font-medium">{t('currency.name')}</th>
                      <th className="text-left py-3 px-4 text-stone-600 font-medium">{t('currency.symbol')}</th>
                      <th className="text-center py-3 px-4 text-stone-600 font-medium">{t('currency.decimals')}</th>
                      <th className="text-center py-3 px-4 text-stone-600 font-medium">{t('currency.status')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCurrencies.map((c) => (
                      <tr key={c.id} className="border-b border-stone-100 hover:bg-stone-50">
                        <td className="py-3 px-4 font-mono font-medium text-stone-900">{c.code}</td>
                        <td className="py-3 px-4 text-stone-700">{c.name}</td>
                        <td className="py-3 px-4 text-stone-700">{c.symbol || '—'}</td>
                        <td className="py-3 px-4 text-center text-stone-700">{c.decimalPlaces}</td>
                        <td className="py-3 px-4 text-center">
                          {existingCurrencyIds.has(c.id) ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                              {t('currency.added')}
                            </span>
                          ) : (
                            <button
                              onClick={() => {
                                setConfirmAction({
                                  title: t('currency.addCurrency'),
                                  message: `${t('currency.confirmAddMessage')} ${c.code} (${c.name})?`,
                                  confirmLabel: t('currency.add'),
                                  variant: 'default' as const,
                                  onConfirm: async () => {
                                    setConfirmAction(null);
                                    try {
                                      const dto: MosqueCurrencyCreateDTO = {
                                        currencyId: c.id,
                                        isPrimary: mosqueCurrencies.length === 0,
                                        isActive: true,
                                      };
                                      await currencyApi.addMosqueCurrency(dto);
                                      await loadMosqueCurrencies();
                                      setToast({ message: t('currency.currencyAdded'), type: 'success' });
                                    } catch (err) {
                                      console.error('Failed to add currency:', err);
                                      setToast({ message: t('currency.addError'), type: 'error' });
                                    }
                                  },
                                });
                              }}
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-stone-100 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 transition-colors cursor-pointer"
                            >
                              + {t('currency.addCurrency')}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-3 text-xs text-stone-400">
                  {t('currency.totalCurrencies')}: {allCurrencies.length}
                </p>
              </div>
            </>
          )}
        </Card>
      )}

      {/* ====== Add Currency Modal ====== */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
            <div className="p-6 border-b border-stone-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-stone-900">{t('currency.addCurrency')}</h3>
                <button onClick={() => { setShowAddModal(false); setAddSearch(''); }} className="text-stone-400 hover:text-stone-700">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="mt-3">
                <input
                  type="text"
                  value={addSearch}
                  onChange={(e) => setAddSearch(e.target.value)}
                  placeholder={t('currency.searchToAdd')}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-emerald-500 focus:border-emerald-500"
                  autoFocus
                />
              </div>
            </div>
            <div className="overflow-y-auto flex-1 p-2">
              {availableToAdd.length === 0 ? (
                <p className="text-center py-4 text-stone-500 text-sm">{t('currency.noResults')}</p>
              ) : (
                <div className="space-y-1">
                  {availableToAdd.slice(0, 20).map((c) => (
                    <button
                      key={c.id}
                      onClick={() => handleAddCurrency(c.id)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-emerald-50 transition-colors text-left"
                    >
                      <div>
                        <span className="font-mono font-medium text-stone-900">{c.code}</span>
                        <span className="text-stone-600 ml-2">{c.name}</span>
                      </div>
                      <span className="text-stone-400">{c.symbol}</span>
                    </button>
                  ))}
                  {availableToAdd.length > 20 && (
                    <p className="text-center text-xs text-stone-400 py-2">
                      {availableToAdd.length} {t('currency.moreAvailable')}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ====== Exchange Rate Modal ====== */}
      {showRateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="p-6 border-b border-stone-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-stone-900">
                  {editingRate ? t('currency.editRate') : t('currency.addRate')}
                </h3>
                <button onClick={() => { setShowRateModal(false); setEditingRate(null); }} className="text-stone-400 hover:text-stone-700">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">{t('currency.from')}</label>
                <select
                  value={rateForm.fromCurrencyId}
                  onChange={(e) => setRateForm({ ...rateForm, fromCurrencyId: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value={0}>{t('currency.selectCurrency')}</option>
                  {activeMosqueCurrencies.map((mc) => (
                    <option key={mc.currencyId} value={mc.currencyId}>
                      {mc.currencyCode} - {mc.currencyName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">{t('currency.to')}</label>
                <select
                  value={rateForm.toCurrencyId}
                  onChange={(e) => setRateForm({ ...rateForm, toCurrencyId: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value={0}>{t('currency.selectCurrency')}</option>
                  {activeMosqueCurrencies
                    .filter((mc) => mc.currencyId !== rateForm.fromCurrencyId)
                    .map((mc) => (
                      <option key={mc.currencyId} value={mc.currencyId}>
                        {mc.currencyCode} - {mc.currencyName}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">{t('currency.rate')}</label>
                <input
                  type="number"
                  step="0.0001"
                  value={rateForm.rate || ''}
                  onChange={(e) => setRateForm({ ...rateForm, rate: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="1.0000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">{t('currency.effectiveDate')}</label>
                <input
                  type="date"
                  value={rateForm.effectiveDate}
                  onChange={(e) => setRateForm({ ...rateForm, effectiveDate: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>
            <div className="p-6 border-t border-stone-200 flex justify-end gap-3">
              <button
                onClick={() => { setShowRateModal(false); setEditingRate(null); }}
                className="px-4 py-2 text-sm border border-stone-300 rounded-lg hover:bg-stone-50"
              >
                {t('currency.cancel')}
              </button>
              <button
                onClick={handleSaveRate}
                disabled={!rateForm.fromCurrencyId || !rateForm.toCurrencyId || !rateForm.rate}
                className="px-4 py-2 text-sm bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingRate ? t('currency.save') : t('currency.add')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmAction !== null}
        title={confirmAction?.title ?? ''}
        message={confirmAction?.message ?? ''}
        confirmLabel={confirmAction?.confirmLabel ?? t('currency.delete')}
        cancelLabel={t('currency.cancel')}
        variant={confirmAction?.variant ?? 'danger'}
        onConfirm={() => confirmAction?.onConfirm()}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}
