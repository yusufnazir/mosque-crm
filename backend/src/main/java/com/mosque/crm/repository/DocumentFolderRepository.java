package com.mosque.crm.repository;

import com.mosque.crm.entity.DocumentFolder;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DocumentFolderRepository extends JpaRepository<DocumentFolder, Long> {

    List<DocumentFolder> findByOrganizationIdAndParentFolderIdIsNull(Long organizationId);

    List<DocumentFolder> findByOrganizationIdAndParentFolderId(Long organizationId, Long parentFolderId);
}
