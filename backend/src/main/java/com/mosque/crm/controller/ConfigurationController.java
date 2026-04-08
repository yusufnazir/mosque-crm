package com.mosque.crm.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;

import com.mosque.crm.config.BillingSchedulerConfig;
import com.mosque.crm.dto.BillingSchedulerConfigDTO;
import com.mosque.crm.dto.ConfigurationDTO;
import com.mosque.crm.dto.MailServerConfigDTO;
import com.mosque.crm.dto.MinioConfigDTO;
import com.mosque.crm.entity.Configuration;
import com.mosque.crm.multitenancy.TenantContext;
import com.mosque.crm.service.BillingService;
import com.mosque.crm.service.ConfigurationService;
import com.mosque.crm.service.MinioStorageService;

@RestController
@RequestMapping("/configurations")
public class ConfigurationController {

    private static final Logger log = LoggerFactory.getLogger(ConfigurationController.class);
    private final ConfigurationService configurationService;
    private final MinioStorageService minioStorageService;
    private final RestTemplate restTemplate;
    private final BillingService billingService;

    public ConfigurationController(ConfigurationService configurationService, MinioStorageService minioStorageService, RestTemplate restTemplate, BillingService billingService) {
        this.configurationService = configurationService;
        this.minioStorageService = minioStorageService;
        this.restTemplate = restTemplate;
        this.billingService = billingService;
    }

    @GetMapping
    public ResponseEntity<List<ConfigurationDTO>> getAllConfigurations() {
        List<ConfigurationDTO> configs = configurationService.getAllConfigurations()
                .stream()
                .map(c -> new ConfigurationDTO(c.getName(), c.getValue()))
                .collect(Collectors.toList());
        return ResponseEntity.ok(configs);
    }

