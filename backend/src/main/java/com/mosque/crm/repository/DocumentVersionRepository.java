package com.mosque.crm.repository;

import com.mosque.crm.entity.DocumentVersion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DocumentVersionRepository extends JpaRepository<DocumentVersion, Long> {

    List<DocumentVersion> findByDocumentIdOrderByVersionNumberDesc(Long documentId);
}
