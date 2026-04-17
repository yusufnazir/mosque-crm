package com.mosque.crm.repository;

import com.mosque.crm.entity.DocumentAuditEvent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DocumentAuditEventRepository extends JpaRepository<DocumentAuditEvent, Long> {

    List<DocumentAuditEvent> findByDocumentIdOrderByOccurredAtDesc(Long documentId);

    List<DocumentAuditEvent> findByOrganizationIdOrderByOccurredAtDesc(Long organizationId);
}
