package com.mosque.crm.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.function.Supplier;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.mosque.crm.entity.User;
import com.mosque.crm.repository.UserRepository;

class UserContactServiceTest {
    private final UserRepository users = mock(UserRepository.class);
    private final AuthorizationService authorization = mock(AuthorizationService.class);
    private final UserContactService service = new UserContactService(users, authorization);

    @BeforeEach
    void allowGlobalLookup() {
        when(authorization.withoutOrganizationFilter(any()))
                .thenAnswer(invocation -> ((Supplier<?>) invocation.getArgument(0)).get());
    }

    @Test
    void savesIndependentAdminContactsAndClearsOptionalContactsWithoutChangingUsername() {
        User user = user();
        service.updateContacts(user, " ADMIN@EXAMPLE.TEST ", "00597 812-3456");

        assertThat(user.getEmail()).isEqualTo("admin@example.test");
        assertThat(user.getPhone()).isEqualTo("+5978123456");
        assertThat(user.getUsername()).isEqualTo("admin");
        verify(users).existsByLoginContactExcludingUser("admin@example.test", 7L);
        verify(users).existsByLoginContactExcludingUser("+5978123456", 7L);
        service.updateContacts(user, "", "");
        assertThat(user.getEmail()).isNull();
        assertThat(user.getPhone()).isNull();
    }

    @Test
    void rejectsInvalidPhonesAndGlobalContactConflictsBeforeMutatingOrSaving() {
        User user = user();
        user.setEmail("old@example.test");
        assertThatThrownBy(() -> service.updateContacts(user, "new@example.test", "8123456"))
                .isInstanceOf(IllegalArgumentException.class);
        when(users.existsByLoginContactExcludingUser("+5978123456", 7L)).thenReturn(true);
        assertThatThrownBy(() -> service.updateContacts(user, "new@example.test", "+5978123456"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThat(user.getEmail()).isEqualTo("old@example.test");
        assertThat(user.getPhone()).isNull();
        verify(users, never()).saveAndFlush(any());
    }

    @Test
    void copyingMemberPhonesSkipsConflictsAndNeverOverwritesAnAccountChoice() {
        User user = user();
        service.copyMemberPhone(user, "+5978123456");
        assertThat(user.getPhone()).isNull();
        user.setId(null);
        when(users.existsByLoginContactExcludingUser("+5978123456", null)).thenReturn(true);
        service.copyMemberPhone(user, "+5978123456");
        assertThat(user.getPhone()).isNull();
        when(users.existsByLoginContactExcludingUser("+5978123456", null)).thenReturn(false);
        service.copyMemberPhone(user, "+597 8123456");
        assertThat(user.getPhone()).isEqualTo("+5978123456");
        service.copyMemberPhone(user, "+31612345678");
        assertThat(user.getPhone()).isEqualTo("+5978123456");
    }

    private User user() {
        User user = new User();
        user.setId(7L);
        user.setUsername("admin");
        return user;
    }
}
