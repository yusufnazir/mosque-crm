package com.mosque.crm.service;

import java.util.stream.Collectors;

import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import com.mosque.crm.entity.User;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final LoginIdentifierResolver loginIdentifierResolver;

    public CustomUserDetailsService(LoginIdentifierResolver loginIdentifierResolver) {
        this.loginIdentifierResolver = loginIdentifierResolver;
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        // Aliases resolve to the stored username so JWT subjects remain unchanged.
        User user = loginIdentifierResolver.resolve(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));

        return org.springframework.security.core.userdetails.User.builder()
                .username(user.getUsername())
                .password(user.getPassword())
                .authorities(user.getRoles().stream()
                        .map(role -> new SimpleGrantedAuthority(role.getName()))
                        .collect(Collectors.toList()))
                .accountExpired(false)
                .accountLocked(user.isAccountLocked())
                .credentialsExpired(user.isCredentialsExpired())
                .disabled(!user.isAccountEnabled())
                .build();
    }
}
