package com.mosque.crm.controller;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.mosque.crm.dto.RoleCreateRequest;
import com.mosque.crm.dto.RolePermissionUpdateRequest;
import com.mosque.crm.dto.RoleTemplateDTO;
import com.mosque.crm.entity.Permission;
import com.mosque.crm.entity.RoleTemplate;
import com.mosque.crm.repository.PermissionRepository;
import com.mosque.crm.repository.RoleTemplateRepository;
import com.mosque.crm.service.AuthorizationService;
import com.mosque.crm.service.RoleTemplateService;

import jakarta.validation.Valid;

/**
 * Super-admin endpoints for managing role templates.
 * Templates are the master source for tenant role provisioning.
 * All endpoints require the "superadmin.manage" permission.
 */
@RestController
@RequestMapping("/admin/role-templates")
public class RoleTemplateController {

    private static final Logger log = LoggerFactory.getLogger(RoleTemplateController.class);

    private final RoleTemplateRepository templateRepository;
    private final PermissionRepository permissionRepository;
    private final AuthorizationService authorizationService;
    private final RoleTemplateService roleTemplateService;

    public RoleTemplateController(RoleTemplateRepository templateRepository,
                                  PermissionRepository permissionRepository,
                                  AuthorizationService authorizationService,
                                  RoleTemplateService roleTemplateService) {
        this.templateRepository = templateRepository;
        this.permissionRepository = permissionRepository;
        this.authorizationService = authorizationService;
        this.roleTemplateService = roleTemplateService;
    }

    @GetMapping
    @PreAuthorize("@auth.hasPermission('superadmin.manage')")
    public ResponseEntity<List<RoleTemplateDTO>> getAllTemplates() {
        List<RoleTemplate> templates = templateRepository.findAllByOrderBySortOrderAscNameAsc();
        return ResponseEntity.ok(templates.stream().map(this::toDTO).collect(Collectors.toList()));
    }

