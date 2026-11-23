'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { useAuth } from '@/lib/auth/AuthContext';
import ConfirmDialog from '@/components/ConfirmDialog';
import ToastNotification from '@/components/ToastNotification';
import { parseApiErrorBody } from '@/lib/api';
import {
  whatsappApi,
  type PageResponse,
  type WhatsAppEnqueueResultDTO,
  type WhatsAppMessageDTO,
  type WhatsAppOptOutDTO,
  type WhatsAppStatsDTO,
} from '@/lib/whatsappApi';

type Tab = 'compose' | 'queue' | 'replies' | 'optouts';

const STATUS_STYLES: Record<string, string> = {
  QUEUED: 'bg-amber-100 text-amber-800',
  SENDING: 'bg-sky-100 text-sky-800',
  SENT: 'bg-emerald-100 text-emerald-800',
  FAILED: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-600',
  SKIPPED: 'bg-stone-100 text-stone-600',
};

const PAGE_SIZE = 20;

/** Total skipped recipients of an enqueue result (the counters are always present, the list may be capped). */
function skippedTotalOf(result: WhatsAppEnqueueResultDTO): number {
  return (
    result.skippedTotal ??
    result.skippedOptOut + result.skippedInvalid + (result.skippedNoPhone ?? 0) + result.skippedDuplicate
  );
}

const SKIP_REASON_KEYS: Record<string, string> = {
  NO_PHONE: 'whatsapp.result_reason_no_phone',
  INVALID_FORMAT: 'whatsapp.result_reason_invalid',
  OPT_OUT: 'whatsapp.result_reason_opt_out',
  DUPLICATE: 'whatsapp.result_reason_duplicate',
  ALREADY_QUEUED: 'whatsapp.result_reason_already_queued',
};

const SKIP_REASON_STYLES: Record<string, string> = {
  NO_PHONE: 'bg-gray-100 text-gray-700',
  INVALID_FORMAT: 'bg-red-100 text-red-800',
  OPT_OUT: 'bg-amber-100 text-amber-800',
  DUPLICATE: 'bg-gray-100 text-gray-600',
  ALREADY_QUEUED: 'bg-sky-100 text-sky-800',
};

/** Client-side preview only — the server does the real (randomized) resolution. */
function resolveSpintax(template: string, name: string, org: string, randomize: boolean): string {
  const withPlaceholders = template
    .replace(/\{\{\s*name\s*\}\}/gi, name)
    .replace(/\{\{\s*first_name\s*\}\}/gi, name.split(' ')[0] || name)
    .replace(/\{\{\s*org\s*\}\}/gi, org)
    .replace(/\\n/g, '\n');

  let output = withPlaceholders;
  for (let i = 0; i < 20; i += 1) {
    const next = output.replace(/\{([^{}|]*\|[^{}]*)\}/, (_match, group: string) => {
      const options = group.split('|');
      const index = randomize ? Math.floor(Math.random() * options.length) : 0;
      return options[index].trim();
    });
    if (next === output) break;
    output = next;
  }
  return output;
}

function countVariants(template: string): number {
  let variants = 1;
  const regex = /\{([^{}|]*\|[^{}]*)\}/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(template)) !== null) {
    variants *= match[1].split('|').length;
  }
  return variants;
}

function extractApiErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error) || !error.message) return fallback;
  try {
    const parsed = JSON.parse(error.message) as { error?: string; message?: string };
    return parsed.error || parsed.message || fallback;
  } catch {
    return error.message || fallback;
  }
}

