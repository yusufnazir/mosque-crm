package com.mosque.crm.service;

import java.util.Set;

import org.springframework.stereotype.Service;

import com.mosque.crm.entity.UserPreferences;
import com.mosque.crm.repository.UserPreferencesRepository;

@Service
public class MessageLanguageService {

    public static final String ORGANIZATION_LANGUAGE_KEY = "DEFAULT_LANGUAGE";
    private static final Set<String> SUPPORTED = Set.of("en", "nl");

    private final UserPreferencesRepository preferencesRepository;
    private final ConfigurationService configurationService;

    public MessageLanguageService(UserPreferencesRepository preferencesRepository,
                                  ConfigurationService configurationService) {
        this.preferencesRepository = preferencesRepository;
        this.configurationService = configurationService;
    }

    public static boolean isSupported(String language) {
        return language != null && SUPPORTED.contains(language);
    }

    public String organizationLanguage(Long organizationId) {
        String language = configurationService.getValueTenantAware(ORGANIZATION_LANGUAGE_KEY, organizationId)
                .orElse("en");
        if (!isSupported(language)) {
            throw new IllegalStateException("Unsupported organization language: " + language);
        }
        return language;
    }

    public String resolve(Long userId, Long organizationId) {
        if (userId != null) {
            String language = preferencesRepository.findByUserId(userId)
                    .map(UserPreferences::getLanguage)
                    .orElse(null);
            if (language != null) {
                if (!isSupported(language)) {
                    throw new IllegalStateException("Unsupported user language: " + language);
                }
                return language;
            }
        }
        return organizationLanguage(organizationId);
    }
}
