package com.mosque.crm.scheduler;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;

/**
 * Dedicated thread pool for the platform schedulers.
 *
 * Separate from any web/app thread so a slow job can never delay requests, and big enough for
 * one job each to run concurrently without two instances of the same job overlapping
 * (the runtime guards per job as well).
 */
@Configuration
public class SchedulerConfig {

    @Bean
    public ThreadPoolTaskScheduler platformTaskScheduler(
            @Value("${scheduler.pool-size:4}") int poolSize) {
        ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();
        scheduler.setPoolSize(Math.max(1, poolSize));
        scheduler.setThreadNamePrefix("platform-job-");
        scheduler.setWaitForTasksToCompleteOnShutdown(true);
        scheduler.setAwaitTerminationSeconds(20);
        scheduler.setErrorHandler(throwable ->
                org.slf4j.LoggerFactory.getLogger(SchedulerConfig.class)
                        .error("Unhandled exception in a scheduled job", throwable));
        return scheduler;
    }
}
