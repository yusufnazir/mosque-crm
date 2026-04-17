package com.mosque.crm.controller;

import com.mosque.crm.dto.DocumentAuditEventDTO;
import com.mosque.crm.dto.DocumentCommentCreateDTO;
import com.mosque.crm.dto.DocumentCommentDTO;
import com.mosque.crm.dto.DocumentCreateDTO;
import com.mosque.crm.dto.DocumentDTO;
import com.mosque.crm.dto.DocumentDetailDTO;
import com.mosque.crm.dto.DocumentDownloadUrlDTO;
import com.mosque.crm.dto.DocumentShareCreateDTO;
import com.mosque.crm.dto.DocumentShareDTO;
import com.mosque.crm.dto.DocumentVersionDTO;
import com.mosque.crm.dto.RichTextDocumentSaveDTO;
import com.mosque.crm.entity.Document;
import com.mosque.crm.entity.User;
import com.mosque.crm.repository.UserRepository;
import com.mosque.crm.service.DocumentAuditService;
import com.mosque.crm.service.DocumentService;
import com.mosque.crm.subscription.FeatureKeys;
import com.mosque.crm.subscription.PlanFeatureRequired;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;

import java.io.IOException;
import java.util.List;

@PlanFeatureRequired(FeatureKeys.DOCUMENT_MANAGEMENT)
@RestController
@RequestMapping("/documents")
public class DocumentController {

    private static final Logger log = LoggerFactory.getLogger(DocumentController.class);

    private final DocumentService documentService;
    private final DocumentAuditService documentAuditService;
    private final UserRepository userRepository;

    public DocumentController(DocumentService documentService,
                               DocumentAuditService documentAuditService,
                               UserRepository userRepository) {
        this.documentService = documentService;
        this.documentAuditService = documentAuditService;
        this.userRepository = userRepository;
    }

    // ==================== List / Get ====================

    @GetMapping
    public ResponseEntity<List<DocumentDTO>> listDocuments(@RequestParam(required = false) Long folderId) {
        if (folderId != null) {
            return ResponseEntity.ok(documentService.listDocumentsInFolder(folderId));
        }
        return ResponseEntity.ok(documentService.listRootDocuments());
    }

    @GetMapping("/trash")
    public ResponseEntity<List<DocumentDTO>> listTrash() {
        return ResponseEntity.ok(documentService.listTrash());
    }

    @GetMapping("/{id}")
    public ResponseEntity<DocumentDetailDTO> getDocument(@PathVariable Long id) {
        User currentUser = getCurrentUser();
        Long userId = currentUser != null ? currentUser.getId() : null;
        return ResponseEntity.ok(documentService.getDocument(id, userId));
    }

    // ==================== Upload ====================

    @PostMapping("/upload")
    public ResponseEntity<DocumentDTO> uploadFile(
        @RequestParam("file") MultipartFile file,
        @RequestParam(value = "title", required = false) String title,
        @RequestParam(value = "description", required = false) String description,
        @RequestParam(value = "folderId", required = false) Long folderId,
        @RequestParam(value = "visibility", required = false) String visibility
    ) {
        User currentUser = getCurrentUser();
        if (currentUser == null) return ResponseEntity.status(401).build();
        DocumentCreateDTO meta = new DocumentCreateDTO();
        meta.setTitle(title != null ? title : file.getOriginalFilename());
        meta.setDescription(description);
        meta.setFolderId(folderId);
        if (visibility != null) {
            meta.setVisibility(com.mosque.crm.enums.DocumentVisibility.valueOf(visibility.toUpperCase()));
        }
        return ResponseEntity.ok(documentService.uploadFile(file, meta, currentUser.getId()));
    }

    // ==================== Rich text ====================

    @PostMapping("/rich-text")
    public ResponseEntity<DocumentDTO> createRichText(@RequestBody DocumentCreateDTO dto) {
        User currentUser = getCurrentUser();
        if (currentUser == null) return ResponseEntity.status(401).build();
        return ResponseEntity.ok(documentService.createRichTextDocument(dto, currentUser.getId()));
    }

    @PostMapping("/{id}/content")
    public ResponseEntity<DocumentDTO> saveContent(@PathVariable Long id, @RequestBody RichTextDocumentSaveDTO dto) {
        User currentUser = getCurrentUser();
        if (currentUser == null) return ResponseEntity.status(401).build();
        return ResponseEntity.ok(documentService.saveRichTextContent(id, dto, currentUser.getId()));
    }

    // ==================== Metadata ====================

    @PutMapping("/{id}")
    public ResponseEntity<DocumentDTO> updateDocument(@PathVariable Long id, @RequestBody DocumentCreateDTO dto) {
        User currentUser = getCurrentUser();
        if (currentUser == null) return ResponseEntity.status(401).build();
        return ResponseEntity.ok(documentService.updateDocument(id, dto, currentUser.getId()));
    }

