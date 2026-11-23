package com.mosque.crm.scheduler;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TimeZone;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.atomic.AtomicBoolean;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.scheduling.support.CronTrigger;
import org.springframework.stereotype.Component;

import com.mosque.crm.entity.ScheduledJobConfig;
import com.mosque.crm.repository.ScheduledJobConfigRepository;

/**
 * Owns the live scheduling of every {@link ScheduledJob}.
 *
 * Each job runs on its own {@link ScheduledFuture}, so starting, stopping, re-timing or
 * "run now" acts on the running application immediately — no restart and no annotation magic.
 * The runtime also serialises runs per job (an overrunning job is skipped rather than stacked)
 * and records the outcome on the configuration row.
 */
@Component
public class SchedulerRuntime {

    private static final Logger log = LoggerFactory.getLogger(SchedulerRuntime.class);

    private final ScheduledJobConfigRepository configRepository;
    private final ThreadPoolTaskScheduler taskScheduler;
    private final boolean schedulingEnabled;

    /** All discovered jobs, keyed by {@link ScheduledJob#key()}. */
    private final Map<String, ScheduledJob> jobs = new LinkedHashMap<>();

    /** Currently scheduled futures (absent = stopped). */
    private final Map<String, ScheduledFuture<?>> futures = new ConcurrentHashMap<>();

    /** Guards against overlapping runs of the same job. */
    private final Map<String, AtomicBoolean> running = new ConcurrentHashMap<>();

    public SchedulerRuntime(ScheduledJobConfigRepository configRepository,
                            ThreadPoolTaskScheduler taskScheduler,
                            List<ScheduledJob> scheduledJobs,
                            @Value("${scheduler.enabled:true}") boolean schedulingEnabled) {
        this.configRepository = configRepository;
        this.taskScheduler = taskScheduler;
        this.schedulingEnabled = schedulingEnabled;

        List<ScheduledJob> sorted = new ArrayList<>(scheduledJobs);
        sorted.sort(Comparator.comparing(ScheduledJob::key));
        for (ScheduledJob job : sorted) {
            jobs.put(job.key(), job);
            running.put(job.key(), new AtomicBoolean(false));
        }
        log.info("Discovered {} scheduled job(s): {}", jobs.size(), jobs.keySet());
    }

    // ─── lifecycle ────────────────────────────────────────────────────────────

    @EventListener(ApplicationReadyEvent.class)
    public void bootstrap() {
        if (!schedulingEnabled) {
            log.info("Scheduler runtime disabled (scheduler.enabled=false)");
            return;
        }
        for (ScheduledJob job : jobs.values()) {
            try {
                ScheduledJobConfig config = ensureConfig(job);
                if (config.isEnabled()) {
                    schedule(job, config);
                }
            } catch (Exception e) {
                log.error("Could not start scheduled job '{}': {}", job.key(), e.getMessage(), e);
            }
        }
    }

    /** (Re)schedules a job with the stored configuration. Replaces any existing schedule. */
    public synchronized void schedule(ScheduledJob job, ScheduledJobConfig config) {
        cancel(job.key());
        if (!schedulingEnabled) {
            return;
        }

        Runnable guarded = guarded(job, config);
        try {
            if (ScheduledJobConfig.TriggerType.FIXED_DELAY.equals(config.getTriggerType())) {
                int seconds = config.getFixedDelaySeconds() == null ? 60 : config.getFixedDelaySeconds();
                Instant firstRun = Instant.now().plusSeconds(Math.max(0, job.initialDelaySeconds()));
                ScheduledFuture<?> future = taskScheduler.scheduleWithFixedDelay(
                        guarded, firstRun, Duration.ofSeconds(Math.max(1, seconds)));
                futures.put(job.key(), future);
                log.info("Started job '{}' every {}s", job.key(), seconds);
            } else {
                TimeZone zone = timeZone(config.getTimezone());
                CronTrigger trigger = new CronTrigger(config.getCronExpression(), zone);
                ScheduledFuture<?> future = taskScheduler.schedule(guarded, trigger);
                futures.put(job.key(), future);
                log.info("Started job '{}' with cron '{}' ({})", job.key(), config.getCronExpression(), config.getTimezone());
            }
        } catch (Exception e) {
            log.error("Invalid schedule for job '{}': {}", job.key(), e.getMessage());
            throw new IllegalStateException("Could not schedule job: " + e.getMessage(), e);
        }
    }

    /** Cancels the schedule. A run that is already executing is not interrupted. */
    public synchronized void cancel(String jobKey) {
        ScheduledFuture<?> future = futures.remove(jobKey);
        if (future != null) {
            future.cancel(false);
            log.info("Stopped job '{}'", jobKey);
        }
    }

