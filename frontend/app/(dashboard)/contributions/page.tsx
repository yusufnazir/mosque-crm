'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
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
  MemberContributionAssignment,
  MemberContributionAssignmentCreate,
  PageResponse,
  PaymentDocument,
  contributionTypeApi,
  contributionObligationApi,
  memberPaymentApi,
  exemptionApi,
  contributionAssignmentApi,
  createPeriodicPayments,
  paymentDocumentApi,
} from '@/lib/contributionApi';
import { currencyApi, OrganizationCurrencyDTO } from '@/lib/currencyApi';
import { useDateFormat } from '@/lib/DateFormatContext';
import { memberApi } from '@/lib/api';
import { useAuth } from '@/lib/auth/AuthContext';
import { useSubscription } from '@/lib/subscription/SubscriptionContext';
import ToastNotification from '@/components/ToastNotification';
import ConfirmDialog from '@/components/ConfirmDialog';
import PaymentReceiptModal from '@/components/PaymentReceiptModal';

type Tab = 'types' | 'obligations' | 'payments' | 'exemptions' | 'assignments';

export default function ContributionsPage() {
  const { t, language: locale } = useTranslation();
  const { can, isSuperAdmin, user } = useAuth();
  const { hasFeature } = useSubscription();
  const { formatDate } = useDateFormat();
  const router = useRouter();
  const params = useParams();
  const validTabs: Tab[] = ['types', 'obligations', 'payments', 'exemptions', 'assignments'];
  const activeTab: Tab = validTabs.includes(params.tab as Tab) ? (params.tab as Tab) : 'types';

  const canViewTypes = isSuperAdmin || can('contribution.view_types') || can('contribution.manage_types') || can('contribution.manage');
  const canManageTypes = isSuperAdmin || can('contribution.manage_types') || can('contribution.manage');
  const canViewObligations = isSuperAdmin || can('contribution.view_obligations') || can('contribution.manage_obligations') || can('contribution.manage');
  const canManageObligations = isSuperAdmin || can('contribution.manage_obligations') || can('contribution.manage');
  const canViewPayments =
    hasFeature('payment.tracking') && (
    isSuperAdmin ||
    can('contribution.view') ||
    can('contribution.view_payments') ||
    can('contribution.create_payment') ||
    can('contribution.edit_payment') ||
    can('contribution.delete_payment') ||
    can('contribution.reverse') ||
    can('contribution.edit_reversal') ||
    can('contribution.delete_reversal') ||
    can('contribution.manage'));
  const canViewExemptions = isSuperAdmin || can('contribution.view_exemptions') || can('contribution.create_exemption') || can('contribution.edit_exemption') || can('contribution.delete_exemption') || can('contribution.manage');
  const canCreateExemption = isSuperAdmin || can('contribution.create_exemption') || can('contribution.manage');
  const canEditExemption = isSuperAdmin || can('contribution.edit_exemption') || can('contribution.manage');
  const canDeleteExemption = isSuperAdmin || can('contribution.delete_exemption') || can('contribution.manage');
  const canViewAssignments = isSuperAdmin || can('contribution.view_assignments') || can('contribution.manage_assignments') || can('contribution.manage');
  const canManageAssignments = isSuperAdmin || can('contribution.manage_assignments') || can('contribution.manage');

  // Check if user has any management permissions to show admin stats
  const hasManagementPermissions = 
    canManageTypes || 
    canManageObligations || 
    can('contribution.create_payment') || 
    can('contribution.edit_payment') || 
    can('contribution.delete_payment') ||
    canCreateExemption ||
    canEditExemption ||
    canDeleteExemption ||
    canManageAssignments;

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
  const [paymentsRefreshKey, setPaymentsRefreshKey] = useState(0);
  const [paymentsCount, setPaymentsCount] = useState(0);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState<MemberPayment | null>(null);
  const [viewingPayment, setViewingPayment] = useState<MemberPayment | null>(null);
  const [deletePaymentId, setDeletePaymentId] = useState<number | null>(null);
  const [reversePaymentId, setReversePaymentId] = useState<number | null>(null);
  const [receiptPayment, setReceiptPayment] = useState<MemberPayment | null>(null);

  // ===== Exemptions State =====
  const [exemptions, setExemptions] = useState<MemberContributionExemption[]>([]);
  const [exemptionsLoading, setExemptionsLoading] = useState(false);
  const [showExemptionModal, setShowExemptionModal] = useState(false);
  const [editingExemption, setEditingExemption] = useState<MemberContributionExemption | null>(null);

  // ===== Assignments State =====
  const [assignments, setAssignments] = useState<MemberContributionAssignment[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<MemberContributionAssignment | null>(null);
  const [deleteAssignmentId, setDeleteAssignmentId] = useState<number | null>(null);

  // ===== Organization currencies =====
  const [organizationCurrencies, setOrganizationCurrencies] = useState<OrganizationCurrencyDTO[]>([]);

  // ===== Person search for payments =====
  const [personSearch, setPersonSearch] = useState('');
  const [personResults, setPersonResults] = useState<any[]>([]);
  const [selectedPerson, setSelectedPerson] = useState<any>(null);

  // ===== Confirm Dialogs =====
  const [deactivateTypeId, setDeactivateTypeId] = useState<number | null>(null);
  const [deleteObligationId, setDeleteObligationId] = useState<number | null>(null);
  const [deleteExemptionId, setDeleteExemptionId] = useState<number | null>(null);

  // ===== Toast =====
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);

  // Load types and currencies on mount
  useEffect(() => {
    loadTypes();
    loadOrganizationCurrencies();
  }, []);

  // Load tab-specific data when tab changes
  useEffect(() => {
    if (activeTab === 'obligations') loadObligations();
    if (activeTab === 'exemptions') loadExemptions();
    if (activeTab === 'assignments') loadAssignments();
  }, [activeTab]);

  // ===== Data Loading =====
  const loadTypes = async () => {
    setTypesLoading(true);
    try {
      const data = await contributionTypeApi.getAll();
      setTypes(Array.isArray(data) ? data : []);
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
      setObligations(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load obligations:', err);
    } finally {
      setObligationsLoading(false);
    }
  };

  const loadOrganizationCurrencies = async () => {
    try {
      const data = await currencyApi.getActiveOrganizationCurrencies();
      setOrganizationCurrencies(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load organization currencies:', err);
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

  const handleDeactivateType = (id: number) => {
    setDeactivateTypeId(id);
  };

  const confirmDeactivateType = async () => {
    if (deactivateTypeId == null) return;
    try {
      await contributionTypeApi.deactivate(deactivateTypeId);
      loadTypes();
    } catch (err) {
      console.error('Failed to deactivate type:', err);
    } finally {
      setDeactivateTypeId(null);
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

  const handleDeleteObligation = (id: number) => {
    setDeleteObligationId(id);
  };

  const confirmDeleteObligation = async () => {
    if (deleteObligationId == null) return;
    try {
      await contributionObligationApi.delete(deleteObligationId);
      loadObligations();
    } catch (err) {
      console.error('Failed to delete obligation:', err);
    } finally {
      setDeleteObligationId(null);
    }
  };

  // ===== Payment CRUD =====
  const handleSavePayment = async (data: MemberPaymentCreate): Promise<string | null> => {
    try {
      if (editingPayment) {
        await memberPaymentApi.update(editingPayment.id, data);
      } else {
        // Determine frequency to split multi-period payments into individual records
        const selectedType = types.find(ct => ct.id === data.contributionTypeId);
        const activeObligation = selectedType?.obligations?.find(o => o.amount > 0);
        const frequency = activeObligation?.frequency as 'MONTHLY' | 'YEARLY' | undefined;
        // Fetch full payment list for overlap detection (cannot rely on paginated subset)
        const allPayments = await memberPaymentApi.getAll();
        const result = await createPeriodicPayments(data, frequency, undefined, allPayments);

        if (result.skippedCount > 0 && result.created.length > 0) {
          setToast({
            message: t('contributions.payments_created_with_skips', {
              created: result.created.length,
              skipped: result.skippedCount,
              periods: result.skippedPeriods.join(', ')
            }),
            type: 'warning'
          });
          setShowPaymentModal(false);
          setEditingPayment(null);
          setSelectedPerson(null);
          setPersonSearch('');
          setPaymentsRefreshKey(k => k + 1);
          return null;
        }
        if (result.skippedCount > 0 && result.created.length === 0) {
          setToast({
            message: t('contributions.all_periods_already_paid', {
              periods: result.skippedPeriods.join(', ')
            }),
            type: 'info'
          });
          setShowPaymentModal(false);
          setEditingPayment(null);
          setSelectedPerson(null);
          setPersonSearch('');
          return null;
        }
      }
      setShowPaymentModal(false);
      setEditingPayment(null);
      setSelectedPerson(null);
      setPersonSearch('');
      setPaymentsRefreshKey(k => k + 1);
      setToast({ message: 'Saved successfully', type: 'success' });
      return null;
    } catch (err: any) {
      console.warn('Failed to save payment:', err.message);
      return err.message || 'Failed to save payment';
    }
  };

  const handleDeletePayment = (id: number) => {
    setDeletePaymentId(id);
  };

  const confirmDeletePayment = async () => {
    if (deletePaymentId == null) return;
    try {
      await memberPaymentApi.delete(deletePaymentId);
      setPaymentsRefreshKey(k => k + 1);
      setToast({ message: t('member_detail.payment_deleted'), type: 'success' });
    } catch (err) {
      console.error('Failed to delete payment:', err);
      setToast({ message: t('member_detail.payment_delete_error'), type: 'error' });
    } finally {
      setDeletePaymentId(null);
    }
  };

  const handleReversePayment = (id: number) => {
    setReversePaymentId(id);
  };

  const confirmReversePayment = async () => {
    if (reversePaymentId == null) return;
    try {
      await memberPaymentApi.reverse(reversePaymentId);
      setPaymentsRefreshKey(k => k + 1);
      setToast({ message: t('contributions.reversal_created'), type: 'success' });
    } catch (err: any) {
      console.error('Failed to reverse payment:', err);
      setToast({ message: err.message || t('contributions.reversal_error'), type: 'error' });
    } finally {
      setReversePaymentId(null);
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

  const handleDeleteExemption = (id: number) => {
    setDeleteExemptionId(id);
  };

  const confirmDeleteExemption = async () => {
    if (deleteExemptionId == null) return;
    try {
      await exemptionApi.delete(deleteExemptionId);
      loadExemptions();
    } catch (err) {
      console.error('Failed to delete exemption:', err);
    } finally {
      setDeleteExemptionId(null);
    }
  };

  // ===== Assignment CRUD =====
  const loadAssignments = async () => {
    setAssignmentsLoading(true);
    try {
      const data = await contributionAssignmentApi.getAll();
      setAssignments(data);
    } catch (err) {
      console.error('Failed to load assignments:', err);
    } finally {
      setAssignmentsLoading(false);
    }
  };

  const handleSaveAssignment = async (data: MemberContributionAssignmentCreate): Promise<string | null> => {
    try {
      if (editingAssignment) {
        await contributionAssignmentApi.update(editingAssignment.id, data);
      } else {
        await contributionAssignmentApi.create(data);
      }
      setShowAssignmentModal(false);
      setEditingAssignment(null);
      setSelectedPerson(null);
      setPersonSearch('');
      loadAssignments();
      setToast({ message: t('contributions.assignment_saved'), type: 'success' });
      return null;
    } catch (err: any) {
      console.warn('Failed to save assignment:', err.message);
      return err.message || 'Failed to save assignment';
    }
  };

  const handleDeleteAssignment = (id: number) => {
    setDeleteAssignmentId(id);
  };

  const confirmDeleteAssignment = async () => {
    if (deleteAssignmentId == null) return;
    try {
      await contributionAssignmentApi.delete(deleteAssignmentId);
      loadAssignments();
      setToast({ message: t('contributions.assignment_deleted'), type: 'success' });
    } catch (err) {
      console.error('Failed to delete assignment:', err);
    } finally {
      setDeleteAssignmentId(null);
    }
  };

  const handleToggleAssignment = async (id: number) => {
    try {
      await contributionAssignmentApi.toggleActive(id);
      loadAssignments();
    } catch (err) {
      console.error('Failed to toggle assignment:', err);
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

  // Local date helper — avoids timezone issues with toISOString() returning UTC date
  const localToday = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  };

  // ===== Tab buttons =====
  const tabs: { key: Tab; label: string }[] = [
    ...(canViewTypes ? [{ key: 'types' as Tab, label: t('contributions.types') }] : []),
    ...(canViewObligations ? [{ key: 'obligations' as Tab, label: t('contributions.obligations') }] : []),
    ...(canViewPayments ? [{ key: 'payments' as Tab, label: t('contributions.payments') }] : []),
    ...(canViewExemptions ? [{ key: 'exemptions' as Tab, label: t('contributions.exemptions') }] : []),
    ...(canViewAssignments ? [{ key: 'assignments' as Tab, label: t('contributions.assignments') }] : []),
  ];

  useEffect(() => {
    if (!params.tab) {
      router.replace('/contributions/types');
      return;
    }
    if (tabs.length === 0) return;
    if (!tabs.some(tab => tab.key === activeTab)) {
      router.replace(`/contributions/${tabs[0].key}`);
    }
  }, [activeTab, tabs, router, params.tab]);

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

      {/* Summary Cards - only show for users with management permissions */}
      {hasManagementPermissions && (
        <div className="hidden md:grid grid-cols-3 gap-6">
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
              <p className="text-2xl font-bold text-blue-600">{paymentsCount}</p>
            </div>
          </Card>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-stone-200">
        <div role="tablist" className="flex space-x-2 sm:space-x-4 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              role="tab"
              aria-selected={activeTab === tab.key}
              key={tab.key}
              onClick={() => {
                router.push(`/contributions/${tab.key}`);
              }}
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
      {activeTab === 'types' && canViewTypes && (
        <TypesTab
          types={types}
          loading={typesLoading}
          getTypeName={getTypeName}
          canManage={canManageTypes}
          onAdd={() => { setEditingType(null); setShowTypeModal(true); }}
          onEdit={(type) => { setEditingType(type); setShowTypeModal(true); }}
          onDeactivate={handleDeactivateType}
          onActivate={handleActivateType}
          t={t}
          locale={locale}
        />
      )}

      {activeTab === 'obligations' && canViewObligations && (
        <ObligationsTab
          obligations={obligations}
          loading={obligationsLoading}
          types={types}
          getTypeNameByCode={getTypeNameByCode}
          canManage={canManageObligations}
          onAdd={() => { setEditingObligation(null); setShowObligationModal(true); }}
          onEdit={(obl) => { setEditingObligation(obl); setShowObligationModal(true); }}
          onDelete={handleDeleteObligation}
          formatCurrency={formatCurrency}
          formatDate={formatDate}
          organizationCurrencies={organizationCurrencies}
          t={t}
        />
      )}

      {activeTab === 'payments' && canViewPayments && (
        <PaymentsTab
          refreshKey={paymentsRefreshKey}
          onTotalChange={setPaymentsCount}
          onAdd={() => { setEditingPayment(null); setShowPaymentModal(true); }}
          onEdit={(p) => { setEditingPayment(p); setShowPaymentModal(true); }}
          onView={(p) => setViewingPayment(p)}
          onDelete={handleDeletePayment}
          onReverse={handleReversePayment}
          onReceipt={setReceiptPayment}
          getTypeNameByCode={getTypeNameByCode}
          formatCurrency={formatCurrency}
          formatDate={formatDate}
          organizationCurrencies={organizationCurrencies}
          types={types}
          isSuperAdmin={isSuperAdmin}
          canReverse={can('contribution.reverse')}
          canEditReversal={can('contribution.edit_reversal')}
          canDeleteReversal={can('contribution.delete_reversal')}
          canCreatePayment={can('contribution.create_payment')}
          canEditPayment={can('contribution.edit_payment')}
          canDeletePayment={can('contribution.delete_payment')}
          hasManagementPermissions={hasManagementPermissions}
          user={user}
          can={can}
          t={t}
        />
      )}

      {activeTab === 'exemptions' && canViewExemptions && (
        <ExemptionsTab
          exemptions={exemptions}
          loading={exemptionsLoading}
          canCreate={canCreateExemption}
          canEdit={canEditExemption}
          canDelete={canDeleteExemption}
          onAdd={() => { setEditingExemption(null); setShowExemptionModal(true); }}
          onEdit={(e) => { setEditingExemption(e); setShowExemptionModal(true); }}
          onDelete={handleDeleteExemption}
          getTypeNameByCode={getTypeNameByCode}
          formatDate={formatDate}
          t={t}
        />
      )}

      {activeTab === 'assignments' && canViewAssignments && (
        <AssignmentsTab
          assignments={assignments}
          loading={assignmentsLoading}
          canManage={canManageAssignments}
          onAdd={() => { setEditingAssignment(null); setShowAssignmentModal(true); }}
          onEdit={(a) => { setEditingAssignment(a); setShowAssignmentModal(true); }}
          onDelete={handleDeleteAssignment}
          onToggle={handleToggleAssignment}
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
          organizationCurrencies={organizationCurrencies}
          onSave={handleSaveObligation}
          onClose={() => { setShowObligationModal(false); setEditingObligation(null); }}
          t={t}
        />
      )}

      {/* Payment View Modal (read-only) */}
      {viewingPayment && (
        <PaymentViewModal
          payment={viewingPayment}
          onClose={() => setViewingPayment(null)}
          getTypeNameByCode={getTypeNameByCode}
          formatCurrency={formatCurrency}
          formatDate={formatDate}
          t={t}
        />
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <PaymentModal
          payment={editingPayment}
          types={types.filter(t => t.isActive)}
          organizationCurrencies={organizationCurrencies}
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

      {/* Payment Receipt Modal */}
      <PaymentReceiptModal
        open={receiptPayment != null}
        payment={receiptPayment}
        onClose={() => setReceiptPayment(null)}
        contributionTypeName={receiptPayment ? getTypeNameByCode(receiptPayment.contributionTypeCode) : ''}
        formatDate={formatDate}
        t={t}
      />

      {/* Payment Delete Confirmation */}
      <ConfirmDialog
        open={deletePaymentId != null}
        title={t('contributions.confirm_delete_title')}
        message={t('contributions.confirm_delete_payment')}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        variant="danger"
        onConfirm={confirmDeletePayment}
        onCancel={() => setDeletePaymentId(null)}
      />

      {/* Payment Reversal Confirmation */}
      <ConfirmDialog
        open={reversePaymentId != null}
        title={t('contributions.confirm_reversal_title')}
        message={t('contributions.confirm_reversal_message')}
        confirmLabel={t('contributions.reverse')}
        cancelLabel={t('common.cancel')}
        variant="warning"
        onConfirm={confirmReversePayment}
        onCancel={() => setReversePaymentId(null)}
      />

      {/* Deactivate Type Confirmation */}
      <ConfirmDialog
        open={deactivateTypeId != null}
        title={t('contributions.confirm_delete_title')}
        message={t('contributions.confirm_deactivate')}
        confirmLabel={t('contributions.deactivate')}
        cancelLabel={t('common.cancel')}
        variant="warning"
        onConfirm={confirmDeactivateType}
        onCancel={() => setDeactivateTypeId(null)}
      />

      {/* Obligation Delete Confirmation */}
      <ConfirmDialog
        open={deleteObligationId != null}
        title={t('contributions.confirm_delete_title')}
        message={t('contributions.confirm_delete')}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        variant="danger"
        onConfirm={confirmDeleteObligation}
        onCancel={() => setDeleteObligationId(null)}
      />

      {/* Exemption Delete Confirmation */}
      <ConfirmDialog
        open={deleteExemptionId != null}
        title={t('contributions.confirm_delete_title')}
        message={t('contributions.confirm_delete')}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        variant="danger"
        onConfirm={confirmDeleteExemption}
        onCancel={() => setDeleteExemptionId(null)}
      />

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

      {/* Assignment Delete Confirmation */}
      <ConfirmDialog
        open={deleteAssignmentId != null}
        title={t('contributions.delete_assignment_title')}
        message={t('contributions.delete_assignment_message')}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        variant="danger"
        onConfirm={confirmDeleteAssignment}
        onCancel={() => setDeleteAssignmentId(null)}
      />

      {/* Assignment Modal */}
      {showAssignmentModal && (
        <AssignmentModal
          assignment={editingAssignment}
          types={types.filter(t => t.isRequired && t.isActive)}
          onSave={handleSaveAssignment}
          onClose={() => { setShowAssignmentModal(false); setEditingAssignment(null); setSelectedPerson(null); setPersonSearch(''); }}
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
function TypesTab({ types, loading, getTypeName, canManage, onAdd, onEdit, onDeactivate, onActivate, t, locale }: {
  types: ContributionType[];
  loading: boolean;
  getTypeName: (type: ContributionType) => string;
  canManage: boolean;
  onAdd: () => void;
  onEdit: (type: ContributionType) => void;
  onDeactivate: (id: number) => void;
  onActivate: (id: number) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  locale: string;
}) {
  return (
    <Card>
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-stone-800">{t('contributions.types')}</h2>
          {canManage && (
            <button
              onClick={onAdd}
              className="px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 transition-colors text-sm"
            >
              + {t('contributions.add_type')}
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-8 text-stone-400">{t('common.loading')}</div>
        ) : types.length === 0 ? (
          <div className="text-center py-8 text-stone-400">{t('contributions.no_types')}</div>
        ) : (
          <>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-left text-stone-500">
                  <th className="pb-3 pr-4">{t('contributions.code')}</th>
                  <th className="pb-3 pr-4">{t('contributions.name')}</th>
                  <th className="pb-3 pr-4">{t('contributions.required')}</th>
                  <th className="pb-3 pr-4">{t('contributions.status')}</th>
                  <th className="pb-3 pr-4">{t('contributions.obligations')}</th>
                  {canManage && <th className="pb-3">{t('common.actions')}</th>}
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
                    {canManage && (
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
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {types.map((type) => (
              <div key={type.id} className="border border-stone-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-medium text-stone-900">{getTypeName(type)}</div>
                    <div className="font-mono text-xs text-stone-400 mt-0.5">{type.code}</div>
                  </div>
                  <div className="flex gap-1.5">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      type.isRequired ? 'bg-amber-100 text-amber-700' : 'bg-stone-100 text-stone-500'
                    }`}>
                      {type.isRequired ? t('contributions.required') : t('contributions.optional')}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      type.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
                    }`}>
                      {type.isActive ? t('contributions.active') : t('contributions.inactive')}
                    </span>
                  </div>
                </div>
                {type.obligations && type.obligations.length > 0 && (
                  <div className="text-xs text-stone-500 mb-3">
                    {type.obligations.length} {type.obligations.length === 1 ? t('contributions.obligation') : t('contributions.obligations')}
                  </div>
                )}
                {canManage && (
                  <div className="flex gap-3 pt-2 border-t border-stone-100">
                    <button onClick={() => onEdit(type)} className="text-emerald-600 hover:text-emerald-800 text-xs">{t('common.edit')}</button>
                    {type.isActive ? (
                      <button onClick={() => onDeactivate(type.id)} className="text-red-500 hover:text-red-700 text-xs">{t('contributions.deactivate')}</button>
                    ) : (
                      <button onClick={() => onActivate(type.id)} className="text-blue-500 hover:text-blue-700 text-xs">{t('contributions.activate')}</button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
          </>
        )}
      </div>
    </Card>
  );
}

// ===== Obligations Tab Component =====
function ObligationsTab({ obligations, loading, types, getTypeNameByCode, canManage, onAdd, onEdit, onDelete, formatCurrency, formatDate, organizationCurrencies, t }: {
  obligations: ContributionObligation[];
  loading: boolean;
  types: ContributionType[];
  getTypeNameByCode: (code: string) => string;
  canManage: boolean;
  onAdd: () => void;
  onEdit: (obl: ContributionObligation) => void;
  onDelete: (id: number) => void;
  formatCurrency: (amount: number, currencyCode?: string) => string;
  formatDate: (date: string) => string;
  organizationCurrencies: OrganizationCurrencyDTO[];
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  return (
    <Card>
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-stone-800">{t('contributions.obligations')}</h2>
          {canManage && (
            <button
              onClick={onAdd}
              className="px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 transition-colors text-sm"
            >
              + {t('contributions.add_obligation')}
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-8 text-stone-400">{t('common.loading')}</div>
        ) : obligations.length === 0 ? (
          <div className="text-center py-8 text-stone-400">{t('contributions.no_obligations')}</div>
        ) : (
          <>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-left text-stone-500">
                  <th className="pb-3 pr-4">{t('contributions.type')}</th>
                  <th className="pb-3 pr-4">{t('contributions.amount')}</th>
                  <th className="pb-3 pr-4">{t('contributions.currency')}</th>
                  <th className="pb-3 pr-4">{t('contributions.frequency')}</th>
                  <th className="pb-3 pr-4">{t('contributions.start_date')}</th>
                  {canManage && <th className="pb-3">{t('common.actions')}</th>}
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
                    {canManage && (
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
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {obligations.map((obl) => (
              <div key={obl.id} className="border border-stone-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-medium text-stone-900">{obl.contributionTypeCode ? getTypeNameByCode(obl.contributionTypeCode) : '-'}</div>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">
                      {t(`contributions.freq_${obl.frequency.toLowerCase()}`)}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-emerald-700">{formatCurrency(obl.amount, obl.currencyCode)}</div>
                    <div className="text-xs text-stone-400">{obl.currencyCode || ''}</div>
                  </div>
                </div>
                <div className="text-xs text-stone-500 mb-3">
                  {formatDate(obl.startDate)}
                </div>
                {canManage && (
                  <div className="flex gap-3 pt-2 border-t border-stone-100">
                    <button onClick={() => onEdit(obl)} className="text-emerald-600 hover:text-emerald-800 text-xs">{t('common.edit')}</button>
                    <button onClick={() => onDelete(obl.id!)} className="text-red-500 hover:text-red-700 text-xs">{t('common.delete')}</button>
                  </div>
                )}
              </div>
            ))}
          </div>
          </>
        )}
      </div>
    </Card>
  );
}

// ===== Payments Tab Component =====
function PaymentsTab({ refreshKey, onTotalChange, onAdd, onEdit, onView, onDelete, onReverse, onReceipt, getTypeNameByCode, formatCurrency, formatDate, organizationCurrencies, types, isSuperAdmin, canReverse, canEditReversal, canDeleteReversal, canCreatePayment, canEditPayment, canDeletePayment, hasManagementPermissions, user, can, t }: {
  refreshKey: number;
  onTotalChange?: (total: number) => void;
  onAdd: () => void;
  onEdit: (p: MemberPayment) => void;
  onView: (p: MemberPayment) => void;
  onDelete: (id: number) => void;
  onReverse: (id: number) => void;
  onReceipt: (p: MemberPayment) => void;
  getTypeNameByCode: (code: string) => string;
  formatCurrency: (amount: number, currencyCode?: string) => string;
  formatDate: (date: string) => string;
  organizationCurrencies: OrganizationCurrencyDTO[];
  types: ContributionType[];
  isSuperAdmin: boolean;
  canReverse: boolean;
  canEditReversal: boolean;
  canDeleteReversal: boolean;
  canCreatePayment: boolean;
  canEditPayment: boolean;
  canDeletePayment: boolean;
  hasManagementPermissions: boolean;
  user: { personId?: string | number; username?: string } | null;
  can: (permission: string) => boolean;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const [payments, setPayments] = useState<MemberPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [personFilter, setPersonFilter] = useState<string>('all');
  const [personFilterName, setPersonFilterName] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Available years for the year filter dropdown — fetched once from full dataset
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  // Person autocomplete filter state
  const [personSearchText, setPersonSearchText] = useState('');
  const [personSearchResults, setPersonSearchResults] = useState<{ id: number; firstName: string; lastName: string }[]>([]);
  const [showPersonDropdown, setShowPersonDropdown] = useState(false);
  const personDropdownRef = useRef<HTMLDivElement>(null);

  // Close person dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (personDropdownRef.current && !personDropdownRef.current.contains(e.target as Node)) {
        setShowPersonDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-filter payments to current user if they don't have management permissions
  useEffect(() => {
    if (!hasManagementPermissions && user?.personId) {
      setPersonFilter(user.personId.toString());
      // Also set name for display (you can improve this by fetching the user's name)
      setPersonFilterName(`${user.username || 'My'} Payments`);
    }
  }, [hasManagementPermissions, user?.personId]);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: currentPage,
        size: pageSize,
        sort: ['person.firstName,asc', 'periodFrom,asc', 'contributionType.code,asc'],
        year: yearFilter !== 'all' ? Number(yearFilter) : undefined,
        personId: personFilter !== 'all' ? Number(personFilter) : undefined,
        contributionTypeId: typeFilter !== 'all' ? Number(typeFilter) : undefined,
      };
      
      // Use /my endpoint only if user has view_self_only AND no management permissions
      const selfOnly = can('contribution.view_self_only') && !hasManagementPermissions && !isSuperAdmin;
      const data = selfOnly
        ? await memberPaymentApi.getCurrentUserPayments(params)
        : await memberPaymentApi.getAllPaginated(params);
      
      const page = data as any;
      setPayments(page.content || data);
      setTotalElements(page.totalElements || (Array.isArray(data) ? data.length : 0));
      setTotalPages(page.totalPages || 1);
    } catch (err) {
      console.error('Failed to load payments:', err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, yearFilter, personFilter, typeFilter, can, hasManagementPermissions, isSuperAdmin]);

  // Load available years once (and on refreshKey changes)
  useEffect(() => {
    const loadYears = async () => {
      try {
        // Fetch a lightweight full list to extract years (no pagination)
        const all = await memberPaymentApi.getAll();
        const years = Array.from(
          new Set(
            all.flatMap((p) => {
              const yrs: number[] = [];
              if (p.periodFrom) yrs.push(new Date(p.periodFrom).getFullYear());
              if (p.paymentDate) yrs.push(new Date(p.paymentDate).getFullYear());
              return yrs;
            })
          )
        ).sort((a, b) => b - a);
        setAvailableYears(years);

        if (onTotalChange) onTotalChange(all.length);
      } catch (err) {
        console.error('Failed to load payment years:', err);
      }
    };
    loadYears();
  }, [refreshKey]);

  // Fetch paginated data when page/size/year/refreshKey changes
  useEffect(() => {
    fetchPayments();
  }, [fetchPayments, refreshKey]);

  // Reset to first page when year filter changes
  const handleYearChange = (value: string) => {
    setYearFilter(value);
    setCurrentPage(0);
  };

  // Reset to first page when person filter changes
  const handlePersonChange = (value: string) => {
    setPersonFilter(value);
    setCurrentPage(0);
  };

  // Reset to first page when type filter changes
  const handleTypeChange = (value: string) => {
    setTypeFilter(value);
    setCurrentPage(0);
  };

  // Person autocomplete search
  const handlePersonSearch = async (query: string) => {
    setPersonSearchText(query);
    if (query.length < 2) {
      setPersonSearchResults([]);
      setShowPersonDropdown(false);
      return;
    }
    try {
      const results = await memberApi.search(query) as any[];
      setPersonSearchResults(results);
      setShowPersonDropdown(results.length > 0);
    } catch (err) {
      console.error('Failed to search persons:', err);
    }
  };

  // Select a person from autocomplete
  const selectPersonFilter = (person: { id: number; firstName: string; lastName: string }) => {
    const name = `${person.firstName} ${person.lastName}`;
    setPersonFilterName(name);
    setPersonSearchText(name);
    handlePersonChange(String(person.id));
    setShowPersonDropdown(false);
    setPersonSearchResults([]);
  };

  // Clear the person filter
  const clearPersonFilter = () => {
    setPersonFilterName('');
    setPersonSearchText('');
    handlePersonChange('all');
    setPersonSearchResults([]);
    setShowPersonDropdown(false);
  };

  // Format a period range with month name prefix
  const formatPeriod = (periodFrom: string, periodTo: string): string => {
    if (!periodFrom || !periodTo) return '-';
    const [fy, fm, fd] = periodFrom.split('-').map(Number);
    const [ty, tm, td] = periodTo.split('-').map(Number);
    const fromDate = new Date(fy, fm - 1, fd);
    const toDate = new Date(ty, tm - 1, td);
    // Check if it spans a full calendar month
    const lastDayOfMonth = new Date(fy, fm, 0).getDate();
    if (fy === ty && fm === tm && fd === 1 && td === lastDayOfMonth) {
      return fromDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }
    // Check if it spans a full calendar year
    if (fy === ty && fm === 1 && fd === 1 && tm === 12 && td === 31) {
      return String(fy);
    }
    const fmtFrom = fromDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const fmtTo = toDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${fmtFrom} \u2014 ${fmtTo}`;
  };

  // Calculate totals per currency for current page
  const pageTotalsByCurrency = payments.reduce<Record<string, number>>((acc, p) => {
    const key = p.currencyCode || '?';
    acc[key] = (acc[key] || 0) + (p.amount || 0);
    return acc;
  }, {});

  // Build a map: originalPaymentId -> reversalPayment (to detect which payments have been reversed)
  const reversedByMap = new Map<number, MemberPayment>();
  payments.forEach((p) => {
    if (p.isReversal && p.reversedPaymentId) {
      reversedByMap.set(p.reversedPaymentId, p);
    }
  });

  // Pagination helpers
  const from = totalElements === 0 ? 0 : currentPage * pageSize + 1;
  const to = Math.min((currentPage + 1) * pageSize, totalElements);

  return (
    <Card>
      <div className="p-6">
        <div className="flex flex-col gap-3 mb-4">
          {/* Title row + Add button */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-stone-800">{t('contributions.payments')}</h2>
              <span className="text-sm text-stone-500">({totalElements})</span>
            </div>
            {(isSuperAdmin || canCreatePayment) && (
              <button
                onClick={onAdd}
                className="px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 transition-colors text-sm"
              >
                + {t('contributions.add_payment')}
              </button>
            )}
          </div>
          {/* Filters row */}
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Person autocomplete - hidden for view-self-only users (who lack management permissions) */}
            {(!can('contribution.view_self_only') || hasManagementPermissions || isSuperAdmin) && (
            <div className="relative w-full sm:w-64" ref={personDropdownRef}>
              <div className="relative">
                <input
                  type="text"
                  value={personSearchText}
                  onChange={(e) => handlePersonSearch(e.target.value)}
                  onFocus={() => { if (personSearchResults.length > 0) setShowPersonDropdown(true); }}
                  placeholder={t('contributions.search_person')}
                  disabled={!hasManagementPermissions}
                  className={`border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500 w-full pr-8 ${!hasManagementPermissions ? 'bg-stone-100 text-stone-500 cursor-not-allowed' : ''}`}
                  title={!hasManagementPermissions ? 'You can only view your own payments' : undefined}
                />
                {personFilter !== 'all' && (
                  <button
                    onClick={clearPersonFilter}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                    title="Clear"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              {showPersonDropdown && personSearchResults.length > 0 && (
                <div className="absolute z-20 mt-1 w-full bg-white border border-stone-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {personSearchResults.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => selectPersonFilter(p)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                    >
                      {p.firstName} {p.lastName}
                    </button>
                  ))}
                </div>
              )}
            </div>
            )}
            {availableYears.length > 0 && (
              <select
                value={yearFilter}
                onChange={(e) => handleYearChange(e.target.value)}
                className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500 w-full sm:w-auto"
              >
                <option value="all">{t('contributions.all_years')}</option>
                {availableYears.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            )}
            {types.length > 0 && (
              <select
                value={typeFilter}
                onChange={(e) => handleTypeChange(e.target.value)}
                className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500 w-full sm:w-auto"
              >
                <option value="all">{t('contributions.all_types')}</option>
                {types.map((ct) => (
                  <option key={ct.id} value={ct.id}>{getTypeNameByCode(ct.code)}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8 text-stone-400">{t('common.loading')}</div>
        ) : payments.length === 0 ? (
          <div className="text-center py-8 text-stone-400">{(yearFilter !== 'all' || personFilter !== 'all' || typeFilter !== 'all') ? t('contributions.no_payments_filter') : t('contributions.no_payments')}</div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
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
                  {payments.map((payment) => {
                    const isRev = payment.isReversal === true;
                    const reversalPayment = reversedByMap.get(payment.id);
                    const hasBeenReversed = !isRev && !!reversalPayment;
                    // Permission logic:
                    // SUPERADMIN: can always edit + delete any payment
                    // For reversals: need contribution.edit_reversal / contribution.delete_reversal
                    // For regular payments: need contribution.edit_payment / contribution.delete_payment
                    const showEdit = isSuperAdmin || (isRev ? canEditReversal : canEditPayment);
                    const showDelete = isSuperAdmin || (isRev ? canDeleteReversal : canDeletePayment);
                    const showReverse = !isRev && !hasBeenReversed && (isSuperAdmin || canReverse);
                    return (
                    <tr key={payment.id} className={`border-b border-stone-100 hover:bg-stone-50 ${isRev ? 'bg-red-50/40' : ''}`}>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <Link href={`/members/${payment.personId}`} className="text-emerald-700 hover:underline">{payment.personName}</Link>
                          {isRev && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700">
                              {t('contributions.reversal')}
                            </span>
                          )}
                          {hasBeenReversed && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                              </svg>
                              {t('contributions.reversed')}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 pr-4">{getTypeNameByCode(payment.contributionTypeCode)}</td>
                      <td className={`py-3 pr-4 font-medium ${isRev ? 'text-red-600' : ''}`}>
                        {formatCurrency(payment.amount, payment.currencyCode)}
                      </td>
                      <td className="py-3 pr-4 text-xs text-stone-500">{payment.currencyCode || '-'}</td>
                      <td className="py-3 pr-4 text-xs text-stone-500">
                        {payment.periodFrom && payment.periodTo
                          ? formatPeriod(payment.periodFrom, payment.periodTo)
                          : '-'}
                      </td>
                      <td className="py-3 pr-4">{formatDate(payment.paymentDate)}</td>
                      <td className="py-3 pr-4 text-xs text-stone-500">
                        <div className="flex items-center gap-1.5">
                          <span>
                            {payment.reference || (hasBeenReversed ? '' : '-')}
                            {hasBeenReversed && reversalPayment && (
                              <span className="text-amber-600">
                                {payment.reference ? ' · ' : ''}#{reversalPayment.id}
                              </span>
                            )}
                          </span>
                          {(payment.documentCount ?? 0) > 0 && (
                            <span className="inline-flex items-center gap-0.5 text-emerald-600" title={t('contributions.documents_attached', { count: payment.documentCount ?? 0 })}>
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                              </svg>
                              <span className="text-[10px] font-medium">{payment.documentCount}</span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => onReceipt(payment)}
                            className="text-stone-500 hover:text-stone-700 text-xs"
                            title={t('receipt.view_receipt')}
                          >
                            <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                          </button>
                          {showReverse && (
                            <button
                              onClick={() => onReverse(payment.id)}
                              className="text-amber-600 hover:text-amber-800 text-xs"
                              title={t('contributions.reverse')}
                            >
                              {t('contributions.reverse')}
                            </button>
                          )}
                          {showEdit ? (
                            <button
                              onClick={() => onEdit(payment)}
                              className="text-emerald-600 hover:text-emerald-800 text-xs"
                            >
                              {t('common.edit')}
                            </button>
                          ) : (
                            <button
                              onClick={() => onView(payment)}
                              className="text-blue-600 hover:text-blue-800 text-xs"
                            >
                              {t('common.view')}
                            </button>
                          )}
                          {showDelete && (
                            <button
                              onClick={() => onDelete(payment.id)}
                              className="text-red-500 hover:text-red-700 text-xs"
                            >
                              {t('common.delete')}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {payments.map((payment) => {
                const isRev = payment.isReversal === true;
                const reversalPayment = reversedByMap.get(payment.id);
                const hasBeenReversed = !isRev && !!reversalPayment;
                const showEdit = isSuperAdmin || (isRev ? canEditReversal : canEditPayment);
                const showDelete = isSuperAdmin || (isRev ? canDeleteReversal : canDeletePayment);
                const showReverse = !isRev && !hasBeenReversed && (isSuperAdmin || canReverse);
                return (
                <div key={payment.id} className={`border rounded-lg p-4 ${isRev ? 'border-red-200 bg-red-50/40' : 'border-stone-200'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-medium text-stone-900 flex items-center gap-2">
                        <Link href={`/members/${payment.personId}`} className="text-emerald-700 hover:underline">{payment.personName}</Link>
                        {isRev && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700">
                            {t('contributions.reversal')}
                          </span>
                        )}
                        {hasBeenReversed && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                            {t('contributions.reversed')}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-stone-500">{getTypeNameByCode(payment.contributionTypeCode)}</div>
                    </div>
                    <div className="text-right">
                      <div className={`font-semibold ${isRev ? 'text-red-600' : 'text-emerald-700'}`}>{formatCurrency(payment.amount, payment.currencyCode)}</div>
                      <div className="text-xs text-stone-400">{payment.currencyCode || ''}</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-500 mb-3">
                    <span>{formatDate(payment.paymentDate)}</span>
                    {payment.periodFrom && payment.periodTo && (
                      <span>{formatPeriod(payment.periodFrom, payment.periodTo)}</span>
                    )}
                    {payment.reference && <span>{payment.reference}</span>}
                    {hasBeenReversed && reversalPayment && (
                      <span className="text-amber-600">#{reversalPayment.id}</span>
                    )}
                    {(payment.documentCount ?? 0) > 0 && (
                      <span className="inline-flex items-center gap-0.5 text-emerald-600">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                        </svg>
                        <span className="text-[10px] font-medium">{payment.documentCount}</span>
                      </span>
                    )}
                  </div>
                  <div className="flex gap-3 pt-2 border-t border-stone-100">
                    <button onClick={() => onReceipt(payment)} className="text-stone-500 hover:text-stone-700 text-xs" title={t('receipt.view_receipt')}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                      </svg>
                    </button>
                    {showReverse && (
                      <button onClick={() => onReverse(payment.id)} className="text-amber-600 hover:text-amber-800 text-xs">{t('contributions.reverse')}</button>
                    )}
                    {showEdit ? (
                      <button onClick={() => onEdit(payment)} className="text-emerald-600 hover:text-emerald-800 text-xs">{t('common.edit')}</button>
                    ) : (
                      <button onClick={() => onView(payment)} className="text-blue-600 hover:text-blue-800 text-xs">{t('common.view')}</button>
                    )}
                    {showDelete && (
                      <button onClick={() => onDelete(payment.id)} className="text-red-500 hover:text-red-700 text-xs">{t('common.delete')}</button>
                    )}
                  </div>
                </div>
                );
              })}
            </div>
            {/* Total summary for current page */}
            <div className="mt-3 pt-3 border-t border-stone-200 flex justify-between items-center">
              <span className="text-sm text-stone-500">
                {t('contributions.showing_entries', { from, to, total: totalElements })}
              </span>
              <span className="text-sm font-medium text-stone-700">
                {t('contributions.total')}:{' '}
                {Object.entries(pageTotalsByCurrency).map(([code, amount], i) => (
                  <span key={code}>
                    {i > 0 && ' | '}
                    {formatCurrency(amount, code)}
                  </span>
                ))}
              </span>
            </div>
            {/* Pagination controls */}
            {totalPages > 1 && (
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-stone-500">{t('contributions.rows_per_page')}</label>
                  <select
                    value={pageSize}
                    onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(0); }}
                    className="border border-stone-300 rounded px-2 py-1 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    {[10, 20, 50, 100].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                    disabled={currentPage === 0}
                    className="px-3 py-1 text-sm border border-stone-300 rounded hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    ‹
                  </button>
                  <span className="text-sm text-stone-600 flex items-center gap-1">
                    {t('contributions.page_prefix')}
                    <input
                      type="number"
                      min={1}
                      max={totalPages}
                      value={currentPage + 1}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val) && val >= 1 && val <= totalPages) {
                          setCurrentPage(val - 1);
                        }
                      }}
                      className="w-12 text-center border border-stone-300 rounded px-1 py-0.5 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                    />
                    {t('contributions.page_of_total', { total: totalPages })}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={currentPage >= totalPages - 1}
                    className="px-3 py-1 text-sm border border-stone-300 rounded hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    ›
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  );
}

// ===== Exemptions Tab Component =====
function ExemptionsTab({ exemptions, loading, canCreate, canEdit, canDelete, onAdd, onEdit, onDelete, getTypeNameByCode, formatDate, t }: {
  exemptions: MemberContributionExemption[];
  loading: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onAdd: () => void;
  onEdit: (e: MemberContributionExemption) => void;
  onDelete: (id: number) => void;
  getTypeNameByCode: (code: string) => string;
  formatDate: (date: string) => string;
  t: (key: string, params?: Record<string, string | number>) => string;
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
          {canCreate && (
            <button
              onClick={onAdd}
              className="px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 transition-colors text-sm"
            >
              + {t('contributions.add_exemption')}
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-8 text-stone-400">{t('common.loading')}</div>
        ) : exemptions.length === 0 ? (
          <div className="text-center py-8 text-stone-400">{t('contributions.no_exemptions')}</div>
        ) : (
          <>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-left text-stone-500">
                  <th className="pb-3 pr-4">{t('contributions.person')}</th>
                  <th className="pb-3 pr-4">{t('contributions.type')}</th>
                  <th className="pb-3 pr-4">{t('contributions.exemption_type')}</th>
                  <th className="pb-3 pr-4">{t('contributions.reason')}</th>
                  <th className="pb-3 pr-4">{t('contributions.start_date')}</th>
                  <th className="pb-3 pr-4">{t('contributions.end_date')}</th>
                  <th className="pb-3 pr-4">{t('contributions.status')}</th>
                  {(canEdit || canDelete) && <th className="pb-3">{t('common.actions')}</th>}
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
                    {(canEdit || canDelete) && (
                      <td className="py-3">
                        <div className="flex gap-2">
                          {canEdit && (
                            <button
                              onClick={() => onEdit(ex)}
                              className="text-emerald-600 hover:text-emerald-800 text-xs"
                            >
                              {t('common.edit')}
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => onDelete(ex.id)}
                              className="text-red-500 hover:text-red-700 text-xs"
                            >
                              {t('common.delete')}
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {exemptions.map((ex) => (
              <div key={ex.id} className="border border-stone-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-medium text-stone-900">{ex.personName}</div>
                    <div className="text-xs text-stone-500 mt-0.5">{getTypeNameByCode(ex.contributionTypeCode)}</div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    ex.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-500'
                  }`}>
                    {ex.isActive ? t('contributions.active') : t('contributions.inactive')}
                  </span>
                </div>
                <div className="space-y-1 text-xs text-stone-500 mb-3">
                  <div>{formatExemptionType(ex.exemptionType, ex.amount)}</div>
                  <div>{formatDate(ex.startDate)} — {ex.endDate ? formatDate(ex.endDate) : t('contributions.ongoing')}</div>
                  {ex.reason && <div className="truncate">{ex.reason}</div>}
                </div>
                {(canEdit || canDelete) && (
                  <div className="flex gap-3 pt-2 border-t border-stone-100">
                    {canEdit && (
                      <button onClick={() => onEdit(ex)} className="text-emerald-600 hover:text-emerald-800 text-xs">{t('common.edit')}</button>
                    )}
                    {canDelete && (
                      <button onClick={() => onDelete(ex.id)} className="text-red-500 hover:text-red-700 text-xs">{t('common.delete')}</button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
          </>
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
  t: (key: string, params?: Record<string, string | number>) => string;
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
                placeholder="e.g. MONTHLY_CONTRIBUTION"
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
function ObligationModal({ obligation, types, organizationCurrencies, onSave, onClose, t }: {
  obligation: ContributionObligation | null;
  types: ContributionType[];
  organizationCurrencies: OrganizationCurrencyDTO[];
  onSave: (data: ContributionObligationCreate) => Promise<string | null>;
  onClose: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
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
              {organizationCurrencies.length === 0 ? (
                <p className="text-xs text-amber-600">{t('contributions.no_currencies')}</p>
              ) : (
                <select
                  value={currencyId || ''}
                  onChange={(e) => setCurrencyId(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="">{t('contributions.select_currency')}</option>
                  {organizationCurrencies.map((mc) => (
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

// ===== Payment View Modal (read-only) =====
function PaymentViewModal({ payment, onClose, getTypeNameByCode, formatCurrency, formatDate, t }: {
  payment: MemberPayment;
  onClose: () => void;
  getTypeNameByCode: (code: string) => string;
  formatCurrency: (amount: number, currencyCode?: string) => string;
  formatDate: (date: string) => string;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const isRev = payment.isReversal === true;
  const [documents, setDocuments] = useState<PaymentDocument[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleteDocId, setDeleteDocId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatPeriod = (from: string, to: string): string => {
    const fd = new Date(from);
    const td = new Date(to);
    const fMonth = fd.toLocaleString(undefined, { month: 'short' });
    const fYear = fd.getFullYear();
    const tMonth = td.toLocaleString(undefined, { month: 'short' });
    const tYear = td.getFullYear();
    if (fYear === tYear && fd.getMonth() === td.getMonth()) return `${fMonth} ${fYear}`;
    if (fYear === tYear) return `${fMonth} – ${tMonth} ${fYear}`;
    return `${fMonth} ${fYear} – ${tMonth} ${tYear}`;
  };

  const loadDocuments = useCallback(async () => {
    if (!payment.paymentGroupId) return;
    setDocsLoading(true);
    try {
      const docs = await paymentDocumentApi.list(payment.paymentGroupId);
      setDocuments(docs);
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setDocsLoading(false);
    }
  }, [payment.paymentGroupId]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !payment.paymentGroupId) return;
    setUploading(true);
    try {
      await paymentDocumentApi.upload(payment.paymentGroupId, file);
      await loadDocuments();
    } catch (err) {
      console.error('Failed to upload document:', err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteDoc = async () => {
    if (deleteDocId === null) return;
    try {
      await paymentDocumentApi.delete(deleteDocId);
      setDocuments(prev => prev.filter(d => d.id !== deleteDocId));
    } catch (err) {
      console.error('Failed to delete document:', err);
    } finally {
      setDeleteDocId(null);
    }
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-stone-900">
              {t('contributions.view_payment')}
            </h2>
            {isRev && (
              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-700">
                {t('contributions.reversal')}
              </span>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide mb-1">{t('contributions.person')}</label>
              <p className="text-sm text-stone-900">{payment.personName}</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide mb-1">{t('contributions.type')}</label>
              <p className="text-sm text-stone-900">{getTypeNameByCode(payment.contributionTypeCode)}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide mb-1">{t('contributions.amount')}</label>
                <p className={`text-sm font-semibold ${isRev ? 'text-red-600' : 'text-stone-900'}`}>
                  {formatCurrency(payment.amount, payment.currencyCode)}
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide mb-1">{t('contributions.currency')}</label>
                <p className="text-sm text-stone-900">{payment.currencyCode || '-'}</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide mb-1">{t('contributions.payment_date')}</label>
              <p className="text-sm text-stone-900">{formatDate(payment.paymentDate)}</p>
            </div>

            {payment.periodFrom && payment.periodTo && (
              <div>
                <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide mb-1">{t('contributions.period')}</label>
                <p className="text-sm text-stone-900">{formatPeriod(payment.periodFrom, payment.periodTo)}</p>
              </div>
            )}

            {payment.reference && (
              <div>
                <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide mb-1">{t('contributions.reference')}</label>
                <p className="text-sm text-stone-900">{payment.reference}</p>
              </div>
            )}

            {payment.notes && (
              <div>
                <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide mb-1">{t('contributions.notes')}</label>
                <p className="text-sm text-stone-900 whitespace-pre-wrap">{payment.notes}</p>
              </div>
            )}

            {payment.createdAt && (
              <div>
                <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide mb-1">{t('common.created_at')}</label>
                <p className="text-sm text-stone-500">{formatDate(payment.createdAt)}</p>
              </div>
            )}

            {/* Documents Section */}
            {payment.paymentGroupId && (
              <div className="pt-4 border-t border-stone-200">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide">
                    {t('contributions.documents')}
                    {documents.length > 0 && (
                      <span className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">
                        {documents.length}
                      </span>
                    )}
                  </label>
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      onChange={handleUpload}
                      accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      {uploading ? t('contributions.uploading_document') : t('contributions.upload_document')}
                    </button>
                  </div>
                </div>

                {docsLoading ? (
                  <p className="text-xs text-stone-400">{t('common.loading')}</p>
                ) : documents.length === 0 ? (
                  <p className="text-xs text-stone-400">{t('contributions.no_documents')}</p>
                ) : (
                  <div className="space-y-2">
                    {documents.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-2.5 bg-stone-50 rounded-lg">
                        <div className="flex items-center gap-2 min-w-0">
                          <svg className="w-4 h-4 text-stone-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-stone-700 truncate">{doc.fileName}</p>
                            <p className="text-[10px] text-stone-400">
                              {formatFileSize(doc.fileSize)}
                              {doc.createdAt && ` \u00B7 ${formatDate(doc.createdAt)}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          <a
                            href={paymentDocumentApi.downloadUrl(doc.id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 text-emerald-600 hover:text-emerald-800 rounded hover:bg-emerald-50 transition-colors"
                            title={t('common.download')}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                          </a>
                          <button
                            onClick={() => setDeleteDocId(doc.id)}
                            className="p-1 text-red-500 hover:text-red-700 rounded hover:bg-red-50 transition-colors"
                            title={t('common.delete')}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end pt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-stone-100 text-stone-700 hover:bg-stone-200 rounded-lg text-sm transition-colors"
            >
              {t('common.close')}
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={deleteDocId !== null}
        title={t('contributions.delete_document_title')}
        message={t('contributions.delete_document_message')}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        variant="danger"
        onConfirm={handleDeleteDoc}
        onCancel={() => setDeleteDocId(null)}
      />
    </div>
  );
}

// ===== Payment Modal =====
function PaymentModal({ payment, types, organizationCurrencies, onSave, onClose, personSearch, personResults, selectedPerson, onSearchPersons, onSelectPerson, getTypeName, t }: {
  payment: MemberPayment | null;
  types: ContributionType[];
  organizationCurrencies: OrganizationCurrencyDTO[];
  onSave: (data: MemberPaymentCreate) => Promise<string | null>;
  onClose: () => void;
  personSearch: string;
  personResults: any[];
  selectedPerson: any;
  onSearchPersons: (query: string) => void;
  onSelectPerson: (person: any) => void;
  getTypeName: (type: ContributionType) => string;
  t: (key: string, params?: Record<string, string | number>) => string;
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
  // For multi-period: amount field = per-unit amount (each record), not the total
  const calculatedAmount = exemptedUnitAmount !== undefined ? exemptedUnitAmount : undefined;

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
                  // Auto-set currency from obligation, or fall back to organization's first currency
                  if (!payment) {
                    if (newObligation?.currencyId) {
                      setCurrencyId(newObligation.currencyId);
                    } else if (organizationCurrencies.length === 1) {
                      setCurrencyId(organizationCurrencies[0].currencyId);
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
              {obligationUnitAmount && !amountManual && frequency && periodCount > 1 && !payment && (
                <p className="mt-1 text-xs text-emerald-600">
                  {t('contributions.will_create_records', { count: periodCount })}: {periodCount} × {exemptedUnitAmount?.toFixed(2)}
                  {activeExemption && exemptedUnitAmount !== undefined && exemptedUnitAmount !== obligationUnitAmount
                    ? ` (${obligationUnitAmount.toFixed(2)} → ${exemptedUnitAmount.toFixed(2)})`
                    : ''}
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
                  âš¡ {t('contributions.exemption_applied')}: {
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
              {organizationCurrencies.length === 0 ? (
                <p className="text-xs text-amber-600">{t('contributions.no_currencies')}</p>
              ) : (
                <select
                  value={currencyId || ''}
                  onChange={(e) => setCurrencyId(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="">{t('contributions.select_currency')}</option>
                  {organizationCurrencies.map((mc) => (
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
  t: (key: string, params?: Record<string, string | number>) => string;
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

// ===== Assignments Tab Component =====
function AssignmentsTab({ assignments, loading, canManage, onAdd, onEdit, onDelete, onToggle, getTypeNameByCode, formatDate, t }: {
  assignments: MemberContributionAssignment[];
  loading: boolean;
  canManage: boolean;
  onAdd: () => void;
  onEdit: (a: MemberContributionAssignment) => void;
  onDelete: (id: number) => void;
  onToggle: (id: number) => void;
  getTypeNameByCode: (code: string) => string;
  formatDate: (date: string) => string;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  return (
    <Card>
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-stone-800">{t('contributions.assignments')}</h2>
          {canManage && (
            <button
              onClick={onAdd}
              className="px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 transition-colors text-sm"
            >
              + {t('contributions.add_assignment')}
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-8 text-stone-400">{t('common.loading')}</div>
        ) : assignments.length === 0 ? (
          <div className="text-center py-8 text-stone-400">{t('contributions.no_assignments')}</div>
        ) : (
          <>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-left text-stone-500">
                  <th className="pb-3 pr-4">{t('contributions.person')}</th>
                  <th className="pb-3 pr-4">{t('contributions.type')}</th>
                  <th className="pb-3 pr-4">{t('contributions.start_date')}</th>
                  <th className="pb-3 pr-4">{t('contributions.end_date')}</th>
                  <th className="pb-3 pr-4">{t('contributions.notes')}</th>
                  <th className="pb-3 pr-4">{t('contributions.status')}</th>
                  {canManage && <th className="pb-3">{t('common.actions')}</th>}
                </tr>
              </thead>
              <tbody>
                {assignments.map((a) => (
                  <tr key={a.id} className="border-b border-stone-100 hover:bg-stone-50">
                    <td className="py-3 pr-4">{a.personName}</td>
                    <td className="py-3 pr-4">{getTypeNameByCode(a.contributionTypeCode)}</td>
                    <td className="py-3 pr-4 text-xs">{formatDate(a.startDate)}</td>
                    <td className="py-3 pr-4 text-xs">{a.endDate ? formatDate(a.endDate) : t('contributions.ongoing')}</td>
                    <td className="py-3 pr-4 text-xs text-stone-500 max-w-[150px] truncate">{a.notes || '-'}</td>
                    <td className="py-3 pr-4">
                      {canManage ? (
                        <button
                          onClick={() => onToggle(a.id)}
                          className={`px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                            a.isActive ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                          }`}
                        >
                          {a.isActive ? t('contributions.active') : t('contributions.inactive')}
                        </button>
                      ) : (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          a.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-500'
                        }`}>
                          {a.isActive ? t('contributions.active') : t('contributions.inactive')}
                        </span>
                      )}
                    </td>
                    {canManage && (
                      <td className="py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => onEdit(a)}
                            className="text-emerald-600 hover:text-emerald-800 text-xs"
                          >
                            {t('common.edit')}
                          </button>
                          <button
                            onClick={() => onDelete(a.id)}
                            className="text-red-500 hover:text-red-700 text-xs"
                          >
                            {t('common.delete')}
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {assignments.map((a) => (
              <div key={a.id} className="border border-stone-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-medium text-stone-900">{a.personName}</div>
                    <div className="text-xs text-stone-500 mt-0.5">{getTypeNameByCode(a.contributionTypeCode)}</div>
                  </div>
                  {canManage ? (
                    <button
                      onClick={() => onToggle(a.id)}
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        a.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-500'
                      }`}
                    >
                      {a.isActive ? t('contributions.active') : t('contributions.inactive')}
                    </button>
                  ) : (
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        a.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-500'
                      }`}
                    >
                      {a.isActive ? t('contributions.active') : t('contributions.inactive')}
                    </span>
                  )}
                </div>
                <div className="space-y-1 text-xs text-stone-500 mb-3">
                  <div>{formatDate(a.startDate)} — {a.endDate ? formatDate(a.endDate) : t('contributions.ongoing')}</div>
                  {a.notes && <div className="truncate">{a.notes}</div>}
                </div>
                {canManage && (
                  <div className="flex gap-3 pt-2 border-t border-stone-100">
                    <button onClick={() => onEdit(a)} className="text-emerald-600 hover:text-emerald-800 text-xs">{t('common.edit')}</button>
                    <button onClick={() => onDelete(a.id)} className="text-red-500 hover:text-red-700 text-xs">{t('common.delete')}</button>
                  </div>
                )}
              </div>
            ))}
          </div>
          </>
        )}
      </div>
    </Card>
  );
}

// ===== Assignment Modal =====
function AssignmentModal({ assignment, types, onSave, onClose, personSearch, personResults, selectedPerson, onSearchPersons, onSelectPerson, getTypeName, t }: {
  assignment: MemberContributionAssignment | null;
  types: ContributionType[];
  onSave: (data: MemberContributionAssignmentCreate) => Promise<string | null>;
  onClose: () => void;
  personSearch: string;
  personResults: any[];
  selectedPerson: any;
  onSearchPersons: (query: string) => void;
  onSelectPerson: (person: any) => void;
  getTypeName: (type: ContributionType) => string;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const [personId, setPersonId] = useState(assignment?.personId || 0);
  const [typeId, setTypeId] = useState(assignment?.contributionTypeId || 0);
  const [startDate, setStartDate] = useState(assignment?.startDate || (() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`; })());
  const [endDate, setEndDate] = useState(assignment?.endDate || '');
  const [notes, setNotes] = useState(assignment?.notes || '');
  const [showPersonDropdown, setShowPersonDropdown] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const finalPersonId = selectedPerson?.id || personId;
    if (!finalPersonId) { setSaving(false); return; }
    const err = await onSave({
      contributionTypeId: typeId,
      personId: Number(finalPersonId),
      startDate,
      endDate: endDate || undefined,
      notes: notes || undefined,
    });
    setSaving(false);
    if (err) setError(err);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-bold text-stone-900 mb-4">
            {assignment ? t('contributions.edit_assignment') : t('contributions.add_assignment')}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Person Search */}
            <div className="relative">
              <label className="block text-sm font-medium text-stone-700 mb-1">{t('contributions.person')}</label>
              {assignment ? (
                <div className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm bg-stone-50">
                  {assignment.personName}
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
                disabled={!!assignment}
              >
                <option value={0} disabled>{t('contributions.select_type')}</option>
                {types.map((type) => (
                  <option key={type.id} value={type.id}>{getTypeName(type)}</option>
                ))}
              </select>
              {!assignment && (
                <p className="text-xs text-stone-400 mt-1">{t('contributions.assignment_required_only')}</p>
              )}
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

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">{t('contributions.notes')}</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                rows={2}
                placeholder={t('contributions.assignment_notes_placeholder')}
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
              <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
