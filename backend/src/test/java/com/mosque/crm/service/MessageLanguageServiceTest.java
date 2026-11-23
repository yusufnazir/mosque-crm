package com.mosque.crm.service;

import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.mosque.crm.entity.UserPreferences;
import com.mosque.crm.repository.UserPreferencesRepository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MessageLanguageServiceTest {
    @Mock private UserPreferencesRepository preferencesRepository;
    @Mock private ConfigurationService configurationService;
    @InjectMocks private MessageLanguageService service;

    @Test
    void explicitUserPreferenceOverridesOrganization() {
        UserPreferences preferences = new UserPreferences();
        preferences.setLanguage("en");
        when(preferencesRepository.findByUserId(12L)).thenReturn(Optional.of(preferences));

        assertThat(service.resolve(12L, 3L)).isEqualTo("en");
        verify(configurationService, never()).getValueTenantAware("DEFAULT_LANGUAGE", 3L);
    }

    @Test
    void unsetUserPreferenceFollowsReceivingOrganization() {
        when(preferencesRepository.findByUserId(12L)).thenReturn(Optional.of(new UserPreferences()));
        when(configurationService.getValueTenantAware("DEFAULT_LANGUAGE", 3L)).thenReturn(Optional.of("nl"));
        when(configurationService.getValueTenantAware("DEFAULT_LANGUAGE", 4L)).thenReturn(Optional.of("en"));

        assertThat(service.resolve(12L, 3L)).isEqualTo("nl");
        assertThat(service.resolve(12L, 4L)).isEqualTo("en");
    }

    @Test
    void missingRecipientAndOrganizationDefaultFallsBackToEnglish() {
        when(configurationService.getValueTenantAware("DEFAULT_LANGUAGE", 3L)).thenReturn(Optional.empty());

        assertThat(service.resolve(null, 3L)).isEqualTo("en");
        verify(preferencesRepository, never()).findByUserId(null);
    }

    @Test
    void invalidStoredLanguageFailsExplicitly() {
        when(configurationService.getValueTenantAware("DEFAULT_LANGUAGE", 3L)).thenReturn(Optional.of("de"));

        assertThatThrownBy(() -> service.resolve(null, 3L))
                .isInstanceOf(IllegalStateException.class);
    }
}
