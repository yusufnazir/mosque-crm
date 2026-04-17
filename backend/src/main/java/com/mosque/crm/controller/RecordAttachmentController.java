package com.mosque.crm.controller;

import com.mosque.crm.dto.DocumentLinkCreateDTO;
import com.mosque.crm.dto.DocumentLinkDTO;
import com.mosque.crm.dto.DocumentQuotaDTO;
import com.mosque.crm.entity.User;
import com.mosque.crm.multitenancy.TenantContext;
import com.mosque.crm.repository.UserRepository;
import com.mosque.crm.service.DocumentQuotaService;
import com.mosque.crm.service.DocumentService;
import com.mosque.crm.subscription.FeatureKeys;
import com.mosque.crm.subscription.PlanFeatureRequired;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@PlanFeatureRequired(FeatureKeys.DOCUMENT_MANAGEMENT)
@RestController
@RequestMapping("/record-attachments")
public class RecordAttachmentController {

    private static final Logger log = LoggerFactory.getLogger(RecordAttachmentController.class);

    private final DocumentService documentService;
    private final DocumentQuotaService documentQuotaService;
    private final UserRepository userRepository;

    public RecordAttachmentController(DocumentService documentService,
                                      DocumentQuotaService documentQuotaService,
                                      UserRepository userRepository) {
        this.documentService = documentService;
        this.documentQuotaService = documentQuotaService;
        this.userRepository = userRepository;
    }

    @GetMapping
    public ResponseEntity<List<DocumentLinkDTO>> getLinksForEntity(
        @RequestParam String entityType,
        @RequestParam Long entityId
    ) {
        return ResponseEntity.ok(documentService.getLinksForEntity(entityType, entityId));
    }

    @PostMapping
    public ResponseEntity<DocumentLinkDTO> linkDocument(@RequestBody DocumentLinkCreateDTO dto) {
        User currentUser = getCurrentUser();
        if (currentUser == null) return ResponseEntity.status(401).build();
        return ResponseEntity.ok(documentService.linkDocument(dto, currentUser.getId()));
    }

    @DeleteMapping("/{linkId}")
    public ResponseEntity<Void> removeLink(@PathVariable Long linkId) {
        User currentUser = getCurrentUser();
        if (currentUser == null) return ResponseEntity.status(401).build();
        documentService.removeLink(linkId, currentUser.getId());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/quota")
    public ResponseEntity<DocumentQuotaDTO> getQuota() {
        Long orgId = TenantContext.getCurrentOrganizationId();
        return ResponseEntity.ok(documentQuotaService.getQuotaDTO(orgId));
    }

    private User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || "anonymousUser".equals(authentication.getName())) return null;
        return userRepository.findByUsername(authentication.getName()).orElse(null);
    }
}
