package com.mosque.crm.service;

import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mosque.crm.dto.MembershipTermsVersionCreateDTO;
import com.mosque.crm.dto.MembershipTermsDraftDTO;
import com.mosque.crm.dto.MembershipTermsVersionDTO;
import com.mosque.crm.entity.MembershipTermsVersion;
import com.mosque.crm.entity.Organization;
import com.mosque.crm.multitenancy.TenantContext;
import com.mosque.crm.repository.MembershipTermsVersionRepository;
import com.mosque.crm.repository.OrganizationRepository;

@Service
@Transactional
public class MembershipTermsService {

    private static final String TERMS_ENABLED_KEY = "TERMS_ENABLED";
    private static final String TERMS_DRAFT_TITLE_KEY = "MEMBERSHIP_TERMS_DRAFT_TITLE";
    private static final String TERMS_DRAFT_TITLE_NL_KEY = "MEMBERSHIP_TERMS_DRAFT_TITLE_NL";
    private static final String TERMS_DRAFT_CONTENT_KEY = "MEMBERSHIP_TERMS_DRAFT_CONTENT";
    private static final String TERMS_DRAFT_CONTENT_NL_KEY = "MEMBERSHIP_TERMS_DRAFT_CONTENT_NL";
    private static final String TERMS_DRAFT_TIMESTAMP_KEY = "MEMBERSHIP_TERMS_DRAFT_TIMESTAMP";
    private static final String TERMS_DRAFT_TIMESTAMP_NL_KEY = "MEMBERSHIP_TERMS_DRAFT_TIMESTAMP_NL";

    private static final List<String> AVAILABLE_PLACEHOLDERS = Arrays.asList(
            "{{organization.name}}",
            "{{organization.shortName}}",
            "{{organization.address}}",
            "{{organization.city}}",
            "{{organization.country}}",
            "{{organization.postalCode}}",
            "{{organization.phone}}",
            "{{organization.email}}",
            "{{organization.website}}",
            "{{config.APP_NAME}}");

    private final MembershipTermsVersionRepository membershipTermsVersionRepository;
    private final OrganizationRepository organizationRepository;
    private final ConfigurationService configurationService;

    public MembershipTermsService(
            MembershipTermsVersionRepository membershipTermsVersionRepository,
            OrganizationRepository organizationRepository,
            ConfigurationService configurationService) {
        this.membershipTermsVersionRepository = membershipTermsVersionRepository;
        this.organizationRepository = organizationRepository;
        this.configurationService = configurationService;
    }

