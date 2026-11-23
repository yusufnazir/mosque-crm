package com.mosque.crm.scheduler;

/**
 * A background job the platform can start, stop and reconfigure at runtime.
 *
 * Implementations are Spring beans; {@link SchedulerRuntime} discovers them automatically and
 * creates a {@code scheduler_job_configs} row with their defaults on first start. The code is
 * the source of truth for <em>which</em> jobs exist — the database only stores settings and
 * last-run state, so nothing has to be migrated when a job is added.
 */
public interface ScheduledJob {

    /** Stable identifier, also used as the configuration row key. e.g. {@code billing.daily}. */
    String key();

    /** English fallback label (the UI translates {@code scheduler.job_<key>} when available). */
    String label();

    /** English fallback description shown under the label. */
    String description();

    /** {@code CRON} or {@code FIXED_DELAY}. */
    String defaultTriggerType();

    /**
     * Whether the job starts enabled when its configuration row is created for the first time.
     * Lets a job carry over an older, properties/configuration based "enabled" flag.
     */
    default boolean defaultEnabled() {
        return true;
    }

    /** Default cron expression (6 fields, Spring syntax) when the job is cron driven. */
    default String defaultCron() {
        return null;
    }

    /** Default interval in seconds when the job is interval driven. */
    default Integer defaultFixedDelaySeconds() {
        return null;
    }

    default String defaultTimezone() {
        return "Europe/Amsterdam";
    }

    /** Delay before the first run when the job is (re)started. */
    default long initialDelaySeconds() {
        return 0;
    }

    /** Executes one pass. Exceptions are caught by the runtime and recorded as a failed run. */
    void run() throws Exception;
}
