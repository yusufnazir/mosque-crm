package com.mosque.crm.service;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.ui.freemarker.FreeMarkerTemplateUtils;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import freemarker.template.Configuration;
import freemarker.template.Template;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final ConfigurationService configurationService;
    private final RestTemplate restTemplate;
    private final Configuration freemarkerConfig;

    public EmailService(ConfigurationService configurationService, Configuration freemarkerConfig) {
        this.configurationService = configurationService;
        this.freemarkerConfig = freemarkerConfig;

        // Configure RestTemplate to NOT follow redirects
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5000);
        factory.setReadTimeout(5000);
        this.restTemplate = new RestTemplate(factory);
    }

    /**
     * Send password reset email
     */
    public void sendPasswordResetEmail(String toEmail, String username, String resetToken, String locale) {
        if (toEmail == null || toEmail.isEmpty()) {
            log.warn("User {} has no email address. Cannot send password reset email.", username);
            return;
        }

        // Get mail server configuration
        String host = configurationService.getMailServerHost();
        String mailUsername = configurationService.getMailServerUsername();
        String mailPassword = configurationService.getMailServerPassword();
        String projectUuid = configurationService.getMailServerProjectUuid();

        // Check if mail server is configured
        if (host == null || host.isEmpty()) {
            log.error("Mail server not configured. Cannot send password reset email.");
            return;
        }

        // Log configuration status (without exposing sensitive data)
        log.info("Mail server configuration - Host: {}, Username: {}, Password: {}, ProjectUuid: {}",
            host,
            mailUsername != null ? mailUsername : "NOT SET",
            mailPassword != null ? mailPassword : "NOT SET",
            projectUuid != null ? projectUuid : "NOT SET",
             toEmail != null ? toEmail : "NOT SET"
        );

        // Build reset URL
        String resetUrl = "http://localhost:3000/reset-password?token=" + resetToken;

        // Prepare email content based on locale
        String emailSubject = getSubject(locale);
        String emailBody = buildPasswordResetEmailBody(username, resetUrl, locale);

        // Prepare request payload matching MailMessageJson structure
        Map<String, Object> payload = new HashMap<>();
        payload.put("to", Arrays.asList(toEmail)); // Must be List<String>
        payload.put("subject", emailSubject);
        payload.put("text", emailBody); // Changed from "body" to "text"
        payload.put("projectId", projectUuid);

        try {
            // Prepare headers with Basic Authentication
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            // Add Basic Auth header if credentials are configured
            if (mailUsername != null && !mailUsername.isEmpty() &&
                mailPassword != null && !mailPassword.isEmpty()) {
                String auth = mailUsername + ":" + mailPassword;
                byte[] encodedAuth = Base64.getEncoder().encode(auth.getBytes(StandardCharsets.UTF_8));
                String authHeader = "Basic " + new String(encodedAuth);
                headers.set("Authorization", authHeader);
                log.info("Added Basic Authentication header for user: {}", mailUsername);
                log.debug("Auth header (first 20 chars): {}...", authHeader.substring(0, Math.min(20, authHeader.length())));
            } else {
                log.warn("Username or password not configured - sending request without authentication");
            }

            // Create request entity
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);

            // Send POST request to mail server
            String mailEndpoint = host + "/rest/v1/api/register-mail";

            log.info("Sending email to mail server: {}", mailEndpoint);
            log.debug("Email payload: to={}, subject={}, projectId={}", toEmail, emailSubject, projectUuid);

            ResponseEntity<String> response = restTemplate.postForEntity(mailEndpoint, request, String.class);

            // Check response status
            HttpStatus status = (HttpStatus) response.getStatusCode();
            if (status.is2xxSuccessful()) {
                log.info("Password reset email sent successfully to: {}", toEmail);
            } else if (status.is3xxRedirection()) {
                log.error("Mail server returned redirect ({}). Check URL configuration. Expected URL: {}", status, mailEndpoint);
                log.info("Redirect location: {}", response.getHeaders().getLocation());
                fallbackLog(toEmail, emailSubject, emailBody, resetUrl);
            } else {
                log.error("Failed to send password reset email. Status: {}, Response: {}", status, response.getBody());
                fallbackLog(toEmail, emailSubject, emailBody, resetUrl);
            }
        } catch (RestClientException e) {
            log.error("Error sending password reset email to {}: {}", toEmail, e.getMessage());
            fallbackLog(toEmail, emailSubject, emailBody, resetUrl);
        } catch (Exception e) {
            log.error("Unexpected error sending password reset email", e);
            fallbackLog(toEmail, emailSubject, emailBody, resetUrl);
        }
    }

    /**
     * Log email details as fallback when mail server fails
     */
    private void fallbackLog(String toEmail, String emailSubject, String emailBody, String resetUrl) {
        log.info("=== PASSWORD RESET EMAIL (Fallback - Mail server error) ===");
        log.info("To: {}", toEmail);
        log.info("Subject: {}", emailSubject);
        log.info("Body:\n{}", emailBody);
        log.info("Reset URL: {}", resetUrl);
        log.info("=============================================================");
    }

    /**
     * Get email subject based on locale
     */
    private String getSubject(String locale) {
        if ("nl".equalsIgnoreCase(locale)) {
            return "Wachtwoord Herstel Verzoek - Moskee CRM";
        }
        return "Password Reset Request - Mosque CRM";
    }

    /**
     * Build password reset email body using FreeMarker template
     */
    private String buildPasswordResetEmailBody(String username, String resetUrl, String locale) {
        try {
            // Determine template name based on locale
            String templateName = "nl".equalsIgnoreCase(locale)
                ? "email/password-reset-nl.ftl"
                : "email/password-reset-en.ftl";

            // Load template
            Template template = freemarkerConfig.getTemplate(templateName);

            // Prepare data model
            Map<String, Object> model = new HashMap<>();
            model.put("username", username);
            model.put("resetUrl", resetUrl);

            // Process template
            return FreeMarkerTemplateUtils.processTemplateIntoString(template, model);
        } catch (Exception e) {
            log.error("Error processing email template", e);
            // Fallback to simple text email
            return String.format("""
                Hello %s,

                You have requested to reset your password for Mosque CRM.

                Click the link below to reset your password:
                %s

                This link will expire in 30 minutes.

                If you did not request this, please ignore this email.

                Best regards,
                Mosque CRM Team
                """, username, resetUrl);
        }
    }
}
