'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import Card from '@/components/Card';
import {
  ContributionType,
  ContributionTypeCreate,
  ContributionTypeTranslation,
  ContributionObligation,
  ContributionObligationCreate,
  MemberPayment,
  MemberPaymentCreate,
  MemberContributionExemption,
  MemberContributionExemptionCreate,
  contributionTypeApi,
  contributionObligationApi,
  memberPaymentApi,
  exemptionApi,
} from '@/lib/contributionApi';
import { currencyApi, MosqueCurrencyDTO } from '@/lib/currencyApi';
import { memberApi } from '@/lib/api';
import ToastNotification from '@/components/ToastNotification';

type Tab = 'types' | 'obligations' | 'payments' | 'exemptions';

export default function ContributionsPage() {
  const { t, language: locale } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>('types');

  // ===== Types State =====
  const [types, setTypes] = useState<ContributionType[]>([]);
  const [typesLoading, setTypesLoading] = useState(true);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [editingType, setEditingType] = useState<ContributionType | null>(null);

  // ===== Obligations State =====
  const [obligations, setObligations] = useState<ContributionObligation[]>([]);
  const [obligationsLoading, setObligationsLoading] = useState(false);
  const [showObligationModal, setShowObligationModal] = useState(false);
  const [editingObligation, setEditingObligation] = useState<ContributionObligation | null>(null);

  // ===== Payments State =====
  const [payments, setPayments] = useState<MemberPayment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState<MemberPayment | null>(null);

  // ===== Exemptions State =====
  const [exemptions, setExemptions] = useState<MemberContributionExemption[]>([]);
  const [exemptionsLoading, setExemptionsLoading] = useState(false);
  const [showExemptionModal, setShowExemptionModal] = useState(false);
  const [editingExemption, setEditingExemption] = useState<MemberContributionExemption | null>(null);

  // ===== Mosque currencies =====
  const [mosqueCurrencies, setMosqueCurrencies] = useState<MosqueCurrencyDTO[]>([]);

  // ===== Person search for payments =====
  const [personSearch, setPersonSearch] = useState('');
  const [personResults, setPersonResults] = useState<any[]>([]);
  const [selectedPerson, setSelectedPerson] = useState<any>(null);

  // ===== Toast =====
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Load types and currencies on mount
  useEffect(() => {
    loadTypes();
    loadMosqueCurrencies();
  }, []);

  // Load tab-specific data when tab changes
  useEffect(() => {
    if (activeTab === 'obligations') loadObligations();
    if (activeTab === 'payments') loadPayments();
    if (activeTab === 'exemptions') loadExemptions();
  }, [activeTab]);

  // ===== Data Loading =====
  const loadTypes = async () => {
    setTypesLoading(true);
    try {
      const data = await contributionTypeApi.getAll();
      setTypes(data);
    } catch (err) {
      console.error('Failed to load contribution types:', err);
    } finally {
      setTypesLoading(false);
    }
  };

  const loadObligations = async () => {
    setObligationsLoading(true);
    try {
      const data = await contributionObligationApi.getAll();
      setObligations(data);
    } catch (err) {
      console.error('Failed to load obligations:', err);
    } finally {
      setObligationsLoading(false);
    }
  };

  const loadPayments = async () => {
    setPaymentsLoading(true);
    try {
      const data = await memberPaymentApi.getAll();
      setPayments(data);
    } catch (err) {
      console.error('Failed to load payments:', err);
    } finally {
      setPaymentsLoading(false);
    }
  };

  const loadMosqueCurrencies = async () => {
    try {
      const data = await currencyApi.getActiveMosqueCurrencies();
      setMosqueCurrencies(data);
    } catch (err) {
      console.error('Failed to load mosque currencies:', err);
    }
  };

  // ===== Helper: get translated name for a type =====
  const getTypeName = (type: ContributionType): string => {
    if (!type.translations || type.translations.length === 0) return type.code;
    const trans = type.translations.find(t => t.locale === locale)
      || type.translations.find(t => t.locale === 'en')
      || type.translations[0];
    return trans?.name || type.code;
  };

  const getTypeNameByCode = (code: string): string => {
    const type = types.find(t => t.code === code);
    return type ? getTypeName(type) : code;
  };

  // ===== Type CRUD =====
  const handleSaveType = async (data: ContributionTypeCreate) => {
    try {
      if (editingType) {
        await contributionTypeApi.update(editingType.id, data);
      } else {
        await contributionTypeApi.create(data);
      }
      setShowTypeModal(false);
      setEditingType(null);
      loadTypes();
    } catch (err) {
      console.error('Failed to save type:', err);
    }
  };

  const handleDeactivateType = async (id: number) => {
    if (!confirm(t('contributions.confirm_deactivate'))) return;
    try {
      await contributionTypeApi.deactivate(id);
      loadTypes();
    } catch (err) {
      console.error('Failed to deactivate type:', err);
    }
  };

  const handleActivateType = async (id: number) => {
    try {
      await contributionTypeApi.activate(id);
      loadTypes();
    } catch (err) {
      console.error('Failed to activate type:', err);
    }
  };

  // ===== Obligation CRUD =====
  const handleSaveObligation = async (data: ContributionObligationCreate): Promise<string | null> => {
    try {
      if (editingObligation) {
        await contributionObligationApi.update(editingObligation.id!, data);
      } else {
        await contributionObligationApi.create(data);
      }
      setShowObligationModal(false);
      setEditingObligation(null);
      loadObligations();
      setToast({ message: 'Saved successfully', type: 'success' });
      return null;
    } catch (err: any) {
      console.warn('Failed to save obligation:', err.message);
      return err.message || 'Failed to save obligation';
    }
  };

  const handleDeleteObligation = async (id: number) => {
    if (!confirm(t('contributions.confirm_delete'))) return;
    try {
      await contributionObligationApi.delete(id);
      loadObligations();
    } catch (err) {
      console.error('Failed to delete obligation:', err);
    }
  };

  // ===== Payment CRUD =====
  const handleSavePayment = async (data: MemberPaymentCreate): Promise<string | null> => {
    try {
      if (editingPayment) {
        await memberPaymentApi.update(editingPayment.id, data);
      } else {
        await memberPaymentApi.create(data);
      }
      setShowPaymentModal(false);
      setEditingPayment(null);
      setSelectedPerson(null);
      setPersonSearch('');
      loadPayments();
      setToast({ message: 'Saved successfully', type: 'success' });
      return null;
    } catch (err: any) {
      console.warn('Failed to save payment:', err.message);
      return err.message || 'Failed to save payment';
    }
  };

  const handleDeletePayment = async (id: number) => {
    if (!confirm(t('contributions.confirm_delete'))) return;
    try {
      await memberPaymentApi.delete(id);
      loadPayments();
    } catch (err) {
      console.error('Failed to delete payment:', err);
    }
  };

  // ===== Exemption CRUD =====
  const loadExemptions = async () => {
    setExemptionsLoading(true);
    try {
      const data = await exemptionApi.getAll();
      setExemptions(data);
    } catch (err) {
      console.error('Failed to load exemptions:', err);
    } finally {
      setExemptionsLoading(false);
    }
  };

  const handleSaveExemption = async (data: MemberContributionExemptionCreate): Promise<string | null> => {
    try {
      if (editingExemption) {
        await exemptionApi.update(editingExemption.id, data);
      } else {
        await exemptionApi.create(data);
      }
      setShowExemptionModal(false);
      setEditingExemption(null);
      setSelectedPerson(null);
      setPersonSearch('');
      loadExemptions();
      setToast({ message: 'Saved successfully', type: 'success' });
      return null;
    } catch (err: any) {
      console.warn('Failed to save exemption:', err.message);
      return err.message || 'Failed to save exemption';
    }
  };

  const handleDeleteExemption = async (id: number) => {
    if (!confirm(t('contributions.confirm_delete'))) return;
    try {
      await exemptionApi.delete(id);
      loadExemptions();
    } catch (err) {
      console.error('Failed to delete exemption:', err);
    }
  };

  // ===== Person search =====
  const searchPersons = async (query: string) => {
    setPersonSearch(query);
    if (query.length < 2) {
      setPersonResults([]);
      return;
    }
    try {
      const results = await memberApi.search(query) as any[];
      setPersonResults(results);
    } catch (err) {
      console.error('Failed to search persons:', err);
    }
  };

  // ===== Format helpers =====
  const formatCurrency = (amount: number, currencyCode?: string) => {
    if (currencyCode) {
      return new Intl.NumberFormat(locale === 'nl' ? 'nl-NL' : 'en-US', {
        style: 'currency',
        currency: currencyCode,
      }).format(amount);
    }
    return new Intl.NumberFormat(locale === 'nl' ? 'nl-NL' : 'en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString(locale === 'nl' ? 'nl-NL' : 'en-US');
  };

  // Local date helper — avoids timezone issues with toISOString() returning UTC date
  const localToday = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  };

  // ===== Tab buttons =====
  const tabs: { key: Tab; label: string }[] = [
    { key: 'types', label: t('contributions.types') },
    { key: 'obligations', label: t('contributions.obligations') },
    { key: 'payments', label: t('contributions.payments') },
    { key: 'exemptions', label: t('contributions.exemptions') },
  ];

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Toast */}
      {toast && (
        <ToastNotification
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-stone-900">{t('contributions.title')}</h1>
          <p className="text-stone-500 mt-1">{t('contributions.subtitle')}</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
        <Card>
          <div className="p-6">
            <p className="text-sm text-stone-500">{t('contributions.total_types')}</p>
            <p className="text-2xl font-bold text-emerald-700">{types.length}</p>
            <p className="text-xs text-stone-400 mt-1">
              {types.filter(t => t.isActive).length} {t('contributions.active')}
            </p>
          </div>
        </Card>
        <Card>
          <div className="p-6">
            <p className="text-sm text-stone-500">{t('contributions.required_types')}</p>
            <p className="text-2xl font-bold text-amber-600">
              {types.filter(t => t.isRequired).length}
            </p>
          </div>
        </Card>
        <Card>
          <div className="p-6">
            <p className="text-sm text-stone-500">{t('contributions.total_payments')}</p>
            <p className="text-2xl font-bold text-blue-600">{payments.length}</p>
          </div>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-stone-200">
        <div className="flex space-x-2 sm:space-x-4 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-stone-500 hover:text-stone-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'types' && (
        <TypesTab
          types={types}
          loading={typesLoading}
          getTypeName={getTypeName}
          onAdd={() => { setEditingType(null); setShowTypeModal(true); }}
          onEdit={(type) => { setEditingType(type); setShowTypeModal(true); }}
          onDeactivate={handleDeactivateType}
          onActivate={handleActivateType}
          t={t}
          locale={locale}
        />
      )}

      {activeTab === 'obligations' && (
        <ObligationsTab
          obligations={obligations}
          loading={obligationsLoading}
          types={types}
          getTypeNameByCode={getTypeNameByCode}
          onAdd={() => { setEditingObligation(null); setShowObligationModal(true); }}
          onEdit={(obl) => { setEditingObligation(obl); setShowObligationModal(true); }}
          onDelete={handleDeleteObligation}
          formatCurrency={formatCurrency}
          formatDate={formatDate}
          mosqueCurrencies={mosqueCurrencies}
          t={t}
        />
      )}

      {activeTab === 'payments' && (
        <PaymentsTab
          payments={payments}
          loading={paymentsLoading}
          onAdd={() => { setEditingPayment(null); setShowPaymentModal(true); }}
          onEdit={(p) => { setEditingPayment(p); setShowPaymentModal(true); }}
          onDelete={handleDeletePayment}
          getTypeNameByCode={getTypeNameByCode}
          formatCurrency={formatCurrency}
          formatDate={formatDate}
          mosqueCurrencies={mosqueCurrencies}
          t={t}
        />
      )}

      {activeTab === 'exemptions' && (
        <ExemptionsTab
          exemptions={exemptions}
          loading={exemptionsLoading}
          onAdd={() => { setEditingExemption(null); setShowExemptionModal(true); }}
          onEdit={(e) => { setEditingExemption(e); setShowExemptionModal(true); }}
          onDelete={handleDeleteExemption}
          getTypeNameByCode={getTypeNameByCode}
          formatDate={formatDate}
          t={t}
        />
      )}

      {/* Type Modal */}
      {showTypeModal && (
        <TypeModal
          type={editingType}
          onSave={handleSaveType}
          onClose={() => { setShowTypeModal(false); setEditingType(null); }}
          t={t}
          locale={locale}
        />
      )}

      {/* Obligation Modal */}
      {showObligationModal && (
        <ObligationModal
          obligation={editingObligation}
          types={types.filter(t => t.isRequired && t.isActive)}
          mosqueCurrencies={mosqueCurrencies}
          onSave={handleSaveObligation}
          onClose={() => { setShowObligationModal(false); setEditingObligation(null); }}
          t={t}
        />
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <PaymentModal
          payment={editingPayment}
          types={types.filter(t => t.isActive)}
          mosqueCurrencies={mosqueCurrencies}
          onSave={handleSavePayment}
          onClose={() => { setShowPaymentModal(false); setEditingPayment(null); setSelectedPerson(null); setPersonSearch(''); }}
          personSearch={personSearch}
          personResults={personResults}
          selectedPerson={selectedPerson}
          onSearchPersons={searchPersons}
          onSelectPerson={setSelectedPerson}
          getTypeName={(type: ContributionType) => getTypeName(type)}
          t={t}
        />
      )}

      {/* Exemption Modal */}
      {showExemptionModal && (
        <ExemptionModal
          exemption={editingExemption}
          types={types.filter(t => t.isActive)}
          onSave={handleSaveExemption}
          onClose={() => { setShowExemptionModal(false); setEditingExemption(null); setSelectedPerson(null); setPersonSearch(''); }}
          personSearch={personSearch}
          personResults={personResults}
          selectedPerson={selectedPerson}
          onSearchPersons={searchPersons}
          onSelectPerson={setSelectedPerson}
          getTypeName={(type: ContributionType) => getTypeName(type)}
          t={t}
        />
      )}
    </div>
  );
}

