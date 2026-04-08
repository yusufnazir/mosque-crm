package com.mosque.crm.controller;

import java.util.List;
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
import org.springframework.web.bind.annotation.RestController;

import com.mosque.crm.dto.OrganizationDTO;
import com.mosque.crm.entity.Organization;
import com.mosque.crm.repository.OrganizationRepository;
import com.mosque.crm.service.RoleTemplateService;

@RestController
@RequestMapping("/organizations")
public class OrganizationController {

    private static final Logger log = LoggerFactory.getLogger(OrganizationController.class);

    private final OrganizationRepository organizationRepository;
    private final RoleTemplateService roleTemplateService;

    public OrganizationController(OrganizationRepository organizationRepository,
                            RoleTemplateService roleTemplateService) {
        this.organizationRepository = organizationRepository;
        this.roleTemplateService = roleTemplateService;
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
        organization.setActive(dto.getActive() != null ? dto.getActive() : true);

        Organization saved = organizationRepository.save(organization);
        roleTemplateService.provisionDefaultRolesForOrganization(saved.getId());
        log.info("Created organization: {} (id={})", saved.getName(), saved.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(toDTO(saved));
    }

    @PutMapping("/{id}")
    @PreAuthorize("@auth.hasPermission('organization.manage')")
    public ResponseEntity<OrganizationDTO> updateOrganization(@PathVariable Long id, @RequestBody OrganizationDTO dto) {
        return organizationRepository.findById(id)
                .map(organization -> {
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
                    Organization saved = organizationRepository.save(organization);
                    log.info("Updated organization: {} (id={})", saved.getName(), saved.getId());
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
        dto.setActive(organization.isActive());
        dto.setCreatedAt(organization.getCreatedAt());
        dto.setUpdatedAt(organization.getUpdatedAt());
        return dto;
    }
}
