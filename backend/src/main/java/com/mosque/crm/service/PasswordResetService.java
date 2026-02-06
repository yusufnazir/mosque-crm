package com.mosque.crm.service;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mosque.crm.entity.PasswordResetToken;
import com.mosque.crm.entity.User;
import com.mosque.crm.repository.PasswordResetTokenRepository;
import com.mosque.crm.repository.UserPreferencesRepository;
import com.mosque.crm.repository.UserRepository;

@Service
public class PasswordResetService {

    private static final Logger log = LoggerFactory.getLogger(PasswordResetService.class);
    private static final int TOKEN_EXPIRY_MINUTES = 30;

    private final PasswordResetTokenRepository tokenRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;
    private final PasswordEncoder passwordEncoder;
    private final UserPreferencesRepository userPreferencesRepository;

    public PasswordResetService(
            PasswordResetTokenRepository tokenRepository,
            UserRepository userRepository,
            EmailService emailService,
            PasswordEncoder passwordEncoder,
            UserPreferencesRepository userPreferencesRepository
    ) {
        this.tokenRepository = tokenRepository;
        this.userRepository = userRepository;
        this.emailService = emailService;
        this.passwordEncoder = passwordEncoder;
        this.userPreferencesRepository = userPreferencesRepository;
    }

    /**
     * Request password reset
     * Always returns success to prevent username enumeration
     */
    @Transactional
    public void requestPasswordReset(String username) {
        try {
            Optional<User> userOpt = userRepository.findByUsername(username);

            if (userOpt.isPresent()) {
                User user = userOpt.get();

                // Generate secure random token
                String token = UUID.randomUUID().toString();

                // Set expiration (30 minutes from now)
                LocalDateTime expiresAt = LocalDateTime.now().plusMinutes(TOKEN_EXPIRY_MINUTES);

                // Create and save token
                PasswordResetToken resetToken = new PasswordResetToken(user, token, expiresAt);
                tokenRepository.save(resetToken);

                // Send email (if user has email)
                if (user.getEmail() != null && !user.getEmail().isEmpty()) {
                    // Get user's language preference (default to "en" if not set)
                    String language = userPreferencesRepository.findByUserId(user.getId())
                            .map(prefs -> prefs.getLanguage())
                            .orElse("en");
                    emailService.sendPasswordResetEmail(user.getEmail(), user.getUsername(), token, language);
                } else {
                    log.warn("User {} has no email address. Password reset link: token={}", username, token);
                }

                log.info("Password reset requested for user: {}", username);
            } else {
                // User not found - but don't reveal this
                log.info("Password reset requested for non-existent user: {}", username);
            }
        } catch (Exception e) {
            log.error("Error processing password reset request", e);
            // Swallow exception to prevent username enumeration
        }
    }

    /**
     * Reset password using token
     */
    @Transactional
    public boolean resetPassword(String token, String newPassword) {
        Optional<PasswordResetToken> tokenOpt = tokenRepository.findByToken(token);

        if (tokenOpt.isEmpty()) {
            log.warn("Password reset attempted with invalid token");
            return false;
        }

        PasswordResetToken resetToken = tokenOpt.get();

        // Validate token
        if (!resetToken.isValid()) {
            log.warn("Password reset attempted with invalid/expired token for user: {}",
                    resetToken.getUser().getUsername());
            return false;
        }

        // Validate password strength
        if (newPassword == null || newPassword.length() < 6) {
            log.warn("Password reset attempted with weak password");
            return false;
        }

        // Update password
        User user = resetToken.getUser();
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        // Mark token as used
        resetToken.setUsed(true);
        tokenRepository.save(resetToken);

        log.info("Password successfully reset for user: {}", user.getUsername());
        return true;
    }

    /**
     * Clean up expired tokens
     */
    @Transactional
    public void deleteExpiredTokens() {
        tokenRepository.deleteExpiredTokens(LocalDateTime.now());
        log.info("Expired password reset tokens deleted");
    }
}
