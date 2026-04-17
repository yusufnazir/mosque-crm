'use client';

import { useState, useEffect, useCallback, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { useAuth } from '@/lib/auth/AuthContext';
import ToastNotification from '@/components/ToastNotification';
import ConfirmDialog from '@/components/ConfirmDialog';
import {
  subscriptionApi,
  ChangeSubscriptionPlanResultDTO,
  OrganizationSubscriptionDTO,
  SubscriptionPlanDTO,
  PlanEntitlementDTO,
  FeatureDefinitionDTO,
  CreateSubscriptionPlanEntitlementInput,
  SubscriptionInvoiceDTO,
  RecordSubscriptionPaymentRequest,
} from '@/lib/api';
import { useDateFormat } from '@/lib/DateFormatContext';

// ─── Shared helpers ──────────────────────────────────────────────────────────

function subscriptionStatusBadge(status: string) {
  const map: Record<string, string> = {
    TRIALING: 'bg-blue-100 text-blue-800',
    ACTIVE: 'bg-emerald-100 text-emerald-800',
    PAST_DUE: 'bg-yellow-100 text-yellow-800',
    CANCELED: 'bg-red-100 text-red-800',
    EXPIRED: 'bg-gray-100 text-gray-600',
  };
  return map[status] ?? 'bg-gray-100 text-gray-600';
}

function invoiceStatusBadge(status: string) {
  const map: Record<string, { cls: string; label: string }> = {
    PAID:    { cls: 'bg-emerald-100 text-emerald-800 border border-emerald-200', label: 'Paid' },
    PENDING: { cls: 'bg-yellow-100 text-yellow-800 border border-yellow-200',   label: 'Pending' },
    OVERDUE: { cls: 'bg-red-100 text-red-800 border border-red-200',             label: 'Overdue' },
  };
  const s = map[status];
  return s
    ? <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${s.cls}`}>{s.label}</span>
    : <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">{status}</span>;
}

function formatAmount(amount: number, currency: string) {
  return `${currency ?? ''} ${amount.toFixed(2)}`;
}

// ─── EntitlementsTable ────────────────────────────────────────────────────────

function EntitlementsTable({ entitlements }: { entitlements: PlanEntitlementDTO[] }) {
  const { t } = useTranslation();
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b">
            <th className="text-left py-3 px-4 font-semibold text-gray-700">{t('subscription.feature')}</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-700">{t('subscription.enabled')}</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-700">{t('subscription.limit')}</th>
          </tr>
        </thead>
        <tbody>
          {entitlements.map((e) => (
            <tr key={e.featureKey} className="border-b hover:bg-gray-50 transition">
              <td className="py-3 px-4 font-medium text-gray-800">{e.displayLabel ?? e.featureKey}</td>
              <td className="py-3 px-4">
                {e.enabled ? (
                  <span className="inline-flex items-center gap-1 text-emerald-700">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {t('subscription.yes')}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    {t('subscription.no')}
                  </span>
                )}
              </td>
              <td className="py-3 px-4 text-gray-600">
                {e.limitValue !== null && e.limitValue !== undefined
                  ? e.limitValue === 0
                    ? t('subscription.unlimited')
                    : String(e.limitValue)
                  : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── SubscriptionSection ─────────────────────────────────────────────────────

function SubscriptionSection() {
  const { t } = useTranslation();
  const { can, isSuperAdmin, selectedOrganization, user } = useAuth();

  const [subscription, setSubscription] = useState<OrganizationSubscriptionDTO | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlanDTO[]>([]);
  const [featureDefs, setFeatureDefs] = useState<FeatureDefinitionDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [selectedPlanCode, setSelectedPlanCode] = useState<string>('');
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [startsAt, setStartsAt] = useState<string>(new Date().toISOString().substring(0, 10));
  const [assigning, setAssigning] = useState(false);
  const [assignBillingEnabled, setAssignBillingEnabled] = useState(true);

  const [creatingPlan, setCreatingPlan] = useState(false);
  const [planCodeInput, setPlanCodeInput] = useState('');
  const [planNameInput, setPlanNameInput] = useState('');
  const [planDescriptionInput, setPlanDescriptionInput] = useState('');
  const [planMonthlyPriceInput, setPlanMonthlyPriceInput] = useState('15');
  const [planYearlyPriceInput, setPlanYearlyPriceInput] = useState('150');
  const [planAdminLimitInput, setPlanAdminLimitInput] = useState('2');
  const [planMemberLimitInput, setPlanMemberLimitInput] = useState('');
  const [planFeatureToggles, setPlanFeatureToggles] = useState<Record<string, boolean>>({});
  const [editingPlanCode, setEditingPlanCode] = useState<string | null>(null);
  const [updatingPlan, setUpdatingPlan] = useState(false);
  const [deletePlanDialog, setDeletePlanDialog] = useState<{ open: boolean; code: string; name: string } | null>(null);

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    subscriptionId: number;
    newStatus: string;
    message: string;
  } | null>(null);
  const [changePlanDialog, setChangePlanDialog] = useState<{ open: boolean; plan: SubscriptionPlanDTO } | null>(null);
  const [changingPlan, setChangingPlan] = useState(false);
  const [lastPlanChangeResult, setLastPlanChangeResult] = useState<ChangeSubscriptionPlanResultDTO | null>(null);
  const [planChangePreview, setPlanChangePreview] = useState<ChangeSubscriptionPlanResultDTO | null>(null);
  const [loadingPlanPreview, setLoadingPlanPreview] = useState(false);
  const [togglingBilling, setTogglingBilling] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sub, availablePlans, defs] = await Promise.all([
        subscriptionApi.getCurrent().catch(() => null),
        subscriptionApi.getPlans().catch(() => []),
        subscriptionApi.getFeatureDefinitions().catch(() => []),
      ]);
      setSubscription(sub);
      setPlans(availablePlans as SubscriptionPlanDTO[]);
      setFeatureDefs(defs as FeatureDefinitionDTO[]);
    } catch {
      setToast({ message: t('subscription.load_error'), type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadData(); }, []);

  // Resolve display label from the feature catalogue loaded from DB.
  const featureLabel = useCallback((key: string): string =>
    featureDefs.find((d) => d.featureKey === key)?.displayLabel ?? key,
    [featureDefs]);

  // Single source of truth: derive ordered feature keys from the DB catalogue.
  // LIMIT and BOOLEAN features drive the plan comparison table and creation form.
  // Keys present in plans but not yet in the catalogue are appended at the end.
  const allFeatureKeys = useMemo(() => {
    const dbKeys = new Set(plans.flatMap((p) => p.entitlements.map((e) => e.featureKey)));
    const ordered = featureDefs
      .filter((d) => d.featureType === 'LIMIT' || d.featureType === 'BOOLEAN')
      .map((d) => d.featureKey);
    return [
      ...ordered,
      ...Array.from(dbKeys).filter((k) => !ordered.includes(k)),
    ];
  }, [plans, featureDefs]);

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlanCode) return;
    setAssigning(true);
    try {
      const organizationId = subscription?.organizationId ?? selectedOrganization?.id ?? user?.organizationId;
      if (!organizationId) throw new Error('Select an organization first before assigning a plan.');
      const created = await subscriptionApi.assign({
        organizationId,
        planCode: selectedPlanCode,
        billingCycle,
        startsAt: `${startsAt}T00:00:00`,
        autoRenew: true,
        billingEnabled: assignBillingEnabled,
      });
      setSubscription(created);
      setToast({ message: t('subscription.assign_success'), type: 'success' });
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : t('subscription.assign_error'), type: 'error' });
    } finally {
      setAssigning(false);
    }
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingPlan(true);
    try {
      const entitlements: CreateSubscriptionPlanEntitlementInput[] = allFeatureKeys.map((featureKey) => {
        const enabled = Boolean(planFeatureToggles[featureKey]);
        const entry: CreateSubscriptionPlanEntitlementInput = { featureKey, enabled };
        if (featureKey === 'admin.users.max') {
          const parsed = Number(planAdminLimitInput);
          entry.limitValue = Number.isFinite(parsed) && parsed > 0 ? parsed : null;
        }
        if (featureKey === 'members.max') {
          const parsed = Number(planMemberLimitInput);
          entry.limitValue = Number.isFinite(parsed) && parsed > 0 ? parsed : null;
        }
        return entry;
      });
      const created = await subscriptionApi.createPlan({
        code: planCodeInput.trim().toUpperCase(),
        name: planNameInput.trim(),
        description: planDescriptionInput.trim() || undefined,
        monthlyPrice: Number(planMonthlyPriceInput),
        yearlyPrice: Number(planYearlyPriceInput),
        isActive: true,
        entitlements,
      });
      setPlans((prev) => [created, ...prev]);
      setSelectedPlanCode(created.code);
      setToast({ message: 'Subscription plan created successfully', type: 'success' });
      setPlanCodeInput('');
      setPlanNameInput('');
      setPlanDescriptionInput('');
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : 'Failed to create subscription plan', type: 'error' });
    } finally {
      setCreatingPlan(false);
    }
  };

  const startEditPlan = (plan: SubscriptionPlanDTO) => {
    setEditingPlanCode(plan.code);
    setPlanCodeInput(plan.code);
    setPlanNameInput(plan.name);
    setPlanDescriptionInput(plan.description ?? '');
    setPlanMonthlyPriceInput(String(plan.monthlyPrice));
    setPlanYearlyPriceInput(String(plan.yearlyPrice));
    const toggles: Record<string, boolean> = {};
    allFeatureKeys.forEach((key) => { toggles[key] = false; });
    plan.entitlements.forEach((e) => {
      toggles[e.featureKey] = e.enabled;
      if (e.featureKey === 'admin.users.max' && e.limitValue != null) setPlanAdminLimitInput(String(e.limitValue));
      if (e.featureKey === 'members.max' && e.limitValue != null) setPlanMemberLimitInput(String(e.limitValue));
    });
    setPlanFeatureToggles(toggles);
  };

  const cancelEditPlan = () => {
    setEditingPlanCode(null);
    setPlanCodeInput('');
    setPlanNameInput('');
    setPlanDescriptionInput('');
  };

  const handleUpdatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlanCode) return;
    setUpdatingPlan(true);
    try {
      const entitlements: CreateSubscriptionPlanEntitlementInput[] = allFeatureKeys.map((featureKey) => {
        const enabled = Boolean(planFeatureToggles[featureKey]);
        const entry: CreateSubscriptionPlanEntitlementInput = { featureKey, enabled };
        if (featureKey === 'admin.users.max') {
          const parsed = Number(planAdminLimitInput);
          entry.limitValue = Number.isFinite(parsed) && parsed > 0 ? parsed : null;
        }
        if (featureKey === 'members.max') {
          const parsed = Number(planMemberLimitInput);
          entry.limitValue = Number.isFinite(parsed) && parsed > 0 ? parsed : null;
        }
        return entry;
      });
      const updated = await subscriptionApi.updatePlan(editingPlanCode, {
        name: planNameInput.trim(),
        description: planDescriptionInput.trim() || undefined,
        monthlyPrice: Number(planMonthlyPriceInput),
        yearlyPrice: Number(planYearlyPriceInput),
        isActive: true,
        entitlements,
      });
      setPlans((prev) => prev.map((p) => (p.code === updated.code ? updated : p)));
      setToast({ message: 'Subscription plan updated successfully', type: 'success' });
      cancelEditPlan();
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : 'Failed to update subscription plan', type: 'error' });
    } finally {
      setUpdatingPlan(false);
    }
  };

  const confirmDeletePlan = async () => {
    if (!deletePlanDialog) return;
    try {
      await subscriptionApi.deletePlan(deletePlanDialog.code);
      setPlans((prev) => prev.filter((p) => p.code !== deletePlanDialog.code));
      if (selectedPlanCode === deletePlanDialog.code) setSelectedPlanCode('');
      if (editingPlanCode === deletePlanDialog.code) cancelEditPlan();
      setToast({ message: 'Subscription plan deleted successfully', type: 'success' });
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : 'Failed to delete subscription plan', type: 'error' });
    } finally {
      setDeletePlanDialog(null);
    }
  };

  const planPriceForCycle = (plan: SubscriptionPlanDTO, cycle: 'MONTHLY' | 'YEARLY') =>
    cycle === 'YEARLY' ? plan.yearlyPrice : plan.monthlyPrice;

  const normalizeCycle = (cycle?: string): 'MONTHLY' | 'YEARLY' =>
    cycle === 'YEARLY' ? 'YEARLY' : 'MONTHLY';

  const planChangeLabel = (candidatePlan: SubscriptionPlanDTO) => {
    if (!subscription) return 'Choose Plan';
    const cycle = normalizeCycle(subscription.billingCycle);
    const currentPrice = planPriceForCycle(subscription.plan, cycle);
    const candidatePrice = planPriceForCycle(candidatePlan, cycle);
    if (candidatePrice > currentPrice) return 'Upgrade';
    if (candidatePrice < currentPrice) return 'Downgrade';
    return 'Switch Plan';
  };

  const activePlans = plans.filter((plan) => plan.isActive).slice().sort((a, b) => a.monthlyPrice - b.monthlyPrice);

  const comparisonFeatureKeys = allFeatureKeys;

  const getPlanEntitlement = (plan: SubscriptionPlanDTO, featureKey: string): PlanEntitlementDTO | null =>
    plan.entitlements.find((e) => e.featureKey === featureKey) ?? null;

  const formatLimit = (limitValue: number | null | undefined): string => {
    if (limitValue == null) return 'No limit';
    if (limitValue === 0) return 'Unlimited';
    return String(limitValue);
  };

  const getPlanChangeSummary = (targetPlan: SubscriptionPlanDTO) => {
    if (!subscription) return <p className="text-sm">Are you sure you want to switch to {targetPlan.name}?</p>;
    const cycle = normalizeCycle(subscription.billingCycle);
    const currentPrice = planPriceForCycle(subscription.plan, cycle);
    const targetPrice = planPriceForCycle(targetPlan, cycle);
    const delta = targetPrice - currentPrice;
    const cycleLabel = cycle === 'YEARLY' ? 'year' : 'month';
    const hasPreview = planChangePreview !== null && changePlanDialog?.plan.code === targetPlan.code;
    const previewAmount = hasPreview ? Number(planChangePreview.amountDueNow ?? 0) : null;
    const previewDays = hasPreview ? planChangePreview.remainingDays : null;
    const previewEffectiveAt = hasPreview ? planChangePreview.effectiveAt : null;

    const changedFeatures = comparisonFeatureKeys.map((featureKey) => {
      const cur = getPlanEntitlement(subscription.plan, featureKey);
      const tgt = getPlanEntitlement(targetPlan, featureKey);
      const curEnabled = Boolean(cur?.enabled);
      const tgtEnabled = Boolean(tgt?.enabled);
      if (curEnabled !== tgtEnabled) return `${featureLabel(featureKey)}: ${tgtEnabled ? 'included' : 'not included'}`;
      if (tgtEnabled && cur?.limitValue !== tgt?.limitValue)
        return `${featureLabel(featureKey)}: ${formatLimit(cur?.limitValue)} -> ${formatLimit(tgt?.limitValue)}`;
      return null;
    }).filter((item): item is string => item !== null).slice(0, 5);

    return (
      <div className="space-y-2 text-sm">
        <p>Switching from <span className="font-semibold">{subscription.plan.name}</span> to <span className="font-semibold">{targetPlan.name}</span>.</p>
        <p>Price change: <span className="font-semibold">${Math.abs(delta).toFixed(2)}</span> {delta >= 0 ? 'more' : 'less'} per {cycleLabel}.</p>
        {loadingPlanPreview && <p className="text-xs text-stone-500">Calculating proration preview...</p>}
        {hasPreview && previewAmount !== null && (
          <p>{previewAmount > 0
            ? `Amount due now: $${previewAmount.toFixed(2)} for ${previewDays ?? 0} remaining day(s).`
            : `No charge due now. Change effective on ${new Date(previewEffectiveAt as string).toLocaleDateString()}.`}
          </p>
        )}
        {changedFeatures.length > 0 && (
          <div>
            <p className="font-medium">Key feature differences:</p>
            <ul className="mt-1 space-y-1 list-disc pl-5">{changedFeatures.map((line) => <li key={line}>{line}</li>)}</ul>
          </div>
        )}
      </div>
    );
  };

  const confirmPlanChange = async () => {
    if (!changePlanDialog) return;
    setChangingPlan(true);
    try {
      if (!subscription) {
        const created = await subscriptionApi.choosePlan({ planCode: changePlanDialog.plan.code });
        setSubscription(created);
        setToast({ message: t('subscription.assign_success'), type: 'success' });
      } else {
        const result = await subscriptionApi.changePlan({ planCode: changePlanDialog.plan.code });
        setLastPlanChangeResult(result);
        setSubscription(result.subscription);
        if (result.action === 'UPGRADE_IMMEDIATE') {
          setToast({ message: `Upgrade applied. Amount due now: $${Number(result.amountDueNow).toFixed(2)} for ${result.remainingDays} remaining day(s).`, type: 'success' });
        } else {
          setToast({ message: `Downgrade scheduled. Your current plan stays active until ${new Date(result.effectiveAt).toLocaleDateString()}.`, type: 'success' });
        }
      }
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : 'Failed to update subscription plan', type: 'error' });
    } finally {
      setChangingPlan(false);
      setChangePlanDialog(null);
    }
  };

  const openPlanChangeDialog = async (plan: SubscriptionPlanDTO) => {
    setChangePlanDialog({ open: true, plan });
    setPlanChangePreview(null);
    if (!subscription) return;
    setLoadingPlanPreview(true);
    try {
      const preview = await subscriptionApi.previewPlanChange({ planCode: plan.code });
      setPlanChangePreview(preview);
    } catch { /* keep dialog usable */ } finally {
      setLoadingPlanPreview(false);
    }
  };

  const requestStatusChange = (newStatus: string) => {
    if (!subscription) return;
    setConfirmDialog({ open: true, subscriptionId: subscription.id, newStatus, message: t('subscription.confirm_status_change', { status: newStatus }) });
  };

  const confirmStatusChange = async () => {
    if (!confirmDialog) return;
    try {
      const updated = await subscriptionApi.updateStatus(confirmDialog.subscriptionId, confirmDialog.newStatus);
      setSubscription(updated);
      setToast({ message: t('subscription.status_updated'), type: 'success' });
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : t('subscription.status_update_error'), type: 'error' });
    } finally {
      setConfirmDialog(null);
    }
  };

  const handleToggleBillingEnabled = async () => {
    if (!subscription) return;
    const newValue = !(subscription.billingEnabled !== false);
    setTogglingBilling(true);
    try {
      const updated = await subscriptionApi.updateBillingEnabled(subscription.id, newValue);
      setSubscription(updated);
      setToast({ message: newValue ? t('subscription.billing_enabled') + ' enabled' : t('subscription.no_billing') + ' — billing disabled', type: 'success' });
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : 'Failed to update billing setting', type: 'error' });
    } finally {
      setTogglingBilling(false);
    }
  };

  if (!can('subscription.view') && !isSuperAdmin) {
    return <p className="text-red-500 py-4">{t('common_extra.access_denied')}</p>;
  }

  return (
    <div className="max-w-5xl">
      {toast && <ToastNotification message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {confirmDialog && (
        <ConfirmDialog
          open={confirmDialog.open}
          title={t('subscription.confirm_status_title')}
          message={confirmDialog.message}
          confirmLabel={t('common.save')}
          cancelLabel={t('common.cancel')}
          variant="warning"
          onConfirm={confirmStatusChange}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
      {deletePlanDialog && (
        <ConfirmDialog
          open={deletePlanDialog.open}
          title="Delete Subscription Plan"
          message={`Are you sure you want to delete plan ${deletePlanDialog.name} (${deletePlanDialog.code})?`}
          confirmLabel="Delete"
          cancelLabel="Cancel"
          variant="danger"
          onConfirm={confirmDeletePlan}
          onCancel={() => setDeletePlanDialog(null)}
        />
      )}
      {changePlanDialog && (
        <ConfirmDialog
          open={changePlanDialog.open}
          title="Confirm Plan Change"
          message={getPlanChangeSummary(changePlanDialog.plan)}
          confirmLabel={changingPlan ? 'Updating...' : 'Confirm'}
          confirmDisabled={loadingPlanPreview || changingPlan}
          cancelLabel="Cancel"
          variant="warning"
          onConfirm={confirmPlanChange}
          onCancel={() => { setChangePlanDialog(null); setPlanChangePreview(null); }}
        />
      )}

      {!isSuperAdmin && lastPlanChangeResult && (
        <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-900">
          {lastPlanChangeResult.action === 'UPGRADE_IMMEDIATE' ? (
            <p className="text-sm">Upgrade completed. Amount due now: <span className="font-semibold">${Number(lastPlanChangeResult.amountDueNow).toFixed(2)}</span> for {lastPlanChangeResult.remainingDays} remaining day(s).</p>
          ) : (
            <p className="text-sm">Downgrade scheduled. Effective on <span className="font-semibold">{new Date(lastPlanChangeResult.effectiveAt).toLocaleDateString()}</span>.</p>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-700" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Current Subscription Card */}
          {subscription ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{subscription.plan.name}</h2>
                  {subscription.plan.description && <p className="text-gray-500 text-sm mt-1">{subscription.plan.description}</p>}
                </div>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${subscriptionStatusBadge(subscription.status)}`}>
                  {subscription.status}
                </span>
                {subscription.billingEnabled === false && (
                  <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700">{t('subscription.no_billing')}</span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">{t('subscription.billing_cycle')}</p>
                  <p className="font-semibold text-gray-800 capitalize">{subscription.billingCycle.toLowerCase()}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">{t('subscription.price')}</p>
                  <p className="font-semibold text-gray-800">
                    {subscription.billingEnabled === false
                      ? t('subscription.free')
                      : subscription.billingCycle === 'YEARLY'
                        ? `$${subscription.plan.yearlyPrice}/yr`
                        : `$${subscription.plan.monthlyPrice}/mo`}
                  </p>
                </div>
                {isSuperAdmin && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">{t('subscription.billing_enabled')}</p>
                    {subscription.billingEnabled === false ? (
                      <span className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                        {t('subscription.no_billing')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        {t('subscription.billing_enabled')}
                      </span>
                    )}
                  </div>
                )}
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">{t('subscription.starts_at')}</p>
                  <p className="font-semibold text-gray-800">{new Date(subscription.startsAt).toLocaleDateString()}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">{t('subscription.expires_at')}</p>
                  <p className="font-semibold text-gray-800">{subscription.endsAt ? new Date(subscription.endsAt).toLocaleDateString() : t('subscription.no_expiry')}</p>
                </div>
              </div>

              <h3 className="text-base font-semibold text-gray-800 mb-3">{t('subscription.entitlements')}</h3>
              <EntitlementsTable entitlements={subscription.plan.entitlements} />

              {isSuperAdmin && (
                <div className="mt-6 pt-4 border-t flex flex-wrap gap-3 items-center">
                  {subscription.status === 'ACTIVE' && (
                    <>
                      <button onClick={() => requestStatusChange('PAST_DUE')} className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg text-sm font-medium hover:bg-yellow-200 transition">{t('subscription.suspend')}</button>
                      <button onClick={() => requestStatusChange('CANCELED')} className="px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition">{t('subscription.cancel')}</button>
                    </>
                  )}
                  {(subscription.status === 'PAST_DUE' || subscription.status === 'CANCELED' || subscription.status === 'EXPIRED') && (
                    <button onClick={() => requestStatusChange('ACTIVE')} className="px-4 py-2 bg-emerald-100 text-emerald-800 rounded-lg text-sm font-medium hover:bg-emerald-200 transition">{t('subscription.reactivate')}</button>
                  )}
                  <div className="ml-auto flex items-center gap-2">
                    <span className="text-sm text-gray-600">{t('subscription.billing_enabled')}</span>
                    <button
                      type="button"
                      disabled={togglingBilling}
                      onClick={handleToggleBillingEnabled}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${subscription.billingEnabled !== false ? 'bg-emerald-600' : 'bg-gray-300'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${subscription.billingEnabled !== false ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center">
              <div className="text-gray-400 mb-3">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-gray-500">{t('subscription.no_subscription')}</p>
              {!isSuperAdmin && <p className="text-gray-400 text-sm mt-1">{t('subscription.contact_admin')}</p>}
              {isSuperAdmin && plans.length === 0 && (
                <p className="text-amber-700 text-sm mt-2">No subscription plans are configured yet. Add plan seed data in the backend database first.</p>
              )}
            </div>
          )}

          {/* Assign Plan (super-admin only) */}
          {isSuperAdmin && plans.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-5">{t('subscription.assign_plan')}</h2>
              <form onSubmit={handleAssign} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('subscription.select_plan')}</label>
                  <select value={selectedPlanCode} onChange={(e) => setSelectedPlanCode(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent" required>
                    <option value="">{t('subscription.select_plan_placeholder')}</option>
                    {plans.map((p) => <option key={p.id} value={p.code}>{p.name} — ${p.monthlyPrice}/mo · ${p.yearlyPrice}/yr</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('subscription.billing_cycle')}</label>
                  <div className="flex gap-3">
                    {(['MONTHLY', 'YEARLY'] as const).map((cycle) => (
                      <label key={cycle} className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="billingCycle" value={cycle} checked={billingCycle === cycle} onChange={() => setBillingCycle(cycle)} className="accent-emerald-700" />
                        <span className="text-sm text-gray-700 capitalize">{cycle.toLowerCase()}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('subscription.starts_at')}</label>
                  <input type="date" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent" required />
                </div>
                {selectedPlanCode !== '' && (() => {
                  const p = plans.find((pl) => pl.code === selectedPlanCode);
                  return p ? (
                    <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-4">
                      <p className="text-sm font-semibold text-emerald-800 mb-2">{p.name}</p>
                      <EntitlementsTable entitlements={p.entitlements} />
                    </div>
                  ) : null;
                })()}
                <div className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 bg-gray-50">
                  <input type="checkbox" id="assignBillingEnabled" checked={assignBillingEnabled} onChange={(e) => setAssignBillingEnabled(e.target.checked)} className="accent-emerald-700 mt-0.5" />
                  <label htmlFor="assignBillingEnabled" className="text-sm text-gray-700">
                    <span className="font-medium">{t('subscription.billing_enabled')}</span>
                    <p className="text-xs text-gray-500 mt-0.5">{t('subscription.billing_enabled_help')}</p>
                  </label>
                </div>
                <button type="submit" disabled={assigning || !selectedPlanCode} className="px-6 py-2.5 bg-emerald-700 text-white rounded-lg font-semibold hover:bg-emerald-800 transition disabled:opacity-50 disabled:cursor-not-allowed">
                  {assigning ? t('subscription.assigning') : t('subscription.assign')}
                </button>
              </form>
            </div>
          )}

          {/* Self-service plan chooser (non-admin) */}
          {!isSuperAdmin && plans.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-5">Available Plans</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {activePlans.map((plan) => {
                  const isCurrent = subscription?.plan.code === plan.code;
                  return (
                    <div key={plan.id} className={`border rounded-xl p-4 ${isCurrent ? 'border-emerald-300 bg-emerald-50/40' : 'border-gray-200'}`}>
                      <div className="flex items-start justify-between mb-2 gap-2">
                        <h3 className="font-semibold text-gray-900">{plan.name}</h3>
                        {isCurrent && <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Current</span>}
                      </div>
                      {plan.description && <p className="text-xs text-gray-500 mb-3">{plan.description}</p>}
                      <div className="flex gap-3 mb-3 text-sm">
                        <span className="text-gray-700">${plan.monthlyPrice}<span className="text-gray-400">/mo</span></span>
                        <span className="text-gray-400">·</span>
                        <span className="text-gray-700">${plan.yearlyPrice}<span className="text-gray-400">/yr</span></span>
                      </div>
                      <button
                        type="button"
                        disabled={isCurrent || changingPlan}
                        onClick={() => { void openPlanChangeDialog(plan); }}
                        className="w-full px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-700 text-white hover:bg-emerald-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isCurrent ? 'Current Plan' : planChangeLabel(plan)}
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="mt-8">
                <h3 className="text-base font-semibold text-gray-900 mb-3">Compare Plans</h3>
                <div className="md:hidden space-y-3">
                  {comparisonFeatureKeys.map((featureKey) => (
                    <div key={featureKey} className="border border-gray-200 rounded-lg p-3">
                      <p className="font-medium text-gray-800 mb-2">{featureLabel(featureKey)}</p>
                      <div className="space-y-2">
                        {activePlans.map((plan) => {
                          const ent = getPlanEntitlement(plan, featureKey);
                          const enabled = Boolean(ent?.enabled);
                          const limit = ent?.limitValue;
                          const isCurrent = subscription?.plan.code === plan.code;
                          return (
                            <div key={`${featureKey}-${plan.code}`} className="flex items-start justify-between gap-3 text-sm">
                              <div className="text-gray-700">{plan.name}{isCurrent && <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Current</span>}</div>
                              <div className="text-right">
                                <div className={enabled ? 'text-emerald-700' : 'text-gray-400'}>{enabled ? 'Included' : 'Not included'}</div>
                                {enabled && <div className="text-xs text-gray-500 mt-0.5">{limit == null ? 'No limit' : limit === 0 ? 'Unlimited' : `Limit: ${limit}`}</div>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="hidden md:block overflow-x-auto rounded-lg border border-gray-200">
                  <table className="min-w-[720px] w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Feature</th>
                        {activePlans.map((plan) => (
                          <th key={plan.code} className="text-left py-3 px-4 font-semibold text-gray-700 min-w-[170px]">
                            <div className="flex items-center gap-2">
                              {plan.name}
                              {subscription?.plan.code === plan.code && <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Current</span>}
                            </div>
                            <p className="text-xs font-normal text-gray-500 mt-1">${plan.monthlyPrice}/mo · ${plan.yearlyPrice}/yr</p>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {comparisonFeatureKeys.map((featureKey) => (
                        <tr key={featureKey} className="border-b border-gray-100 last:border-b-0">
                          <td className="py-3 px-4 font-medium text-gray-800">{featureLabel(featureKey)}</td>
                          {activePlans.map((plan) => {
                            const ent = getPlanEntitlement(plan, featureKey);
                            const enabled = Boolean(ent?.enabled);
                            const limit = ent?.limitValue;
                            return (
                              <td key={`${plan.code}-${featureKey}`} className="py-3 px-4 align-top">
                                {enabled ? (
                                  <span className="inline-flex items-center gap-1 text-emerald-700">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                    Included
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-gray-400">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                    Not included
                                  </span>
                                )}
                                {enabled && <p className="text-xs text-gray-500 mt-1">{limit == null ? 'No limit' : limit === 0 ? 'Unlimited' : `Limit: ${limit}`}</p>}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Create / Edit Plan (super-admin) */}
          {isSuperAdmin && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-5">
                {editingPlanCode ? `Edit Subscription Plan (${editingPlanCode})` : 'Create Subscription Plan'}
              </h2>
              <form onSubmit={editingPlanCode ? handleUpdatePlan : handleCreatePlan} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Plan Code</label>
                    <input type="text" value={planCodeInput} onChange={(e) => setPlanCodeInput(e.target.value.toUpperCase())} placeholder="STARTER" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent" disabled={Boolean(editingPlanCode)} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Plan Name</label>
                    <input type="text" value={planNameInput} onChange={(e) => setPlanNameInput(e.target.value)} placeholder="Starter" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent" required />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea value={planDescriptionInput} onChange={(e) => setPlanDescriptionInput(e.target.value)} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Price</label>
                    <input type="number" min="0" step="0.01" value={planMonthlyPriceInput} onChange={(e) => setPlanMonthlyPriceInput(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Yearly Price</label>
                    <input type="number" min="0" step="0.01" value={planYearlyPriceInput} onChange={(e) => setPlanYearlyPriceInput(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Admin Users Limit</label>
                    <input type="number" min="1" step="1" value={planAdminLimitInput} onChange={(e) => setPlanAdminLimitInput(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Member Limit</label>
                    <input type="number" min="0" step="1" value={planMemberLimitInput} onChange={(e) => setPlanMemberLimitInput(e.target.value)} placeholder="Empty = unlimited" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent" />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Feature Entitlements</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {allFeatureKeys.map((featureKey) => (
                      <label key={featureKey} className="flex items-center gap-2 text-sm text-gray-700">
                        <input type="checkbox" checked={Boolean(planFeatureToggles[featureKey])} onChange={(e) => setPlanFeatureToggles((prev) => ({ ...prev, [featureKey]: e.target.checked }))} className="accent-emerald-700" />
                        <span>{featureLabel(featureKey)}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button type="submit" disabled={creatingPlan || updatingPlan} className="px-6 py-2.5 bg-emerald-700 text-white rounded-lg font-semibold hover:bg-emerald-800 transition disabled:opacity-50 disabled:cursor-not-allowed">
                    {editingPlanCode ? (updatingPlan ? 'Updating Plan...' : 'Update Plan') : (creatingPlan ? 'Creating Plan...' : 'Create Plan')}
                  </button>
                  {editingPlanCode && (
                    <button type="button" onClick={cancelEditPlan} className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition">Cancel Edit</button>
                  )}
                </div>
              </form>
            </div>
          )}

          {isSuperAdmin && plans.length === 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800">
              <p className="font-semibold">Subscription plans missing</p>
              <p className="text-sm mt-1">The API returned an empty list for /subscription/plans. Create seed records for subscription_plans and plan_entitlements, then refresh this page.</p>
            </div>
          )}

          {/* Available Plans overview (super-admin) */}
          {isSuperAdmin && plans.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-5">{t('subscription.available_plans')}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {plans.map((plan) => (
                  <div key={plan.id} className="border border-gray-200 rounded-xl p-4 hover:border-emerald-300 transition">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-gray-900">{plan.name}</h3>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${plan.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                          {plan.isActive ? t('subscription.active') : t('subscription.inactive')}
                        </span>
                        <button type="button" onClick={() => startEditPlan(plan)} className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700 hover:bg-blue-200">Edit</button>
                        <button type="button" onClick={() => setDeletePlanDialog({ open: true, code: plan.code, name: plan.name })} className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700 hover:bg-red-200">Delete</button>
                      </div>
                    </div>
                    {plan.description && <p className="text-xs text-gray-500 mb-3">{plan.description}</p>}
                    <div className="flex gap-3 mb-3 text-sm">
                      <span className="text-gray-700">${plan.monthlyPrice}<span className="text-gray-400">/mo</span></span>
                      <span className="text-gray-400">·</span>
                      <span className="text-gray-700">${plan.yearlyPrice}<span className="text-gray-400">/yr</span></span>
                    </div>
                    <ul className="space-y-1">
                      {[
                        // ALWAYS_ON features first — true for every plan
                        ...featureDefs
                          .filter((d) => d.featureType === 'ALWAYS_ON')
                          .map((d) => ({
                            featureKey: d.featureKey,
                            enabled: true,
                            limitValue: null as number | null,
                            displayLabel: d.displayLabel,
                            sortOrder: d.sortOrder,
                          })),
                        // Then the plan's own entitlements (already sorted by sortOrder from backend)
                        ...plan.entitlements,
                      ].map((e) => (
                        <li key={e.featureKey} className="flex items-center gap-2 text-xs text-gray-600">
                          {e.enabled ? (
                            <svg className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                          ) : (
                            <svg className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                          )}
                          <span className={e.enabled ? '' : 'text-gray-400'}>{featureLabel(e.featureKey)}{e.limitValue != null && e.limitValue > 0 ? ` (max ${e.limitValue})` : ''}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── InvoicesSection ─────────────────────────────────────────────────────────

function InvoicesSection() {
  const { t } = useTranslation();
  const { isSuperAdmin, can } = useAuth();
  const { formatDate } = useDateFormat();

  const [invoices, setInvoices] = useState<SubscriptionInvoiceDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [deleteInvoice, setDeleteInvoice] = useState<SubscriptionInvoiceDTO | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [runningBillingJob, setRunningBillingJob] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [paymentInvoice, setPaymentInvoice] = useState<SubscriptionInvoiceDTO | null>(null);
  const [paymentForm, setPaymentForm] = useState<RecordSubscriptionPaymentRequest>({ amount: 0, currency: 'EUR', paymentMethod: '', reference: '' });
  const [submittingPayment, setSubmittingPayment] = useState(false);

  const isAdmin = isSuperAdmin || can('billing.manage');

  const loadInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const data = await subscriptionApi.getInvoices();
      setInvoices(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      setToast({ message: (err as Error)?.message ?? 'Failed to load invoices', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadInvoices(); }, [loadInvoices]);

  const handleDownload = async (invoice: SubscriptionInvoiceDTO) => {
    setDownloadingId(invoice.id);
    try {
      await subscriptionApi.downloadInvoicePdf(invoice.id);
    } catch (err: unknown) {
      setToast({ message: (err as Error)?.message ?? t('billing.download_error'), type: 'error' });
    } finally {
      setDownloadingId(null);
    }
  };

  const openPaymentDialog = (invoice: SubscriptionInvoiceDTO) => {
    setPaymentForm({ amount: invoice.amount, currency: invoice.currency ?? 'EUR', paymentMethod: '', reference: '' });
    setPaymentInvoice(invoice);
  };

  const handleRunBillingNow = async () => {
    setRunningBillingJob(true);
    try {
      const response = await fetch('/api/configurations/billing-scheduler/run', { method: 'POST' });
      if (response.ok) {
        setToast({ message: t('billing.run_success'), type: 'success' });
        loadInvoices();
      } else {
        setToast({ message: t('billing.run_error'), type: 'error' });
      }
    } catch {
      setToast({ message: t('billing.run_error'), type: 'error' });
    } finally {
      setRunningBillingJob(false);
    }
  };

  const handleDeleteInvoice = async () => {
    if (!deleteInvoice) return;
    setDeletingId(deleteInvoice.id);
    try {
      await subscriptionApi.deleteInvoice(deleteInvoice.id);
      setToast({ message: t('billing.invoice_deleted'), type: 'success' });
      setDeleteInvoice(null);
      loadInvoices();
    } catch (err: unknown) {
      setToast({ message: (err as Error)?.message ?? t('billing.delete_error'), type: 'error' });
    } finally {
      setDeletingId(null);
    }
  };

  const handleRecordPayment = async () => {
    if (!paymentInvoice) return;
    setSubmittingPayment(true);
    try {
      await subscriptionApi.recordPayment(paymentInvoice.id, paymentForm);
      setToast({ message: t('billing.payment_recorded'), type: 'success' });
      setPaymentInvoice(null);
      loadInvoices();
    } catch (err: unknown) {
      setToast({ message: (err as Error)?.message ?? t('billing.payment_error'), type: 'error' });
    } finally {
      setSubmittingPayment(false);
    }
  };

  return (
    <div>
      {toast && <ToastNotification message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Toolbar */}
      <div className="mb-6 flex items-center justify-end">
        {isSuperAdmin && (
          <button
            onClick={handleRunBillingNow}
            disabled={runningBillingJob}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-stone-800 hover:bg-stone-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition whitespace-nowrap"
          >
            {runningBillingJob ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                {t('billing.running')}
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {t('billing.run_now')}
              </>
            )}
          </button>
        )}
      </div>

      {/* Invoice table */}
      <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-stone-400">
            <svg className="animate-spin w-6 h-6 mr-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Loading…
          </div>
        ) : invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-stone-400">
            <svg className="w-12 h-12 mb-4 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-lg font-medium">{t('billing.no_invoices')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200">
                  <th className="text-left py-3 px-4 font-semibold text-stone-700">{t('billing.invoice')}</th>
                  {isSuperAdmin && <th className="text-left py-3 px-4 font-semibold text-stone-700">Organization</th>}
                  <th className="text-left py-3 px-4 font-semibold text-stone-700">Plan</th>
                  <th className="text-left py-3 px-4 font-semibold text-stone-700">{t('billing.period')}</th>
                  <th className="text-left py-3 px-4 font-semibold text-stone-700">{t('billing.issue_date')}</th>
                  <th className="text-left py-3 px-4 font-semibold text-stone-700">{t('billing.due_date')}</th>
                  <th className="text-right py-3 px-4 font-semibold text-stone-700">{t('billing.amount')}</th>
                  <th className="text-center py-3 px-4 font-semibold text-stone-700">{t('billing.status')}</th>
                  <th className="text-center py-3 px-4 font-semibold text-stone-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv, idx) => (
                  <tr key={inv.id} className={`border-b border-stone-100 hover:bg-stone-50 transition ${idx % 2 === 0 ? '' : 'bg-stone-50/40'}`}>
                    <td className="py-3 px-4 font-mono text-xs text-stone-600 font-medium"># {inv.id}</td>
                    {isSuperAdmin && <td className="py-3 px-4 text-stone-700">{inv.organizationName ?? `Org #${inv.organizationId}`}</td>}
                    <td className="py-3 px-4 text-stone-700">{inv.planName ?? '—'}</td>
                    <td className="py-3 px-4 text-stone-600 whitespace-nowrap">{formatDate(inv.periodStart)} – {formatDate(inv.periodEnd)}</td>
                    <td className="py-3 px-4 text-stone-600 whitespace-nowrap">{formatDate(inv.issueDate)}</td>
                    <td className="py-3 px-4 text-stone-600 whitespace-nowrap">{formatDate(inv.dueDate)}</td>
                    <td className="py-3 px-4 text-right font-semibold text-stone-800 whitespace-nowrap">{formatAmount(inv.amount, inv.currency)}</td>
                    <td className="py-3 px-4 text-center">{invoiceStatusBadge(inv.status)}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => handleDownload(inv)} disabled={downloadingId === inv.id} title={t('billing.download_pdf')} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-emerald-600 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed transition">
                          {downloadingId === inv.id ? (
                            <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>
                          ) : (
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                          )}
                          {t('billing.download_pdf')}
                        </button>
                        {isAdmin && inv.status !== 'PAID' && (
                          <button onClick={() => openPaymentDialog(inv)} title={t('billing.record_payment')} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-stone-300 text-stone-700 hover:bg-stone-50 transition">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                            {t('billing.record_payment')}
                          </button>
                        )}
                        {isSuperAdmin && (
                          <button onClick={() => setDeleteInvoice(inv)} disabled={deletingId === inv.id} title={t('billing.delete_invoice')} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            {t('billing.delete_invoice')}
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

      {/* Record Payment Modal */}
      {paymentInvoice && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-stone-900 mb-1">{t('billing.record_payment')}</h2>
            <p className="text-stone-500 text-sm mb-6">Invoice #{paymentInvoice.id} &mdash; {formatAmount(paymentInvoice.amount, paymentInvoice.currency)}</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">{t('billing.amount')}</label>
                <input type="number" step="0.01" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) || 0 })} className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">{t('billing.payment_method')}</label>
                <input type="text" value={paymentForm.paymentMethod ?? ''} onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })} placeholder="Bank transfer, cash, etc." className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">{t('billing.reference')}</label>
                <input type="text" value={paymentForm.reference ?? ''} onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })} placeholder="Transaction ID or reference number" className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setPaymentInvoice(null)} className="px-4 py-2 text-sm font-medium text-stone-700 border border-stone-300 rounded-lg hover:bg-stone-50 transition">Cancel</button>
              <button onClick={handleRecordPayment} disabled={submittingPayment} className="px-4 py-2 text-sm font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg disabled:opacity-50 transition">
                {submittingPayment ? 'Saving…' : t('billing.record_payment')}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleteInvoice !== null}
        title={t('billing.delete_invoice_title')}
        message={t('billing.delete_invoice_confirm', { id: String(deleteInvoice?.id ?? '') })}
        confirmLabel={t('billing.delete_invoice_confirm_btn')}
        cancelLabel={t('common.cancel')}
        variant="danger"
        onConfirm={handleDeleteInvoice}
        onCancel={() => setDeleteInvoice(null)}
      />
    </div>
  );
}

// ─── BillingPageInner ─────────────────────────────────────────────────────────

function BillingPageInner() {
  const { t } = useTranslation();
  const { can, isSuperAdmin } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  const canViewSubscription = can('subscription.view') || isSuperAdmin;
  const canViewInvoices = can('billing.view') || can('billing.manage') || isSuperAdmin;

  const rawTab = searchParams.get('tab');
  const activeTab = rawTab === 'invoices' && canViewInvoices
    ? 'invoices'
    : rawTab === 'subscription' && canViewSubscription
      ? 'subscription'
      : canViewSubscription
        ? 'subscription'
        : canViewInvoices
          ? 'invoices'
          : 'subscription';

  const setTab = (tab: string) => {
    router.replace(`/billing?tab=${tab}`);
  };

  return (
    <div className="p-4 md:p-8">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-stone-900">{t('billing.page_title')}</h1>
        <p className="text-stone-500 mt-1">{t('billing.page_subtitle')}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 border-b border-stone-200">
        {canViewSubscription && (
          <button
            onClick={() => setTab('subscription')}
            className={`px-5 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 transition-colors ${
              activeTab === 'subscription'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300'
            }`}
          >
            {t('billing.tab_subscription')}
          </button>
        )}
        {canViewInvoices && (
          <button
            onClick={() => setTab('invoices')}
            className={`px-5 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 transition-colors ${
              activeTab === 'invoices'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300'
            }`}
          >
            {t('billing.tab_invoices')}
          </button>
        )}
      </div>

      {/* Tab content */}
      {activeTab === 'subscription' && canViewSubscription && <SubscriptionSection />}
      {activeTab === 'invoices' && canViewInvoices && <InvoicesSection />}
    </div>
  );
}

// ─── Default export ───────────────────────────────────────────────────────────

export default function BillingPage() {
  return (
    <Suspense fallback={<div className="p-8 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-700" /></div>}>
      <BillingPageInner />
    </Suspense>
  );
}
