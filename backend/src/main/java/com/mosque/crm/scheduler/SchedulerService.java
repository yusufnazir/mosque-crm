package com.mosque.crm.scheduler;

import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.support.CronExpression;
import org.springframework.stereotype.Service;

import com.mosque.crm.dto.ScheduledJobDTO;
import com.mosque.crm.entity.ScheduledJobConfig;
import com.mosque.crm.repository.ScheduledJobConfigRepository;

/**
 * Platform-admin API for the scheduler runtime: list, reconfigure, start, stop and run-now.
 *
 * All changes are applied to the running application through {@link SchedulerRuntime}; nothing
 * here waits for a restart.
 */
@Service
public class SchedulerService {

    private static final Logger log = LoggerFactory.getLogger(SchedulerService.class);

    private static final int MIN_INTERVAL_SECONDS = 1;
    private static final int MAX_INTERVAL_SECONDS = 86_400;

    private final SchedulerRuntime runtime;
    private final ScheduledJobConfigRepository configRepository;

    public SchedulerService(SchedulerRuntime runtime, ScheduledJobConfigRepository configRepository) {
        this.runtime = runtime;
        this.configRepository = configRepository;
    }

    public List<ScheduledJobDTO> list() {
        List<ScheduledJobDTO> result = new ArrayList<>();
        for (ScheduledJob job : runtime.jobs()) {
            ScheduledJobConfig config = runtime.ensureConfig(job);
            result.add(toDTO(job, config));
        }
        return result;
    }

    public ScheduledJobDTO get(String key) {
        ScheduledJob job = requireJob(key);
        return toDTO(job, runtime.ensureConfig(job));
    }

    /** Stores new settings and applies them immediately (reschedule when enabled, stop when disabled). */
    public ScheduledJobDTO update(String key, ScheduledJobDTO dto, String username) {
        ScheduledJob job = requireJob(key);
        ScheduledJobConfig config = runtime.ensureConfig(job);

        String triggerType = normalizeTriggerType(dto.getTriggerType(), config.getTriggerType());
        String timezone = dto.getTimezone() == null || dto.getTimezone().isBlank()
                ? config.getTimezone()
                : dto.getTimezone().trim();
        try {
            ZoneId.of(timezone);
        } catch (Exception e) {
            throw new IllegalArgumentException("Unknown time zone: " + timezone);
        }

        String cron = config.getCronExpression();
        Integer interval = config.getFixedDelaySeconds();
        if (ScheduledJobConfig.TriggerType.CRON.equals(triggerType)) {
            cron = dto.getCronExpression() == null ? config.getCronExpression() : dto.getCronExpression().trim();
            if (cron == null || cron.isBlank()) {
                throw new IllegalArgumentException("A cron expression is required for a cron schedule.");
            }
            if (!CronExpression.isValidExpression(cron)) {
                throw new IllegalArgumentException("Invalid cron expression: " + cron);
            }
        } else {
            interval = dto.getFixedDelaySeconds() == null ? config.getFixedDelaySeconds() : dto.getFixedDelaySeconds();
            if (interval == null || interval < MIN_INTERVAL_SECONDS || interval > MAX_INTERVAL_SECONDS) {
                throw new IllegalArgumentException("The interval must be between "
                        + MIN_INTERVAL_SECONDS + " and " + MAX_INTERVAL_SECONDS + " seconds.");
            }
        }

        config.setTriggerType(triggerType);
        config.setCronExpression(cron);
        config.setFixedDelaySeconds(interval);
        config.setTimezone(timezone);
        config.setEnabled(dto.isEnabled());
        config.setUpdatedBy(username);
        ScheduledJobConfig saved = configRepository.save(config);

        if (saved.isEnabled()) {
            runtime.schedule(job, saved);
        } else {
            runtime.cancel(job.key());
        }
        log.info("Scheduler '{}' updated by {}: enabled={}, trigger={}, cron={}, interval={}s",
                key, username, saved.isEnabled(), triggerType, cron, interval);
        return toDTO(job, saved);
    }

    public ScheduledJobDTO start(String key, String username) {
        ScheduledJob job = requireJob(key);
        ScheduledJobConfig config = runtime.ensureConfig(job);
        config.setEnabled(true);
        config.setUpdatedBy(username);
        ScheduledJobConfig saved = configRepository.save(config);
        runtime.schedule(job, saved);
        log.info("Scheduler '{}' started by {}", key, username);
        return toDTO(job, saved);
    }

    public ScheduledJobDTO stop(String key, String username) {
        ScheduledJob job = requireJob(key);
        ScheduledJobConfig config = runtime.ensureConfig(job);
        config.setEnabled(false);
        config.setUpdatedBy(username);
        ScheduledJobConfig saved = configRepository.save(config);
        runtime.cancel(job.key());
        log.info("Scheduler '{}' stopped by {}", key, username);
        return toDTO(job, saved);
    }

    /** Runs the job once now; the schedule itself is untouched. */
    public ScheduledJobDTO runNow(String key) {
        ScheduledJob job = requireJob(key);
        ScheduledJobConfig config = runtime.ensureConfig(job);
        runtime.runNow(key);
        return toDTO(job, config);
    }

    private ScheduledJob requireJob(String key) {
        ScheduledJob job = runtime.job(key);
        if (job == null) {
            throw new IllegalArgumentException("Unknown job: " + key);
        }
        return job;
    }

    private String normalizeTriggerType(String requested, String fallback) {
        String value = requested == null || requested.isBlank() ? fallback : requested.trim().toUpperCase();
        if (!ScheduledJobConfig.TriggerType.CRON.equals(value)
                && !ScheduledJobConfig.TriggerType.FIXED_DELAY.equals(value)) {
            throw new IllegalArgumentException("Trigger type must be CRON or FIXED_DELAY.");
        }
        return value;
    }

    private ScheduledJobDTO toDTO(ScheduledJob job, ScheduledJobConfig config) {
        ScheduledJobDTO dto = new ScheduledJobDTO();
        dto.setKey(job.key());
        dto.setLabel(job.label());
        dto.setDescription(job.description());
        dto.setEnabled(config.isEnabled());
        dto.setScheduled(runtime.isScheduled(config.getJobKey()));
        dto.setRunning(runtime.isRunning(config.getJobKey()));
        dto.setTriggerType(config.getTriggerType());
        dto.setCronExpression(config.getCronExpression());
        dto.setFixedDelaySeconds(config.getFixedDelaySeconds());
        dto.setTimezone(config.getTimezone());
        dto.setNextRunAt(runtime.nextRunAt(config));
        dto.setLastRunAt(config.getLastRunAt());
        dto.setLastStatus(config.getLastStatus());
        dto.setLastDurationMs(config.getLastDurationMs());
        dto.setLastError(config.getLastError());
        dto.setUpdatedAt(config.getUpdatedAt());
        dto.setUpdatedBy(config.getUpdatedBy());
        return dto;
    }
}