    // ==================== Trash / Restore / Delete ====================

    @PostMapping("/{id}/trash")
    public ResponseEntity<Void> trashDocument(@PathVariable Long id) {
        User currentUser = getCurrentUser();
        if (currentUser == null) return ResponseEntity.status(401).build();
        documentService.trashDocument(id, currentUser.getId());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/restore")
    public ResponseEntity<Void> restoreDocument(@PathVariable Long id) {
        User currentUser = getCurrentUser();
        if (currentUser == null) return ResponseEntity.status(401).build();
        documentService.restoreDocument(id, currentUser.getId());
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> permanentDelete(@PathVariable Long id) {
        User currentUser = getCurrentUser();
        if (currentUser == null) return ResponseEntity.status(401).build();
        documentService.permanentDelete(id, currentUser.getId());
        return ResponseEntity.noContent().build();
    }

    // ==================== Download ====================

    @GetMapping("/{id}/download")
    public ResponseEntity<DocumentDownloadUrlDTO> getDownloadUrl(@PathVariable Long id) {
        User currentUser = getCurrentUser();
        Long userId = currentUser != null ? currentUser.getId() : null;
        return ResponseEntity.ok(documentService.getDownloadUrl(id, userId));
    }

    @GetMapping("/{id}/download-stream")
    public ResponseEntity<byte[]> downloadStream(@PathVariable Long id) throws IOException {
        User currentUser = getCurrentUser();
        Long userId = currentUser != null ? currentUser.getId() : null;
        Document doc = documentService.requireDocumentEntity(id);
        ResponseInputStream<GetObjectResponse> stream = documentService.streamDocument(id, userId);
        byte[] bytes = stream.readAllBytes();
        stream.close();
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + doc.getOriginalFilename() + "\"")
            .contentType(doc.getMimeType() != null ? MediaType.parseMediaType(doc.getMimeType()) : MediaType.APPLICATION_OCTET_STREAM)
            .body(bytes);
    }

    // ==================== Versions ====================

    @PostMapping("/{id}/versions")
    public ResponseEntity<DocumentDTO> uploadNewVersion(
        @PathVariable Long id,
        @RequestParam("file") MultipartFile file,
        @RequestParam(value = "changeNote", required = false) String changeNote
    ) {
        User currentUser = getCurrentUser();
        if (currentUser == null) return ResponseEntity.status(401).build();
        return ResponseEntity.ok(documentService.uploadNewVersion(id, file, changeNote, currentUser.getId()));
    }

    // ==================== Shares ====================

    @PostMapping("/{id}/shares")
    public ResponseEntity<DocumentShareDTO> addShare(@PathVariable Long id, @RequestBody DocumentShareCreateDTO dto) {
        User currentUser = getCurrentUser();
        if (currentUser == null) return ResponseEntity.status(401).build();
        return ResponseEntity.ok(documentService.addShare(id, dto, currentUser.getId()));
    }

    @DeleteMapping("/{id}/shares/{shareId}")
    public ResponseEntity<Void> removeShare(@PathVariable Long id, @PathVariable Long shareId) {
        User currentUser = getCurrentUser();
        if (currentUser == null) return ResponseEntity.status(401).build();
        documentService.removeShare(shareId, currentUser.getId());
        return ResponseEntity.noContent().build();
    }

    // ==================== Comments ====================

    @PostMapping("/{id}/comments")
    public ResponseEntity<DocumentCommentDTO> addComment(@PathVariable Long id, @RequestBody DocumentCommentCreateDTO dto) {
        User currentUser = getCurrentUser();
        if (currentUser == null) return ResponseEntity.status(401).build();
        return ResponseEntity.ok(documentService.addComment(id, dto, currentUser.getId()));
    }

    @PostMapping("/{id}/comments/{commentId}/resolve")
    public ResponseEntity<DocumentCommentDTO> resolveComment(@PathVariable Long id, @PathVariable Long commentId) {
        User currentUser = getCurrentUser();
        if (currentUser == null) return ResponseEntity.status(401).build();
        return ResponseEntity.ok(documentService.resolveComment(commentId, currentUser.getId()));
    }

    // ==================== Audit log ====================

    @GetMapping("/{id}/audit")
    public ResponseEntity<List<DocumentAuditEventDTO>> getAuditLog(@PathVariable Long id) {
        return ResponseEntity.ok(documentAuditService.getDocumentAuditLog(id));
    }

    // ==================== Helper ====================

    private User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || "anonymousUser".equals(authentication.getName())) return null;
        return userRepository.findByUsername(authentication.getName()).orElse(null);
    }
}
