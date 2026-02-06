package com.mosque.crm.service;

import java.util.Arrays;
import java.util.List;
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
    private static final List<String> SUPPORTED_LANGUAGES = Arrays.asList("en", "nl");

    private final UserPreferencesRepository repository;

    public UserPreferencesService(UserPreferencesRepository repository) {
        this.repository = repository;
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
        if (!SUPPORTED_LANGUAGES.contains(language)) {
            throw new IllegalArgumentException("Unsupported language: " + language);
        }

        UserPreferences prefs = getOrCreate(user);
        prefs.setLanguage(language);
        UserPreferences saved = repository.save(prefs);

        // Apply locale immediately for current request
        LocaleContextHolder.setLocale(Locale.forLanguageTag(language));

        log.info("Updated language preference for user {} to: {}", user.getUsername(), language);
        return saved;
    }

    /**
     * Apply user's language preference to current context
     */
    public void applyLanguagePreference(User user) {
        UserPreferences prefs = getOrCreate(user);
        LocaleContextHolder.setLocale(Locale.forLanguageTag(prefs.getLanguage()));
    }

    /**
     * Convert entity to DTO
     */
    public UserPreferencesDTO toDTO(UserPreferences prefs) {
        return new UserPreferencesDTO(
                prefs.getLanguage(),
                prefs.getTheme(),
                prefs.getTimezone(),
                prefs.getCalendar()
        );
    }
}
