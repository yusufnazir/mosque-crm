'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { useAuth } from '@/lib/auth/AuthContext';
import ToastNotification from '@/components/ToastNotification';
import ConfirmDialog from '@/components/ConfirmDialog';
import {
  subscriptionApi,
  OrganizationSubscriptionDTO,
  SubscriptionPlanDTO,
  PlanEntitlementDTO,
} from '@/lib/api';

const FEATURE_LABELS: Record<string, string> = {
  'admin.users.max': 'Admin Users Limit',
  'member.portal': 'Member Portal',
  'reports.advanced': 'Advanced Reports',
  'import.excel': 'Excel Import',
  'finance.multi_currency': 'Multi-Currency Finance',
  'family.tree': 'Family Tree',
};

function featureLabel(key: string): string {
  return FEATURE_LABELS[key] ?? key;
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    ACTIVE: 'bg-emerald-100 text-emerald-800',
    SUSPENDED: 'bg-yellow-100 text-yellow-800',
    CANCELLED: 'bg-red-100 text-red-800',
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
            <tr key={e.id} className="border-b hover:bg-gray-50 transition">
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
  const { can, isSuperAdmin } = useAuth();

  const [subscription, setSubscription] = useState<OrganizationSubscriptionDTO | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlanDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Assign-plan form (super-admin)
  const [selectedPlanId, setSelectedPlanId] = useState<number | ''>('');
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'ANNUAL'>('MONTHLY');
  const [startsAt, setStartsAt] = useState<string>(new Date().toISOString().substring(0, 10));
  const [assigning, setAssigning] = useState(false);

  // Status change confirm dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    subscriptionId: number;
    newStatus: string;
    message: string;
  } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sub, availablePlans] = await Promise.all([
        subscriptionApi.getCurrent().catch(() => null),
        isSuperAdmin ? subscriptionApi.getPlans().catch(() => []) : Promise.resolve([]),
      ]);
      setSubscription(sub);
      if (isSuperAdmin) setPlans(availablePlans as SubscriptionPlanDTO[]);
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
    if (!selectedPlanId) return;
    setAssigning(true);
    try {
      const mosqueId = subscription?.mosqueId ?? 0;
      const created = await subscriptionApi.assign({
        mosqueId,
        planId: selectedPlanId as number,
        billingCycle,
        startsAt,
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

      {/* Header */}
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-charcoal">{t('subscription.title')}</h1>
        <p className="text-gray-500 mt-1">{t('subscription.subtitle')}</p>
      </div>

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
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">{t('subscription.billing_cycle')}</p>
                  <p className="font-semibold text-gray-800 capitalize">
                    {subscription.billingCycle.toLowerCase()}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">{t('subscription.price')}</p>
                  <p className="font-semibold text-gray-800">
                    {subscription.billingCycle === 'ANNUAL'
                      ? `$${subscription.plan.annualPrice}/yr`
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
                    {subscription.expiresAt
                      ? new Date(subscription.expiresAt).toLocaleDateString()
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
                        onClick={() => requestStatusChange('SUSPENDED')}
                        className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg text-sm font-medium hover:bg-yellow-200 transition"
                      >
                        {t('subscription.suspend')}
                      </button>
                      <button
                        onClick={() => requestStatusChange('CANCELLED')}
                        className="px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition"
                      >
                        {t('subscription.cancel')}
                      </button>
                    </>
                  )}
                  {subscription.status === 'SUSPENDED' && (
                    <button
                      onClick={() => requestStatusChange('ACTIVE')}
                      className="px-4 py-2 bg-emerald-100 text-emerald-800 rounded-lg text-sm font-medium hover:bg-emerald-200 transition"
                    >
                      {t('subscription.reactivate')}
                    </button>
                  )}
                  {(subscription.status === 'CANCELLED' || subscription.status === 'EXPIRED') && (
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
                    value={selectedPlanId}
                    onChange={(e) => setSelectedPlanId(e.target.value ? Number(e.target.value) : '')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    required
                  >
                    <option value="">{t('subscription.select_plan_placeholder')}</option>
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — ${p.monthlyPrice}/mo · ${p.annualPrice}/yr
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
                    {(['MONTHLY', 'ANNUAL'] as const).map((cycle) => (
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
                {selectedPlanId !== '' && (() => {
                  const p = plans.find((pl) => pl.id === selectedPlanId);
                  return p ? (
                    <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-4">
                      <p className="text-sm font-semibold text-emerald-800 mb-2">{p.name}</p>
                      <EntitlementsTable entitlements={p.entitlements} />
                    </div>
                  ) : null;
                })()}

                <button
                  type="submit"
                  disabled={assigning || !selectedPlanId}
                  className="px-6 py-2.5 bg-emerald-700 text-white rounded-lg font-semibold hover:bg-emerald-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {assigning ? t('subscription.assigning') : t('subscription.assign')}
                </button>
              </form>
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
                      <span className={`text-xs px-2 py-0.5 rounded-full ${plan.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                        {plan.isActive ? t('subscription.active') : t('subscription.inactive')}
                      </span>
                    </div>
                    {plan.description && (
                      <p className="text-xs text-gray-500 mb-3">{plan.description}</p>
                    )}
                    <div className="flex gap-3 mb-3 text-sm">
                      <span className="text-gray-700">${plan.monthlyPrice}<span className="text-gray-400">/mo</span></span>
                      <span className="text-gray-400">·</span>
                      <span className="text-gray-700">${plan.annualPrice}<span className="text-gray-400">/yr</span></span>
                    </div>
                    <ul className="space-y-1">
                      {plan.entitlements.map((e) => (
                        <li key={e.id} className="flex items-center gap-2 text-xs text-gray-600">
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
