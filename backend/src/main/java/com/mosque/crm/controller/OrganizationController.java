package com.mosque.crm.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.mosque.crm.dto.OrganizationDTO;
import com.mosque.crm.entity.Organization;
import com.mosque.crm.entity.User;
import com.mosque.crm.repository.OrganizationRepository;
import com.mosque.crm.service.AuthorizationService;
import com.mosque.crm.service.RoleTemplateService;

@RestController
@RequestMapping("/organizations")
public class OrganizationController {

    private static final Logger log = LoggerFactory.getLogger(OrganizationController.class);

    private final OrganizationRepository organizationRepository;
    private final RoleTemplateService roleTemplateService;
    private final AuthorizationService authorizationService;

    public OrganizationController(OrganizationRepository organizationRepository,
                            RoleTemplateService roleTemplateService,
                            AuthorizationService authorizationService) {
        this.organizationRepository = organizationRepository;
        this.roleTemplateService = roleTemplateService;
        this.authorizationService = authorizationService;
    }

    @GetMapping
    @PreAuthorize("@auth.hasPermission('organization.manage')")
    public ResponseEntity<List<OrganizationDTO>> getAllOrganizations() {
        List<OrganizationDTO> organizations = organizationRepository.findAll().stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(organizations);
    }

    @GetMapping("/active")
    public ResponseEntity<List<OrganizationDTO>> getActiveOrganizations() {
        List<OrganizationDTO> organizations = organizationRepository.findByActiveTrue().stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(organizations);
    }