    @Transactional(readOnly = true)
    public List<MembershipTermsVersionDTO> getHistoryForCurrentTenant() {
        Long organizationId = requireOrganizationId();
        Organization organization = getOrganization(organizationId);
        return membershipTermsVersionRepository.findByOrganizationIdOrderByVersionNumberDesc(organizationId)
                .stream()
                .map(version -> toDTO(version, organization))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Optional<MembershipTermsVersion> getCurrentActiveEntity(Long organizationId) {
        return membershipTermsVersionRepository.findFirstByOrganizationIdAndActiveTrueOrderByVersionNumberDesc(organizationId);
    }

    @Transactional(readOnly = true)
    public Optional<MembershipTermsVersionDTO> getCurrentForCurrentTenant() {
        Long organizationId = requireOrganizationId();
        Organization organization = getOrganization(organizationId);
        return membershipTermsVersionRepository.findFirstByOrganizationIdAndActiveTrueOrderByVersionNumberDesc(organizationId)
                .map(version -> toDTO(version, organization));
    }

    @Transactional(readOnly = true)
    public boolean isTermsEnabledForCurrentTenant() {
        Long organizationId = requireOrganizationId();
        return "true".equalsIgnoreCase(
                configurationService.getValueTenantAware(TERMS_ENABLED_KEY, organizationId).orElse("false"));
    }

    @Transactional(readOnly = true)
    public boolean isTermsEnabledForOrganization(Long organizationId) {
        return "true".equalsIgnoreCase(
                configurationService.getValueTenantAware(TERMS_ENABLED_KEY, organizationId).orElse("false"));
    }

    public void setTermsEnabled(boolean enabled) {
        Long organizationId = requireOrganizationId();
        configurationService.setTenantValue(TERMS_ENABLED_KEY, String.valueOf(enabled), organizationId);
    }

    @Transactional(readOnly = true)
    public MembershipTermsDraftDTO getDraftForCurrentTenant() {
        Long organizationId = requireOrganizationId();
        MembershipTermsDraftDTO dto = new MembershipTermsDraftDTO();
        dto.setTitle(trimToNull(configurationService.getValueTenantAware(TERMS_DRAFT_TITLE_KEY, organizationId).orElse(null)));
        dto.setTitleNl(trimToNull(configurationService.getValueTenantAware(TERMS_DRAFT_TITLE_NL_KEY, organizationId).orElse(null)));
        dto.setContent(trimToNull(configurationService.getValueTenantAware(TERMS_DRAFT_CONTENT_KEY, organizationId).orElse(null)));
        dto.setContentNl(trimToNull(configurationService.getValueTenantAware(TERMS_DRAFT_CONTENT_NL_KEY, organizationId).orElse(null)));

        String timestampStr = configurationService.getValueTenantAware(TERMS_DRAFT_TIMESTAMP_KEY, organizationId).orElse(null);
        if (timestampStr != null && !timestampStr.trim().isEmpty()) {
            try {
                dto.setLastSavedAt(Long.parseLong(timestampStr));
            } catch (NumberFormatException e) {
                // Ignore invalid timestamp
            }
        }

        String timestampNlStr = configurationService.getValueTenantAware(TERMS_DRAFT_TIMESTAMP_NL_KEY, organizationId).orElse(null);
        if (timestampNlStr != null && !timestampNlStr.trim().isEmpty()) {
            try {
                dto.setLastSavedAtNl(Long.parseLong(timestampNlStr));
            } catch (NumberFormatException e) {
                // Ignore invalid timestamp
            }
        }

        return dto;
    }

    public MembershipTermsDraftDTO saveDraftForCurrentTenant(MembershipTermsDraftDTO dto) {
        Long organizationId = requireOrganizationId();
        String title = trimToNull(dto != null ? dto.getTitle() : null);
        String titleNl = trimToNull(dto != null ? dto.getTitleNl() : null);
        String content = trimToNull(dto != null ? dto.getContent() : null);
        String contentNl = trimToNull(dto != null ? dto.getContentNl() : null);
        String locale = dto != null ? trimToNull(dto.getLocale()) : null;

        configurationService.setTenantValue(TERMS_DRAFT_TITLE_KEY, title == null ? "" : title, organizationId);
        configurationService.setTenantValue(TERMS_DRAFT_TITLE_NL_KEY, titleNl == null ? "" : titleNl, organizationId);
        configurationService.setTenantValue(TERMS_DRAFT_CONTENT_KEY, content == null ? "" : content, organizationId);
        configurationService.setTenantValue(TERMS_DRAFT_CONTENT_NL_KEY, contentNl == null ? "" : contentNl, organizationId);

        long timestamp = System.currentTimeMillis();
        if ("nl".equalsIgnoreCase(locale)) {
            configurationService.setTenantValue(TERMS_DRAFT_TIMESTAMP_NL_KEY, String.valueOf(timestamp), organizationId);
        } else {
            configurationService.setTenantValue(TERMS_DRAFT_TIMESTAMP_KEY, String.valueOf(timestamp), organizationId);
        }

        Long savedTimestampEn = parseLongSafely(configurationService.getValueTenantAware(TERMS_DRAFT_TIMESTAMP_KEY, organizationId).orElse(null));
        Long savedTimestampNl = parseLongSafely(configurationService.getValueTenantAware(TERMS_DRAFT_TIMESTAMP_NL_KEY, organizationId).orElse(null));

        MembershipTermsDraftDTO saved = new MembershipTermsDraftDTO();
        saved.setTitle(title);
        saved.setTitleNl(titleNl);
        saved.setContent(content);
        saved.setContentNl(contentNl);
        saved.setLastSavedAt(savedTimestampEn);
        saved.setLastSavedAtNl(savedTimestampNl);
        return saved;
    }

    @Transactional(readOnly = true)
    public Optional<MembershipTermsVersionDTO> getCurrentPublic(String orgHandle) {
        Organization organization = organizationRepository.findByHandle(orgHandle)
                .orElseThrow(() -> new IllegalArgumentException("Organization not found: " + orgHandle));
        if (!isTermsEnabledForOrganization(organization.getId())) {
            return Optional.empty();
        }
        return membershipTermsVersionRepository.findFirstByOrganizationIdAndActiveTrueOrderByVersionNumberDesc(organization.getId())
                .map(version -> toDTO(version, organization));
    }

    public MembershipTermsVersionDTO publishNewVersion(MembershipTermsVersionCreateDTO dto, String createdBy) {
        Long organizationId = requireOrganizationId();
        Organization organization = getOrganization(organizationId);
        if (dto.getTitle() == null || dto.getTitle().trim().isEmpty()) {
            throw new IllegalArgumentException("Title is required.");
        }
        if (dto.getContent() == null || dto.getContent().trim().isEmpty()) {
            throw new IllegalArgumentException("Content is required.");
        }

        membershipTermsVersionRepository.findByOrganizationIdAndActiveTrue(organizationId)
                .forEach(version -> version.setActive(false));

        int nextVersionNumber = membershipTermsVersionRepository.findFirstByOrganizationIdOrderByVersionNumberDesc(organizationId)
                .map(MembershipTermsVersion::getVersionNumber)
                .orElse(0) + 1;

        MembershipTermsVersion version = new MembershipTermsVersion();
        version.setOrganizationId(organizationId);
        version.setVersionNumber(nextVersionNumber);
        version.setTitle(dto.getTitle().trim());
        version.setContent(dto.getContent().trim());
        version.setTitleNl(trimToNull(dto.getTitleNl()));
        version.setContentNl(trimToNull(dto.getContentNl()));
        version.setActive(true);
        version.setCreatedBy(createdBy);

        MembershipTermsVersion saved = membershipTermsVersionRepository.save(version);
        return toDTO(saved, organization);
    }

    public String renderContent(MembershipTermsVersion version, Organization organization) {
        return renderContent(version.getContent(), organization);
    }

    public String renderContent(String template, Organization organization) {
        Map<String, String> values = new LinkedHashMap<>();
        values.put("organization.name", safe(organization.getName()));
        values.put("organization.shortName", safe(organization.getShortName()));
        values.put("organization.address", safe(organization.getAddress()));
        values.put("organization.city", safe(organization.getCity()));
        values.put("organization.country", safe(organization.getCountry()));
        values.put("organization.postalCode", safe(organization.getPostalCode()));
        values.put("organization.phone", safe(organization.getPhone()));
        values.put("organization.email", safe(organization.getEmail()));
        values.put("organization.website", safe(organization.getWebsite()));
        values.put("config.APP_NAME", safe(configurationService.getValueTenantAware("APP_NAME", organization.getId()).orElse(configurationService.getAppName())));

        String rendered = template;
        for (Map.Entry<String, String> entry : values.entrySet()) {
            rendered = rendered.replace("{{" + entry.getKey() + "}}", entry.getValue());
        }
        return rendered.replace("\r\n", "\n");
    }

    public List<String> getAvailablePlaceholders() {
        return AVAILABLE_PLACEHOLDERS;
    }

    private MembershipTermsVersionDTO toDTO(MembershipTermsVersion version, Organization organization) {
        MembershipTermsVersionDTO dto = new MembershipTermsVersionDTO();
        dto.setId(version.getId());
        dto.setVersionNumber(version.getVersionNumber());
        dto.setTitle(version.getTitle());
        dto.setContent(version.getContent());
        dto.setTitleNl(version.getTitleNl());
        dto.setContentNl(version.getContentNl());
        dto.setRenderedContent(renderContent(version, organization));
        String contentNl = trimToNull(version.getContentNl());
        dto.setRenderedContentNl(contentNl != null ? renderContent(contentNl, organization) : dto.getRenderedContent());
        dto.setActive(version.isActive());
        dto.setCreatedBy(version.getCreatedBy());
        dto.setCreatedAt(version.getCreatedAt());
        dto.setUpdatedAt(version.getUpdatedAt());
        dto.setAvailablePlaceholders(getAvailablePlaceholders());
        return dto;
    }

    private Long requireOrganizationId() {
        Long organizationId = TenantContext.getCurrentOrganizationId();
        if (organizationId == null) {
            throw new IllegalStateException("No organization context found.");
        }
        return organizationId;
    }

    private Organization getOrganization(Long organizationId) {
        return organizationRepository.findById(organizationId)
                .orElseThrow(() -> new IllegalArgumentException("Organization not found: " + organizationId));
    }

    private String safe(String value) {
        return value == null ? "" : value.trim();
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private Long parseLongSafely(String value) {
        if (value == null || value.trim().isEmpty()) {
            return null;
        }
        try {
            return Long.parseLong(value.trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }
}