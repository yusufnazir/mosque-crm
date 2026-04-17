package com.mosque.crm.service;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.mosque.crm.dto.GeneralEventDocumentDTO;
import com.mosque.crm.entity.GeneralEvent;
import com.mosque.crm.entity.GeneralEventDocument;
import com.mosque.crm.entity.GeneralEventSession;
import com.mosque.crm.repository.GeneralEventDocumentRepository;
import com.mosque.crm.repository.GeneralEventRepository;
import com.mosque.crm.repository.GeneralEventSessionRepository;

/**
 * Service for managing documents attached to general events (or specific sessions).
 * Files are stored in S3/MinIO via StorageService; metadata is persisted in the database.
 */
@Service
public class GeneralEventDocumentService {

    private static final Logger log = LoggerFactory.getLogger(GeneralEventDocumentService.class);

    private final GeneralEventDocumentRepository documentRepository;
    private final GeneralEventRepository eventRepository;
    private final GeneralEventSessionRepository sessionRepository;
    private final StorageService storageService;

    public GeneralEventDocumentService(GeneralEventDocumentRepository documentRepository,
                                        GeneralEventRepository eventRepository,
                                        GeneralEventSessionRepository sessionRepository,
                                        StorageService storageService) {
        this.documentRepository = documentRepository;
        this.eventRepository = eventRepository;
        this.sessionRepository = sessionRepository;
        this.storageService = storageService;
    }

    /**
     * Upload a document and link it to an event (and optionally a session).
     *
     * @param eventId     the general event id
     * @param sessionId   optional session id (null = event-level document)
     * @param description optional human-readable label (e.g. "Lesson slides – Week 3")
     * @param file        the uploaded multipart file
     * @param uploadedBy  user id of the uploader
     */
    @Transactional
    public GeneralEventDocumentDTO uploadDocument(Long eventId, Long sessionId, String description,
                                                   MultipartFile file, Long uploadedBy) {
        if (file.isEmpty()) {
            throw new RuntimeException("File is empty");
        }

        GeneralEvent event = eventRepository.findById(eventId)
                .orElseThrow(() -> new RuntimeException("Event not found with id: " + eventId));

        GeneralEventSession session = null;
        if (sessionId != null) {
            session = sessionRepository.findById(sessionId)
                    .orElseThrow(() -> new RuntimeException("Session not found with id: " + sessionId));
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

        String key = "event-documents/" + eventId + "/" + UUID.randomUUID() + extension;

        try {
            storageService.upload(key, file.getInputStream(), file.getContentType(), file.getSize());
        } catch (Exception e) {
            throw new RuntimeException("Failed to upload document: " + e.getMessage(), e);
        }

        GeneralEventDocument doc = new GeneralEventDocument();
        doc.setGeneralEvent(event);
        doc.setSession(session);
        doc.setFileName(originalName);
        doc.setStorageKey(key);
        doc.setContentType(file.getContentType());
        doc.setFileSize(file.getSize());
        doc.setDescription(description != null && !description.isBlank() ? description.trim() : null);
        doc.setUploadedBy(uploadedBy);

        doc = documentRepository.save(doc);
        log.info("Uploaded event document: eventId={}, sessionId={}, file={}, key={}", eventId, sessionId, originalName, key);
        return toDTO(doc);
    }

    /**
     * List all documents for an event, or filter by session when sessionId is provided.
     */
    @Transactional(readOnly = true)
    public List<GeneralEventDocumentDTO> listDocuments(Long eventId, Long sessionId) {
        List<GeneralEventDocument> docs;
        if (sessionId != null) {
            docs = documentRepository.findByGeneralEventIdAndSessionIdOrderByCreatedAtDesc(eventId, sessionId);
        } else {
            docs = documentRepository.findByGeneralEventIdOrderByCreatedAtDesc(eventId);
        }
        return docs.stream().map(this::toDTO).collect(Collectors.toList());
    }

    /**
     * Return the raw entity (for download).
     */
    @Transactional(readOnly = true)
    public GeneralEventDocument getDocumentEntity(Long documentId) {
        return documentRepository.findById(documentId)
                .orElseThrow(() -> new RuntimeException("Document not found with id: " + documentId));
    }

    /**
     * Delete a document from storage and the database.
     */
    @Transactional
    public void deleteDocument(Long documentId) {
        GeneralEventDocument doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new RuntimeException("Document not found with id: " + documentId));

        try {
            storageService.delete(doc.getStorageKey());
        } catch (Exception e) {
            log.warn("Failed to delete document from storage (key={}): {}", doc.getStorageKey(), e.getMessage());
        }

        documentRepository.delete(doc);
        log.info("Deleted event document id={}, eventId={}", documentId, doc.getGeneralEvent().getId());
    }

    private GeneralEventDocumentDTO toDTO(GeneralEventDocument doc) {
        GeneralEventDocumentDTO dto = new GeneralEventDocumentDTO();
        dto.setId(doc.getId());
        dto.setGeneralEventId(doc.getGeneralEvent().getId());
        if (doc.getSession() != null) {
            dto.setSessionId(doc.getSession().getId());
            dto.setSessionName(doc.getSession().getSessionName());
        }
        dto.setFileName(doc.getFileName());
        dto.setContentType(doc.getContentType());
        dto.setFileSize(doc.getFileSize());
        dto.setDescription(doc.getDescription());
        dto.setUploadedBy(doc.getUploadedBy());
        dto.setCreatedAt(doc.getCreatedAt());
        return dto;
    }
}
