package com.mosque.crm.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.PlatformTransactionManager;

import com.mosque.crm.multitenancy.TenantAwareJpaTransactionManager;

import jakarta.persistence.EntityManagerFactory;

/**
 * JPA configuration that registers a tenant-aware transaction manager.
 * This replaces Spring Boot's default JpaTransactionManager to ensure
 * the Hibernate organizationFilter is enabled at the start of every transaction,
 * guaranteeing data isolation between tenants.
 */
@Configuration
public class JpaConfig {

    @Bean
    public PlatformTransactionManager transactionManager(EntityManagerFactory entityManagerFactory) {
        return new TenantAwareJpaTransactionManager(entityManagerFactory);
    }
}