    @GetMapping("/{id}")
    @PreAuthorize("@auth.hasPermission('organization.manage')")
    public ResponseEntity<OrganizationDTO> getOrganizationById(@PathVariable Long id) {
        return organizationRepository.findById(id)
                .map(this::toDTO)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @PreAuthorize("@auth.hasPermission('organization.manage')")
    public ResponseEntity<OrganizationDTO> createOrganization(@RequestBody OrganizationDTO dto) {
        if (organizationRepository.existsByName(dto.getName())) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }
        if (dto.getHandle() != null && !dto.getHandle().isBlank()) {
            String handle = dto.getHandle().toLowerCase();
            if (!handle.matches("^[a-z0-9-]+$")) {
                return ResponseEntity.badRequest().build();
            }
            if (organizationRepository.existsByHandle(handle)) {
                return ResponseEntity.status(HttpStatus.CONFLICT).build();
            }
            dto.setHandle(handle);
        }

        Organization organization = new Organization();
        organization.setName(dto.getName());
        organization.setShortName(dto.getShortName());
        organization.setAddress(dto.getAddress());
        organization.setCity(dto.getCity());
        organization.setCountry(dto.getCountry());
        organization.setPostalCode(dto.getPostalCode());
        organization.setPhone(dto.getPhone());
        organization.setEmail(dto.getEmail());
        organization.setWebsite(dto.getWebsite());
        organization.setHandle(dto.getHandle());
        organization.setActive(dto.getActive() != null ? dto.getActive() : true);

        Organization saved = organizationRepository.save(organization);
        roleTemplateService.provisionDefaultRolesForOrganization(saved.getId());
        log.info("Created organization: {} (id={})", saved.getName(), saved.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(toDTO(saved));
    }

    @PutMapping("/{id}")
    @PreAuthorize("@auth.hasPermission('organization.manage')")
    public ResponseEntity<OrganizationDTO> updateOrganization(@PathVariable Long id, @RequestBody OrganizationDTO dto) {
        Organization organization = organizationRepository.findById(id).orElse(null);
        if (organization == null) {
            return ResponseEntity.notFound().build();
        }
        organization.setName(dto.getName());
        organization.setShortName(dto.getShortName());
        organization.setAddress(dto.getAddress());
        organization.setCity(dto.getCity());
        organization.setCountry(dto.getCountry());
        organization.setPostalCode(dto.getPostalCode());
        organization.setPhone(dto.getPhone());
        organization.setEmail(dto.getEmail());
        organization.setWebsite(dto.getWebsite());
        if (dto.getActive() != null) {
            organization.setActive(dto.getActive());
        }
        if (dto.getHandle() != null && !dto.getHandle().isBlank()) {
            String handle = dto.getHandle().toLowerCase();
            if (!handle.matches("^[a-z0-9-]+$")) {
                return ResponseEntity.badRequest().build();
            }
            boolean taken = organizationRepository.findByHandle(handle)
                    .map(existing -> !existing.getId().equals(id))
                    .orElse(false);
            if (taken) {
                return ResponseEntity.status(HttpStatus.CONFLICT).build();
            }
            organization.setHandle(handle);
        } else {
            organization.setHandle(null);
        }
        Organization saved = organizationRepository.save(organization);
        log.info("Updated organization: {} (id={})", saved.getName(), saved.getId());
        return ResponseEntity.ok(toDTO(saved));
    }

    @GetMapping("/check-handle")
    public ResponseEntity<Map<String, Boolean>> checkHandle(
            @RequestParam String handle,
            @RequestParam(required = false) Long excludeId) {
        String normalized = handle.toLowerCase();
        if (!normalized.matches("^[a-z0-9-]+$")) {
            Map<String, Boolean> result = new HashMap<>();
            result.put("available", false);
            return ResponseEntity.ok(result);
        }
        boolean taken = organizationRepository.findByHandle(normalized)
                .map(existing -> excludeId == null || !existing.getId().equals(excludeId))
                .orElse(false);
        Map<String, Boolean> result = new HashMap<>();
        result.put("available", !taken);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/my")
    public ResponseEntity<OrganizationDTO> getMyOrganization() {
        User user = authorizationService.getCurrentUser();
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        if (user.getOrganizationId() == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return organizationRepository.findById(user.getOrganizationId())
                .map(this::toDTO)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/my/handle")
    public ResponseEntity<OrganizationDTO> updateMyHandle(@RequestBody Map<String, String> body) {
        User user = authorizationService.getCurrentUser();
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        if (user.getOrganizationId() == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        String handle = body.get("handle");
        if (handle == null || handle.isBlank()) {
            return organizationRepository.findById(user.getOrganizationId())
                    .map(org -> {
                        org.setHandle(null);
                        return ResponseEntity.ok(toDTO(organizationRepository.save(org)));
                    })
                    .orElse(ResponseEntity.notFound().build());
        }
        handle = handle.toLowerCase();
        if (!handle.matches("^[a-z0-9-]+$")) {
            return ResponseEntity.badRequest().build();
        }
        final String normalizedHandle = handle;
        boolean taken = organizationRepository.findByHandle(normalizedHandle)
                .map(existing -> !existing.getId().equals(user.getOrganizationId()))
                .orElse(false);
        if (taken) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }
        return organizationRepository.findById(user.getOrganizationId())
                .map(org -> {
                    org.setHandle(normalizedHandle);
                    Organization saved = organizationRepository.save(org);
                    log.info("Updated handle for organization: {} (id={}) to '{}'", saved.getName(), saved.getId(), normalizedHandle);
                    return ResponseEntity.ok(toDTO(saved));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    private OrganizationDTO toDTO(Organization organization) {
        OrganizationDTO dto = new OrganizationDTO();
        dto.setId(organization.getId());
        dto.setName(organization.getName());
        dto.setShortName(organization.getShortName());
        dto.setAddress(organization.getAddress());
        dto.setCity(organization.getCity());
        dto.setCountry(organization.getCountry());
        dto.setPostalCode(organization.getPostalCode());
        dto.setPhone(organization.getPhone());
        dto.setEmail(organization.getEmail());
        dto.setWebsite(organization.getWebsite());
        dto.setHandle(organization.getHandle());
        dto.setActive(organization.isActive());
        dto.setCreatedAt(organization.getCreatedAt());
        dto.setUpdatedAt(organization.getUpdatedAt());
        return dto;
    }
}
