package com.mosque.crm.repository;

import com.mosque.crm.entity.DocumentLink;
import com.mosque.crm.enums.DocumentLinkedEntityType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DocumentLinkRepository extends JpaRepository<DocumentLink, Long> {

    List<DocumentLink> findByDocumentId(Long documentId);

    List<DocumentLink> findByOrganizationIdAndEntityTypeAndEntityId(Long organizationId, DocumentLinkedEntityType entityType, Long entityId);

    Optional<DocumentLink> findByDocumentIdAndEntityTypeAndEntityId(Long documentId, DocumentLinkedEntityType entityType, Long entityId);
}
