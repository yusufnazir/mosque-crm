package com.mosque.crm.controller;

import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.mosque.crm.dto.PaymentDocumentDTO;
import com.mosque.crm.entity.PaymentDocument;
import com.mosque.crm.service.PaymentDocumentService;
import com.mosque.crm.service.StorageService;

import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;

/**
 * REST controller for payment document upload, download, listing and deletion.
 * Documents are linked to a payment_group_id, so all payments in a multi-period
 * batch share the same documents.
 */
@RestController
@RequestMapping("/payment-documents")
@CrossOrigin(origins = "*")
public class PaymentDocumentController {

    private static final Logger log = LoggerFactory.getLogger(PaymentDocumentController.class);

    private final PaymentDocumentService documentService;
    private final StorageService storageService;

    public PaymentDocumentController(PaymentDocumentService documentService,
                                      StorageService storageService) {
        this.documentService = documentService;
        this.storageService = storageService;
    }

    /**
     * Upload a document for a payment group.
     */
    @PostMapping("/groups/{groupId}")
    public ResponseEntity<?> uploadDocument(@PathVariable String groupId,
                                             @RequestParam("file") MultipartFile file) {
        try {
            PaymentDocumentDTO doc = documentService.uploadDocument(groupId, file);
            return ResponseEntity.ok(doc);
        } catch (Exception e) {
            log.error("Failed to upload document for group {}: {}", groupId, e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * List all documents for a payment group.
     */
    @GetMapping("/groups/{groupId}")
    public ResponseEntity<List<PaymentDocumentDTO>> listDocuments(@PathVariable String groupId) {
        List<PaymentDocumentDTO> docs = documentService.getDocumentsByGroupId(groupId);
        return ResponseEntity.ok(docs);
    }

    /**
     * Download a specific document by ID.
     */
    @GetMapping("/{documentId}/download")
    public ResponseEntity<?> downloadDocument(@PathVariable Long documentId) {
        try {
            PaymentDocument doc = documentService.getDocumentEntity(documentId);
            ResponseInputStream<GetObjectResponse> response = storageService.download(doc.getStorageKey());
            GetObjectResponse metadata = response.response();

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_TYPE, doc.getContentType() != null ? doc.getContentType() : metadata.contentType())
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + doc.getFileName() + "\"")
                    .body(response.readAllBytes());
        } catch (Exception e) {
            log.error("Failed to download document {}: {}", documentId, e.getMessage());
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Delete a document by ID.
     */
    @DeleteMapping("/{documentId}")
    public ResponseEntity<?> deleteDocument(@PathVariable Long documentId) {
        try {
            documentService.deleteDocument(documentId);
            return ResponseEntity.ok(Map.of("message", "Document deleted"));
        } catch (Exception e) {
            log.error("Failed to delete document {}: {}", documentId, e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
