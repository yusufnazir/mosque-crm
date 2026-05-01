package com.mosque.crm.repository;

import com.mosque.crm.entity.Document;
import com.mosque.crm.enums.DocumentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface DocumentRepository extends JpaRepository<Document, Long> {

    List<Document> findByOrganizationIdAndFolderIdAndStatusNot(Long organizationId, Long folderId, DocumentStatus status);

    List<Document> findByOrganizationIdAndFolderIdIsNullAndStatusNot(Long organizationId, DocumentStatus status);

    List<Document> findByOrganizationIdAndStatus(Long organizationId, DocumentStatus status);

    @Query("""
        SELECT d
        FROM Document d
        WHERE d.organizationId = :organizationId
          AND d.status <> :excludedStatus
          AND (
              :query IS NULL
              OR LOWER(d.title) LIKE LOWER(CONCAT('%', :query, '%'))
              OR LOWER(COALESCE(d.originalFilename, '')) LIKE LOWER(CONCAT('%', :query, '%'))
          )
        """)
    Page<Document> searchDocuments(
            @Param("organizationId") Long organizationId,
            @Param("excludedStatus") DocumentStatus excludedStatus,
            @Param("query") String query,
            Pageable pageable
    );
}