// ===== Types Tab Component =====
function TypesTab({ types, loading, getTypeName, onAdd, onEdit, onDeactivate, onActivate, t, locale }: {
  types: ContributionType[];
  loading: boolean;
  getTypeName: (type: ContributionType) => string;
  onAdd: () => void;
  onEdit: (type: ContributionType) => void;
  onDeactivate: (id: number) => void;
  onActivate: (id: number) => void;
  t: (key: string) => string;
  locale: string;
}) {
  return (
    <Card>
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-stone-800">{t('contributions.types')}</h2>
          <button
            onClick={onAdd}
            className="px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 transition-colors text-sm"
          >
            + {t('contributions.add_type')}
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-stone-400">{t('common.loading')}</div>
        ) : types.length === 0 ? (
          <div className="text-center py-8 text-stone-400">{t('contributions.no_types')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="border-b border-stone-200 text-left text-stone-500">
                  <th className="pb-3 pr-4">{t('contributions.code')}</th>
                  <th className="pb-3 pr-4">{t('contributions.name')}</th>
                  <th className="pb-3 pr-4">{t('contributions.required')}</th>
                  <th className="pb-3 pr-4">{t('contributions.status')}</th>
                  <th className="pb-3 pr-4">{t('contributions.obligations')}</th>
                  <th className="pb-3">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {types.map((type) => (
                  <tr key={type.id} className="border-b border-stone-100 hover:bg-stone-50">
                    <td className="py-3 pr-4 font-mono text-xs">{type.code}</td>
                    <td className="py-3 pr-4">{getTypeName(type)}</td>
                    <td className="py-3 pr-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        type.isRequired
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-stone-100 text-stone-500'
                      }`}>
                        {type.isRequired ? t('contributions.required') : t('contributions.optional')}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        type.isActive
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-red-100 text-red-600'
                      }`}>
                        {type.isActive ? t('contributions.active') : t('contributions.inactive')}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-xs text-stone-500">
                      {type.obligations && type.obligations.length > 0
                        ? `${type.obligations.length} ${type.obligations.length === 1 ? t('contributions.obligation') : t('contributions.obligations')}`
                        : '-'}
                    </td>
                    <td className="py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => onEdit(type)}
                          className="text-emerald-600 hover:text-emerald-800 text-xs"
                        >
                          {t('common.edit')}
                        </button>
                        {type.isActive ? (
                          <button
                            onClick={() => onDeactivate(type.id)}
                            className="text-red-500 hover:text-red-700 text-xs"
                          >
                            {t('contributions.deactivate')}
                          </button>
                        ) : (
                          <button
                            onClick={() => onActivate(type.id)}
                            className="text-blue-500 hover:text-blue-700 text-xs"
                          >
                            {t('contributions.activate')}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Card>
  );
}

// ===== Obligations Tab Component =====
function ObligationsTab({ obligations, loading, types, getTypeNameByCode, onAdd, onEdit, onDelete, formatCurrency, formatDate, mosqueCurrencies, t }: {
  obligations: ContributionObligation[];
  loading: boolean;
  types: ContributionType[];
  getTypeNameByCode: (code: string) => string;
  onAdd: () => void;
  onEdit: (obl: ContributionObligation) => void;
  onDelete: (id: number) => void;
  formatCurrency: (amount: number, currencyCode?: string) => string;
  formatDate: (date: string) => string;
  mosqueCurrencies: MosqueCurrencyDTO[];
  t: (key: string) => string;
}) {
  return (
    <Card>
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-stone-800">{t('contributions.obligations')}</h2>
          <button
            onClick={onAdd}
            className="px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 transition-colors text-sm"
          >
            + {t('contributions.add_obligation')}
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-stone-400">{t('common.loading')}</div>
        ) : obligations.length === 0 ? (
          <div className="text-center py-8 text-stone-400">{t('contributions.no_obligations')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[750px]">
              <thead>
                <tr className="border-b border-stone-200 text-left text-stone-500">
                  <th className="pb-3 pr-4">{t('contributions.type')}</th>
                  <th className="pb-3 pr-4">{t('contributions.amount')}</th>
                  <th className="pb-3 pr-4">{t('contributions.currency')}</th>
                  <th className="pb-3 pr-4">{t('contributions.frequency')}</th>
                  <th className="pb-3 pr-4">{t('contributions.start_date')}</th>
                  <th className="pb-3">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {obligations.map((obl) => (
                  <tr key={obl.id} className="border-b border-stone-100 hover:bg-stone-50">
                    <td className="py-3 pr-4">{obl.contributionTypeCode ? getTypeNameByCode(obl.contributionTypeCode) : '-'}</td>
                    <td className="py-3 pr-4 font-medium">{formatCurrency(obl.amount, obl.currencyCode)}</td>
                    <td className="py-3 pr-4 text-xs text-stone-500">{obl.currencyCode || '-'}</td>
                    <td className="py-3 pr-4">
                      <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700">
                        {t(`contributions.freq_${obl.frequency.toLowerCase()}`)}
                      </span>
                    </td>
                    <td className="py-3 pr-4">{formatDate(obl.startDate)}</td>
                    <td className="py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => onEdit(obl)}
                          className="text-emerald-600 hover:text-emerald-800 text-xs"
                        >
                          {t('common.edit')}
                        </button>
                        <button
                          onClick={() => onDelete(obl.id!)}
                          className="text-red-500 hover:text-red-700 text-xs"
                        >
                          {t('common.delete')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Card>
  );
}

// ===== Payments Tab Component =====
function PaymentsTab({ payments, loading, onAdd, onEdit, onDelete, getTypeNameByCode, formatCurrency, formatDate, mosqueCurrencies, t }: {
  payments: MemberPayment[];
  loading: boolean;
  onAdd: () => void;
  onEdit: (p: MemberPayment) => void;
  onDelete: (id: number) => void;
  getTypeNameByCode: (code: string) => string;
  formatCurrency: (amount: number, currencyCode?: string) => string;
  formatDate: (date: string) => string;
  mosqueCurrencies: MosqueCurrencyDTO[];
  t: (key: string) => string;
}) {
  return (
    <Card>
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-stone-800">{t('contributions.payments')}</h2>
          <button
            onClick={onAdd}
            className="px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 transition-colors text-sm"
          >
            + {t('contributions.add_payment')}
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-stone-400">{t('common.loading')}</div>
        ) : payments.length === 0 ? (
          <div className="text-center py-8 text-stone-400">{t('contributions.no_payments')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="border-b border-stone-200 text-left text-stone-500">
                  <th className="pb-3 pr-4">{t('contributions.person')}</th>
                  <th className="pb-3 pr-4">{t('contributions.type')}</th>
                  <th className="pb-3 pr-4">{t('contributions.amount')}</th>
                  <th className="pb-3 pr-4">{t('contributions.currency')}</th>
                  <th className="pb-3 pr-4">{t('contributions.period_range')}</th>
                  <th className="pb-3 pr-4">{t('contributions.payment_date')}</th>
                  <th className="pb-3 pr-4">{t('contributions.reference')}</th>
                  <th className="pb-3">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id} className="border-b border-stone-100 hover:bg-stone-50">
                    <td className="py-3 pr-4">{payment.personName}</td>
                    <td className="py-3 pr-4">{getTypeNameByCode(payment.contributionTypeCode)}</td>
                    <td className="py-3 pr-4 font-medium">{formatCurrency(payment.amount, payment.currencyCode)}</td>
                    <td className="py-3 pr-4 text-xs text-stone-500">{payment.currencyCode || '-'}</td>
                    <td className="py-3 pr-4 text-xs text-stone-500">
                      {payment.periodFrom && payment.periodTo
                        ? `${formatDate(payment.periodFrom)} — ${formatDate(payment.periodTo)}`
                        : '-'}
                    </td>
                    <td className="py-3 pr-4">{formatDate(payment.paymentDate)}</td>
                    <td className="py-3 pr-4 text-xs text-stone-500">{payment.reference || '-'}</td>
                    <td className="py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => onEdit(payment)}
                          className="text-emerald-600 hover:text-emerald-800 text-xs"
                        >
                          {t('common.edit')}
                        </button>
                        <button
                          onClick={() => onDelete(payment.id)}
                          className="text-red-500 hover:text-red-700 text-xs"
                        >
                          {t('common.delete')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Card>
  );
}

// ===== Exemptions Tab Component =====
function ExemptionsTab({ exemptions, loading, onAdd, onEdit, onDelete, getTypeNameByCode, formatDate, t }: {
  exemptions: MemberContributionExemption[];
  loading: boolean;
  onAdd: () => void;
  onEdit: (e: MemberContributionExemption) => void;
  onDelete: (id: number) => void;
  getTypeNameByCode: (code: string) => string;
  formatDate: (date: string) => string;
  t: (key: string) => string;
}) {
  const formatExemptionType = (type: string, amount?: number) => {
    switch (type) {
      case 'FULL': return t('contributions.exemption_full');
      case 'FIXED_AMOUNT': return `${t('contributions.exemption_fixed')}: ${amount?.toFixed(2) ?? '-'}`;
      case 'DISCOUNT_AMOUNT': return `${t('contributions.exemption_discount_amount')}: -${amount?.toFixed(2) ?? '-'}`;
      case 'DISCOUNT_PERCENTAGE': return `${t('contributions.exemption_discount_pct')}: -${amount ?? '-'}%`;
      default: return type;
    }
  };

  return (
    <Card>
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-stone-800">{t('contributions.exemptions')}</h2>
          <button
            onClick={onAdd}
            className="px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 transition-colors text-sm"
          >
            + {t('contributions.add_exemption')}
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-stone-400">{t('common.loading')}</div>
        ) : exemptions.length === 0 ? (
          <div className="text-center py-8 text-stone-400">{t('contributions.no_exemptions')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="border-b border-stone-200 text-left text-stone-500">
                  <th className="pb-3 pr-4">{t('contributions.person')}</th>
                  <th className="pb-3 pr-4">{t('contributions.type')}</th>
                  <th className="pb-3 pr-4">{t('contributions.exemption_type')}</th>
                  <th className="pb-3 pr-4">{t('contributions.reason')}</th>
                  <th className="pb-3 pr-4">{t('contributions.start_date')}</th>
                  <th className="pb-3 pr-4">{t('contributions.end_date')}</th>
                  <th className="pb-3 pr-4">{t('contributions.status')}</th>
                  <th className="pb-3">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {exemptions.map((ex) => (
                  <tr key={ex.id} className="border-b border-stone-100 hover:bg-stone-50">
                    <td className="py-3 pr-4">{ex.personName}</td>
                    <td className="py-3 pr-4">{getTypeNameByCode(ex.contributionTypeCode)}</td>
                    <td className="py-3 pr-4 text-xs">{formatExemptionType(ex.exemptionType, ex.amount)}</td>
                    <td className="py-3 pr-4 text-xs text-stone-500 max-w-[150px] truncate">{ex.reason || '-'}</td>
                    <td className="py-3 pr-4 text-xs">{formatDate(ex.startDate)}</td>
                    <td className="py-3 pr-4 text-xs">{ex.endDate ? formatDate(ex.endDate) : t('contributions.ongoing')}</td>
                    <td className="py-3 pr-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        ex.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-500'
                      }`}>
                        {ex.isActive ? t('contributions.active') : t('contributions.inactive')}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => onEdit(ex)}
                          className="text-emerald-600 hover:text-emerald-800 text-xs"
                        >
                          {t('common.edit')}
                        </button>
                        <button
                          onClick={() => onDelete(ex.id)}
                          className="text-red-500 hover:text-red-700 text-xs"
                        >
                          {t('common.delete')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Card>
  );
}

// ===== Type Modal =====
function TypeModal({ type, onSave, onClose, t, locale }: {
  type: ContributionType | null;
  onSave: (data: ContributionTypeCreate) => void;
  onClose: () => void;
  t: (key: string) => string;
  locale: string;
}) {
  const [code, setCode] = useState(type?.code || '');
  const [isRequired, setIsRequired] = useState(type?.isRequired || false);
  const [isActive, setIsActive] = useState(type?.isActive ?? true);
  const [nameEn, setNameEn] = useState('');
  const [descEn, setDescEn] = useState('');
  const [nameNl, setNameNl] = useState('');
  const [descNl, setDescNl] = useState('');

  useEffect(() => {
    if (type?.translations) {
      const en = type.translations.find(t => t.locale === 'en');
      const nl = type.translations.find(t => t.locale === 'nl');
      if (en) { setNameEn(en.name); setDescEn(en.description || ''); }
      if (nl) { setNameNl(nl.name); setDescNl(nl.description || ''); }
    }
  }, [type]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const translations: ContributionTypeTranslation[] = [];
    if (nameEn) translations.push({ locale: 'en', name: nameEn, description: descEn || undefined });
    if (nameNl) translations.push({ locale: 'nl', name: nameNl, description: descNl || undefined });

    onSave({ code, isRequired, isActive, translations });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-bold text-stone-900 mb-4">
            {type ? t('contributions.edit_type') : t('contributions.add_type')}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">{t('contributions.code')}</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                required
                placeholder="e.g. MONTHLY_FEE"
              />
            </div>

            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={isRequired}
                  onChange={(e) => setIsRequired(e.target.checked)}
                  className="rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
                />
                {t('contributions.required')}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
                />
                {t('contributions.active')}
              </label>
            </div>

            {/* English Translation */}
            <fieldset className="border border-stone-200 rounded-lg p-3">
              <legend className="text-xs font-medium text-stone-500 px-1">English</legend>
              <div className="space-y-2">
                <input
                  type="text"
                  value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder={t('contributions.name')}
                />
                <textarea
                  value={descEn}
                  onChange={(e) => setDescEn(e.target.value)}
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder={t('contributions.description')}
                  rows={2}
                />
              </div>
            </fieldset>

            {/* Dutch Translation */}
            <fieldset className="border border-stone-200 rounded-lg p-3">
              <legend className="text-xs font-medium text-stone-500 px-1">Nederlands</legend>
              <div className="space-y-2">
                <input
                  type="text"
                  value={nameNl}
                  onChange={(e) => setNameNl(e.target.value)}
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder={t('contributions.name')}
                />
                <textarea
                  value={descNl}
                  onChange={(e) => setDescNl(e.target.value)}
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder={t('contributions.description')}
                  rows={2}
                />
              </div>
            </fieldset>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-lg text-sm"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 text-sm"
              >
                {t('common.save')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ===== Obligation Modal =====
function ObligationModal({ obligation, types, mosqueCurrencies, onSave, onClose, t }: {
  obligation: ContributionObligation | null;
  types: ContributionType[];
  mosqueCurrencies: MosqueCurrencyDTO[];
  onSave: (data: ContributionObligationCreate) => Promise<string | null>;
  onClose: () => void;
  t: (key: string) => string;
}) {
  const [typeId, setTypeId] = useState(obligation?.contributionTypeId || 0);
  const [amount, setAmount] = useState(obligation?.amount?.toString() || '');
  const [currencyId, setCurrencyId] = useState<number | undefined>(obligation?.currencyId || undefined);
  const [frequency, setFrequency] = useState(obligation?.frequency || 'MONTHLY');
  const [startDate, setStartDate] = useState(obligation?.startDate || '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const err = await onSave({
      contributionTypeId: typeId,
      amount: parseFloat(amount),
      frequency,
      startDate,
      currencyId: currencyId || undefined,
    });
    setSaving(false);
    if (err) setError(err);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">        <div className="p-6">
          <h2 className="text-xl font-bold text-stone-900 mb-4">
            {obligation ? t('contributions.edit_obligation') : t('contributions.add_obligation')}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">{t('contributions.type')}</label>
              <select
                value={typeId}
                onChange={(e) => setTypeId(Number(e.target.value))}
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                required
              >
                <option value={0} disabled>{t('contributions.select_type')}</option>
                {types.map((type) => (
                  <option key={type.id} value={type.id}>{type.code}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">{t('contributions.amount')}</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">{t('contributions.currency')}</label>
              {mosqueCurrencies.length === 0 ? (
                <p className="text-xs text-amber-600">{t('contributions.no_currencies')}</p>
              ) : (
                <select
                  value={currencyId || ''}
                  onChange={(e) => setCurrencyId(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="">{t('contributions.select_currency')}</option>
                  {mosqueCurrencies.map((mc) => (
                    <option key={mc.currencyId} value={mc.currencyId}>
                      {mc.currencyCode} — {mc.currencyName} ({mc.currencySymbol})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">{t('contributions.frequency')}</label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as 'MONTHLY' | 'YEARLY')}
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="MONTHLY">{t('contributions.freq_monthly')}</option>
                <option value="YEARLY">{t('contributions.freq_yearly')}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">{t('contributions.start_date')}</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                required
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={onClose} className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-lg text-sm">
                {t('common.cancel')}
              </button>
              <button type="submit" disabled={saving} className="px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 text-sm disabled:opacity-50">
                {saving ? '...' : t('common.save')}
              </button>
            </div>

            {error && (
              <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

// ===== Payment Modal =====
function PaymentModal({ payment, types, mosqueCurrencies, onSave, onClose, personSearch, personResults, selectedPerson, onSearchPersons, onSelectPerson, getTypeName, t }: {
  payment: MemberPayment | null;
  types: ContributionType[];
  mosqueCurrencies: MosqueCurrencyDTO[];
  onSave: (data: MemberPaymentCreate) => Promise<string | null>;
  onClose: () => void;
  personSearch: string;
  personResults: any[];
  selectedPerson: any;
  onSearchPersons: (query: string) => void;
  onSelectPerson: (person: any) => void;
  getTypeName: (type: ContributionType) => string;
  t: (key: string) => string;
}) {
  const [personId, setPersonId] = useState(payment?.personId || 0);
  const [typeId, setTypeId] = useState(payment?.contributionTypeId || 0);
  const [currencyId, setCurrencyId] = useState<number | undefined>(payment?.currencyId || undefined);
  const [amount, setAmount] = useState(payment?.amount?.toString() || '');
  const [amountManual, setAmountManual] = useState(!!payment); // true when editing existing payment
  const [paymentDate, setPaymentDate] = useState(payment?.paymentDate || (() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`; })());
  const [periodFrom, setPeriodFrom] = useState(payment?.periodFrom || '');
  const [periodTo, setPeriodTo] = useState(payment?.periodTo || '');
  const [reference, setReference] = useState(payment?.reference || '');
  const [notes, setNotes] = useState(payment?.notes || '');
  const [showPersonDropdown, setShowPersonDropdown] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Determine if the selected type has a periodic obligation
  const selectedType = types.find(t => t.id === typeId);
  const activeObligation = selectedType?.obligations?.find(o => o.amount > 0);
  const frequency = activeObligation?.frequency; // 'MONTHLY' | 'YEARLY' | undefined

  // Fetch active exemptions for selected person + type
  const [activeExemption, setActiveExemption] = useState<MemberContributionExemption | null>(null);
  const resolvedPersonId = selectedPerson?.id || personId;

  useEffect(() => {
    if (resolvedPersonId && typeId) {
      exemptionApi.getActive(Number(resolvedPersonId), typeId)
        .then(list => setActiveExemption(list.length > 0 ? list[0] : null))
        .catch(() => setActiveExemption(null));
    } else {
      setActiveExemption(null);
    }
  }, [resolvedPersonId, typeId]);

  // Calculate period count for auto-fill
  const computePeriodCount = (): number => {
    if (!periodFrom || !periodTo || !frequency) return 1;
    if (frequency === 'MONTHLY') {
      const [fy, fm] = periodFrom.substring(0, 7).split('-').map(Number);
      const [ty, tm] = periodTo.substring(0, 7).split('-').map(Number);
      return Math.max(1, (ty - fy) * 12 + (tm - fm) + 1);
    } else {
      const fy = new Date(periodFrom).getFullYear();
      const ty = new Date(periodTo).getFullYear();
      return Math.max(1, ty - fy + 1);
    }
  };
  const periodCount = computePeriodCount();
  const obligationUnitAmount = activeObligation?.amount;

  // Apply exemption per-period to the unit amount, then multiply by period count
  const applyExemptionPerUnit = (unitAmount: number): number => {
    if (!activeExemption) return unitAmount;
    switch (activeExemption.exemptionType) {
      case 'FULL': return 0;
      case 'FIXED_AMOUNT': return activeExemption.amount ?? unitAmount;
      case 'DISCOUNT_AMOUNT': return Math.max(0, unitAmount - (activeExemption.amount ?? 0));
      case 'DISCOUNT_PERCENTAGE': return Math.max(0, unitAmount * (1 - (activeExemption.amount ?? 0) / 100));
      default: return unitAmount;
    }
  };

  const exemptedUnitAmount = obligationUnitAmount ? applyExemptionPerUnit(obligationUnitAmount) : undefined;
  const calculatedAmount = exemptedUnitAmount !== undefined ? exemptedUnitAmount * periodCount : undefined;

  // Auto-fill amount when type or period changes (unless user manually overrode)
  useEffect(() => {
    if (amountManual) return;
    if (calculatedAmount !== undefined) {
      setAmount(calculatedAmount.toFixed(2));
    }
  }, [typeId, periodFrom, periodTo, calculatedAmount, amountManual]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const finalPersonId = selectedPerson?.id || personId;
    if (!finalPersonId) { setSaving(false); return; }
    const err = await onSave({
      personId: Number(finalPersonId),
      contributionTypeId: typeId,
      amount: parseFloat(amount),
      paymentDate,
      periodFrom: periodFrom || undefined,
      periodTo: periodTo || undefined,
      reference: reference || undefined,
      notes: notes || undefined,
      currencyId: currencyId || undefined,
    });
    setSaving(false);
    if (err) setError(err);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-bold text-stone-900 mb-4">
            {payment ? t('contributions.edit_payment') : t('contributions.add_payment')}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Person Search */}
            <div className="relative">
              <label className="block text-sm font-medium text-stone-700 mb-1">{t('contributions.person')}</label>
              {payment ? (
                <div className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm bg-stone-50">
                  {payment.personName}
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    value={selectedPerson ? `${selectedPerson.firstName} ${selectedPerson.lastName || ''}` : personSearch}
                    onChange={(e) => {
                      onSelectPerson(null);
                      onSearchPersons(e.target.value);
                      setShowPersonDropdown(true);
                    }}
                    onFocus={() => setShowPersonDropdown(true)}
                    className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder={t('contributions.search_person')}
                    required={!selectedPerson && !personId}
                  />
                  {showPersonDropdown && personResults.length > 0 && (
                    <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-stone-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                      {personResults.map((person: any) => (
                        <button
                          key={person.id}
                          type="button"
                          onClick={() => {
                            onSelectPerson(person);
                            setPersonId(Number(person.id));
                            setShowPersonDropdown(false);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-stone-50 text-sm"
                        >
                          {person.firstName} {person.lastName || ''}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">{t('contributions.type')}</label>
              <select
                value={typeId}
                onChange={(e) => {
                  const newTypeId = Number(e.target.value);
                  setTypeId(newTypeId);
                  setAmountManual(false);
                  // Auto-set period defaults based on frequency
                  const newType = types.find(ct => ct.id === newTypeId);
                  const newObligation = newType?.obligations?.find(o => o.amount > 0);
                  const freq = newObligation?.frequency;
                  const now = new Date();
                  if (freq === 'MONTHLY') {
                    const y = now.getFullYear();
                    const m = now.getMonth() + 1;
                    const lastDay = new Date(y, m, 0).getDate();
                    setPeriodFrom(`${y}-${String(m).padStart(2, '0')}-01`);
                    setPeriodTo(`${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`);
                  } else if (freq === 'YEARLY') {
                    const y = now.getFullYear();
                    setPeriodFrom(`${y}-01-01`);
                    setPeriodTo(`${y}-12-31`);
                  } else {
                    setPeriodFrom('');
                    setPeriodTo('');
                  }
                  // Auto-set currency from obligation, or fall back to mosque's first currency
                  if (!payment) {
                    if (newObligation?.currencyId) {
                      setCurrencyId(newObligation.currencyId);
                    } else if (mosqueCurrencies.length === 1) {
                      setCurrencyId(mosqueCurrencies[0].currencyId);
                    }
                  }
                }}
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                required
              >
                <option value={0} disabled>{t('contributions.select_type')}</option>
                {types.map((type) => (
                  <option key={type.id} value={type.id}>{getTypeName(type)}</option>
                ))}
              </select>
            </div>

            {/* Period selection — shown when selected type has a periodic obligation */}
            {frequency && (
              <div className="bg-stone-50 rounded-lg p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-stone-700">
                    {t('contributions.period')}
                    <span className="ml-1 text-xs text-stone-400 font-normal">
                      ({frequency === 'MONTHLY' ? t('contributions.freq_monthly') : t('contributions.freq_yearly')})
                    </span>
                  </label>
                  {periodCount >= 1 && (
                    <span className="text-xs text-emerald-600 font-medium">
                      {periodCount} {frequency === 'MONTHLY' ? (periodCount === 1 ? t('contributions.month') : t('contributions.months')) : (periodCount === 1 ? t('contributions.year') : t('contributions.years'))}
                    </span>
                  )}
                </div>
                <p className="text-xs text-stone-400">{t('contributions.select_period')}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-stone-500 mb-1">{t('contributions.period_from')}</label>
                    {frequency === 'MONTHLY' ? (
                      <div className="flex gap-1">
                        <select
                          value={periodFrom ? parseInt(periodFrom.substring(5, 7)) : ''}
                          onChange={(e) => {
                            const month = Number(e.target.value);
                            const year = periodFrom ? parseInt(periodFrom.substring(0, 4)) : new Date().getFullYear();
                            setPeriodFrom(`${year}-${String(month).padStart(2, '0')}-01`);
                          }}
                          className="flex-1 border border-stone-300 rounded-lg px-2 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                        >
                          {Array.from({ length: 12 }, (_, i) => (
                            <option key={i + 1} value={i + 1}>
                              {new Date(2000, i).toLocaleString(undefined, { month: 'short' })}
                            </option>
                          ))}
                        </select>
                        <select
                          value={periodFrom ? parseInt(periodFrom.substring(0, 4)) : new Date().getFullYear()}
                          onChange={(e) => {
                            const year = Number(e.target.value);
                            const month = periodFrom ? parseInt(periodFrom.substring(5, 7)) : (new Date().getMonth() + 1);
                            setPeriodFrom(`${year}-${String(month).padStart(2, '0')}-01`);
                          }}
                          className="w-[5.5rem] border border-stone-300 rounded-lg px-2 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                        >
                          {Array.from({ length: 11 }, (_, i) => 2020 + i).map(y => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <select
                        value={periodFrom ? parseInt(periodFrom.substring(0, 4)) : new Date().getFullYear()}
                        onChange={(e) => setPeriodFrom(`${e.target.value}-01-01`)}
                        className="w-full border border-stone-300 rounded-lg px-2 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                      >
                        {Array.from({ length: 11 }, (_, i) => 2020 + i).map(y => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs text-stone-500 mb-1">{t('contributions.period_to')}</label>
                    {frequency === 'MONTHLY' ? (
                      <div className="flex gap-1">
                        <select
                          value={periodTo ? parseInt(periodTo.substring(5, 7)) : ''}
                          onChange={(e) => {
                            const month = Number(e.target.value);
                            const year = periodTo ? parseInt(periodTo.substring(0, 4)) : new Date().getFullYear();
                            const lastDay = new Date(year, month, 0).getDate();
                            setPeriodTo(`${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`);
                          }}
                          className="flex-1 border border-stone-300 rounded-lg px-2 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                        >
                          {Array.from({ length: 12 }, (_, i) => (
                            <option key={i + 1} value={i + 1}>
                              {new Date(2000, i).toLocaleString(undefined, { month: 'short' })}
                            </option>
                          ))}
                        </select>
                        <select
                          value={periodTo ? parseInt(periodTo.substring(0, 4)) : new Date().getFullYear()}
                          onChange={(e) => {
                            const year = Number(e.target.value);
                            const month = periodTo ? parseInt(periodTo.substring(5, 7)) : (new Date().getMonth() + 1);
                            const lastDay = new Date(year, month, 0).getDate();
                            setPeriodTo(`${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`);
                          }}
                          className="w-[5.5rem] border border-stone-300 rounded-lg px-2 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                        >
                          {Array.from({ length: 11 }, (_, i) => 2020 + i).map(y => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <select
                        value={periodTo ? parseInt(periodTo.substring(0, 4)) : new Date().getFullYear()}
                        onChange={(e) => setPeriodTo(`${e.target.value}-12-31`)}
                        className="w-full border border-stone-300 rounded-lg px-2 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                      >
                        {Array.from({ length: 11 }, (_, i) => 2020 + i).map(y => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">{t('contributions.amount')}</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setAmountManual(true);
                }}
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                required
              />
              {/* Auto-fill hint */}
              {obligationUnitAmount && !amountManual && frequency && periodCount > 1 && (
                <p className="mt-1 text-xs text-emerald-600">
                  {t('contributions.amount_calculation')}: {periodCount} ×{' '}
                  {activeExemption && exemptedUnitAmount !== undefined && exemptedUnitAmount !== obligationUnitAmount
                    ? `(${obligationUnitAmount.toFixed(2)} → ${exemptedUnitAmount.toFixed(2)}) = ${calculatedAmount?.toFixed(2)}`
                    : `${obligationUnitAmount.toFixed(2)} = ${calculatedAmount?.toFixed(2)}`}
                </p>
              )}
              {obligationUnitAmount && !amountManual && !(frequency && periodCount > 1) && (
                <p className="mt-1 text-xs text-emerald-600">
                  {t('contributions.amount_from_obligation')}: {obligationUnitAmount.toFixed(2)}
                  {activeExemption && exemptedUnitAmount !== undefined && exemptedUnitAmount !== obligationUnitAmount
                    ? ` → ${exemptedUnitAmount.toFixed(2)}`
                    : ''}
                </p>
              )}
              {activeExemption && (
                <p className="mt-1 text-xs text-amber-600">
                  ⚡ {t('contributions.exemption_applied')}: {
                    activeExemption.exemptionType === 'FULL' ? t('contributions.exemption_full') :
                    activeExemption.exemptionType === 'FIXED_AMOUNT' ? `${t('contributions.exemption_fixed')}: ${activeExemption.amount?.toFixed(2)}` :
                    activeExemption.exemptionType === 'DISCOUNT_AMOUNT' ? `${t('contributions.exemption_discount_amount')}: -${activeExemption.amount?.toFixed(2)}` :
                    `${t('contributions.exemption_discount_pct')}: -${activeExemption.amount}%`
                  }
                  {activeExemption.reason ? ` (${activeExemption.reason})` : ''}
                </p>
              )}
              {amountManual && calculatedAmount !== undefined && parseFloat(amount) !== calculatedAmount && (
                <button
                  type="button"
                  onClick={() => { setAmount(calculatedAmount.toFixed(2)); setAmountManual(false); }}
                  className="mt-1 text-xs text-emerald-600 hover:text-emerald-800 underline"
                >
                  {t('contributions.reset_to_calculated')}: {calculatedAmount.toFixed(2)}
                </button>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">{t('contributions.currency')}</label>
              {mosqueCurrencies.length === 0 ? (
                <p className="text-xs text-amber-600">{t('contributions.no_currencies')}</p>
              ) : (
                <select
                  value={currencyId || ''}
                  onChange={(e) => setCurrencyId(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="">{t('contributions.select_currency')}</option>
                  {mosqueCurrencies.map((mc) => (
                    <option key={mc.currencyId} value={mc.currencyId}>
                      {mc.currencyCode} — {mc.currencyName} ({mc.currencySymbol})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">{t('contributions.payment_date')}</label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">{t('contributions.reference')}</label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                placeholder={t('contributions.reference_placeholder')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">{t('contributions.notes')}</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={onClose} className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-lg text-sm">
                {t('common.cancel')}
              </button>
              <button type="submit" disabled={saving} className="px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 text-sm disabled:opacity-50">
                {t('common.save')}
              </button>
            </div>
            {error && (
              <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

// ===== Exemption Modal =====
function ExemptionModal({ exemption, types, onSave, onClose, personSearch, personResults, selectedPerson, onSearchPersons, onSelectPerson, getTypeName, t }: {
  exemption: MemberContributionExemption | null;
  types: ContributionType[];
  onSave: (data: MemberContributionExemptionCreate) => Promise<string | null>;
  onClose: () => void;
  personSearch: string;
  personResults: any[];
  selectedPerson: any;
  onSearchPersons: (query: string) => void;
  onSelectPerson: (person: any) => void;
  getTypeName: (type: ContributionType) => string;
  t: (key: string) => string;
}) {
  const [personId, setPersonId] = useState(exemption?.personId || 0);
  const [typeId, setTypeId] = useState(exemption?.contributionTypeId || 0);
  const [exemptionType, setExemptionType] = useState(exemption?.exemptionType || 'FULL');
  const [amount, setAmount] = useState(exemption?.amount?.toString() || '');
  const [reason, setReason] = useState(exemption?.reason || '');
  const [startDate, setStartDate] = useState(exemption?.startDate || (() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`; })());
  const [endDate, setEndDate] = useState(exemption?.endDate || '');
  const [isActive, setIsActive] = useState(exemption?.isActive ?? true);
  const [showPersonDropdown, setShowPersonDropdown] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const needsAmount = exemptionType !== 'FULL';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const finalPersonId = selectedPerson?.id || personId;
    if (!finalPersonId) { setSaving(false); return; }
    const err = await onSave({
      personId: Number(finalPersonId),
      contributionTypeId: typeId,
      exemptionType,
      amount: needsAmount && amount ? parseFloat(amount) : undefined,
      reason: reason || undefined,
      startDate,
      endDate: endDate || undefined,
      isActive,
    });
    setSaving(false);
    if (err) setError(err);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-bold text-stone-900 mb-4">
            {exemption ? t('contributions.edit_exemption') : t('contributions.add_exemption')}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Person Search */}
            <div className="relative">
              <label className="block text-sm font-medium text-stone-700 mb-1">{t('contributions.person')}</label>
              {exemption ? (
                <div className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm bg-stone-50">
                  {exemption.personName}
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    value={selectedPerson ? `${selectedPerson.firstName} ${selectedPerson.lastName || ''}` : personSearch}
                    onChange={(e) => {
                      onSelectPerson(null);
                      onSearchPersons(e.target.value);
                      setShowPersonDropdown(true);
                    }}
                    onFocus={() => setShowPersonDropdown(true)}
                    className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder={t('contributions.search_person')}
                    required={!selectedPerson && !personId}
                  />
                  {showPersonDropdown && personResults.length > 0 && (
                    <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-stone-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                      {personResults.map((person: any) => (
                        <button
                          key={person.id}
                          type="button"
                          onClick={() => {
                            onSelectPerson(person);
                            setPersonId(Number(person.id));
                            setShowPersonDropdown(false);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-stone-50 text-sm"
                        >
                          {person.firstName} {person.lastName || ''}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">{t('contributions.type')}</label>
              <select
                value={typeId}
                onChange={(e) => setTypeId(Number(e.target.value))}
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                required
              >
                <option value={0} disabled>{t('contributions.select_type')}</option>
                {types.map((type) => (
                  <option key={type.id} value={type.id}>{getTypeName(type)}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">{t('contributions.exemption_type')}</label>
              <select
                value={exemptionType}
                onChange={(e) => setExemptionType(e.target.value as 'FULL' | 'FIXED_AMOUNT' | 'DISCOUNT_AMOUNT' | 'DISCOUNT_PERCENTAGE')}
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                required
              >
                <option value="FULL">{t('contributions.exemption_full')}</option>
                <option value="FIXED_AMOUNT">{t('contributions.exemption_fixed')}</option>
                <option value="DISCOUNT_AMOUNT">{t('contributions.exemption_discount_amount')}</option>
                <option value="DISCOUNT_PERCENTAGE">{t('contributions.exemption_discount_pct')}</option>
              </select>
            </div>

            {needsAmount && (
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  {exemptionType === 'DISCOUNT_PERCENTAGE' ? t('contributions.percentage') : t('contributions.amount')}
                </label>
                <input
                  type="number"
                  step={exemptionType === 'DISCOUNT_PERCENTAGE' ? '1' : '0.01'}
                  min={exemptionType === 'DISCOUNT_PERCENTAGE' ? '1' : '0.01'}
                  max={exemptionType === 'DISCOUNT_PERCENTAGE' ? '100' : undefined}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                  required
                  placeholder={exemptionType === 'DISCOUNT_PERCENTAGE' ? '0-100' : undefined}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">{t('contributions.reason')}</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                rows={2}
                placeholder={t('contributions.reason_placeholder')}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">{t('contributions.start_date')}</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  {t('contributions.end_date')} <span className="text-xs text-stone-400">({t('contributions.optional')})</span>
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="exemption-active"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
              />
              <label htmlFor="exemption-active" className="text-sm text-stone-700">{t('contributions.active')}</label>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={onClose} className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-lg text-sm">
                {t('common.cancel')}
              </button>
              <button type="submit" disabled={saving} className="px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 text-sm disabled:opacity-50">
                {saving ? '...' : t('common.save')}
              </button>
            </div>
            {error && (
              <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
