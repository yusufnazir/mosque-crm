package com.mosque.crm.controller;

import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.MessageSource;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.mosque.crm.dto.AuthResponse;
import com.mosque.crm.dto.ForgotPasswordRequest;
import com.mosque.crm.dto.LoginRequest;
import com.mosque.crm.dto.PasswordChangeDTO;
import com.mosque.crm.dto.RegistrationRequest;
import com.mosque.crm.dto.ResetPasswordRequest;
import com.mosque.crm.dto.UserPreferencesDTO;
import com.mosque.crm.entity.Organization;
import com.mosque.crm.entity.User;
import com.mosque.crm.entity.UserPreferences;
import com.mosque.crm.repository.OrganizationRepository;
import com.mosque.crm.repository.UserRepository;
import com.mosque.crm.security.JwtUtil;
import com.mosque.crm.service.AuthorizationService;
import com.mosque.crm.service.ConfigurationService;
import com.mosque.crm.service.PasswordResetService;
import com.mosque.crm.service.RegistrationService;
import com.mosque.crm.service.UserPreferencesService;

@RestController
@RequestMapping("/auth")
public class AuthController {

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private UserDetailsService userDetailsService;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private OrganizationRepository organizationRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private UserPreferencesService userPreferencesService;

    @Autowired
    private PasswordResetService passwordResetService;

    @Autowired
    private AuthorizationService authorizationService;

    @Autowired
    private RegistrationService registrationService;

    @Autowired
    private MessageSource messageSource;

