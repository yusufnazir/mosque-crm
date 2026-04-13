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
        String resetUrl = configurationService.getAppBaseUrl() + "/reset-password?token=" + resetToken;

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
        String appName = configurationService.getAppName();
        if ("nl".equalsIgnoreCase(locale)) {
            return "Wachtwoord Herstel Verzoek - " + appName;
        }
        return "Password Reset Request - " + appName;
    }

    /**
     * Send welcome email to a newly created user account with a password setup link
     */
    public void sendWelcomeEmail(String toEmail, String firstName, String username, String appName, String setupToken, String locale) {
        if (toEmail == null || toEmail.isEmpty()) {
            log.warn("Cannot send welcome email: no email address provided.");
            return;
        }

        // Get mail server configuration
        String host = configurationService.getMailServerHost();
        String mailUsername = configurationService.getMailServerUsername();
        String mailPassword = configurationService.getMailServerPassword();
        String projectUuid = configurationService.getMailServerProjectUuid();

        // Build password setup URL using the reset-password page with the token
        String setupUrl = configurationService.getAppBaseUrl() + "/reset-password?token=" + setupToken;

        if (host == null || host.isEmpty()) {
            log.error("Mail server not configured. Cannot send welcome email.");
            log.info("=== WELCOME EMAIL (Fallback - Mail server not configured) ===");
            log.info("To: {}", toEmail);
            log.info("Username: {}", username);
            log.info("App: {}", appName);
            log.info("Password Setup URL: {}", setupUrl);
            log.info("=============================================================");
            return;
        }

        // Prepare email content
        String emailSubject = getWelcomeSubject(locale, appName);
        String emailBody = buildWelcomeEmailBody(firstName, username, setupUrl, appName, locale);

        // Prepare request payload
        Map<String, Object> payload = new HashMap<>();
        payload.put("to", Arrays.asList(toEmail));
        payload.put("subject", emailSubject);
        payload.put("text", emailBody);
        payload.put("projectId", projectUuid);

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            if (mailUsername != null && !mailUsername.isEmpty() &&
                mailPassword != null && !mailPassword.isEmpty()) {
                String auth = mailUsername + ":" + mailPassword;
                byte[] encodedAuth = Base64.getEncoder().encode(auth.getBytes(StandardCharsets.UTF_8));
                String authHeader = "Basic " + new String(encodedAuth);
                headers.set("Authorization", authHeader);
            }

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);
            String mailEndpoint = host + "/rest/v1/api/register-mail";

            log.info("Sending welcome email to: {}", toEmail);
            ResponseEntity<String> response = restTemplate.postForEntity(mailEndpoint, request, String.class);

            HttpStatus status = (HttpStatus) response.getStatusCode();
            if (status.is2xxSuccessful()) {
                log.info("Welcome email sent successfully to: {}", toEmail);
            } else {
                log.error("Failed to send welcome email. Status: {}", status);
                fallbackWelcomeLog(toEmail, emailSubject, emailBody, setupUrl);
            }
        } catch (Exception e) {
            log.error("Error sending welcome email to {}: {}", toEmail, e.getMessage());
            fallbackWelcomeLog(toEmail, emailSubject, emailBody, setupUrl);
        }
    }

    private String getWelcomeSubject(String locale, String appName) {
        if ("nl".equalsIgnoreCase(locale)) {
            return "Welkom bij " + appName;
        }
        return "Welcome to " + appName;
    }

    private void fallbackWelcomeLog(String toEmail, String subject, String body, String setupUrl) {
        log.info("=== WELCOME EMAIL (Fallback - Mail server error) ===");
        log.info("To: {}", toEmail);
        log.info("Subject: {}", subject);
        log.info("Body:\n{}", body);
        log.info("Password Setup URL: {}", setupUrl);
        log.info("=====================================================");
    }

    private String buildWelcomeEmailBody(String firstName, String username, String setupUrl, String appName, String locale) {
        try {
            String templateName = "nl".equalsIgnoreCase(locale)
                ? "email/welcome-nl.ftl"
                : "email/welcome-en.ftl";

            Template template = freemarkerConfig.getTemplate(templateName);

            Map<String, Object> model = new HashMap<>();
            model.put("firstName", firstName);
            model.put("username", username);
            model.put("setupUrl", setupUrl);
            model.put("appName", appName);

            return FreeMarkerTemplateUtils.processTemplateIntoString(template, model);
        } catch (Exception e) {
            log.error("Error processing welcome email template", e);
            // Fallback to simple text
            return String.format("""
                Hello %s,

                An account has been created for you on %s.

                Your username is: %s

                Please visit the link below to set your password:
                %s

                This link will expire in 72 hours.

                Best regards,
                %s Team
                """, firstName, appName, username, setupUrl, appName);
        }
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
            model.put("appName", configurationService.getAppName());

            // Process template
            return FreeMarkerTemplateUtils.processTemplateIntoString(template, model);
        } catch (Exception e) {
            log.error("Error processing email template", e);
            // Fallback to simple text email
            String appName = configurationService.getAppName();
            return String.format("""
                Hello %s,

                You have requested to reset your password for %s.

                Click the link below to reset your password:
                %s

                This link will expire in 30 minutes.

                If you did not request this, please ignore this email.

                Best regards,
                %s Team
                """, username, appName, resetUrl, appName);
        }
    }

    // ────────────────────────────────────────────────────────────────
    // Join-request email methods
    // ────────────────────────────────────────────────────────────────

    /**
     * Notify a registrant that their application was received and is under review.
     */
    public void sendJoinRequestReceivedEmail(String toEmail, String firstName, String orgName, String appName, String locale) {
        sendTemplatedEmail(toEmail, appName + " - Membership Application Received",
                buildJoinRequestReceivedBody(firstName, orgName, appName, locale));
    }

    /**
     * Notify an admin that a new join request has been submitted.
     */
    public void sendJoinRequestAdminNotification(String toEmail, String requesterName, String requesterEmail,
            String orgName, String appName, String adminUrl, String locale) {
        sendTemplatedEmail(toEmail, appName + " - New Membership Application",
                buildJoinRequestAdminNotifyBody(requesterName, requesterEmail, orgName, appName, adminUrl, locale));
    }

    /**
     * Notify the registrant that their request was approved and send the completion link.
     */
    public void sendJoinRequestApprovedEmail(String toEmail, String firstName, String orgName, String appName,
            String completionUrl, String locale) {
        sendTemplatedEmail(toEmail, appName + " - Membership Application Approved",
                buildJoinRequestApprovedBody(firstName, orgName, appName, completionUrl, locale));
    }

    /**
     * Notify the registrant that their request was rejected.
     */
    public void sendJoinRequestRejectedEmail(String toEmail, String firstName, String orgName, String appName,
            String rejectionReason, String locale) {
        sendTemplatedEmail(toEmail, appName + " - Membership Application Rejected",
                buildJoinRequestRejectedBody(firstName, orgName, appName, rejectionReason, locale));
    }

    // ── shared low-level sender (reuses same pattern as existing methods) ──

    private void sendTemplatedEmail(String toEmail, String subject, String body) {
        if (toEmail == null || toEmail.isEmpty()) {
            log.warn("sendTemplatedEmail: no email address provided.");
            return;
        }
        String host = configurationService.getMailServerHost();
        String mailUsername = configurationService.getMailServerUsername();
        String mailPassword = configurationService.getMailServerPassword();
        String projectUuid = configurationService.getMailServerProjectUuid();

        if (host == null || host.isEmpty()) {
            log.info("=== EMAIL (Fallback - Mail server not configured) ===");
            log.info("To: {}", toEmail);
            log.info("Subject: {}", subject);
            log.info("Body:\n{}", body);
            log.info("=====================================================");
            return;
        }

        Map<String, Object> payload = new HashMap<>();
        payload.put("to", Arrays.asList(toEmail));
        payload.put("subject", subject);
        payload.put("text", body);
        payload.put("projectId", projectUuid);

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            if (mailUsername != null && !mailUsername.isEmpty() &&
                    mailPassword != null && !mailPassword.isEmpty()) {
                String auth = mailUsername + ":" + mailPassword;
                byte[] encodedAuth = Base64.getEncoder().encode(auth.getBytes(StandardCharsets.UTF_8));
                headers.set("Authorization", "Basic " + new String(encodedAuth));
            }
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);
            String mailEndpoint = host + "/rest/v1/api/register-mail";
            ResponseEntity<String> response = restTemplate.postForEntity(mailEndpoint, request, String.class);
            HttpStatus status = (HttpStatus) response.getStatusCode();
            if (!status.is2xxSuccessful()) {
                log.error("Failed to send email to {}. Status: {}", toEmail, status);
            } else {
                log.info("Email sent successfully to: {}", toEmail);
            }
        } catch (Exception e) {
            log.error("Error sending email to {}: {}", toEmail, e.getMessage());
        }
    }

    // ── FTL body builders for join-request emails ──

    private String buildJoinRequestReceivedBody(String firstName, String orgName, String appName, String locale) {
        try {
            String templateName = "nl".equalsIgnoreCase(locale)
                    ? "email/join-request-received-nl.ftl"
                    : "email/join-request-received-en.ftl";
            Template template = freemarkerConfig.getTemplate(templateName);
            Map<String, Object> model = new HashMap<>();
            model.put("firstName", firstName);
            model.put("orgName", orgName);
            model.put("appName", appName);
            return FreeMarkerTemplateUtils.processTemplateIntoString(template, model);
        } catch (Exception e) {
            log.error("Error processing join-request-received template", e);
            return String.format("Dear %s, your membership application for %s has been received.", firstName, orgName);
        }
    }

    private String buildJoinRequestAdminNotifyBody(String requesterName, String requesterEmail,
            String orgName, String appName, String adminUrl, String locale) {
        try {
            String templateName = "nl".equalsIgnoreCase(locale)
                    ? "email/join-request-admin-notify-nl.ftl"
                    : "email/join-request-admin-notify-en.ftl";
            Template template = freemarkerConfig.getTemplate(templateName);
            Map<String, Object> model = new HashMap<>();
            model.put("requesterName", requesterName);
            model.put("requesterEmail", requesterEmail);
            model.put("orgName", orgName);
            model.put("appName", appName);
            model.put("adminUrl", adminUrl);
            return FreeMarkerTemplateUtils.processTemplateIntoString(template, model);
        } catch (Exception e) {
            log.error("Error processing join-request-admin-notify template", e);
            return String.format("New membership application from %s (%s) for %s. Review at: %s",
                    requesterName, requesterEmail, orgName, adminUrl);
        }
    }

    private String buildJoinRequestApprovedBody(String firstName, String orgName, String appName,
            String completionUrl, String locale) {
        try {
            String templateName = "nl".equalsIgnoreCase(locale)
                    ? "email/join-request-approved-nl.ftl"
                    : "email/join-request-approved-en.ftl";
            Template template = freemarkerConfig.getTemplate(templateName);
            Map<String, Object> model = new HashMap<>();
            model.put("firstName", firstName);
            model.put("orgName", orgName);
            model.put("appName", appName);
            model.put("completionUrl", completionUrl);
            return FreeMarkerTemplateUtils.processTemplateIntoString(template, model);
        } catch (Exception e) {
            log.error("Error processing join-request-approved template", e);
            return String.format("Dear %s, your application for %s has been approved. Activate your account: %s",
                    firstName, orgName, completionUrl);
        }
    }

    private String buildJoinRequestRejectedBody(String firstName, String orgName, String appName,
            String rejectionReason, String locale) {
        try {
            String templateName = "nl".equalsIgnoreCase(locale)
                    ? "email/join-request-rejected-nl.ftl"
                    : "email/join-request-rejected-en.ftl";
            Template template = freemarkerConfig.getTemplate(templateName);
            Map<String, Object> model = new HashMap<>();
            model.put("firstName", firstName);
            model.put("orgName", orgName);
            model.put("appName", appName);
            model.put("rejectionReason", rejectionReason != null ? rejectionReason : "");
            return FreeMarkerTemplateUtils.processTemplateIntoString(template, model);
        } catch (Exception e) {
            log.error("Error processing join-request-rejected template", e);
            return String.format("Dear %s, your membership application for %s could not be approved.", firstName, orgName);
        }
    }

    /**
     * Send a membership invitation to a prospective member with the registration link.
     */
    public void sendMemberInviteEmail(String toEmail, String orgName, String appName, String registrationUrl, String locale) {
        sendTemplatedEmail(toEmail, appName + " - Invitation to Join " + orgName,
                buildMemberInviteBody(orgName, appName, registrationUrl, locale));
    }

    private String buildMemberInviteBody(String orgName, String appName, String registrationUrl, String locale) {
        try {
            String templateName = "nl".equalsIgnoreCase(locale)
                    ? "email/member-invite-nl.ftl"
                    : "email/member-invite-en.ftl";
            Template template = freemarkerConfig.getTemplate(templateName);
            Map<String, Object> model = new HashMap<>();
            model.put("orgName", orgName);
            model.put("appName", appName);
            model.put("registrationUrl", registrationUrl);
            return FreeMarkerTemplateUtils.processTemplateIntoString(template, model);
        } catch (Exception e) {
            log.error("Error processing member-invite template", e);
            return String.format("You have been invited to register as a member of %s. Register at: %s", orgName, registrationUrl);
        }
    }
}