    /** Runs the job once, immediately, without touching its schedule. */
    public boolean runNow(String jobKey) {
        ScheduledJob job = jobs.get(jobKey);
        if (job == null) {
            throw new IllegalArgumentException("Unknown job: " + jobKey);
        }
        AtomicBoolean flag = running.get(jobKey);
        if (!flag.compareAndSet(false, true)) {
            log.warn("Job '{}' is already running, manual run skipped", jobKey);
            return false;
        }
        taskScheduler.execute(() -> {
            try {
                execute(job);
            } finally {
                flag.set(false);
            }
        });
        return true;
    }

    public boolean isScheduled(String jobKey) {
        return futures.containsKey(jobKey);
    }

    public boolean isRunning(String jobKey) {
        AtomicBoolean flag = running.get(jobKey);
        return flag != null && flag.get();
    }

    public List<ScheduledJob> jobs() {
        return new ArrayList<>(jobs.values());
    }

    public ScheduledJob job(String jobKey) {
        return jobs.get(jobKey);
    }

    public ScheduledJobConfig ensureConfig(ScheduledJob job) {
        return configRepository.findByJobKey(job.key()).orElseGet(() -> {
            ScheduledJobConfig config = new ScheduledJobConfig();
            config.setJobKey(job.key());
            config.setEnabled(job.defaultEnabled());
            config.setTriggerType(job.defaultTriggerType());
            config.setCronExpression(job.defaultCron());
            config.setFixedDelaySeconds(job.defaultFixedDelaySeconds());
            config.setTimezone(job.defaultTimezone());
            config.setUpdatedBy("system");
            log.info("Created default configuration for job '{}'", job.key());
            return configRepository.save(config);
        });
    }

    /** Next execution as wall-clock time (server zone), or {@code null} when not scheduled. */
    public LocalDateTime nextRunAt(ScheduledJobConfig config) {
        if (!schedulingEnabled || !config.isEnabled() || !futures.containsKey(config.getJobKey())) {
            return null;
        }
        if (ScheduledJobConfig.TriggerType.FIXED_DELAY.equals(config.getTriggerType())) {
            int seconds = config.getFixedDelaySeconds() == null ? 60 : Math.max(1, config.getFixedDelaySeconds());
            LocalDateTime base = config.getLastRunAt() == null ? LocalDateTime.now() : config.getLastRunAt();
            return base.plusSeconds(seconds);
        }
        try {
            org.springframework.scheduling.support.CronExpression expression =
                    org.springframework.scheduling.support.CronExpression.parse(config.getCronExpression());
            ZoneId zone = zone(config.getTimezone());
            ZonedDateTime next = expression.next(ZonedDateTime.now(zone));
            return next == null ? null : next.withZoneSameInstant(ZoneId.systemDefault()).toLocalDateTime();
        } catch (Exception e) {
            return null;
        }
    }

    // ─── execution ────────────────────────────────────────────────────────────

    private Runnable guarded(ScheduledJob job, ScheduledJobConfig config) {
        return () -> {
            AtomicBoolean flag = running.get(job.key());
            if (!flag.compareAndSet(false, true)) {
                log.warn("Job '{}' is still running, this tick is skipped", job.key());
                return;
            }
            try {
                execute(job);
            } finally {
                flag.set(false);
            }
        };
    }

    private void execute(ScheduledJob job) {
        long started = System.currentTimeMillis();
        try {
            job.run();
            recordRun(job.key(), ScheduledJobConfig.Status.SUCCESS, System.currentTimeMillis() - started, null);
            log.debug("Job '{}' finished in {} ms", job.key(), System.currentTimeMillis() - started);
        } catch (Exception e) {
            log.error("Job '{}' failed: {}", job.key(), e.getMessage(), e);
            recordRun(job.key(), ScheduledJobConfig.Status.FAILED, System.currentTimeMillis() - started, e.getMessage());
        }
    }

    private void recordRun(String jobKey, String status, long durationMs, String error) {
        try {
            configRepository.findByJobKey(jobKey).ifPresent(config -> {
                config.setLastRunAt(LocalDateTime.now());
                config.setLastStatus(status);
                config.setLastDurationMs(durationMs);
                config.setLastError(error == null ? null
                        : error.substring(0, Math.min(error.length(), 950)));
                configRepository.save(config);
            });
        } catch (Exception e) {
            // Never let bookkeeping break the schedule
            log.warn("Could not record run for job '{}': {}", jobKey, e.getMessage());
        }
    }

    private TimeZone timeZone(String timezone) {
        return TimeZone.getTimeZone(zone(timezone));
    }

    private ZoneId zone(String timezone) {
        try {
            return ZoneId.of(timezone);
        } catch (Exception e) {
            return ZoneId.of("Europe/Amsterdam");
        }
    }
}
