package com.mosque.crm.service;

import com.mosque.crm.dto.DocumentAuditEventDTO;
import com.mosque.crm.entity.DocumentAuditEvent;
import com.mosque.crm.enums.DocumentAuditEventType;
import com.mosque.crm.repository.DocumentAuditEventRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class DocumentAuditService {

    private static final Logger log = LoggerFactory.getLogger(DocumentAuditService.class);

    private final DocumentAuditEventRepository auditEventRepository;

    public DocumentAuditService(DocumentAuditEventRepository auditEventRepository) {
        this.auditEventRepository = auditEventRepository;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void record(Long documentId, Long organizationId, DocumentAuditEventType eventType, Long userId, String detail) {
        DocumentAuditEvent event = new DocumentAuditEvent();
        event.setDocumentId(documentId);
        event.setOrganizationId(organizationId);
        event.setEventType(eventType);
        event.setUserId(userId);
        event.setDetail(detail);
        auditEventRepository.save(event);
        log.debug("Audit event {} recorded for document {}", eventType, documentId);
    }

    @Transactional(readOnly = true)
    public List<DocumentAuditEventDTO> getDocumentAuditLog(Long documentId) {
        return auditEventRepository.findByDocumentIdOrderByOccurredAtDesc(documentId)
            .stream().map(this::toDTO).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<DocumentAuditEventDTO> getOrganizationAuditLog(Long organizationId) {
        return auditEventRepository.findByOrganizationIdOrderByOccurredAtDesc(organizationId)
            .stream().map(this::toDTO).collect(Collectors.toList());
    }

    private DocumentAuditEventDTO toDTO(DocumentAuditEvent e) {
        DocumentAuditEventDTO dto = new DocumentAuditEventDTO();
        dto.setId(e.getId());
        dto.setDocumentId(e.getDocumentId());
        dto.setEventType(e.getEventType());
        dto.setUserId(e.getUserId());
        dto.setDetail(e.getDetail());
        dto.setOccurredAt(e.getOccurredAt() != null ? e.getOccurredAt().toString() : null);
        return dto;
    }
}
