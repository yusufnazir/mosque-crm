package com.mosque.crm.controller;

import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.MessageSource;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
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
import com.mosque.crm.dto.ResetPasswordRequest;
import com.mosque.crm.dto.UserPreferencesDTO;
import com.mosque.crm.entity.User;
import com.mosque.crm.entity.UserPreferences;
import com.mosque.crm.repository.UserRepository;
import com.mosque.crm.security.JwtUtil;
import com.mosque.crm.service.PasswordResetService;
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
    private PasswordEncoder passwordEncoder;

    @Autowired
    private UserPreferencesService userPreferencesService;

    @Autowired
    private PasswordResetService passwordResetService;


    @Autowired
    private MessageSource messageSource;

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
            return ResponseEntity.status(401).body("Invalid username or password");
        }

        final UserDetails userDetails = userDetailsService.loadUserByUsername(loginRequest.getUsername());
        final String token = jwtUtil.generateToken(userDetails);

        User user = userRepository.findByUsername(loginRequest.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

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

        AuthResponse response = new AuthResponse(token, user.getUsername(), roleName, memberId, personId, preferencesDTO);

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
            userRepository.save(user);

            return ResponseEntity.ok("Password changed successfully");
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Failed to change password: " + e.getMessage());
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
}
