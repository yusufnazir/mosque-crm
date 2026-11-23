import { ApiClient } from './api';

export type SchedulerTriggerType = 'CRON' | 'FIXED_DELAY';
export type SchedulerRunStatus = 'SUCCESS' | 'FAILED' | 'SKIPPED';

export interface ScheduledJobDTO {
  /** Stable job key, e.g. `billing.daily`. */
  key: string;
  /** English fallback label — the UI prefers `schedulers.job_<key>`. */
  label: string;
  description?: string;
  /** Stored setting: should the runtime run this job? */
  enabled: boolean;
  /** Live state: is a schedule currently registered in the runtime? */
  scheduled: boolean;
  /** Live state: is a run executing right now? */
  running: boolean;
  triggerType: SchedulerTriggerType;
  cronExpression?: string | null;
  fixedDelaySeconds?: number | null;
  timezone: string;
  nextRunAt?: string | null;
  lastRunAt?: string | null;
  lastStatus?: SchedulerRunStatus | null;
  lastDurationMs?: number | null;
  lastError?: string | null;
  updatedAt?: string | null;
  updatedBy?: string | null;
}

export interface ScheduledJobUpdate {
  enabled: boolean;
  triggerType: SchedulerTriggerType;
  cronExpression?: string | null;
  fixedDelaySeconds?: number | null;
  timezone?: string;
}

const keyPath = (key: string) => `/schedulers/${encodeURIComponent(key)}`;

export const schedulerApi = {
  list: () => ApiClient.get<ScheduledJobDTO[]>('/schedulers'),
  get: (key: string) => ApiClient.get<ScheduledJobDTO>(keyPath(key)),
  update: (key: string, payload: ScheduledJobUpdate) =>
    ApiClient.put<ScheduledJobDTO>(keyPath(key), payload),
  start: (key: string) => ApiClient.post<ScheduledJobDTO>(`${keyPath(key)}/start`),
  stop: (key: string) => ApiClient.post<ScheduledJobDTO>(`${keyPath(key)}/stop`),
  runNow: (key: string) => ApiClient.post<ScheduledJobDTO>(`${keyPath(key)}/run`),
};
