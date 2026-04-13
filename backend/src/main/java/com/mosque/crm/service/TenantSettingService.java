package com.mosque.crm.service;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mosque.crm.dto.TenantSettingFieldDTO;
import com.mosque.crm.entity.TenantSettingField;
import com.mosque.crm.multitenancy.TenantContext;
import com.mosque.crm.repository.TenantSettingFieldRepository;

@Service
public class TenantSettingService {

    private static final Logger log = LoggerFactory.getLogger(TenantSettingService.class);
    private static final String TERMS_ENABLED_KEY = "TERMS_ENABLED";

    private final TenantSettingFieldRepository tenantSettingFieldRepository;
    private final ConfigurationService configurationService;

    public TenantSettingService(TenantSettingFieldRepository tenantSettingFieldRepository,
                                ConfigurationService configurationService) {
        this.tenantSettingFieldRepository = tenantSettingFieldRepository;
        this.configurationService = configurationService;
    }

    /**
     * Get all tenant setting fields with their global (system) config values (super-admin view).
     */
    public List<TenantSettingFieldDTO> getAllFieldsWithValues() {
        List<TenantSettingField> fields = tenantSettingFieldRepository.findAllByOrderByDisplayOrderAsc();
        return fields.stream()
                .map(f -> toDTO(f, configurationService.getValue(f.getFieldKey()).orElse(null)))
                .collect(Collectors.toList());
    }

    /**
     * Update which fields are tenant-editable (super-admin operation).
     */
    @Transactional
    public List<TenantSettingFieldDTO> updateTenantEditableFlags(Map<String, Boolean> fieldEditableMap) {
        List<TenantSettingField> allFields = tenantSettingFieldRepository.findAllByOrderByDisplayOrderAsc();
        for (TenantSettingField field : allFields) {
            Boolean editable = fieldEditableMap.get(field.getFieldKey());
            if (editable != null) {
                field.setTenantEditable(editable);
            }
        }
        tenantSettingFieldRepository.saveAll(allFields);
        log.info("Updated tenant-editable flags for {} fields", fieldEditableMap.size());
        return allFields.stream()
                .map(f -> toDTO(f, configurationService.getValue(f.getFieldKey()).orElse(null)))
                .collect(Collectors.toList());
    }

    /**
     * Get only tenant-editable fields with their effective values for the current org.
     * Returns the org-specific override if present, otherwise the global default.
     */
    public List<TenantSettingFieldDTO> getTenantEditableFieldsWithValues() {
        Long organizationId = TenantContext.getCurrentOrganizationId();
        List<TenantSettingField> fields = tenantSettingFieldRepository.findByTenantEditableTrueOrderByDisplayOrderAsc();
        List<TenantSettingFieldDTO> result = fields.stream()
                .map(f -> toDTO(f, configurationService.getValueTenantAware(f.getFieldKey(), organizationId).orElse(null)))
            .collect(Collectors.toList());

        // Synthetic field so tenant settings can carry terms toggle state without requiring a new table row.
        result.add(new TenantSettingFieldDTO(
            -1L,
            TERMS_ENABLED_KEY,
            "Enable Terms & Conditions",
            "membership",
            true,
            Integer.MAX_VALUE,
            configurationService.getValueTenantAware(TERMS_ENABLED_KEY, organizationId).orElse("false")
        ));

        return result;
    }

    /**
     * Update configuration values for tenant-editable fields only (tenant admin operation).
     * Writes org-specific overrides — does NOT modify global (system-wide) settings.
     */
    @Transactional
    public void updateTenantSettings(Map<String, String> fieldValues) {
        Long organizationId = TenantContext.getCurrentOrganizationId();
        if (organizationId == null) {
            log.warn("updateTenantSettings called without tenant context — aborting to prevent global config pollution");
            return;
        }

        Set<String> editableKeys = tenantSettingFieldRepository.findByTenantEditableTrue()
                .stream()
                .map(TenantSettingField::getFieldKey)
                .collect(Collectors.toSet());

        for (Map.Entry<String, String> entry : fieldValues.entrySet()) {
            if (editableKeys.contains(entry.getKey()) || TERMS_ENABLED_KEY.equals(entry.getKey())) {
                configurationService.setTenantValue(entry.getKey(), entry.getValue(), organizationId);
            } else {
                log.warn("Tenant attempted to update non-editable field: {}", entry.getKey());
            }
        }
        log.info("Updated {} tenant settings for organization_id={}", fieldValues.size(), organizationId);
    }

    /**
     * Read tenant-scoped toggle for membership terms requirement.
     */
    public boolean getTermsEnabledForCurrentTenant() {
        Long organizationId = TenantContext.getCurrentOrganizationId();
        if (organizationId == null) {
            return false;
        }
        return "true".equalsIgnoreCase(
                configurationService.getValueTenantAware(TERMS_ENABLED_KEY, organizationId).orElse("false"));
    }

    /**
     * Persist tenant-scoped toggle for membership terms requirement.
     */
    @Transactional
    public void setTermsEnabledForCurrentTenant(boolean enabled) {
        Long organizationId = TenantContext.getCurrentOrganizationId();
        if (organizationId == null) {
            log.warn("setTermsEnabledForCurrentTenant called without tenant context");
            return;
        }
        configurationService.setTenantValue(TERMS_ENABLED_KEY, String.valueOf(enabled), organizationId);
        log.info("Updated TERMS_ENABLED={} for organization_id={}", enabled, organizationId);
    }

    private TenantSettingFieldDTO toDTO(TenantSettingField field, String currentValue) {
        return new TenantSettingFieldDTO(
                field.getId(),
                field.getFieldKey(),
                field.getLabel(),
                field.getCategory(),
                field.isTenantEditable(),
                field.getDisplayOrder(),
                currentValue
        );
    }
}
