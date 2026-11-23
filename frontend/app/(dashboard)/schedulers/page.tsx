'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import ToastNotification from '@/components/ToastNotification';
import { useAuth } from '@/lib/auth/AuthContext';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { schedulerApi, ScheduledJobDTO, SchedulerTriggerType } from '@/lib/schedulerApi';

type Toast = { message: string; type: 'success' | 'error' } | null;

const CRON_PRESETS = [
  { key: 'preset_daily_2am', cron: '0 0 2 * * *' },
  { key: 'preset_daily_midnight', cron: '0 0 0 * * *' },
  { key: 'preset_hourly', cron: '0 0 * * * *' },
  { key: 'preset_weekly_monday', cron: '0 0 2 * * MON' },
  { key: 'preset_monthly_first', cron: '0 0 2 1 * *' },
];

const TIMEZONES = [
  'Europe/Amsterdam',
  'Europe/Brussels',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Paris',
  'Europe/Madrid',
  'UTC',
];

function apiErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error) || !error.message) return fallback;
  try {
    const parsed = JSON.parse(error.message) as { error?: string; message?: string };
    return parsed.error || parsed.message || fallback;
  } catch {
    return error.message || fallback;
  }
}

function formatDateTime(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
}

function formatDuration(ms?: number | null): string {
  if (ms == null) return '—';
  if (ms < 1000) return `${ms} ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)} s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes} min ${Math.round(seconds % 60)} s`;
}