    @Autowired
    private ConfigurationService configurationService;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest loginRequest) {
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            loginRequest.getUsername(),
                            loginRequest.getPassword()
                    )
            );
        } catch (BadCredentialsException e) {
            // OWASP: Never reveal whether the username or password was wrong
            Map<String, String> error = new HashMap<>();
            error.put("code", "invalid_credentials");
            error.put("message", "Invalid username or password");
            return ResponseEntity.status(401).body(error);
        } catch (DisabledException e) {
            // Account disabled by admin — generic message to prevent enumeration
            Map<String, String> error = new HashMap<>();
            error.put("code", "account_disabled");
            error.put("message", "Your account has been disabled. Please contact an administrator.");
            return ResponseEntity.status(403).body(error);
        } catch (LockedException e) {
            // Account locked (e.g. too many failed attempts)
            Map<String, String> error = new HashMap<>();
            error.put("code", "account_locked");
            error.put("message", "Your account has been locked. Please contact an administrator.");
            return ResponseEntity.status(403).body(error);
        }

        final UserDetails userDetails = userDetailsService.loadUserByUsername(loginRequest.getUsername());

        User user = userRepository.findByUsername(loginRequest.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Super admins must have null organizationId in the JWT so the tenant filter
        // is not applied and they can see data across all organizations.
        boolean isSuperAdmin = user.getRoles().stream()
                .anyMatch(r -> "SUPER_ADMIN".equals(r.getName()));
        Long effectiveOrganizationId = isSuperAdmin ? null : user.getOrganizationId();

        // Generate JWT with userId and organizationId embedded
        final String token = jwtUtil.generateToken(userDetails, user.getId(), effectiveOrganizationId);

        // Get primary role (first role in the set)
        String roleName = user.getRoles().isEmpty() ? "MEMBER" :
                         user.getRoles().iterator().next().getName();

        // Get linked person ID if exists (Person uses UUID)
        Long memberId = null; // Legacy field (deprecated)
        String personId = user.getPerson() != null ? user.getPerson().getId().toString() : null;

        // Get or create user preferences
        UserPreferences prefs = userPreferencesService.getOrCreate(user);
        UserPreferencesDTO preferencesDTO = userPreferencesService.toDTO(prefs);

        // Apply language preference to current context
        userPreferencesService.applyLanguagePreference(user);

        // Resolve effective permissions for this user (use userId directly
        // since SecurityContextHolder is not populated during login)
        java.util.Set<String> permissions = authorizationService.getPermissions(user.getId());

        AuthResponse response = new AuthResponse(token, user.getUsername(), roleName, memberId, personId, preferencesDTO);
        response.setOrganizationId(effectiveOrganizationId);
        response.setAppBaseDomain(resolveConfiguredBaseDomain());
        response.setSuperAdmin(isSuperAdmin);
        response.setPermissions(new java.util.ArrayList<>(permissions));
        response.setMustChangePassword(user.isMustChangePassword());

        // Resolve organization name and handle if user is assigned to an organization.
        // Super admins have no organization, so they get the configured super admin subdomain.
        if (isSuperAdmin) {
            String superAdminSubdomain = configurationService.getValue(ConfigurationController.KEY_SUPERADMIN_SUBDOMAIN)
                    .orElse(ConfigurationController.DEFAULT_SUPERADMIN_SUBDOMAIN);
            response.setOrganizationHandle(superAdminSubdomain);
        } else if (user.getOrganizationId() != null) {
            organizationRepository.findById(user.getOrganizationId()).ifPresent(organization -> {
                response.setOrganizationName(organization.getName());
                response.setOrganizationHandle(organization.getHandle());
            });
        }

        // Include super admin's persisted organization selection
        if (response.isSuperAdmin() && user.getSelectedOrganizationId() != null) {
            response.setSelectedOrganizationId(user.getSelectedOrganizationId());
            organizationRepository.findById(user.getSelectedOrganizationId())
                    .ifPresent(organization -> response.setSelectedOrganizationName(organization.getName()));
        }

        return ResponseEntity.ok(response);
    }

    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(@RequestBody PasswordChangeDTO passwordChangeDTO) {
        try {
            // Get current authenticated user
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String username = authentication.getName();

            User user = userRepository.findByUsername(username)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            // Verify old password
            if (!passwordEncoder.matches(passwordChangeDTO.getOldPassword(), user.getPassword())) {
                return ResponseEntity.status(400).body("Current password is incorrect");
            }

            // Validate new password
            if (passwordChangeDTO.getNewPassword() == null || passwordChangeDTO.getNewPassword().length() < 6) {
                return ResponseEntity.status(400).body("New password must be at least 6 characters long");
            }

            // Update password
            user.setPassword(passwordEncoder.encode(passwordChangeDTO.getNewPassword()));
            user.setMustChangePassword(false);
            userRepository.save(user);

            return ResponseEntity.ok("Password changed successfully");
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Failed to change password: " + e.getMessage());
        }
    }

    @PostMapping("/set-password")
    public ResponseEntity<?> setPassword(@RequestBody Map<String, String> request) {
        try {
            // Get current authenticated user
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String username = authentication.getName();

            User user = userRepository.findByUsername(username)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            // Only allow if user must change password
            if (!user.isMustChangePassword()) {
                return ResponseEntity.status(400).body("Password change not required. Use change-password endpoint instead.");
            }

            String newPassword = request.get("newPassword");

            // Validate new password
            if (newPassword == null || newPassword.length() < 6) {
                return ResponseEntity.status(400).body("Password must be at least 6 characters long");
            }

            // Update password and clear the flag
            user.setPassword(passwordEncoder.encode(newPassword));
            user.setMustChangePassword(false);
            userRepository.save(user);

            return ResponseEntity.ok("Password set successfully");
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Failed to set password: " + e.getMessage());
        }
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody ForgotPasswordRequest request,
                                           @RequestHeader(value = "Accept-Language", defaultValue = "en") String acceptLanguage) {
        // Request password reset
        passwordResetService.requestPasswordReset(request.getUsername());

        // Parse locale from Accept-Language header
        Locale locale = Locale.forLanguageTag(acceptLanguage.split(",")[0].split("-")[0]);

        // Always return success to prevent username enumeration
        Map<String, String> response = new HashMap<>();
        response.put("message", messageSource.getMessage("forgot_password.success", null, locale));

        return ResponseEntity.ok(response);
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody ResetPasswordRequest request,
                                          @RequestHeader(value = "Accept-Language", defaultValue = "en") String acceptLanguage) {
        // Parse locale from Accept-Language header
        Locale locale = Locale.forLanguageTag(acceptLanguage.split(",")[0].split("-")[0]);

        boolean success = passwordResetService.resetPassword(request.getToken(), request.getNewPassword());

        if (success) {
            Map<String, String> response = new HashMap<>();
            response.put("message", messageSource.getMessage("reset_password.success", null, locale));
            return ResponseEntity.ok(response);
        } else {
            Map<String, String> response = new HashMap<>();
            response.put("message", messageSource.getMessage("reset_password.invalid_token", null, locale));
            return ResponseEntity.status(400).body(response);
        }
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegistrationRequest request) {
        try {
            User user = registrationService.register(request);

            // Auto-login: generate JWT for the new user
            final String token = jwtUtil.generateToken(
                    org.springframework.security.core.userdetails.User.builder()
                            .username(user.getUsername())
                            .password(user.getPassword())
                            .authorities(user.getRoles().stream()
                                    .map(r -> "ROLE_" + r.getName())
                                    .toArray(String[]::new))
                            .build(),
                    user.getId(),
                    user.getOrganizationId()
            );

            // Build auth response (same as login)
            String roleName = user.getRoles().isEmpty() ? "MEMBER" :
                    user.getRoles().iterator().next().getName();

            java.util.Set<String> permissions = authorizationService.getPermissions(user.getId());

            UserPreferences prefs = userPreferencesService.getOrCreate(user);
            UserPreferencesDTO preferencesDTO = userPreferencesService.toDTO(prefs);

            AuthResponse authResponse = new AuthResponse(token, user.getUsername(), roleName, null, null, preferencesDTO);
            authResponse.setOrganizationId(user.getOrganizationId());
            authResponse.setAppBaseDomain(resolveConfiguredBaseDomain());
            authResponse.setSuperAdmin(false);
            authResponse.setPermissions(new java.util.ArrayList<>(permissions));
            authResponse.setMustChangePassword(false);

            // Resolve organization name
            if (user.getOrganizationId() != null) {
                organizationRepository.findById(user.getOrganizationId())
                        .ifPresent(organization -> authResponse.setOrganizationName(organization.getName()));
            }

            return ResponseEntity.status(201).body(authResponse);
        } catch (IllegalArgumentException e) {
            Map<String, String> error = new HashMap<>();
            error.put("code", "validation_error");
            error.put("message", e.getMessage());
            return ResponseEntity.status(400).body(error);
        }
    }

    private String resolveConfiguredBaseDomain() {
        String configuredDomain = configurationService.getValue(ConfigurationController.KEY_APP_BASE_DOMAIN)
                .map(String::trim)
                .orElse("");
        if (!configuredDomain.isEmpty()) {
            return configuredDomain;
        }
        // Do NOT fall back to extracting a domain from APP_BASE_URL — that config
        // has a different purpose and may point to a stale/different environment.
        // The frontend infers the correct domain from the browser Host header.
        return null;
    }
}
