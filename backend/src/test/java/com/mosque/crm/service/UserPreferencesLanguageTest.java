package com.mosque.crm.service;

import java.util.Optional;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.i18n.LocaleContextHolder;

import com.mosque.crm.dto.UserPreferencesDTO;
import com.mosque.crm.entity.User;
import com.mosque.crm.entity.UserPreferences;
import com.mosque.crm.repository.UserPreferencesRepository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserPreferencesLanguageTest {
    @Mock private UserPreferencesRepository repository;
    @Mock private MessageLanguageService messageLanguageService;
    @InjectMocks private UserPreferencesService service;

    @AfterEach
    void clearLocale() {
        LocaleContextHolder.resetLocaleContext();
    }

    @Test
    void newPreferenceInheritsInsteadOfSavingAnEnglishOverride() {
        User user = new User();
        user.setId(5L);
        user.setOrganizationId(3L);
        when(repository.save(org.mockito.ArgumentMatchers.any(UserPreferences.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(messageLanguageService.resolve(5L, 3L)).thenReturn("nl");

        UserPreferences preferences = service.createDefault(user);
        UserPreferencesDTO dto = service.toDTO(preferences);

        assertThat(preferences.getLanguage()).isNull();
        assertThat(dto.getPreferredLanguage()).isNull();
        assertThat(dto.getLanguage()).isEqualTo("nl");
    }

    @Test
    void userCanSwitchBackToOrganizationDefault() {
        User user = new User();
        user.setId(5L);
        user.setOrganizationId(3L);
        UserPreferences preferences = new UserPreferences(user);
        preferences.setLanguage("en");
        when(repository.findByUserId(5L)).thenReturn(Optional.of(preferences));
        when(repository.save(preferences)).thenReturn(preferences);
        when(messageLanguageService.resolve(5L, 3L)).thenReturn("nl");

        service.updateLanguage(user, null);

        assertThat(preferences.getLanguage()).isNull();
        assertThat(LocaleContextHolder.getLocale().getLanguage()).isEqualTo("nl");
        verify(repository).save(preferences);
    }

    @Test
    void unsupportedLanguageIsRejected() {
        assertThatThrownBy(() -> service.updateLanguage(new User(), "fr"))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
