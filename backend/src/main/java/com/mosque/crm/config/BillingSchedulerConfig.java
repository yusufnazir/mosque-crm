package com.mosque.crm.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.SchedulingConfigurer;
import org.springframework.scheduling.config.ScheduledTaskRegistrar;
import org.springframework.scheduling.support.CronTrigger;

import com.mosque.crm.service.BillingService;
import com.mosque.crm.service.ConfigurationService;

/**
 * Configures the billing scheduler dynamically from the database.
 * The cron expression and enabled flag are read from the configurations table
 * on every trigger evaluation, so changes take effect without a restart.
 */
@Configuration
public class BillingSchedulerConfig implements SchedulingConfigurer {

    private static final Logger log = LoggerFactory.getLogger(BillingSchedulerConfig.class);

    public static final String KEY_ENABLED = "BILLING_SCHEDULER_ENABLED";
    public static final String KEY_CRON = "BILLING_SCHEDULER_CRON";
    public static final String DEFAULT_CRON = "0 0 2 * * *";

    private final BillingService billingService;
    private final ConfigurationService configurationService;

    public BillingSchedulerConfig(BillingService billingService, ConfigurationService configurationService) {
        this.billingService = billingService;
        this.configurationService = configurationService;
    }

    @Override
    public void configureTasks(ScheduledTaskRegistrar taskRegistrar) {
        taskRegistrar.addTriggerTask(
            this::runBillingJob,
            triggerContext -> {
                String cron = configurationService.getValue(KEY_CRON).orElse(DEFAULT_CRON);
                try {
                    return new CronTrigger(cron).nextExecution(triggerContext);
                } catch (Exception e) {
                    log.warn("Invalid billing scheduler cron expression '{}', falling back to default '{}'", cron, DEFAULT_CRON);
                    return new CronTrigger(DEFAULT_CRON).nextExecution(triggerContext);
                }
            }
        );
    }

    private void runBillingJob() {
        String enabled = configurationService.getValue(KEY_ENABLED).orElse("true");
        if ("false".equalsIgnoreCase(enabled)) {
            log.info("Billing scheduler is disabled via configuration, skipping job execution");
            return;
        }
        billingService.dailyBillingJob();
    }
}
