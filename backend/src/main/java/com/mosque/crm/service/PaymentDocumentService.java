package com.mosque.crm.service;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.mosque.crm.dto.PaymentDocumentDTO;
import com.mosque.crm.entity.PaymentDocument;
import com.mosque.crm.repository.PaymentDocumentRepository;

/**
 * Service for managing payment documents.
 * Documents are stored in S3/MinIO via StorageService and tracked in the payment_documents table.
 * Documents are linked to a paymentGroupId, so all payments in a multi-period batch share them.
 */
@Service
public class PaymentDocumentService {

    private static final Logger log = LoggerFactory.getLogger(PaymentDocumentService.class);

    private final PaymentDocumentRepository documentRepository;
    private final StorageService storageService;

    public PaymentDocumentService(PaymentDocumentRepository documentRepository,
                                   StorageService storageService) {
        this.documentRepository = documentRepository;
        this.storageService = storageService;
    }

    /**
     * Upload a document and link it to a payment group.
     */
    @Transactional
    public PaymentDocumentDTO uploadDocument(String paymentGroupId, MultipartFile file) {
        if (file.isEmpty()) {
            throw new RuntimeException("File is empty");
        }

        String originalName = file.getOriginalFilename();
        if (originalName == null || originalName.isBlank()) {
            originalName = "document";
        }

        String extension = "";
        int dotIdx = originalName.lastIndexOf('.');
        if (dotIdx >= 0) {
            extension = originalName.substring(dotIdx);
        }

        String key = "payment-documents/" + paymentGroupId + "/" + UUID.randomUUID() + extension;

        try {
            storageService.upload(key, file.getInputStream(), file.getContentType(), file.getSize());
        } catch (Exception e) {
            throw new RuntimeException("Failed to upload document: " + e.getMessage(), e);
        }

        PaymentDocument doc = new PaymentDocument();
        doc.setPaymentGroupId(paymentGroupId);
        doc.setFileName(originalName);
        doc.setStorageKey(key);
        doc.setContentType(file.getContentType());
        doc.setFileSize(file.getSize());

        doc = documentRepository.save(doc);
        log.info("Uploaded payment document: groupId={}, file={}, key={}", paymentGroupId, originalName, key);
        return convertToDTO(doc);
    }

    /**
     * List all documents for a payment group.
     */
    @Transactional(readOnly = true)
    public List<PaymentDocumentDTO> getDocumentsByGroupId(String paymentGroupId) {
        return documentRepository.findByPaymentGroupId(paymentGroupId).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get a single document by ID (for download).
     */
    @Transactional(readOnly = true)
    public PaymentDocument getDocumentEntity(Long documentId) {
        return documentRepository.findById(documentId)
                .orElseThrow(() -> new RuntimeException("Document not found with id: " + documentId));
    }

    /**
     * Delete a document (from S3 and database).
     */
    @Transactional
    public void deleteDocument(Long documentId) {
        PaymentDocument doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new RuntimeException("Document not found with id: " + documentId));

        try {
            storageService.delete(doc.getStorageKey());
        } catch (Exception e) {
            log.warn("Failed to delete document from storage: {}", e.getMessage());
        }

        documentRepository.delete(doc);
        log.info("Deleted payment document id={}, groupId={}", documentId, doc.getPaymentGroupId());
    }

    /**
     * Count documents for a payment group.
     */
    @Transactional(readOnly = true)
    public int countByGroupId(String paymentGroupId) {
        return documentRepository.countByPaymentGroupId(paymentGroupId);
    }

    private PaymentDocumentDTO convertToDTO(PaymentDocument doc) {
        PaymentDocumentDTO dto = new PaymentDocumentDTO();
        dto.setId(doc.getId());
        dto.setPaymentGroupId(doc.getPaymentGroupId());
        dto.setFileName(doc.getFileName());
        dto.setContentType(doc.getContentType());
        dto.setFileSize(doc.getFileSize());
        dto.setUploadedBy(doc.getUploadedBy());
        dto.setCreatedAt(doc.getCreatedAt());
        return dto;
    }
}
