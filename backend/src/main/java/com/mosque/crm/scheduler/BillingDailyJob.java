package com.mosque.crm.scheduler;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.support.CronExpression;
import org.springframework.stereotype.Component;

import com.mosque.crm.entity.ScheduledJobConfig;
import com.mosque.crm.service.BillingService;
import com.mosque.crm.service.ConfigurationService;

/**
 * The nightly billing run (invoice generation for subscriptions due soon).
 *
 * Previously scheduled by {@code BillingSchedulerConfig} through a {@code SchedulingConfigurer};
 * it is now a regular {@link ScheduledJob} so the platform admin can change its cron, pause it
 * or trigger it from the Schedulers view. The old {@code BILLING_SCHEDULER_CRON} /
 * {@code BILLING_SCHEDULER_ENABLED} configuration values are still honoured the first time the
 * job's row is created, so an existing deployment keeps its timing.
 */
@Component
public class BillingDailyJob implements ScheduledJob {

    private static final Logger log = LoggerFactory.getLogger(BillingDailyJob.class);

    public static final String KEY = "billing.daily";
    public static final String LEGACY_ENABLED_KEY = "BILLING_SCHEDULER_ENABLED";
    public static final String LEGACY_CRON_KEY = "BILLING_SCHEDULER_CRON";
    public static final String DEFAULT_CRON = "0 0 2 * * *";

    private final BillingService billingService;
    private final ConfigurationService configurationService;

    public BillingDailyJob(BillingService billingService, ConfigurationService configurationService) {
        this.billingService = billingService;
        this.configurationService = configurationService;
    }

    @Override
    public String key() {
        return KEY;
    }

    @Override
    public String label() {
        return "Daily billing run";
    }

    @Override
    public String description() {
        return "Generates invoices for subscriptions that are due, and applies the configured dunning steps.";
    }

    @Override
    public String defaultTriggerType() {
        return ScheduledJobConfig.TriggerType.CRON;
    }

    @Override
    public String defaultCron() {
        String legacy = configurationService.getValue(LEGACY_CRON_KEY).orElse(null);
        if (legacy != null && !legacy.isBlank() && CronExpression.isValidExpression(legacy)) {
            log.info("Seeding billing job cron from the legacy {} setting: {}", LEGACY_CRON_KEY, legacy);
            return legacy;
        }
        return DEFAULT_CRON;
    }

    @Override
    public boolean defaultEnabled() {
        return !"false".equalsIgnoreCase(configurationService.getValue(LEGACY_ENABLED_KEY).orElse("true"));
    }

    @Override
    public void run() {
        billingService.dailyBillingJob();
    }
}
