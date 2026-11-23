package com.mosque.crm.entity;

import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Runtime settings and last-run state for one code-defined scheduled job.
 *
 * Platform-level (no organization scope): schedulers run across tenants and are managed by
 * the platform administrator. The set of rows is derived from the {@code ScheduledJob} beans,
 * so deleting a row only resets that job to its code defaults.
 */
@Entity
@Table(name = "scheduler_job_configs")
public class ScheduledJobConfig {

    public static final class TriggerType {
        public static final String CRON = "CRON";
        public static final String FIXED_DELAY = "FIXED_DELAY";

        private TriggerType() {
        }
    }

    public static final class Status {
        public static final String SUCCESS = "SUCCESS";
        public static final String FAILED = "FAILED";
        public static final String SKIPPED = "SKIPPED";

        private Status() {
        }
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "job_key", nullable = false, unique = true, length = 100)
    private String jobKey;

    @Column(name = "enabled", nullable = false)
    private boolean enabled = true;

    @Column(name = "trigger_type", nullable = false, length = 20)
    private String triggerType = TriggerType.CRON;

    @Column(name = "cron_expression", length = 100)
    private String cronExpression;

    @Column(name = "fixed_delay_seconds")
    private Integer fixedDelaySeconds;

    @Column(name = "timezone", nullable = false, length = 64)
    private String timezone = "Europe/Amsterdam";

    @Column(name = "last_run_at")
    private LocalDateTime lastRunAt;

    @Column(name = "last_status", length = 20)
    private String lastStatus;

    @Column(name = "last_duration_ms")
    private Long lastDurationMs;

    @Column(name = "last_error", length = 1000)
    private String lastError;

    @Column(name = "updated_by", length = 100)
    private String updatedBy;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public ScheduledJobConfig() {
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getJobKey() { return jobKey; }
    public void setJobKey(String jobKey) { this.jobKey = jobKey; }

    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }

    public String getTriggerType() { return triggerType; }
    public void setTriggerType(String triggerType) { this.triggerType = triggerType; }

    public String getCronExpression() { return cronExpression; }
    public void setCronExpression(String cronExpression) { this.cronExpression = cronExpression; }

    public Integer getFixedDelaySeconds() { return fixedDelaySeconds; }
    public void setFixedDelaySeconds(Integer fixedDelaySeconds) { this.fixedDelaySeconds = fixedDelaySeconds; }

    public String getTimezone() { return timezone; }
    public void setTimezone(String timezone) { this.timezone = timezone; }

    public LocalDateTime getLastRunAt() { return lastRunAt; }
    public void setLastRunAt(LocalDateTime lastRunAt) { this.lastRunAt = lastRunAt; }

    public String getLastStatus() { return lastStatus; }
    public void setLastStatus(String lastStatus) { this.lastStatus = lastStatus; }

    public Long getLastDurationMs() { return lastDurationMs; }
    public void setLastDurationMs(Long lastDurationMs) { this.lastDurationMs = lastDurationMs; }

    public String getLastError() { return lastError; }
    public void setLastError(String lastError) { this.lastError = lastError; }

    public String getUpdatedBy() { return updatedBy; }
    public void setUpdatedBy(String updatedBy) { this.updatedBy = updatedBy; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
