package com.mosque.crm.service;

import java.util.List;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mosque.crm.entity.Configuration;
import com.mosque.crm.multitenancy.TenantContext;
import com.mosque.crm.repository.ConfigurationRepository;

@Service
public class ConfigurationService {

    private static final Logger log = LoggerFactory.getLogger(ConfigurationService.class);

    private final ConfigurationRepository configurationRepository;

    public ConfigurationService(ConfigurationRepository configurationRepository) {
        this.configurationRepository = configurationRepository;
    }

    /**
     * Get the system-wide (global) configuration value.
     * Uses a native query that bypasses the Hibernate org filter.
     */
    public Optional<String> getValue(String name) {
        return configurationRepository.findGlobalByName(name)
                .map(Configuration::getValue);
    }

    /**
     * Get the system-wide (global) configuration entity.
     * Uses a native query that bypasses the Hibernate org filter.
     */
    public Optional<Configuration> getConfiguration(String name) {
        return configurationRepository.findGlobalByName(name);
    }

    /**
     * Get all configurations (super-admin use: shows all rows including org-specific).
     */
    public List<Configuration> getAllConfigurations() {
        return configurationRepository.findAll();
    }

    /**
     * Get the effective value for a given key in a tenant context.
     * Returns the org-specific override if present, otherwise the global default.
     */
    public Optional<String> getValueTenantAware(String name, Long organizationId) {
        if (organizationId != null) {
            Optional<String> tenantValue = configurationRepository
                    .findTenantByName(name, organizationId)
                    .map(Configuration::getValue);
            if (tenantValue.isPresent()) {
                return tenantValue;
            }
        }
        return configurationRepository.findGlobalByName(name).map(Configuration::getValue);
    }

    /**
     * Write or update the system-wide (global) value for a configuration key.
     * Should only be called from super-admin context.
     */
    @Transactional
    public Configuration setValue(String name, String value) {
        Optional<Configuration> existing = configurationRepository.findGlobalByName(name);

        if (existing.isPresent()) {
            Configuration config = existing.get();
            config.setValue(value);
            log.info("Updated global configuration: {}", name);
            return configurationRepository.save(config);
        } else {
            Configuration config = new Configuration(name, value);
            // Explicitly null out org_id so OrganizationEntityListener does not assign one
            config.setOrganizationId(null);
            log.info("Created global configuration: {}", name);
            return configurationRepository.save(config);
        }
    }

    /**
     * Write or update an org-specific override for a configuration key.
     * Does NOT touch the global (system-wide) value.
     */
    @Transactional
    public Configuration setTenantValue(String name, String value, Long organizationId) {
        Optional<Configuration> existing = configurationRepository.findTenantByName(name, organizationId);

        if (existing.isPresent()) {
            Configuration config = existing.get();
            config.setValue(value);
            log.info("Updated tenant configuration: {} for organization_id={}", name, organizationId);
            return configurationRepository.save(config);
        } else {
            Configuration config = new Configuration(name, value);
            config.setOrganizationId(organizationId);
            log.info("Created tenant configuration: {} for organization_id={}", name, organizationId);
            return configurationRepository.save(config);
        }
    }

    /**
     * Delete configuration by name (global only).
     */
    @Transactional
    public void deleteConfiguration(String name) {
        configurationRepository.findGlobalByName(name).ifPresent(config -> {
            configurationRepository.delete(config);
            log.info("Deleted global configuration: {}", name);
        });
    }

    // Mail server configuration helpers (system-wide)
    public String getMailServerHost() {
        return getValue("MAIL_SERVER_HOST").orElse("");
    }

    public String getMailServerUsername() {
        return getValue("MAIL_SERVER_USERNAME").orElse("");
    }

    public String getMailServerPassword() {
        return getValue("MAIL_SERVER_PASSWORD").orElse("");
    }

    public String getMailServerProjectUuid() {
        return getValue("MAIL_SERVER_PROJECT_UUID").orElse("");
    }

    // Application settings helpers
    public String getAppName() {
        Long organizationId = TenantContext.getCurrentOrganizationId();
        return getValueTenantAware("APP_NAME", organizationId).orElse("MemberFlow");
    }

    public String getAppBaseUrl() {
        return getValue("APP_BASE_URL").orElse("http://localhost:3000");
    }
}
