package com.mosque.crm.service;

import java.util.Locale;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mosque.crm.dto.UserPreferencesDTO;
import com.mosque.crm.entity.User;
import com.mosque.crm.entity.UserPreferences;
import com.mosque.crm.repository.UserPreferencesRepository;

@Service
public class UserPreferencesService {

    private static final Logger log = LoggerFactory.getLogger(UserPreferencesService.class);
    private final UserPreferencesRepository repository;
    private final MessageLanguageService messageLanguageService;

    public UserPreferencesService(UserPreferencesRepository repository, MessageLanguageService messageLanguageService) {
        this.repository = repository;
        this.messageLanguageService = messageLanguageService;
    }

    /**
     * Get user preferences or create default if not exists
     */
    @Transactional
    public UserPreferences getOrCreate(User user) {
        return repository.findByUserId(user.getId())
                .orElseGet(() -> createDefault(user));
    }

    /**
     * Create default preferences for a user
     */
    @Transactional
    public UserPreferences createDefault(User user) {
        log.info("Creating default preferences for user: {}", user.getUsername());
        UserPreferences prefs = new UserPreferences(user);
        return repository.save(prefs);
    }

    /**
     * Update user language preference
     */
    @Transactional
    public UserPreferences updateLanguage(User user, String language) {
        // Validate language code
        if (language != null && !MessageLanguageService.isSupported(language)) {
            throw new IllegalArgumentException("Unsupported language: " + language);
        }

        UserPreferences prefs = getOrCreate(user);
        prefs.setLanguage(language);
        UserPreferences saved = repository.save(prefs);

        // Apply locale immediately for current request
        LocaleContextHolder.setLocale(Locale.forLanguageTag(
                messageLanguageService.resolve(user.getId(), user.getOrganizationId())));

        log.info("Updated language preference for user {} to: {}", user.getUsername(), language);
        return saved;
    }

    /**
     * Apply user's language preference to current context
     */
    public void applyLanguagePreference(User user) {
        getOrCreate(user);
        LocaleContextHolder.setLocale(Locale.forLanguageTag(
                messageLanguageService.resolve(user.getId(), user.getOrganizationId())));
    }

    /**
     * Convert entity to DTO
     */
    public UserPreferencesDTO toDTO(UserPreferences prefs) {
        UserPreferencesDTO dto = new UserPreferencesDTO(
                messageLanguageService.resolve(prefs.getUser().getId(), prefs.getUser().getOrganizationId()),
                prefs.getTheme(),
                prefs.getTimezone(),
                prefs.getCalendar()
        );
        dto.setPreferredLanguage(prefs.getLanguage());
        return dto;
    }
}