export default function SchedulersPage() {
  const { t } = useTranslation();
  const { can } = useAuth();

  const [jobs, setJobs] = useState<ScheduledJobDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [toast, setToast] = useState<Toast>(null);

  const canManage = can('scheduler.manage');

  const load = useCallback(async () => {
    try {
      setLoadError('');
      const data = await schedulerApi.list();
      setJobs(data);
    } catch (error) {
      setLoadError(apiErrorMessage(error, t('schedulers.load_error')));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  // Keep "next run" roughly honest without hammering the API
  useEffect(() => {
    const id = window.setInterval(() => {
      if (!document.hidden) load();
    }, 30000);
    return () => window.clearInterval(id);
  }, [load]);

  const replaceJob = (updated: ScheduledJobDTO) => {
    setJobs(prev => prev.map(job => (job.key === updated.key ? updated : job)));
  };

  const runningCount = useMemo(
    () => jobs.filter(job => job.scheduled).length,
    [jobs],
  );

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-charcoal md:text-3xl">{t('schedulers.title')}</h1>
          <p className="mt-1 max-w-3xl text-sm text-gray-500">{t('schedulers.subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={() => load()}
          disabled={loading}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
        >
          {t('schedulers.refresh')}
        </button>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
        <span className="font-semibold">
          {t('schedulers.summary').replace('{{running}}', String(runningCount)).replace('{{total}}', String(jobs.length))}
        </span>
        <span className="text-emerald-800">{t('schedulers.notice')}</span>
      </div>

      {!canManage && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {t('schedulers.view_only')}
        </div>
      )}

      {loadError && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {loadError}
        </div>
      )}

      {loading && jobs.length === 0 && (
        <p className="text-sm text-gray-500">{t('common.loading')}</p>
      )}

      {!loading && jobs.length === 0 && !loadError && (
        <p className="text-sm text-gray-500">{t('schedulers.no_jobs')}</p>
      )}

      <div className="space-y-5">
        {jobs.map(job => (
          <JobCard
            key={job.key}
            job={job}
            canManage={canManage}
            onJobChanged={replaceJob}
            onToast={setToast}
          />
        ))}
      </div>

      {toast && (
        <ToastNotification message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
}

interface JobCardProps {
  job: ScheduledJobDTO;
  canManage: boolean;
  onJobChanged: (job: ScheduledJobDTO) => void;
  onToast: (toast: Toast) => void;
}

function JobCard({ job, canManage, onJobChanged, onToast }: JobCardProps) {
  const { t } = useTranslation();

  const [triggerType, setTriggerType] = useState<SchedulerTriggerType>(job.triggerType);
  const [cron, setCron] = useState(job.cronExpression ?? '');
  const [intervalSeconds, setIntervalSeconds] = useState(String(job.fixedDelaySeconds ?? 60));
  const [timezone, setTimezone] = useState(job.timezone);
  const [saving, setSaving] = useState(false);
  const [acting, setActing] = useState(false);

  // Re-seed the form whenever the server state changes (save, start, stop, run)
  useEffect(() => {
    setTriggerType(job.triggerType);
    setCron(job.cronExpression ?? '');
    setIntervalSeconds(String(job.fixedDelaySeconds ?? 60));
    setTimezone(job.timezone);
  }, [job.key, job.triggerType, job.cronExpression, job.fixedDelaySeconds, job.timezone, job.updatedAt]);

  const labelKey = `schedulers.job_${job.key.replace(/\./g, '_')}`;
  const translatedLabel = t(labelKey);
  const label = translatedLabel !== labelKey ? translatedLabel : job.label;

  const descriptionKey = `${labelKey}_description`;
  const translatedDescription = t(descriptionKey);
  const description = translatedDescription !== descriptionKey ? translatedDescription : job.description;

  const dirty =
    triggerType !== job.triggerType ||
    (triggerType === 'CRON' ? cron !== (job.cronExpression ?? '') : Number(intervalSeconds) !== (job.fixedDelaySeconds ?? 0)) ||
    timezone !== job.timezone;

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await schedulerApi.update(job.key, {
        enabled: job.enabled,
        triggerType,
        cronExpression: triggerType === 'CRON' ? cron : job.cronExpression ?? null,
        fixedDelaySeconds: triggerType === 'FIXED_DELAY' ? Number(intervalSeconds) : job.fixedDelaySeconds ?? null,
        timezone,
      });
      onJobChanged(updated);
      onToast({ message: t('schedulers.saved'), type: 'success' });
    } catch (error) {
      onToast({ message: apiErrorMessage(error, t('schedulers.save_error')), type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleRunning = async () => {
    setActing(true);
    try {
      const updated = job.scheduled
        ? await schedulerApi.stop(job.key)
        : await schedulerApi.start(job.key);
      onJobChanged(updated);
      onToast({
        message: updated.scheduled ? t('schedulers.started') : t('schedulers.stopped'),
        type: 'success',
      });
    } catch (error) {
      onToast({ message: apiErrorMessage(error, t('schedulers.action_error')), type: 'error' });
    } finally {
      setActing(false);
    }
  };

  const handleRunNow = async () => {
    setActing(true);
    try {
      const updated = await schedulerApi.runNow(job.key);
      onJobChanged(updated);
      onToast({ message: t('schedulers.run_queued'), type: 'success' });
    } catch (error) {
      onToast({ message: apiErrorMessage(error, t('schedulers.action_error')), type: 'error' });
    } finally {
      setActing(false);
    }
  };

  const statusChip = job.running
    ? { text: t('schedulers.status_running_now'), className: 'bg-blue-100 text-blue-800' }
    : job.scheduled
      ? { text: t('schedulers.status_scheduled'), className: 'bg-emerald-100 text-emerald-800' }
      : { text: t('schedulers.status_stopped'), className: 'bg-gray-200 text-gray-700' };

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 p-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-charcoal">{label}</h2>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusChip.className}`}>
              {statusChip.text}
            </span>
            <code className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-600">{job.key}</code>
          </div>
          {description && <p className="mt-1 max-w-3xl text-sm text-gray-500">{description}</p>}
        </div>

        {canManage && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleToggleRunning}
              disabled={acting}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition disabled:opacity-50 ${
                job.scheduled
                  ? 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  : 'bg-emerald-700 text-white hover:bg-emerald-800'
              }`}
            >
              {job.scheduled ? t('schedulers.stop') : t('schedulers.start')}
            </button>
            <button
              type="button"
              onClick={handleRunNow}
              disabled={acting}
              className="rounded-lg bg-gray-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-900 disabled:opacity-50"
            >
              {t('schedulers.run_now')}
            </button>
          </div>
        )}
      </div>

      <div className="grid gap-5 p-5 lg:grid-cols-2">
        {/* Schedule settings */}
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              {t('schedulers.schedule_type')}
            </p>
            <div className="inline-flex overflow-hidden rounded-lg border border-gray-300">
              <button
                type="button"
                disabled={!canManage}
                onClick={() => setTriggerType('CRON')}
                className={`px-4 py-2 text-sm font-medium transition ${
                  triggerType === 'CRON' ? 'bg-emerald-700 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                } disabled:opacity-60`}
              >
                {t('schedulers.trigger_cron')}
              </button>
              <button
                type="button"
                disabled={!canManage}
                onClick={() => setTriggerType('FIXED_DELAY')}
                className={`px-4 py-2 text-sm font-medium transition ${
                  triggerType === 'FIXED_DELAY' ? 'bg-emerald-700 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                } disabled:opacity-60`}
              >
                {t('schedulers.trigger_interval')}
              </button>
            </div>
          </div>

          {triggerType === 'CRON' ? (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  {t('schedulers.cron_label')}
                </label>
                <input
                  type="text"
                  value={cron}
                  disabled={!canManage}
                  onChange={e => setCron(e.target.value)}
                  placeholder="0 0 2 * * *"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm focus:border-transparent focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-50"
                />
                <p className="mt-1 text-xs text-gray-500">{t('schedulers.cron_hint')}</p>
                {canManage && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {CRON_PRESETS.map(preset => (
                      <button
                        key={preset.key}
                        type="button"
                        onClick={() => setCron(preset.cron)}
                        className={`rounded-md border px-2.5 py-1 text-xs transition ${
                          cron === preset.cron
                            ? 'border-emerald-500 bg-emerald-50 font-semibold text-emerald-700'
                            : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {t(`schedulers.${preset.key}`)}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  {t('schedulers.timezone_label')}
                </label>
                <input
                  type="text"
                  list="scheduler-timezones"
                  value={timezone}
                  disabled={!canManage}
                  onChange={e => setTimezone(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-50"
                />
                <datalist id="scheduler-timezones">
                  {TIMEZONES.map(zone => (
                    <option key={zone} value={zone} />
                  ))}
                </datalist>
              </div>
            </>
          ) : (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                {t('schedulers.interval_label')}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={86400}
                  value={intervalSeconds}
                  disabled={!canManage}
                  onChange={e => setIntervalSeconds(e.target.value)}
                  className="w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-50"
                />
                <span className="text-sm text-gray-600">{t('schedulers.interval_unit')}</span>
              </div>
              <p className="mt-1 text-xs text-gray-500">{t('schedulers.interval_hint')}</p>
            </div>
          )}

          {canManage && (
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleSave}
                disabled={!dirty || saving}
                className="rounded-lg bg-emerald-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? t('schedulers.saving') : t('schedulers.save')}
              </button>
              {dirty && <span className="text-xs text-amber-700">{t('schedulers.unsaved')}</span>}
            </div>
          )}
        </div>

        {/* Run history */}
        <div className="rounded-lg bg-gray-50 p-4">
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">{t('schedulers.next_run')}</dt>
              <dd className="text-charcoal">{job.scheduled ? formatDateTime(job.nextRunAt) : t('schedulers.not_scheduled')}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">{t('schedulers.last_run')}</dt>
              <dd className="text-charcoal">{formatDateTime(job.lastRunAt)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">{t('schedulers.last_result')}</dt>
              <dd>
                {job.lastStatus === 'SUCCESS' && (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                    {t('schedulers.result_success')}
                  </span>
                )}
                {job.lastStatus === 'FAILED' && (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">
                    {t('schedulers.result_failed')}
                  </span>
                )}
                {job.lastStatus === 'SKIPPED' && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                    {t('schedulers.result_skipped')}
                  </span>
                )}
                {!job.lastStatus && <span className="text-gray-500">—</span>}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">{t('schedulers.duration')}</dt>
              <dd className="text-charcoal">{formatDuration(job.lastDurationMs)}</dd>
            </div>
          </dl>

          {job.lastError && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-red-700">{t('schedulers.last_error')}</p>
              <p className="mt-1 break-words font-mono text-xs text-red-800">{job.lastError}</p>
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
            <span>
              {t('schedulers.trigger_type_value')}: <strong>{job.triggerType}</strong>
            </span>
            {job.updatedBy && (
              <span>
                {t('schedulers.updated_by')}: <strong>{job.updatedBy}</strong>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