    @GetMapping("/{id}")
    @PreAuthorize("@auth.hasPermission('superadmin.manage')")
    public ResponseEntity<RoleTemplateDTO> getTemplateById(@PathVariable Long id) {
        RoleTemplate template = templateRepository.findById(id).orElse(null);
        if (template == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(toDTO(template));
    }

    @PostMapping
    @PreAuthorize("@auth.hasPermission('superadmin.manage')")
    public ResponseEntity<?> createTemplate(@Valid @RequestBody RoleCreateRequest request) {
        String name = request.getName().trim().toUpperCase().replace(' ', '_');
        if (templateRepository.existsByName(name)) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "A template with name '" + name + "' already exists"));
        }
        RoleTemplate template = new RoleTemplate();
        template.setName(name);
        template.setDescription(request.getDescription());
        RoleTemplate saved = templateRepository.save(template);
        log.info("Created role template '{}' (id={})", saved.getName(), saved.getId());
        return ResponseEntity.ok(toDTO(saved));
    }

    @PutMapping("/{id}")
    @PreAuthorize("@auth.hasPermission('superadmin.manage')")
    public ResponseEntity<?> updateTemplate(@PathVariable Long id,
                                            @Valid @RequestBody RoleCreateRequest request) {
        RoleTemplate template = templateRepository.findById(id).orElse(null);
        if (template == null) return ResponseEntity.notFound().build();

        String newName = request.getName().trim().toUpperCase().replace(' ', '_');
        if (!template.getName().equals(newName) && templateRepository.existsByNameAndIdNot(newName, id)) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "A template with name '" + newName + "' already exists"));
        }

        template.setName(newName);
        template.setDescription(request.getDescription());
        templateRepository.save(template);

        log.info("Updated role template '{}' (id={})", template.getName(), id);
        return ResponseEntity.ok(toDTO(template));
    }

    @PutMapping("/{id}/permissions")
    @PreAuthorize("@auth.hasPermission('superadmin.manage')")
    public ResponseEntity<RoleTemplateDTO> updateTemplatePermissions(
            @PathVariable Long id,
            @Valid @RequestBody RolePermissionUpdateRequest request) {

        RoleTemplate template = templateRepository.findById(id).orElse(null);
        if (template == null) return ResponseEntity.notFound().build();

        Set<String> assignableCodes = template.getAssignablePermissions().stream()
                .map(Permission::getCode).collect(Collectors.toSet());

        Set<Permission> newPermissions = new HashSet<>();
        for (String code : request.getPermissionCodes()) {
            if (!assignableCodes.isEmpty() && !assignableCodes.contains(code)) continue;
            permissionRepository.findByCode(code).ifPresent(newPermissions::add);
        }

        template.getPermissions().clear();
        template.getPermissions().addAll(newPermissions);
        templateRepository.save(template);

        roleTemplateService.syncTemplateToAllTenants(template.getName());
        authorizationService.evictAllCaches();

        log.info("Updated permissions for template '{}' (id={}): {} permissions",
                template.getName(), id, newPermissions.size());
        return ResponseEntity.ok(toDTO(template));
    }

    @PutMapping("/{id}/assignable-permissions")
    @PreAuthorize("@auth.hasPermission('superadmin.manage')")
    public ResponseEntity<RoleTemplateDTO> updateTemplateAssignablePermissions(
            @PathVariable Long id,
            @Valid @RequestBody RolePermissionUpdateRequest request) {

        RoleTemplate template = templateRepository.findById(id).orElse(null);
        if (template == null) return ResponseEntity.notFound().build();

        Set<Permission> newAssignable = new HashSet<>();
        for (String code : request.getPermissionCodes()) {
            permissionRepository.findByCode(code).ifPresent(newAssignable::add);
        }

        Set<String> newAssignableCodes = newAssignable.stream()
                .map(Permission::getCode).collect(Collectors.toSet());
        Set<Permission> prunedGranted = template.getPermissions().stream()
                .filter(p -> newAssignableCodes.contains(p.getCode()))
                .collect(Collectors.toSet());

        template.getAssignablePermissions().clear();
        template.getAssignablePermissions().addAll(newAssignable);
        template.getPermissions().clear();
        template.getPermissions().addAll(prunedGranted);
        templateRepository.save(template);

        roleTemplateService.syncTemplateToAllTenants(template.getName());
        authorizationService.evictAllCaches();

        log.info("Updated assignable permissions for template '{}' (id={}): pool={}, granted={}",
                template.getName(), id, newAssignable.size(), prunedGranted.size());
        return ResponseEntity.ok(toDTO(template));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("@auth.hasPermission('superadmin.manage')")
    public ResponseEntity<?> deleteTemplate(@PathVariable Long id) {
        RoleTemplate template = templateRepository.findById(id).orElse(null);
        if (template == null) return ResponseEntity.notFound().build();

        templateRepository.delete(template);
        log.info("Deleted role template '{}' (id={})", template.getName(), id);
        return ResponseEntity.ok(Map.of("message", "Role template deleted successfully"));
    }

    // ─── Sync endpoint ────────────────────────────────────────────────

    @PostMapping("/{id}/sync")
    @PreAuthorize("@auth.hasPermission('superadmin.manage')")
    public ResponseEntity<?> syncTemplateTenants(@PathVariable Long id) {
        RoleTemplate template = templateRepository.findById(id).orElse(null);
        if (template == null) return ResponseEntity.notFound().build();

        roleTemplateService.syncTemplateToAllTenants(template.getName());
        authorizationService.evictAllCaches();

        log.info("Manually triggered sync for template '{}' (id={})", template.getName(), id);
        return ResponseEntity.ok(Map.of("message",
                "Template '" + template.getName() + "' synced to all tenant copies"));
    }

    // ─── Mapping helper ───────────────────────────────────────────────

    private RoleTemplateDTO toDTO(RoleTemplate template) {
        List<String> permCodes = template.getPermissions().stream()
                .map(Permission::getCode).sorted().collect(Collectors.toList());
        List<String> assignableCodes = template.getAssignablePermissions().stream()
                .map(Permission::getCode).sorted().collect(Collectors.toList());
        return new RoleTemplateDTO(template.getId(), template.getName(), template.getDescription(),
                template.isActive(), template.getSortOrder(), permCodes, assignableCodes);
    }
}
