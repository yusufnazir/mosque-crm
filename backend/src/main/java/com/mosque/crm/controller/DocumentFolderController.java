package com.mosque.crm.controller;

import com.mosque.crm.dto.DocumentFolderCreateDTO;
import com.mosque.crm.dto.DocumentFolderDTO;
import com.mosque.crm.entity.User;
import com.mosque.crm.repository.UserRepository;
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
@RequestMapping("/document-folders")
public class DocumentFolderController {

    private static final Logger log = LoggerFactory.getLogger(DocumentFolderController.class);

    private final DocumentService documentService;
    private final UserRepository userRepository;

    public DocumentFolderController(DocumentService documentService, UserRepository userRepository) {
        this.documentService = documentService;
        this.userRepository = userRepository;
    }

    @GetMapping
    public ResponseEntity<List<DocumentFolderDTO>> listRootFolders() {
        return ResponseEntity.ok(documentService.listRootFolders());
    }

    @GetMapping("/{id}/subfolders")
    public ResponseEntity<List<DocumentFolderDTO>> listSubFolders(@PathVariable Long id) {
        return ResponseEntity.ok(documentService.listSubFolders(id));
    }

    @PostMapping
    public ResponseEntity<DocumentFolderDTO> createFolder(@RequestBody DocumentFolderCreateDTO dto) {
        User currentUser = getCurrentUser();
        if (currentUser == null) return ResponseEntity.status(401).build();
        return ResponseEntity.ok(documentService.createFolder(dto, currentUser.getId()));
    }

    @PutMapping("/{id}")
    public ResponseEntity<DocumentFolderDTO> updateFolder(@PathVariable Long id, @RequestBody DocumentFolderCreateDTO dto) {
        return ResponseEntity.ok(documentService.updateFolder(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteFolder(@PathVariable Long id) {
        documentService.deleteFolder(id);
        return ResponseEntity.noContent().build();
    }

    private User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || "anonymousUser".equals(authentication.getName())) return null;
        return userRepository.findByUsername(authentication.getName()).orElse(null);
    }
}
