package com.mosque.crm.repository;

import com.mosque.crm.entity.DocumentShare;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DocumentShareRepository extends JpaRepository<DocumentShare, Long> {

    List<DocumentShare> findByDocumentId(Long documentId);

    List<DocumentShare> findByDocumentIdAndTargetUserId(Long documentId, Long targetUserId);
}