export default function WhatsAppPage() {
  const { t } = useTranslation();
  const { user, can } = useAuth();

  const [tab, setTab] = useState<Tab>('compose');
  const [stats, setStats] = useState<WhatsAppStatsDTO | null>(null);
  const [statsError, setStatsError] = useState('');

  // Compose
  const [template, setTemplate] = useState('');
  const [recipientType, setRecipientType] = useState<'CUSTOM' | 'ACTIVE_MEMBERS' | 'ALL_MEMBERS'>('CUSTOM');
  const [phones, setPhones] = useState('');
  const [profile, setProfile] = useState<'COLD' | 'CONVERSATION'>('COLD');
  const [countryCode, setCountryCode] = useState('31');
  const [submitting, setSubmitting] = useState(false);
  const [previewSeed, setPreviewSeed] = useState(0);
  const [enqueueResult, setEnqueueResult] = useState<WhatsAppEnqueueResultDTO | null>(null);

  // Queue
  const [messages, setMessages] = useState<PageResponse<WhatsAppMessageDTO> | null>(null);
  const [queueLoading, setQueueLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);
  const [cancelTarget, setCancelTarget] = useState<WhatsAppMessageDTO | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WhatsAppMessageDTO | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Opt-outs
  const [optOuts, setOptOuts] = useState<WhatsAppOptOutDTO[]>([]);
  const [newOptOutPhone, setNewOptOutPhone] = useState('');
  const [newOptOutReason, setNewOptOutReason] = useState('');
  const [optOutSaving, setOptOutSaving] = useState(false);
  const [removeOptOutTarget, setRemoveOptOutTarget] = useState<WhatsAppOptOutDTO | null>(null);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [previews, setPreviews] = useState<string[]>([]);

  const loadStats = useCallback(async () => {
    try {
      const data = await whatsappApi.stats();
      setStats(data);
      setStatsError('');
    } catch (error) {
      setStatsError(extractApiErrorMessage(error, t('whatsapp.stats_error')));
    }
  }, [t]);

  const loadQueue = useCallback(async () => {
    setQueueLoading(true);
    try {
      const data = await whatsappApi.messages({ status: statusFilter || undefined, page, size: PAGE_SIZE });
      if (page > 0 && page >= data.totalPages) {
        setPage(Math.max(0, data.totalPages - 1));
        return;
      }
      setMessages(data);
    } catch (error) {
      setToast({ message: extractApiErrorMessage(error, t('whatsapp.queue_error')), type: 'error' });
    } finally {
      setQueueLoading(false);
    }
  }, [page, statusFilter, t]);

  const loadOptOuts = useCallback(async () => {
    try {
      setOptOuts(await whatsappApi.optOuts());
    } catch (error) {
      setToast({ message: extractApiErrorMessage(error, t('whatsapp.optout_error')), type: 'error' });
    }
  }, [t]);

  useEffect(() => {
    loadStats();
    // Poll slowly, and never while the tab is in the background (every poll runs several counts)
    const timer = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      loadStats();
    }, 45_000);
    return () => clearInterval(timer);
  }, [loadStats]);

  useEffect(() => {
    if (tab === 'queue') loadQueue();
    if (tab === 'optouts') loadOptOuts();
  }, [tab, loadQueue, loadOptOuts]);

  // Re-render three sample variants whenever the template or the shuffle button changes
  useEffect(() => {
    if (!template.trim()) {
      setPreviews([]);
      return;
    }
    const name = t('whatsapp.preview_name');
    const org = user?.organizationName || t('whatsapp.preview_org');
    setPreviews([0, 1, 2].map(() => resolveSpintax(template, name, org, true)));
  }, [template, previewSeed, user?.organizationName, t]);

  const variants = useMemo(() => countVariants(template), [template]);
  const handleEnqueue = async () => {
    if (!template.trim()) {
      setToast({ message: t('whatsapp.template_required'), type: 'error' });
      return;
    }
    const phoneList = phones
      .split(/[\n,;]+/)
      .map((value) => value.trim())
      .filter(Boolean);
    if (recipientType === 'CUSTOM' && phoneList.length === 0) {
      setToast({ message: t('whatsapp.recipients_required'), type: 'error' });
      return;
    }

    setSubmitting(true);
    try {
      const result = await whatsappApi.enqueue({
        recipientType,
        phones: recipientType === 'CUSTOM' ? phoneList : undefined,
        template,
        profile,
        defaultCountryCode: countryCode.replace(/[^0-9]/g, '') || undefined,
      });
      const skippedTotal = skippedTotalOf(result);
      setEnqueueResult(result);
      setToast({
        message: t('whatsapp.queued_toast', {
          queued: String(result.queued),
          skipped: String(skippedTotal),
        }),
        type: result.queued > 0 ? 'success' : 'error',
      });
      if (result.queued > 0) {
        setTemplate('');
        setPhones('');
        loadStats();
      }
      // Only jump to the queue when nobody was skipped; otherwise keep the compose tab
      // open so the admin can see who needs a corrected phone number.
      if (result.queued > 0 && skippedTotal === 0) {
        setTab('queue');
        setPage(0);
      }
    } catch (error) {
      setToast({ message: extractApiErrorMessage(error, t('whatsapp.enqueue_error')), type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelTarget) return;
    try {
      await whatsappApi.cancel(cancelTarget.id);
      setToast({ message: t('whatsapp.cancelled_toast'), type: 'success' });
      setCancelTarget(null);
      loadQueue();
      loadStats();
    } catch (error) {
      setToast({ message: extractApiErrorMessage(error, t('whatsapp.cancel_error')), type: 'error' });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    try {
      await whatsappApi.deleteMessage(deleteTarget.id);
      setToast({ message: t('whatsapp.deleted_toast'), type: 'success' });
    } catch (error) {
      const message = parseApiErrorBody(error)?.code === 'MESSAGE_SENDING'
        ? t('whatsapp.delete_sending')
        : extractApiErrorMessage(error, t('whatsapp.delete_error'));
      setToast({ message, type: 'error' });
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
      loadQueue();
      loadStats();
    }
  };

  const handleAddOptOut = async () => {
    if (!newOptOutPhone.trim()) return;
    setOptOutSaving(true);
    try {
      await whatsappApi.addOptOut(newOptOutPhone.trim(), newOptOutReason.trim() || undefined);
      setNewOptOutPhone('');
      setNewOptOutReason('');
      setToast({ message: t('whatsapp.optout_added'), type: 'success' });
      loadOptOuts();
      loadStats();
    } catch (error) {
      setToast({ message: extractApiErrorMessage(error, t('whatsapp.optout_error')), type: 'error' });
    } finally {
      setOptOutSaving(false);
    }
  };

  const handleRemoveOptOut = async () => {
    if (!removeOptOutTarget) return;
    try {
      await whatsappApi.removeOptOut(removeOptOutTarget.id);
      setToast({ message: t('whatsapp.optout_removed'), type: 'success' });
      setRemoveOptOutTarget(null);
      loadOptOuts();
      loadStats();
    } catch (error) {
      setToast({ message: extractApiErrorMessage(error, t('whatsapp.optout_error')), type: 'error' });
    }
  };

  const sessionOk = stats?.sessionStatus === 'WORKING';
  const sessionLabel = sessionOk
    ? t('whatsapp.session_working')
    : stats?.sessionStatus === 'SCAN_QR_CODE'
      ? t('whatsapp.session_qr')
      : stats?.sessionStatus === 'UNREACHABLE'
        ? t('whatsapp.session_unreachable')
        : t('whatsapp.session_offline');

  const tabs: { key: Tab; label: string }[] = [
    { key: 'compose', label: t('whatsapp.tab_compose') },
    { key: 'queue', label: t('whatsapp.tab_queue') },
    { key: 'replies', label: t('whatsapp.tab_replies') },
    { key: 'optouts', label: t('whatsapp.tab_optouts') },
  ];

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-charcoal">{t('whatsapp.title')}</h1>
          <p className="text-gray-600 mt-1 max-w-2xl">{t('whatsapp.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-sm">
          <span className={`h-2.5 w-2.5 rounded-full ${sessionOk ? 'bg-emerald-500' : 'bg-red-500'}`} />
          <div className="text-xs">
            <p className="font-semibold text-charcoal">{sessionLabel}</p>
            <p className="text-gray-500">
              {t('whatsapp.session_label', { session: stats?.sessionName ?? '—' })}
            </p>
          </div>
        </div>
      </div>

      {statsError && <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{statsError}</div>}

      {/* Safety snapshot */}
      {stats && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label={t('whatsapp.stat_queued')}
            value={String(stats.queued)}
            hint={t('whatsapp.stat_queued_hint')}
          />
          <StatCard
            label={t('whatsapp.stat_sent_today')}
            value={`${stats.sentToday} / ${stats.effectiveDailyCap}`}
            hint={
              stats.effectiveDailyCap < stats.dailyCap
                ? t('whatsapp.stat_warmup_hint', { day: String(stats.warmupDay), cap: String(stats.dailyCap) })
                : t('whatsapp.stat_daily_hint')
            }
          />
          <StatCard
            label={t('whatsapp.stat_last_hour')}
            value={`${stats.sentLastHour} / ${stats.hourlyCap}`}
            hint={t('whatsapp.stat_last_hour_hint')}
          />
          <StatCard
            label={t('whatsapp.stat_safety')}
            value={stats.quietHours ? t('whatsapp.stat_quiet') : t('whatsapp.stat_active')}
            hint={
              stats.quietHours && stats.quietHoursEnd
                ? t('whatsapp.stat_quiet_hint', {
                    start: String(stats.quietHoursStart),
                    end: String(stats.quietHoursEndHour),
                  })
                : t('whatsapp.stat_delays_hint', {
                    min: String(stats.coldDelayMinSeconds),
                    max: String(stats.coldDelayMaxSeconds),
                  })
            }
          />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1 w-fit">
        {tabs.map((item) => (
          <button
            key={item.key}
            onClick={() => setTab(item.key)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
              tab === item.key ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Compose */}
      {tab === 'compose' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-charcoal">{t('whatsapp.template')}</label>
              <textarea
                value={template}
                onChange={(event) => setTemplate(event.target.value)}
                rows={7}
                placeholder={t('whatsapp.template_placeholder')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-emerald-500"
              />
              <p className="mt-1 text-xs text-gray-500">{t('whatsapp.template_hint')}</p>
              <p className="mt-1 text-xs text-emerald-700">
                {t('whatsapp.variant_count', { count: String(variants) })}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-charcoal">
                  {t('whatsapp.recipients')}
                </label>
                <select
                  value={recipientType}
                  onChange={(event) => setRecipientType(event.target.value as typeof recipientType)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="CUSTOM">{t('whatsapp.recipients_custom')}</option>
                  <option value="ACTIVE_MEMBERS">{t('whatsapp.recipients_active')}</option>
                  <option value="ALL_MEMBERS">{t('whatsapp.recipients_all')}</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-charcoal">{t('whatsapp.profile')}</label>
                <select
                  value={profile}
                  onChange={(event) => setProfile(event.target.value as typeof profile)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="COLD">{t('whatsapp.profile_cold')}</option>
                  <option value="CONVERSATION">{t('whatsapp.profile_conversation')}</option>
                </select>
              </div>
            </div>

            {recipientType === 'CUSTOM' && (
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-charcoal">
                    {t('whatsapp.phone_list')}
                  </label>
                  <textarea
                    value={phones}
                    onChange={(event) => setPhones(event.target.value)}
                    rows={4}
                    placeholder={'+31612345678\n0612345678'}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-charcoal">
                    {t('whatsapp.country_code')}
                  </label>
                  <input
                    value={countryCode}
                    onChange={(event) => setCountryCode(event.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    placeholder="31"
                  />
                  <p className="mt-1 text-xs text-gray-500">{t('whatsapp.country_code_hint')}</p>
                </div>
              </div>
            )}

            <button
              onClick={handleEnqueue}
              disabled={submitting}
              className="w-full rounded-lg bg-emerald-700 py-2.5 font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-50"
            >
              {submitting ? t('whatsapp.queueing') : t('whatsapp.queue_button')}
            </button>
            <p className="text-xs text-gray-500">{t('whatsapp.queue_note')}</p>
          </div>

          {/* Preview */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-charcoal">{t('whatsapp.preview')}</h2>
              <button
                onClick={() => setPreviewSeed((value) => value + 1)}
                className="rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                {t('whatsapp.shuffle')}
              </button>
            </div>
            {previews.length === 0 ? (
              <p className="text-sm text-gray-500">{t('whatsapp.preview_empty')}</p>
            ) : (
              <div className="space-y-3">
                {previews.map((preview, index) => (
                  <div key={index} className="rounded-xl rounded-tl-sm bg-emerald-50 p-3 text-sm text-charcoal whitespace-pre-wrap">
                    {preview}
                  </div>
                ))}
                <p className="text-xs text-gray-500">{t('whatsapp.preview_hint')}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Result of the last campaign — names every member that was not queued, and why */}
      {tab === 'compose' && enqueueResult && (
        <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-charcoal">{t('whatsapp.result_title')}</h2>
              <p className="mt-1 text-xs text-gray-500">
                {t('whatsapp.result_summary', {
                  queued: String(enqueueResult.queued),
                  skipped: String(skippedTotalOf(enqueueResult)),
                  noPhone: String(enqueueResult.skippedNoPhone ?? 0),
                  invalid: String(enqueueResult.skippedInvalid),
                })}
              </p>
            </div>
            <button
              onClick={() => setEnqueueResult(null)}
              className="rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              {t('whatsapp.result_dismiss')}
            </button>
          </div>

          {enqueueResult.skipped.length === 0 ? (
            <p className="text-sm text-emerald-700">{t('whatsapp.result_no_skips')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                    <th className="py-2 pr-4 font-medium">{t('whatsapp.result_col_member')}</th>
                    <th className="py-2 pr-4 font-medium">{t('whatsapp.result_col_number')}</th>
                    <th className="py-2 font-medium">{t('whatsapp.result_col_reason')}</th>
                  </tr>
                </thead>
                <tbody>
                  {enqueueResult.skipped.map((row, index) => (
                    <tr key={`${row.phone}-${index}`} className="border-b border-gray-100 last:border-0">
                      <td className="py-2 pr-4 text-charcoal">
                        {row.name || t('whatsapp.result_unnamed')}
                      </td>
                      <td className="py-2 pr-4 font-mono text-xs text-gray-700">{row.phone || '—'}</td>
                      <td className="py-2 text-gray-700">
                        <span
                          title={row.detail ?? undefined}
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            SKIP_REASON_STYLES[row.reason] ?? 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {t(SKIP_REASON_KEYS[row.reason] ?? 'whatsapp.result_reason_unknown')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {enqueueResult.skippedTruncated && (
                <p className="mt-2 text-xs text-amber-700">
                  {t('whatsapp.result_truncated', { count: String(enqueueResult.skippedTotal) })}
                </p>
              )}
            </div>
          )}
          <p className="mt-3 text-xs text-gray-500">{t('whatsapp.result_hint')}</p>
        </div>
      )}

      {/* Queue */}
      {tab === 'queue' && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setPage(0);
              }}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">{t('whatsapp.filter_all')}</option>
              <option value="QUEUED">{t('whatsapp.status_QUEUED')}</option>
              <option value="SENT">{t('whatsapp.status_SENT')}</option>
              <option value="FAILED">{t('whatsapp.status_FAILED')}</option>
              <option value="CANCELLED">{t('whatsapp.status_CANCELLED')}</option>
              <option value="SKIPPED">{t('whatsapp.status_SKIPPED')}</option>
            </select>
            <button
              onClick={loadQueue}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              {t('whatsapp.refresh')}
            </button>
            {messages && (
              <span className="text-sm text-gray-500">
                {t('whatsapp.total_count', { count: String(messages.totalElements) })}
              </span>
            )}
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            {queueLoading ? (
              <div className="flex justify-center py-16">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-emerald-700" />
              </div>
            ) : !messages || messages.content.length === 0 ? (
              <p className="py-16 text-center text-gray-400">{t('whatsapp.queue_empty')}</p>
            ) : (
              <table className="w-full">
                <thead className="border-b border-gray-200 bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {t('whatsapp.col_recipient')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {t('whatsapp.col_message')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {t('whatsapp.col_status')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {t('whatsapp.col_timing')}
                    </th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {messages.content.map((message) => (
                    <tr key={message.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">
                        <p className="font-medium text-gray-900">{message.recipientName || '—'}</p>
                        <p className="text-xs text-gray-500">{message.recipientPhone}</p>
                      </td>
                      <td className="max-w-xs px-4 py-3 text-sm text-gray-600">
                        <p className="line-clamp-2">{message.body}</p>
                        {message.lastError && (
                          <p className="mt-1 text-xs text-red-600">{message.lastError}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            STATUS_STYLES[message.status] ?? 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {t(`whatsapp.status_${message.status}`)}
                        </span>
                        {message.attemptCount > 0 && (
                          <p className="mt-1 text-[11px] text-gray-400">
                            {t('whatsapp.attempts', { count: String(message.attemptCount) })}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {message.sentAt
                          ? t('whatsapp.sent_at', { time: new Date(message.sentAt).toLocaleString() })
                          : message.nextAttemptAt
                            ? t('whatsapp.next_attempt', { time: new Date(message.nextAttemptAt).toLocaleString() })
                            : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {can('whatsapp.manage') && message.status === 'QUEUED' && (
                          <button
                            onClick={() => setCancelTarget(message)}
                            className="rounded-md border border-red-300 px-3 py-1 text-xs text-red-700 hover:bg-red-50"
                          >
                            {t('whatsapp.cancel')}
                          </button>
                        )}
                        {can('whatsapp.manage') && (
                          <button
                            onClick={() => setDeleteTarget(message)}
                            disabled={message.status === 'SENDING'}
                            title={message.status === 'SENDING' ? t('whatsapp.delete_sending') : undefined}
                            className="ml-2 rounded-md border border-red-300 px-3 py-1 text-xs text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {t('whatsapp.delete')}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {messages && messages.totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-gray-600">
              <button
                onClick={() => setPage((value) => Math.max(0, value - 1))}
                disabled={page === 0}
                className="rounded-md border border-gray-300 px-3 py-1.5 disabled:opacity-40"
              >
                {t('common.back')}
              </button>
              <span>
                {t('whatsapp.page_of', {
                  page: String(messages.number + 1),
                  total: String(messages.totalPages),
                })}
              </span>
              <button
                onClick={() => setPage((value) => value + 1)}
                disabled={page + 1 >= messages.totalPages}
                className="rounded-md border border-gray-300 px-3 py-1.5 disabled:opacity-40"
              >
                {t('whatsapp.next')}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Replies */}
      {tab === 'replies' && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="mb-4 text-sm text-gray-600">{t('whatsapp.replies_hint')}</p>
          {!stats || stats.recentReplies.length === 0 ? (
            <p className="py-8 text-center text-gray-400">{t('whatsapp.replies_empty')}</p>
          ) : (
            <ul className="space-y-3">
              {stats.recentReplies.map((reply) => (
                <li key={reply.id} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-charcoal">
                      {reply.contactName || reply.fromPhone}
                    </span>
                    <span className="text-xs text-gray-500">{reply.fromPhone}</span>
                    {reply.optOut && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700">
                        {t('whatsapp.optout_badge')}
                      </span>
                    )}
                    <span className="ml-auto text-xs text-gray-400">
                      {new Date(reply.receivedAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">{reply.body}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Opt-outs */}
      {tab === 'optouts' && (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-1 text-sm font-semibold text-charcoal">{t('whatsapp.optout_add_title')}</h2>
            <p className="mb-3 text-xs text-gray-500">{t('whatsapp.optout_add_hint')}</p>
            <div className="space-y-3">
              <input
                value={newOptOutPhone}
                onChange={(event) => setNewOptOutPhone(event.target.value)}
                placeholder="+31612345678"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <input
                value={newOptOutReason}
                onChange={(event) => setNewOptOutReason(event.target.value)}
                placeholder={t('whatsapp.optout_reason_placeholder')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <button
                onClick={handleAddOptOut}
                disabled={optOutSaving || !newOptOutPhone.trim()}
                className="w-full rounded-lg bg-emerald-700 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
              >
                {optOutSaving ? t('common.saving') : t('whatsapp.optout_add_button')}
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm lg:col-span-2">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-charcoal">
                {t('whatsapp.optout_list_title', { count: String(optOuts.length) })}
              </h2>
              <button
                onClick={loadOptOuts}
                className="rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                {t('whatsapp.refresh')}
              </button>
            </div>
            {optOuts.length === 0 ? (
              <p className="py-8 text-center text-gray-400">{t('whatsapp.optout_empty')}</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {optOuts.map((optOut) => (
                  <li key={optOut.id} className="flex flex-wrap items-center gap-2 py-2.5">
                    <span className="text-sm font-medium text-gray-900">{optOut.phoneE164}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        optOut.source === 'REPLY'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {optOut.source === 'REPLY'
                        ? t('whatsapp.optout_source_reply')
                        : t('whatsapp.optout_source_manual')}
                    </span>
                    {optOut.keyword && <span className="text-xs text-gray-500">“{optOut.keyword}”</span>}
                    <span className="ml-auto text-xs text-gray-400">
                      {new Date(optOut.createdAt).toLocaleDateString()}
                    </span>
                    <button
                      onClick={() => setRemoveOptOutTarget(optOut)}
                      className="rounded-md border border-gray-300 px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-50"
                    >
                      {t('whatsapp.optout_remove')}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Dialogs */}
      <ConfirmDialog
        open={!!cancelTarget}
        title={t('whatsapp.cancel_title')}
        message={t('whatsapp.cancel_message')}
        confirmLabel={t('whatsapp.cancel')}
        cancelLabel={t('common.cancel')}
        variant="warning"
        onConfirm={handleCancel}
        onCancel={() => setCancelTarget(null)}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title={t('whatsapp.delete_title')}
        message={t(deleteTarget?.status === 'QUEUED' ? 'whatsapp.delete_queued_message' : 'whatsapp.delete_message')}
        confirmLabel={t('whatsapp.delete')}
        cancelLabel={t('common.cancel')}
        variant="danger"
        confirmDisabled={deleting}
        onConfirm={handleDelete}
        onCancel={() => { if (!deleting) setDeleteTarget(null); }}
      />

      <ConfirmDialog
        open={!!removeOptOutTarget}
        title={t('whatsapp.optout_remove_title')}
        message={t('whatsapp.optout_remove_message')}
        confirmLabel={t('whatsapp.optout_remove')}
        cancelLabel={t('common.cancel')}
        variant="danger"
        onConfirm={handleRemoveOptOut}
        onCancel={() => setRemoveOptOutTarget(null)}
      />

      {toast && (
        <ToastNotification message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-charcoal">{value}</p>
      <p className="mt-1 text-xs text-gray-500">{hint}</p>
    </div>
  );
}
