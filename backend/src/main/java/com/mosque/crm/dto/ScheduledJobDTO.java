package com.mosque.crm.dto;

import java.time.LocalDateTime;

/**
 * One row of the platform scheduler view.
 *
 * The label/description are English fallbacks — the UI prefers {@code scheduler.job_<key>} and
 * {@code scheduler.job_<key>_description} translations when they exist.
 */
public class ScheduledJobDTO {

    private String key;
    private String label;
    private String description;

    private boolean enabled;
    private boolean scheduled;
    private boolean running;

    private String triggerType;
    private String cronExpression;
    private Integer fixedDelaySeconds;
    private String timezone;

    private LocalDateTime nextRunAt;
    private LocalDateTime lastRunAt;
    private String lastStatus;
    private Long lastDurationMs;
    private String lastError;

    private LocalDateTime updatedAt;
    private String updatedBy;

    public String getKey() { return key; }
    public void setKey(String key) { this.key = key; }

    public String getLabel() { return label; }
    public void setLabel(String label) { this.label = label; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }

    public boolean isScheduled() { return scheduled; }
    public void setScheduled(boolean scheduled) { this.scheduled = scheduled; }

    public boolean isRunning() { return running; }
    public void setRunning(boolean running) { this.running = running; }

    public String getTriggerType() { return triggerType; }
    public void setTriggerType(String triggerType) { this.triggerType = triggerType; }

    public String getCronExpression() { return cronExpression; }
    public void setCronExpression(String cronExpression) { this.cronExpression = cronExpression; }

    public Integer getFixedDelaySeconds() { return fixedDelaySeconds; }
    public void setFixedDelaySeconds(Integer fixedDelaySeconds) { this.fixedDelaySeconds = fixedDelaySeconds; }

    public String getTimezone() { return timezone; }
    public void setTimezone(String timezone) { this.timezone = timezone; }

    public LocalDateTime getNextRunAt() { return nextRunAt; }
    public void setNextRunAt(LocalDateTime nextRunAt) { this.nextRunAt = nextRunAt; }

    public LocalDateTime getLastRunAt() { return lastRunAt; }
    public void setLastRunAt(LocalDateTime lastRunAt) { this.lastRunAt = lastRunAt; }

    public String getLastStatus() { return lastStatus; }
    public void setLastStatus(String lastStatus) { this.lastStatus = lastStatus; }

    public Long getLastDurationMs() { return lastDurationMs; }
    public void setLastDurationMs(Long lastDurationMs) { this.lastDurationMs = lastDurationMs; }

    public String getLastError() { return lastError; }
    public void setLastError(String lastError) { this.lastError = lastError; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public String getUpdatedBy() { return updatedBy; }
    public void setUpdatedBy(String updatedBy) { this.updatedBy = updatedBy; }
}
