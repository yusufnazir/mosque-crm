package com.mosque.crm.controller;

import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.mosque.crm.dto.TenantSettingFieldDTO;
import com.mosque.crm.service.TenantSettingService;

@RestController
@RequestMapping("/tenant-settings")
public class TenantSettingController {

    private static final Logger log = LoggerFactory.getLogger(TenantSettingController.class);

    private final TenantSettingService tenantSettingService;

    public TenantSettingController(TenantSettingService tenantSettingService) {
        this.tenantSettingService = tenantSettingService;
    }

    /**
     * Super-admin: get all setting fields with editability flags and current values.
     */
    @GetMapping("/fields")
    public ResponseEntity<List<TenantSettingFieldDTO>> getAllFields() {
        return ResponseEntity.ok(tenantSettingService.getAllFieldsWithValues());
    }

    /**
     * Super-admin: update which fields are tenant-editable.
     * Body: { "APP_NAME": true, "APP_BASE_URL": false, ... }
     */
    @PutMapping("/fields")
    public ResponseEntity<List<TenantSettingFieldDTO>> updateEditableFlags(@RequestBody Map<String, Boolean> fieldEditableMap) {
        return ResponseEntity.ok(tenantSettingService.updateTenantEditableFlags(fieldEditableMap));
    }

    /**
     * Tenant admin: get only the fields marked as tenant-editable with current values.
     */
    @GetMapping
    public ResponseEntity<List<TenantSettingFieldDTO>> getTenantEditableFields() {
        return ResponseEntity.ok(tenantSettingService.getTenantEditableFieldsWithValues());
    }

    /**
     * Tenant admin: update values for tenant-editable fields only.
     * Body: { "APP_NAME": "My Organization", ... }
     */
    @PutMapping
    public ResponseEntity<Void> updateTenantSettings(@RequestBody Map<String, String> fieldValues) {
        tenantSettingService.updateTenantSettings(fieldValues);
        return ResponseEntity.ok().build();
    }

    /**
     * Tenant admin: read whether membership terms are enabled for registration.
     */
    @GetMapping("/terms-enabled")
    public ResponseEntity<Map<String, Boolean>> getTermsEnabled() {
        return ResponseEntity.ok(Map.of("enabled", tenantSettingService.getTermsEnabledForCurrentTenant()));
    }

    /**
     * Tenant admin: update whether membership terms are enabled for registration.
     * Body: { "enabled": true|false }
     */
    @PutMapping("/terms-enabled")
    public ResponseEntity<Map<String, Boolean>> updateTermsEnabled(@RequestBody Map<String, Boolean> body) {
        boolean enabled = Boolean.TRUE.equals(body.get("enabled"));
        tenantSettingService.setTermsEnabledForCurrentTenant(enabled);
        return ResponseEntity.ok(Map.of("enabled", enabled));
    }
}
