package com.mosque.crm.repository;

import com.mosque.crm.entity.DocumentComment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DocumentCommentRepository extends JpaRepository<DocumentComment, Long> {

    List<DocumentComment> findByDocumentIdAndParentCommentIdIsNullOrderByCreatedAtAsc(Long documentId);

    List<DocumentComment> findByDocumentIdAndParentCommentIdOrderByCreatedAtAsc(Long documentId, Long parentCommentId);
}
