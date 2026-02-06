package com.mosque.crm.service;

import java.util.List;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mosque.crm.entity.Configuration;
import com.mosque.crm.repository.ConfigurationRepository;

@Service
public class ConfigurationService {

    private static final Logger log = LoggerFactory.getLogger(ConfigurationService.class);

    private final ConfigurationRepository configurationRepository;

    public ConfigurationService(ConfigurationRepository configurationRepository) {
        this.configurationRepository = configurationRepository;
    }

    /**
     * Get configuration value by name
     */
    public Optional<String> getValue(String name) {
        return configurationRepository.findByName(name)
                .map(Configuration::getValue);
    }

    /**
     * Get configuration by name
     */
    public Optional<Configuration> getConfiguration(String name) {
        return configurationRepository.findByName(name);
    }

    /**
     * Get all configurations
     */
    public List<Configuration> getAllConfigurations() {
        return configurationRepository.findAll();
    }

    /**
     * Set configuration value (create or update)
     */
    @Transactional
    public Configuration setValue(String name, String value) {
        Optional<Configuration> existing = configurationRepository.findByName(name);

        if (existing.isPresent()) {
            Configuration config = existing.get();
            config.setValue(value);
            log.info("Updated configuration: {}", name);
            return configurationRepository.save(config);
        } else {
            Configuration config = new Configuration(name, value);
            log.info("Created configuration: {}", name);
            return configurationRepository.save(config);
        }
    }

    /**
     * Delete configuration by name
     */
    @Transactional
    public void deleteConfiguration(String name) {
        configurationRepository.findByName(name).ifPresent(config -> {
            configurationRepository.delete(config);
            log.info("Deleted configuration: {}", name);
        });
    }

    // Mail server configuration helpers
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
}
