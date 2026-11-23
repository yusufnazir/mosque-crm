package com.mosque.crm.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import com.mosque.crm.entity.User;
import com.mosque.crm.repository.UserRepository;

class LoginIdentifierResolverTest {
    private final UserRepository users = mock(UserRepository.class);
    private final LoginIdentifierResolver resolver = new LoginIdentifierResolver(users);

    @ParameterizedTest
    @ValueSource(strings = {"member@example.test", " MEMBER@EXAMPLE.TEST ", "+5978123456",
            "+597 812-3456", "005978123456", "5978123456", "8123456"})
    void authenticatesEmailAndPhoneAsTheSameStoredAccount(String identifier) {
        User user = account("existing-username");
        var encoder = new BCryptPasswordEncoder(4);
        user.setPassword(encoder.encode("correct-password"));
        when(users.findUsersByEmail(anyString())).thenReturn(List.of(user));
        when(users.findAllByPhone("+5978123456")).thenReturn(List.of(user));
        when(users.findPhoneUsersByNationalNumber("8123456")).thenReturn(List.of(user));
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(new CustomUserDetailsService(resolver));
        provider.setPasswordEncoder(encoder);

        var authentication = provider.authenticate(
                new UsernamePasswordAuthenticationToken(identifier, "correct-password"));

        assertThat(authentication.getName()).isEqualTo("existing-username");
        assertThat(authentication.isAuthenticated()).isTrue();
    }

    @Test
    void preservesExactUsernamesAndEmailDerivedUsernameCaseFallback() {
        User original = account("member@example.test");
        when(users.findByUsername("member@example.test")).thenReturn(Optional.of(original));

        assertThat(resolver.resolve(" MEMBER@EXAMPLE.TEST ")).containsSame(original);
        assertThat(resolver.resolve("member@example.test")).containsSame(original);
    }

    @ParameterizedTest
    @ValueSource(strings = {"shared@example.test", "+5978123456", "8123456"})
    void rejectsAmbiguousAliases(String identifier) {
        List<User> shared = List.of(account("first"), account("second"));
        when(users.findUsersByEmail(anyString())).thenReturn(shared);
        when(users.findAllByPhone("+5978123456")).thenReturn(shared);
        when(users.findPhoneUsersByNationalNumber("8123456")).thenReturn(shared);

        assertThat(resolver.resolve(identifier)).isEmpty();
    }

    @ParameterizedTest
    @ValueSource(strings = {"member@example.test", "+5978123456"})
    void aliasesStillRequireTheCorrectPasswordAndAnEnabledUnlockedAccount(String identifier) {
        User user = account("existing-username");
        var encoder = new BCryptPasswordEncoder(4);
        user.setPassword(encoder.encode("correct-password"));
        when(users.findUsersByEmail(anyString())).thenReturn(List.of(user));
        when(users.findAllByPhone("+5978123456")).thenReturn(List.of(user));
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(new CustomUserDetailsService(resolver));
        provider.setPasswordEncoder(encoder);

        assertThatThrownBy(() -> provider.authenticate(
                new UsernamePasswordAuthenticationToken(identifier, "wrong-password")))
                .isInstanceOf(BadCredentialsException.class);
        user.setAccountEnabled(false);
        assertThatThrownBy(() -> provider.authenticate(
                new UsernamePasswordAuthenticationToken(identifier, "correct-password")))
                .isInstanceOf(DisabledException.class);
        user.setAccountEnabled(true);
        user.setAccountLocked(true);
        assertThatThrownBy(() -> provider.authenticate(
                new UsernamePasswordAuthenticationToken(identifier, "correct-password")))
                .isInstanceOf(LockedException.class);
    }

    private User account(String username) {
        User user = new User();
        user.setUsername(username);
        user.setEmail("member@example.test");
        user.setPhone("+5978123456");
        return user;
    }
}
