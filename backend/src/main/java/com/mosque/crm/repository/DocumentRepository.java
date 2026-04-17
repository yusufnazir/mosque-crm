package com.mosque.crm.repository;

import com.mosque.crm.entity.Document;
import com.mosque.crm.enums.DocumentStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DocumentRepository extends JpaRepository<Document, Long> {

    List<Document> findByOrganizationIdAndFolderIdAndStatusNot(Long organizationId, Long folderId, DocumentStatus status);

    List<Document> findByOrganizationIdAndFolderIdIsNullAndStatusNot(Long organizationId, DocumentStatus status);

    List<Document> findByOrganizationIdAndStatus(Long organizationId, DocumentStatus status);
}