    @GetMapping("/{name}")
    public ResponseEntity<ConfigurationDTO> getConfiguration(@PathVariable String name) {
        Long organizationId = TenantContext.getCurrentOrganizationId();
        String value = configurationService.getValueTenantAware(name, organizationId).orElse(null);
        if (value == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(new ConfigurationDTO(name, value));
    }

    @PostMapping
    public ResponseEntity<ConfigurationDTO> setConfiguration(@RequestBody ConfigurationDTO dto) {
        Configuration config = configurationService.setValue(dto.getName(), dto.getValue());
        return ResponseEntity.ok(new ConfigurationDTO(config.getName(), config.getValue()));
    }

    @DeleteMapping("/{name}")
    public ResponseEntity<Void> deleteConfiguration(@PathVariable String name) {
        configurationService.deleteConfiguration(name);
        return ResponseEntity.ok().build();
    }

    // Mail server configuration endpoints
    @GetMapping("/mail-server")
    public ResponseEntity<MailServerConfigDTO> getMailServerConfig() {
        MailServerConfigDTO config = new MailServerConfigDTO(
                configurationService.getMailServerHost(),
                configurationService.getMailServerUsername(),
                configurationService.getMailServerPassword(),
                configurationService.getMailServerProjectUuid()
        );
        return ResponseEntity.ok(config);
    }

    @PostMapping("/mail-server")
    public ResponseEntity<Map<String, String>> saveMailServerConfig(@RequestBody MailServerConfigDTO dto) {
        configurationService.setValue("MAIL_SERVER_HOST", dto.getHost());
        configurationService.setValue("MAIL_SERVER_USERNAME", dto.getUsername());
        configurationService.setValue("MAIL_SERVER_PASSWORD", dto.getPassword());
        configurationService.setValue("MAIL_SERVER_PROJECT_UUID", dto.getProjectUuid());

        Map<String, String> response = new HashMap<>();
        response.put("message", "Mail server configuration saved successfully");
        return ResponseEntity.ok(response);
    }

    @PostMapping("/mail-server/test")
    public ResponseEntity<Map<String, String>> testMailServerConnection() {
        Map<String, String> response = new HashMap<>();

        try {
            String host = configurationService.getMailServerHost();
            String username = configurationService.getMailServerUsername();
            String password = configurationService.getMailServerPassword();
            String projectUuid = configurationService.getMailServerProjectUuid();

            // Validate configuration
            if (host == null || host.trim().isEmpty()) {
                response.put("status", "error");
                response.put("message", "Mail server host is not configured");
                return ResponseEntity.ok(response);
            }
            if (username == null || username.trim().isEmpty()) {
                response.put("status", "error");
                response.put("message", "Mail server username is not configured");
                return ResponseEntity.ok(response);
            }
            if (password == null || password.trim().isEmpty()) {
                response.put("status", "error");
                response.put("message", "Mail server password is not configured");
                return ResponseEntity.ok(response);
            }
            if (projectUuid == null || projectUuid.trim().isEmpty()) {
                response.put("status", "error");
                response.put("message", "Mail server project UUID is not configured");
                return ResponseEntity.ok(response);
            }

            // Send test email
            String url = host + "/rest/v1/api/register-mail";
            Map<String, Object> emailPayload = new HashMap<>();
            emailPayload.put("to", java.util.Arrays.asList("test@example.com")); // Must be List<String>
            emailPayload.put("subject", "Mail Server Connection Test");
            emailPayload.put("text", "This is a test email to verify mail server connection. If you receive this, the configuration is correct."); // Changed from "body" to "text"
            emailPayload.put("projectId", projectUuid);

            log.info("Testing mail server connection to: {}", url);

            try {
                // Prepare headers with Basic Authentication
                org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
                headers.setContentType(org.springframework.http.MediaType.APPLICATION_JSON);

                if (username != null && !username.isEmpty() && password != null && !password.isEmpty()) {
                    String auth = username + ":" + password;
                    byte[] encodedAuth = java.util.Base64.getEncoder().encode(auth.getBytes(java.nio.charset.StandardCharsets.UTF_8));
                    String authHeader = "Basic " + new String(encodedAuth);
                    headers.set("Authorization", authHeader);
                }

                org.springframework.http.HttpEntity<Map<String, Object>> request = new org.springframework.http.HttpEntity<>(emailPayload, headers);
                restTemplate.postForEntity(url, request, String.class);
                log.info("Mail server connection test successful");
                response.put("status", "success");
                response.put("message", "Mail server connection successful! Configuration is valid.");
                return ResponseEntity.ok(response);
            } catch (Exception e) {
                log.error("Mail server connection test failed: {}", e.getMessage());
                response.put("status", "error");
                response.put("message", "Connection failed: " + e.getMessage());
                return ResponseEntity.ok(response);
            }
        } catch (Exception e) {
            log.error("Error testing mail server connection", e);
            response.put("status", "error");
            response.put("message", "Test failed: " + e.getMessage());
            return ResponseEntity.ok(response);
        }
    }

    // MinIO / Document Storage configuration endpoints
    @GetMapping("/minio")
    public ResponseEntity<MinioConfigDTO> getMinioConfig() {
        MinioConfigDTO config = new MinioConfigDTO(
                minioStorageService.getEndpoint(),
                minioStorageService.getAccessKey(),
                minioStorageService.getSecretKey(),
                minioStorageService.getBucket(),
                minioStorageService.getRegion(),
                minioStorageService.isUseSsl()
        );
        return ResponseEntity.ok(config);
    }

    @PostMapping("/minio")
    public ResponseEntity<Map<String, String>> saveMinioConfig(@RequestBody MinioConfigDTO dto) {
        configurationService.setValue("MINIO_ENDPOINT", dto.getEndpoint());
        configurationService.setValue("MINIO_ACCESS_KEY", dto.getAccessKey());
        configurationService.setValue("MINIO_SECRET_KEY", dto.getSecretKey());
        configurationService.setValue("MINIO_BUCKET", dto.getBucket());
        configurationService.setValue("MINIO_USE_SSL", String.valueOf(dto.isUseSsl()));

        Map<String, String> response = new HashMap<>();
        response.put("message", "MinIO configuration saved successfully");
        return ResponseEntity.ok(response);
    }

    @PostMapping("/minio/test")
    public ResponseEntity<Map<String, String>> testMinioConnection() {
        Map<String, String> response = new HashMap<>();

        try {
            String error = minioStorageService.testConnection();
            if (error == null) {
                response.put("status", "success");
                response.put("message", "MinIO connection successful! Bucket is accessible.");
            } else {
                response.put("status", "error");
                response.put("message", error);
            }
        } catch (IllegalStateException e) {
            response.put("status", "error");
            response.put("message", e.getMessage());
        } catch (Exception e) {
            log.error("MinIO connection test failed", e);
            response.put("status", "error");
            response.put("message", "Connection test failed: " + e.getMessage());
        }

        return ResponseEntity.ok(response);
    }

    // Billing Scheduler configuration endpoints
    @GetMapping("/billing-scheduler")
    public ResponseEntity<BillingSchedulerConfigDTO> getBillingSchedulerConfig() {
        boolean enabled = !"false".equalsIgnoreCase(
                configurationService.getValue(BillingSchedulerConfig.KEY_ENABLED).orElse("true"));
        String cron = configurationService.getValue(BillingSchedulerConfig.KEY_CRON)
                .orElse(BillingSchedulerConfig.DEFAULT_CRON);
        return ResponseEntity.ok(new BillingSchedulerConfigDTO(enabled, cron));
    }

    @PostMapping("/billing-scheduler")
    public ResponseEntity<Map<String, String>> saveBillingSchedulerConfig(@RequestBody BillingSchedulerConfigDTO dto) {
        configurationService.setValue(BillingSchedulerConfig.KEY_ENABLED, String.valueOf(dto.isEnabled()));
        configurationService.setValue(BillingSchedulerConfig.KEY_CRON,
                dto.getCron() != null && !dto.getCron().isBlank() ? dto.getCron() : BillingSchedulerConfig.DEFAULT_CRON);
        log.info("Billing scheduler configuration updated: enabled={}, cron={}", dto.isEnabled(), dto.getCron());
        Map<String, String> response = new HashMap<>();
        response.put("message", "Billing scheduler configuration saved successfully");
        return ResponseEntity.ok(response);
    }

    @PostMapping("/billing-scheduler/run")
    public ResponseEntity<Map<String, String>> runBillingJobNow() {
        log.info("Manual billing job triggered via API");
        billingService.dailyBillingJob(true); // forced — bypasses the 7-day lookahead window
        log.info("Manual billing job completed");
        Map<String, String> response = new HashMap<>();
        response.put("message", "Billing job completed successfully");
        return ResponseEntity.ok(response);
    }

    // Super admin subdomain configuration
    public static final String KEY_SUPERADMIN_SUBDOMAIN = "SUPERADMIN_SUBDOMAIN";
    public static final String DEFAULT_SUPERADMIN_SUBDOMAIN = "admin";

    @GetMapping("/superadmin-subdomain")
    public ResponseEntity<Map<String, String>> getSuperAdminSubdomain() {
        String value = configurationService.getValue(KEY_SUPERADMIN_SUBDOMAIN)
                .orElse(DEFAULT_SUPERADMIN_SUBDOMAIN);
        Map<String, String> response = new HashMap<>();
        response.put("subdomain", value);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/superadmin-subdomain")
    public ResponseEntity<Map<String, String>> saveSuperAdminSubdomain(@RequestBody Map<String, String> body) {
        String subdomain = body.get("subdomain");
        if (subdomain == null || subdomain.isBlank()) {
            Map<String, String> error = new HashMap<>();
            error.put("message", "Subdomain must not be empty");
            return ResponseEntity.badRequest().body(error);
        }
        // Validate: only lowercase letters, digits, hyphens; no dots or slashes
        if (!subdomain.matches("^[a-z0-9-]+$")) {
            Map<String, String> error = new HashMap<>();
            error.put("message", "Subdomain may only contain lowercase letters, digits and hyphens");
            return ResponseEntity.badRequest().body(error);
        }
        configurationService.setValue(KEY_SUPERADMIN_SUBDOMAIN, subdomain.trim());
        log.info("Super admin subdomain updated to: {}", subdomain);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Super admin subdomain saved successfully");
        response.put("subdomain", subdomain.trim());
        return ResponseEntity.ok(response);
    }
}
