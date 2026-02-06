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

import com.mosque.crm.dto.ConfigurationDTO;
import com.mosque.crm.dto.MailServerConfigDTO;
import com.mosque.crm.entity.Configuration;
import com.mosque.crm.service.ConfigurationService;

@RestController
@RequestMapping("/configurations")
public class ConfigurationController {

    private static final Logger log = LoggerFactory.getLogger(ConfigurationController.class);
    private final ConfigurationService configurationService;
    private final RestTemplate restTemplate;

    public ConfigurationController(ConfigurationService configurationService, RestTemplate restTemplate) {
        this.configurationService = configurationService;
        this.restTemplate = restTemplate;
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
        return configurationService.getConfiguration(name)
                .map(c -> ResponseEntity.ok(new ConfigurationDTO(c.getName(), c.getValue())))
                .orElse(ResponseEntity.notFound().build());
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
}
