'use client';

import { useState, useEffect } from 'react';
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
  CreateSubscriptionPlanEntitlementInput,
} from '@/lib/api';

const FEATURE_LABELS: Record<string, string> = {
  'admin.users.max': 'Admin Users Limit',
  'member.portal': 'Member Portal',
  'reports.advanced': 'Advanced Reports',
  'import.excel': 'Excel Import',
  'finance.multi_currency': 'Multi-Currency Finance',
  'family.tree': 'Family Tree',
};

const PLAN_FEATURE_KEYS = Object.keys(FEATURE_LABELS);

function featureLabel(key: string): string {
  return FEATURE_LABELS[key] ?? key;
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    TRIALING: 'bg-blue-100 text-blue-800',
    ACTIVE: 'bg-emerald-100 text-emerald-800',
    PAST_DUE: 'bg-yellow-100 text-yellow-800',
    CANCELED: 'bg-red-100 text-red-800',
    EXPIRED: 'bg-gray-100 text-gray-600',
  };
  return map[status] ?? 'bg-gray-100 text-gray-600';
}

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
              <td className="py-3 px-4 font-medium text-gray-800">{featureLabel(e.featureKey)}</td>
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

export default function SubscriptionPage() {
  const { t } = useTranslation();
  const { can, isSuperAdmin, selectedMosque, user } = useAuth();

  const [subscription, setSubscription] = useState<OrganizationSubscriptionDTO | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlanDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Assign-plan form (super-admin)
  const [selectedPlanCode, setSelectedPlanCode] = useState<string>('');
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [startsAt, setStartsAt] = useState<string>(new Date().toISOString().substring(0, 10));
  const [assigning, setAssigning] = useState(false);

  // Create-plan form (super-admin)
  const [creatingPlan, setCreatingPlan] = useState(false);
  const [planCodeInput, setPlanCodeInput] = useState('');
  const [planNameInput, setPlanNameInput] = useState('');
  const [planDescriptionInput, setPlanDescriptionInput] = useState('');
  const [planMonthlyPriceInput, setPlanMonthlyPriceInput] = useState('15');
  const [planYearlyPriceInput, setPlanYearlyPriceInput] = useState('150');
  const [planAdminLimitInput, setPlanAdminLimitInput] = useState('2');
  const [planFeatureToggles, setPlanFeatureToggles] = useState<Record<string, boolean>>({
    'admin.users.max': true,
    'member.portal': false,
    'reports.advanced': false,
    'import.excel': true,
    'finance.multi_currency': false,
    'family.tree': true,
  });
  const [editingPlanCode, setEditingPlanCode] = useState<string | null>(null);
  const [updatingPlan, setUpdatingPlan] = useState(false);
  const [deletePlanDialog, setDeletePlanDialog] = useState<{ open: boolean; code: string; name: string } | null>(null);

  // Status change confirm dialog
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

  const loadData = async () => {
    setLoading(true);
    try {
      const [sub, availablePlans] = await Promise.all([
        subscriptionApi.getCurrent().catch(() => null),
        subscriptionApi.getPlans().catch(() => []),
      ]);
      setSubscription(sub);
      setPlans(availablePlans as SubscriptionPlanDTO[]);
    } catch {
      setToast({ message: t('subscription.load_error'), type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlanCode) return;
    setAssigning(true);
    try {
      const mosqueId = subscription?.mosqueId ?? selectedMosque?.id ?? user?.mosqueId;
      if (!mosqueId) {
        throw new Error('Select an organization first before assigning a plan.');
      }
      const created = await subscriptionApi.assign({
        mosqueId,
        planCode: selectedPlanCode,
        billingCycle,
        startsAt: `${startsAt}T00:00:00`,
        autoRenew: true,
      });
      setSubscription(created);
      setToast({ message: t('subscription.assign_success'), type: 'success' });
    } catch (err) {
      const message = err instanceof Error ? err.message : t('subscription.assign_error');
      setToast({ message, type: 'error' });
    } finally {
      setAssigning(false);
    }
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingPlan(true);
    try {
      const entitlements: CreateSubscriptionPlanEntitlementInput[] = PLAN_FEATURE_KEYS.map((featureKey) => {
        const enabled = Boolean(planFeatureToggles[featureKey]);
        const entry: CreateSubscriptionPlanEntitlementInput = {
          featureKey,
          enabled,
        };
        if (featureKey === 'admin.users.max') {
          const parsed = Number(planAdminLimitInput);
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
      const message = err instanceof Error ? err.message : 'Failed to create subscription plan';
      setToast({ message, type: 'error' });
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
    PLAN_FEATURE_KEYS.forEach((key) => {
      toggles[key] = false;
    });
    plan.entitlements.forEach((e) => {
      toggles[e.featureKey] = e.enabled;
      if (e.featureKey === 'admin.users.max' && e.limitValue !== null && e.limitValue !== undefined) {
        setPlanAdminLimitInput(String(e.limitValue));
      }
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
      const entitlements: CreateSubscriptionPlanEntitlementInput[] = PLAN_FEATURE_KEYS.map((featureKey) => {
        const enabled = Boolean(planFeatureToggles[featureKey]);
        const entry: CreateSubscriptionPlanEntitlementInput = {
          featureKey,
          enabled,
        };
        if (featureKey === 'admin.users.max') {
          const parsed = Number(planAdminLimitInput);
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
      const message = err instanceof Error ? err.message : 'Failed to update subscription plan';
      setToast({ message, type: 'error' });
    } finally {
      setUpdatingPlan(false);
    }
  };

  const confirmDeletePlan = async () => {
    if (!deletePlanDialog) return;
    try {
      await subscriptionApi.deletePlan(deletePlanDialog.code);
      setPlans((prev) => prev.filter((p) => p.code !== deletePlanDialog.code));
      if (selectedPlanCode === deletePlanDialog.code) {
        setSelectedPlanCode('');
      }
      if (editingPlanCode === deletePlanDialog.code) {
        cancelEditPlan();
      }
      setToast({ message: 'Subscription plan deleted successfully', type: 'success' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete subscription plan';
      setToast({ message, type: 'error' });
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

  const activePlans = plans
    .filter((plan) => plan.isActive)
    .slice()
    .sort((a, b) => a.monthlyPrice - b.monthlyPrice);

  const comparisonFeatureKeys = Array.from(
    new Set([
      ...PLAN_FEATURE_KEYS,
      ...activePlans.flatMap((plan) => plan.entitlements.map((entitlement) => entitlement.featureKey)),
    ])
  );

  const getPlanEntitlement = (plan: SubscriptionPlanDTO, featureKey: string): PlanEntitlementDTO | null =>
    plan.entitlements.find((entitlement) => entitlement.featureKey === featureKey) ?? null;

  const formatLimit = (limitValue: number | null | undefined): string => {
    if (limitValue === null || limitValue === undefined) return 'No limit';
    if (limitValue === 0) return 'Unlimited';
    return String(limitValue);
  };

  const getPlanChangeSummary = (targetPlan: SubscriptionPlanDTO) => {
    if (!subscription) {
      return (
        <p className="text-sm">
          Are you sure you want to switch to {targetPlan.name}?
        </p>
      );
    }

    const cycle = normalizeCycle(subscription.billingCycle);
    const currentPrice = planPriceForCycle(subscription.plan, cycle);
    const targetPrice = planPriceForCycle(targetPlan, cycle);
    const delta = targetPrice - currentPrice;
    const cycleLabel = cycle === 'YEARLY' ? 'year' : 'month';
    const hasPreview = planChangePreview !== null && changePlanDialog?.plan.code === targetPlan.code;
    const previewAmount = hasPreview ? Number(planChangePreview.amountDueNow ?? 0) : null;
    const previewDays = hasPreview ? planChangePreview.remainingDays : null;
    const previewEffectiveAt = hasPreview ? planChangePreview.effectiveAt : null;

    const changedFeatures = comparisonFeatureKeys
      .map((featureKey) => {
        const currentEntitlement = getPlanEntitlement(subscription.plan, featureKey);
        const targetEntitlement = getPlanEntitlement(targetPlan, featureKey);

        const currentEnabled = Boolean(currentEntitlement?.enabled);
        const targetEnabled = Boolean(targetEntitlement?.enabled);
        const currentLimit = currentEntitlement?.limitValue;
        const targetLimit = targetEntitlement?.limitValue;

        if (currentEnabled !== targetEnabled) {
          return `${featureLabel(featureKey)}: ${targetEnabled ? 'included' : 'not included'}`;
        }

        if (targetEnabled && currentLimit !== targetLimit) {
          return `${featureLabel(featureKey)}: ${formatLimit(currentLimit)} -> ${formatLimit(targetLimit)}`;
        }

        return null;
      })
      .filter((item): item is string => item !== null)
      .slice(0, 5);

    return (
      <div className="space-y-2 text-sm">
        <p>
          You are switching from <span className="font-semibold text-stone-800">{subscription.plan.name}</span> to{' '}
          <span className="font-semibold text-stone-800">{targetPlan.name}</span>.
        </p>
        <p>
          Price change: <span className="font-semibold text-stone-800">${Math.abs(delta).toFixed(2)}</span> {delta >= 0 ? 'more' : 'less'} per {cycleLabel}.
        </p>
        {loadingPlanPreview && (
          <p className="text-xs text-stone-500">Calculating proration preview...</p>
        )}
        {hasPreview && previewAmount !== null && (
          <p>
            {previewAmount > 0
              ? `Amount due now: $${previewAmount.toFixed(2)} for ${previewDays ?? 0} remaining day(s).`
              : `No charge due now. Change effective on ${new Date(previewEffectiveAt as string).toLocaleDateString()}.`}
          </p>
        )}
        {changedFeatures.length > 0 && (
          <div>
            <p className="font-medium text-stone-800">Key feature differences:</p>
            <ul className="mt-1 space-y-1 list-disc pl-5">
              {changedFeatures.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  const confirmPlanChange = async () => {
    if (!changePlanDialog) return;
    setChangingPlan(true);
    try {
      const result = await subscriptionApi.changePlan({
        planCode: changePlanDialog.plan.code,
      });
      setLastPlanChangeResult(result);
      setSubscription(result.subscription);

      if (result.action === 'UPGRADE_IMMEDIATE') {
        setToast({
          message: `Upgrade applied. Amount due now: $${Number(result.amountDueNow).toFixed(2)} for ${result.remainingDays} remaining day(s).`,
          type: 'success',
        });
      } else {
        const effectiveDate = new Date(result.effectiveAt).toLocaleDateString();
        setToast({
          message: `Downgrade scheduled. Your current plan stays active until ${effectiveDate}.`,
          type: 'success',
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update subscription plan';
      setToast({ message, type: 'error' });
    } finally {
      setChangingPlan(false);
      setChangePlanDialog(null);
    }
  };

  const openPlanChangeDialog = async (plan: SubscriptionPlanDTO) => {
    setChangePlanDialog({ open: true, plan });
    setPlanChangePreview(null);
    setLoadingPlanPreview(true);
    try {
      const preview = await subscriptionApi.previewPlanChange({
        planCode: plan.code,
      });
      setPlanChangePreview(preview);
    } catch {
      // Keep dialog usable even when preview fails.
    } finally {
      setLoadingPlanPreview(false);
    }
  };

  const requestStatusChange = (newStatus: string) => {
    if (!subscription) return;
    setConfirmDialog({
      open: true,
      subscriptionId: subscription.id,
      newStatus,
      message: t('subscription.confirm_status_change', { status: newStatus }),
    });
  };

  const confirmStatusChange = async () => {
    if (!confirmDialog) return;
    try {
      const updated = await subscriptionApi.updateStatus(confirmDialog.subscriptionId, confirmDialog.newStatus);
      setSubscription(updated);
      setToast({ message: t('subscription.status_updated'), type: 'success' });
    } catch (err) {
      const message = err instanceof Error ? err.message : t('subscription.status_update_error');
      setToast({ message, type: 'error' });
    } finally {
      setConfirmDialog(null);
    }
  };

  if (!can('subscription.view') && !isSuperAdmin) {
    return (
      <div className="p-4 md:p-8">
        <p className="text-red-500">{t('common_extra.access_denied')}</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      {toast && (
        <ToastNotification message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

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
          onCancel={() => {
            setChangePlanDialog(null);
            setPlanChangePreview(null);
          }}
        />
      )}

      {/* Header */}
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-charcoal">
          {isSuperAdmin ? 'Subscription Management' : 'My Subscription'}
        </h1>
        <p className="text-gray-500 mt-1">
          {isSuperAdmin
            ? 'Create, update and manage subscription plans for organizations.'
            : 'View your active plan and change it when needed.'}
        </p>
      </div>

      {!isSuperAdmin && lastPlanChangeResult && (
        <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-900">
          {lastPlanChangeResult.action === 'UPGRADE_IMMEDIATE' ? (
            <p className="text-sm">
              Upgrade completed with prorated billing. Amount due now:
              <span className="font-semibold"> ${Number(lastPlanChangeResult.amountDueNow).toFixed(2)}</span>
              {' '}for {lastPlanChangeResult.remainingDays} remaining day(s) in this billing cycle.
            </p>
          ) : (
            <p className="text-sm">
              Downgrade scheduled. It will take effect on
              <span className="font-semibold"> {new Date(lastPlanChangeResult.effectiveAt).toLocaleDateString()}</span>.
            </p>
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
                  {subscription.plan.description && (
                    <p className="text-gray-500 text-sm mt-1">{subscription.plan.description}</p>
                  )}
                </div>
                <span
                  className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${statusBadge(subscription.status)}`}
                >
                  {subscription.status}
                </span>
              </div>

              {/* Plan details grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">{t('subscription.billing_cycle')}</p>
                  <p className="font-semibold text-gray-800 capitalize">
                    {subscription.billingCycle.toLowerCase()}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">{t('subscription.price')}</p>
                  <p className="font-semibold text-gray-800">
                    {subscription.billingCycle === 'YEARLY'
                      ? `$${subscription.plan.yearlyPrice}/yr`
                      : `$${subscription.plan.monthlyPrice}/mo`}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">{t('subscription.starts_at')}</p>
                  <p className="font-semibold text-gray-800">
                    {new Date(subscription.startsAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">{t('subscription.expires_at')}</p>
                  <p className="font-semibold text-gray-800">
                    {subscription.endsAt
                      ? new Date(subscription.endsAt).toLocaleDateString()
                      : t('subscription.no_expiry')}
                  </p>
                </div>
              </div>

              {/* Entitlements */}
              <h3 className="text-base font-semibold text-gray-800 mb-3">{t('subscription.entitlements')}</h3>
              <EntitlementsTable entitlements={subscription.plan.entitlements} />

              {/* Status controls (super-admin only) */}
              {isSuperAdmin && (
                <div className="mt-6 pt-4 border-t flex flex-wrap gap-3">
                  {subscription.status === 'ACTIVE' && (
                    <>
                      <button
                        onClick={() => requestStatusChange('PAST_DUE')}
                        className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg text-sm font-medium hover:bg-yellow-200 transition"
                      >
                        {t('subscription.suspend')}
                      </button>
                      <button
                        onClick={() => requestStatusChange('CANCELED')}
                        className="px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition"
                      >
                        {t('subscription.cancel')}
                      </button>
                    </>
                  )}
                  {subscription.status === 'PAST_DUE' && (
                    <button
                      onClick={() => requestStatusChange('ACTIVE')}
                      className="px-4 py-2 bg-emerald-100 text-emerald-800 rounded-lg text-sm font-medium hover:bg-emerald-200 transition"
                    >
                      {t('subscription.reactivate')}
                    </button>
                  )}
                  {(subscription.status === 'CANCELED' || subscription.status === 'EXPIRED') && (
                    <button
                      onClick={() => requestStatusChange('ACTIVE')}
                      className="px-4 py-2 bg-emerald-100 text-emerald-800 rounded-lg text-sm font-medium hover:bg-emerald-200 transition"
                    >
                      {t('subscription.reactivate')}
                    </button>
                  )}
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
              {!isSuperAdmin && (
                <p className="text-gray-400 text-sm mt-1">{t('subscription.contact_admin')}</p>
              )}
              {isSuperAdmin && plans.length === 0 && (
                <p className="text-amber-700 text-sm mt-2">
                  No subscription plans are configured yet. Add plan seed data in the backend database first.
                </p>
              )}
            </div>
          )}

          {/* Assign Plan (super-admin only) */}
          {isSuperAdmin && plans.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-5">{t('subscription.assign_plan')}</h2>
              <form onSubmit={handleAssign} className="space-y-4">
                {/* Plan selector */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('subscription.select_plan')}
                  </label>
                  <select
                    value={selectedPlanCode}
                    onChange={(e) => setSelectedPlanCode(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    required
                  >
                    <option value="">{t('subscription.select_plan_placeholder')}</option>
                    {plans.map((p) => (
                      <option key={p.id} value={p.code}>
                        {p.name} — ${p.monthlyPrice}/mo · ${p.yearlyPrice}/yr
                      </option>
                    ))}
                  </select>
                </div>

                {/* Billing cycle */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('subscription.billing_cycle')}
                  </label>
                  <div className="flex gap-3">
                    {(['MONTHLY', 'YEARLY'] as const).map((cycle) => (
                      <label key={cycle} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="billingCycle"
                          value={cycle}
                          checked={billingCycle === cycle}
                          onChange={() => setBillingCycle(cycle)}
                          className="accent-emerald-700"
                        />
                        <span className="text-sm text-gray-700 capitalize">{cycle.toLowerCase()}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Start date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('subscription.starts_at')}
                  </label>
                  <input
                    type="date"
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    required
                  />
                </div>

                {/* Selected plan preview */}
                {selectedPlanCode !== '' && (() => {
                  const p = plans.find((pl) => pl.code === selectedPlanCode);
                  return p ? (
                    <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-4">
                      <p className="text-sm font-semibold text-emerald-800 mb-2">{p.name}</p>
                      <EntitlementsTable entitlements={p.entitlements} />
                    </div>
                  ) : null;
                })()}

                <button
                  type="submit"
                  disabled={assigning || !selectedPlanCode}
                  className="px-6 py-2.5 bg-emerald-700 text-white rounded-lg font-semibold hover:bg-emerald-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {assigning ? t('subscription.assigning') : t('subscription.assign')}
                </button>
              </form>
            </div>
          )}

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
                          {isCurrent && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                              Current
                            </span>
                          )}
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
                          onClick={() => {
                            void openPlanChangeDialog(plan);
                          }}
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
                <p className="text-sm text-gray-500 mb-4">
                  Compare pricing and included features before you upgrade or downgrade.
                </p>

                {/* Mobile comparison cards */}
                <div className="md:hidden space-y-3">
                  {comparisonFeatureKeys.map((featureKey) => (
                    <div key={featureKey} className="border border-gray-200 rounded-lg p-3">
                      <p className="font-medium text-gray-800 mb-2">{featureLabel(featureKey)}</p>
                      <div className="space-y-2">
                        {activePlans.map((plan) => {
                          const entitlement = getPlanEntitlement(plan, featureKey);
                          const enabled = Boolean(entitlement?.enabled);
                          const limit = entitlement?.limitValue;
                          const isCurrent = subscription?.plan.code === plan.code;
                          return (
                            <div key={`${featureKey}-${plan.code}`} className="flex items-start justify-between gap-3 text-sm">
                              <div className="text-gray-700">
                                {plan.name}
                                {isCurrent && (
                                  <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                                    Current
                                  </span>
                                )}
                              </div>
                              <div className="text-right">
                                <div className={enabled ? 'text-emerald-700' : 'text-gray-400'}>
                                  {enabled ? 'Included' : 'Not included'}
                                </div>
                                {enabled && (
                                  <div className="text-xs text-gray-500 mt-0.5">
                                    {limit === null || limit === undefined
                                      ? 'No limit'
                                      : limit === 0
                                        ? 'Unlimited'
                                        : `Limit: ${limit}`}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop/tablet comparison table */}
                <div className="hidden md:block overflow-x-auto rounded-lg border border-gray-200">
                  <table className="min-w-[720px] w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Feature</th>
                        {activePlans.map((plan) => {
                          const isCurrent = subscription?.plan.code === plan.code;
                          return (
                            <th key={plan.code} className="text-left py-3 px-4 font-semibold text-gray-700 min-w-[170px]">
                              <div className="flex items-center gap-2">
                                <span>{plan.name}</span>
                                {isCurrent && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                                    Current
                                  </span>
                                )}
                              </div>
                              <p className="text-xs font-normal text-gray-500 mt-1">
                                ${plan.monthlyPrice}/mo · ${plan.yearlyPrice}/yr
                              </p>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {comparisonFeatureKeys.map((featureKey) => (
                        <tr key={featureKey} className="border-b border-gray-100 last:border-b-0">
                          <td className="py-3 px-4 font-medium text-gray-800">{featureLabel(featureKey)}</td>
                          {activePlans.map((plan) => {
                            const entitlement = getPlanEntitlement(plan, featureKey);
                            const enabled = Boolean(entitlement?.enabled);
                            const limit = entitlement?.limitValue;
                            return (
                              <td key={`${plan.code}-${featureKey}`} className="py-3 px-4 align-top">
                                {enabled ? (
                                  <span className="inline-flex items-center gap-1 text-emerald-700">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Included
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-gray-400">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    Not included
                                  </span>
                                )}
                                {enabled && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    {limit === null || limit === undefined
                                      ? 'No limit'
                                      : limit === 0
                                        ? 'Unlimited'
                                        : `Limit: ${limit}`}
                                  </p>
                                )}
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

          {isSuperAdmin && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-5">
                {editingPlanCode ? `Edit Subscription Plan (${editingPlanCode})` : 'Create Subscription Plan'}
              </h2>
              <form onSubmit={editingPlanCode ? handleUpdatePlan : handleCreatePlan} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Plan Code</label>
                    <input
                      type="text"
                      value={planCodeInput}
                      onChange={(e) => setPlanCodeInput(e.target.value.toUpperCase())}
                      placeholder="STARTER"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      disabled={Boolean(editingPlanCode)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Plan Name</label>
                    <input
                      type="text"
                      value={planNameInput}
                      onChange={(e) => setPlanNameInput(e.target.value)}
                      placeholder="Starter"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={planDescriptionInput}
                    onChange={(e) => setPlanDescriptionInput(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Price</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={planMonthlyPriceInput}
                      onChange={(e) => setPlanMonthlyPriceInput(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Yearly Price</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={planYearlyPriceInput}
                      onChange={(e) => setPlanYearlyPriceInput(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Admin Users Limit</label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={planAdminLimitInput}
                      onChange={(e) => setPlanAdminLimitInput(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Feature Entitlements</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {PLAN_FEATURE_KEYS.map((featureKey) => (
                      <label key={featureKey} className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={Boolean(planFeatureToggles[featureKey])}
                          onChange={(e) =>
                            setPlanFeatureToggles((prev) => ({
                              ...prev,
                              [featureKey]: e.target.checked,
                            }))
                          }
                          className="accent-emerald-700"
                        />
                        <span>{featureLabel(featureKey)}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={creatingPlan || updatingPlan}
                  className="px-6 py-2.5 bg-emerald-700 text-white rounded-lg font-semibold hover:bg-emerald-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingPlanCode
                    ? updatingPlan
                      ? 'Updating Plan...'
                      : 'Update Plan'
                    : creatingPlan
                      ? 'Creating Plan...'
                      : 'Create Plan'}
                </button>
                {editingPlanCode && (
                  <button
                    type="button"
                    onClick={cancelEditPlan}
                    className="ml-3 px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition"
                  >
                    Cancel Edit
                  </button>
                )}
              </form>
            </div>
          )}

          {isSuperAdmin && plans.length === 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800">
              <p className="font-semibold">Subscription plans missing</p>
              <p className="text-sm mt-1">
                The API returned an empty list for /subscription/plans. Create seed records for subscription_plans and plan_entitlements, then refresh this page.
              </p>
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
                        <button
                          type="button"
                          onClick={() => startEditPlan(plan)}
                          className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700 hover:bg-blue-200"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setDeletePlanDialog({
                              open: true,
                              code: plan.code,
                              name: plan.name,
                            })
                          }
                          className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700 hover:bg-red-200"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    {plan.description && (
                      <p className="text-xs text-gray-500 mb-3">{plan.description}</p>
                    )}
                    <div className="flex gap-3 mb-3 text-sm">
                      <span className="text-gray-700">${plan.monthlyPrice}<span className="text-gray-400">/mo</span></span>
                      <span className="text-gray-400">·</span>
                      <span className="text-gray-700">${plan.yearlyPrice}<span className="text-gray-400">/yr</span></span>
                    </div>
                    <ul className="space-y-1">
                      {plan.entitlements.map((e) => (
                        <li key={e.featureKey} className="flex items-center gap-2 text-xs text-gray-600">
                          {e.enabled ? (
                            <svg className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          )}
                          <span className={e.enabled ? '' : 'text-gray-400'}>
                            {featureLabel(e.featureKey)}
                            {e.limitValue !== null && e.limitValue !== undefined && e.limitValue > 0
                              ? ` (max ${e.limitValue})`
                              : ''}
                          </span>
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
