package com.mosque.crm.service;

import com.mosque.crm.dto.DocumentCommentCreateDTO;
import com.mosque.crm.dto.DocumentCommentDTO;
import com.mosque.crm.dto.DocumentCreateDTO;
import com.mosque.crm.dto.DocumentDTO;
import com.mosque.crm.dto.DocumentDetailDTO;
import com.mosque.crm.dto.DocumentDownloadUrlDTO;
import com.mosque.crm.dto.DocumentFolderCreateDTO;
import com.mosque.crm.dto.DocumentFolderDTO;
import com.mosque.crm.dto.DocumentLinkCreateDTO;
import com.mosque.crm.dto.DocumentLinkDTO;
import com.mosque.crm.dto.DocumentShareCreateDTO;
import com.mosque.crm.dto.DocumentShareDTO;
import com.mosque.crm.dto.DocumentVersionDTO;
import com.mosque.crm.dto.RichTextDocumentSaveDTO;
import com.mosque.crm.entity.Document;
import com.mosque.crm.entity.DocumentComment;
import com.mosque.crm.entity.DocumentFolder;
import com.mosque.crm.entity.DocumentLink;
import com.mosque.crm.entity.DocumentShare;
import com.mosque.crm.entity.DocumentVersion;
import com.mosque.crm.enums.DocumentAuditEventType;
import com.mosque.crm.enums.DocumentStatus;
import com.mosque.crm.enums.DocumentType;
import com.mosque.crm.enums.DocumentVisibility;
import com.mosque.crm.enums.FolderVisibility;
import com.mosque.crm.multitenancy.TenantContext;
import com.mosque.crm.repository.DocumentCommentRepository;
import com.mosque.crm.repository.DocumentFolderRepository;
import com.mosque.crm.repository.DocumentLinkRepository;
import com.mosque.crm.repository.DocumentRepository;
import com.mosque.crm.repository.DocumentShareRepository;
import com.mosque.crm.repository.DocumentVersionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class DocumentService {

    private static final Logger log = LoggerFactory.getLogger(DocumentService.class);

    private final DocumentFolderRepository folderRepository;
    private final DocumentRepository documentRepository;
    private final DocumentShareRepository shareRepository;
    private final DocumentVersionRepository versionRepository;
    private final DocumentCommentRepository commentRepository;
    private final DocumentLinkRepository linkRepository;
    private final DocumentAuditService auditService;
    private final DocumentQuotaService quotaService;
    private final StorageService storageService;

    public DocumentService(DocumentFolderRepository folderRepository,
                           DocumentRepository documentRepository,
                           DocumentShareRepository shareRepository,
                           DocumentVersionRepository versionRepository,
                           DocumentCommentRepository commentRepository,
                           DocumentLinkRepository linkRepository,
                           DocumentAuditService auditService,
                           DocumentQuotaService quotaService,
                           StorageService storageService) {
        this.folderRepository = folderRepository;
        this.documentRepository = documentRepository;
        this.shareRepository = shareRepository;
        this.versionRepository = versionRepository;
        this.commentRepository = commentRepository;
        this.linkRepository = linkRepository;
        this.auditService = auditService;
        this.quotaService = quotaService;
        this.storageService = storageService;
    }

    // ==================== Folders ====================

    @Transactional
    public DocumentFolderDTO createFolder(DocumentFolderCreateDTO dto, Long ownerUserId) {
        DocumentFolder folder = new DocumentFolder();
        folder.setName(dto.getName());
        folder.setDescription(dto.getDescription());
        folder.setParentFolderId(dto.getParentFolderId());
        folder.setOwnerUserId(ownerUserId);
        folder.setVisibility(dto.getVisibility() != null ? dto.getVisibility() : FolderVisibility.PRIVATE);
        folder.setMaxFileSizeMb(dto.getMaxFileSizeMb());
        folder.setAllowedMimeTypes(dto.getAllowedMimeTypes());
        return toFolderDTO(folderRepository.save(folder));
    }

    @Transactional
    public DocumentFolderDTO updateFolder(Long id, DocumentFolderCreateDTO dto) {
        DocumentFolder folder = folderRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Folder not found"));
        if (dto.getName() != null) folder.setName(dto.getName());
        if (dto.getDescription() != null) folder.setDescription(dto.getDescription());
        if (dto.getVisibility() != null) folder.setVisibility(dto.getVisibility());
        if (dto.getMaxFileSizeMb() != null) folder.setMaxFileSizeMb(dto.getMaxFileSizeMb());
        if (dto.getAllowedMimeTypes() != null) folder.setAllowedMimeTypes(dto.getAllowedMimeTypes());
        return toFolderDTO(folderRepository.save(folder));
    }

    @Transactional
    public void deleteFolder(Long id) {
        DocumentFolder folder = folderRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Folder not found"));
        folderRepository.delete(folder);
    }

    @Transactional(readOnly = true)
    public List<DocumentFolderDTO> listRootFolders() {
        Long orgId = TenantContext.getCurrentOrganizationId();
        return folderRepository.findByOrganizationIdAndParentFolderIdIsNull(orgId)
            .stream().map(this::toFolderDTO).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<DocumentFolderDTO> listSubFolders(Long parentId) {
        Long orgId = TenantContext.getCurrentOrganizationId();
        return folderRepository.findByOrganizationIdAndParentFolderId(orgId, parentId)
            .stream().map(this::toFolderDTO).collect(Collectors.toList());
    }

    // ==================== Documents (file upload) ====================

    @Transactional
    public DocumentDTO uploadFile(MultipartFile file, DocumentCreateDTO meta, Long ownerUserId) {
        Long orgId = TenantContext.getCurrentOrganizationId();
        quotaService.checkAndIncrementStorage(orgId, file.getSize());

        String storageKey = "orgs/" + orgId + "/documents/" + UUID.randomUUID() + "-" + file.getOriginalFilename();
        try {
            storageService.upload(storageKey, file.getInputStream(), file.getContentType(), file.getSize());
        } catch (IOException e) {
            quotaService.decrementStorage(orgId, file.getSize());
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "File upload failed", e);
        }

        Document doc = new Document();
        doc.setFolderId(meta.getFolderId());
        doc.setTitle(meta.getTitle() != null ? meta.getTitle() : file.getOriginalFilename());
        doc.setDescription(meta.getDescription());
        doc.setDocumentType(DocumentType.FILE);
        doc.setMimeType(file.getContentType());
        doc.setStorageKey(storageKey);
        doc.setFileSize(file.getSize());
        doc.setOriginalFilename(file.getOriginalFilename());
        doc.setStatus(DocumentStatus.PUBLISHED);
        doc.setVisibility(meta.getVisibility() != null ? meta.getVisibility() : DocumentVisibility.PRIVATE);
        doc.setOwnerUserId(ownerUserId);
        doc.setCreatedBy(ownerUserId);
        if (meta.getExpiresAt() != null && !meta.getExpiresAt().isBlank()) {
            doc.setExpiresAt(LocalDateTime.parse(meta.getExpiresAt()));
        }
        Document saved = documentRepository.save(doc);

        // Save initial version snapshot
        saveVersionSnapshot(saved, ownerUserId, null);

        auditService.record(saved.getId(), orgId, DocumentAuditEventType.CREATED, ownerUserId, "File: " + file.getOriginalFilename());
        return toDTO(saved);
    }

    // ==================== Documents (rich text) ====================

    @Transactional
    public DocumentDTO createRichTextDocument(DocumentCreateDTO meta, Long ownerUserId) {
        Long orgId = TenantContext.getCurrentOrganizationId();

        Document doc = new Document();
        doc.setFolderId(meta.getFolderId());
        doc.setTitle(meta.getTitle());
        doc.setDescription(meta.getDescription());
        doc.setDocumentType(DocumentType.RICH_TEXT);
        doc.setStatus(DocumentStatus.DRAFT);
        doc.setVisibility(meta.getVisibility() != null ? meta.getVisibility() : DocumentVisibility.PRIVATE);
        doc.setOwnerUserId(ownerUserId);
        doc.setCreatedBy(ownerUserId);
        if (meta.getExpiresAt() != null && !meta.getExpiresAt().isBlank()) {
            doc.setExpiresAt(LocalDateTime.parse(meta.getExpiresAt()));
        }
        Document saved = documentRepository.save(doc);
        auditService.record(saved.getId(), orgId, DocumentAuditEventType.CREATED, ownerUserId, "Rich text document");
        return toDTO(saved);
    }

    @Transactional
    public DocumentDTO saveRichTextContent(Long id, RichTextDocumentSaveDTO dto, Long userId) {
        Long orgId = TenantContext.getCurrentOrganizationId();
        Document doc = requireDocument(id);
        doc.setContentHtml(dto.getContentHtml());
        doc.setStatus(DocumentStatus.PUBLISHED);
        doc.setVersionCount(doc.getVersionCount() + 1);
        Document saved = documentRepository.save(doc);

        // Save version snapshot
        DocumentVersion version = new DocumentVersion();
        version.setDocumentId(saved.getId());
        version.setOrganizationId(orgId);
        version.setVersionNumber(saved.getVersionCount());
        version.setContentHtml(dto.getContentHtml());
        version.setChangeNote(dto.getChangeNote());
        version.setChangedByUserId(userId);
        versionRepository.save(version);

        auditService.record(saved.getId(), orgId, DocumentAuditEventType.UPDATED, userId, dto.getChangeNote());
        return toDTO(saved);
    }

    // ==================== Document CRUD ====================

    @Transactional(readOnly = true)
    public DocumentDetailDTO getDocument(Long id, Long userId) {
        Document doc = requireDocument(id);
        Long orgId = TenantContext.getCurrentOrganizationId();
        auditService.record(id, orgId, DocumentAuditEventType.VIEWED, userId, null);
        DocumentDetailDTO dto = toDetailDTO(doc);
        dto.setVersions(versionRepository.findByDocumentIdOrderByVersionNumberDesc(id)
            .stream().map(this::toVersionDTO).collect(Collectors.toList()));
        dto.setShares(shareRepository.findByDocumentId(id)
            .stream().map(this::toShareDTO).collect(Collectors.toList()));
        dto.setComments(commentRepository.findByDocumentIdAndParentCommentIdIsNullOrderByCreatedAtAsc(id)
            .stream().map(this::toCommentDTO).collect(Collectors.toList()));
        return dto;
    }

    @Transactional(readOnly = true)
    public List<DocumentDTO> listDocumentsInFolder(Long folderId) {
        Long orgId = TenantContext.getCurrentOrganizationId();
        return documentRepository.findByOrganizationIdAndFolderIdAndStatusNot(orgId, folderId, DocumentStatus.TRASHED)
            .stream().map(this::toDTO).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<DocumentDTO> listRootDocuments() {
        Long orgId = TenantContext.getCurrentOrganizationId();
        return documentRepository.findByOrganizationIdAndFolderIdIsNullAndStatusNot(orgId, DocumentStatus.TRASHED)
            .stream().map(this::toDTO).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<DocumentDTO> listTrash() {
        Long orgId = TenantContext.getCurrentOrganizationId();
        return documentRepository.findByOrganizationIdAndStatus(orgId, DocumentStatus.TRASHED)
            .stream().map(this::toDTO).collect(Collectors.toList());
    }

    @Transactional
    public DocumentDTO updateDocument(Long id, DocumentCreateDTO dto, Long userId) {
        Long orgId = TenantContext.getCurrentOrganizationId();
        Document doc = requireDocument(id);
        if (dto.getTitle() != null) doc.setTitle(dto.getTitle());
        if (dto.getDescription() != null) doc.setDescription(dto.getDescription());
        if (dto.getVisibility() != null) doc.setVisibility(dto.getVisibility());
        if (dto.getFolderId() != null) doc.setFolderId(dto.getFolderId());
        if (dto.getExpiresAt() != null && !dto.getExpiresAt().isBlank()) {
            doc.setExpiresAt(LocalDateTime.parse(dto.getExpiresAt()));
        }
        Document saved = documentRepository.save(doc);
        auditService.record(saved.getId(), orgId, DocumentAuditEventType.UPDATED, userId, "Metadata update");
        return toDTO(saved);
    }

    @Transactional
    public void trashDocument(Long id, Long userId) {
        Long orgId = TenantContext.getCurrentOrganizationId();
        Document doc = requireDocument(id);
        doc.setStatus(DocumentStatus.TRASHED);
        doc.setDeletedAt(LocalDateTime.now());
        doc.setDeletedBy(userId);
        documentRepository.save(doc);
        auditService.record(id, orgId, DocumentAuditEventType.TRASHED, userId, null);
    }

    @Transactional
    public void restoreDocument(Long id, Long userId) {
        Long orgId = TenantContext.getCurrentOrganizationId();
        Document doc = requireDocument(id);
        doc.setStatus(DocumentStatus.PUBLISHED);
        doc.setDeletedAt(null);
        doc.setDeletedBy(null);
        documentRepository.save(doc);
        auditService.record(id, orgId, DocumentAuditEventType.RESTORED, userId, null);
    }

    @Transactional
    public void permanentDelete(Long id, Long userId) {
        Long orgId = TenantContext.getCurrentOrganizationId();
        Document doc = requireDocument(id);
        if (doc.getStorageKey() != null) {
            try { storageService.delete(doc.getStorageKey()); } catch (Exception e) {
                log.warn("Could not delete storage object {}: {}", doc.getStorageKey(), e.getMessage());
            }
        }
        quotaService.decrementStorage(orgId, doc.getFileSize());
        auditService.record(id, orgId, DocumentAuditEventType.DELETED, userId, null);
        documentRepository.delete(doc);
    }

    // ==================== Download ====================

    @Transactional
    public DocumentDownloadUrlDTO getDownloadUrl(Long id, Long userId) {
        Long orgId = TenantContext.getCurrentOrganizationId();
        Document doc = requireDocument(id);
        if (doc.getDocumentType() != DocumentType.FILE || doc.getStorageKey() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Document has no file to download");
        }
        quotaService.incrementBandwidth(orgId, doc.getFileSize());
        auditService.record(id, orgId, DocumentAuditEventType.DOWNLOADED, userId, null);

        // Build a backend proxy download URL
        String downloadUrl = ServletUriComponentsBuilder.fromCurrentContextPath()
            .path("/api/documents/{id}/download-stream")
            .buildAndExpand(id)
            .toUriString();

        DocumentDownloadUrlDTO dto = new DocumentDownloadUrlDTO();
        dto.setDocumentId(id);
        dto.setDownloadUrl(downloadUrl);
        dto.setFilename(doc.getOriginalFilename());
        dto.setMimeType(doc.getMimeType());
        dto.setFileSize(doc.getFileSize());
        return dto;
    }

    // ==================== Version history ====================

    @Transactional
    public DocumentDTO uploadNewVersion(Long id, MultipartFile file, String changeNote, Long userId) {
        Long orgId = TenantContext.getCurrentOrganizationId();
        Document doc = requireDocument(id);
        if (doc.getDocumentType() != DocumentType.FILE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Version uploads are only for file documents");
        }
        quotaService.checkAndIncrementStorage(orgId, file.getSize());

        String storageKey = "orgs/" + orgId + "/documents/" + UUID.randomUUID() + "-" + file.getOriginalFilename();
        try {
            storageService.upload(storageKey, file.getInputStream(), file.getContentType(), file.getSize());
        } catch (IOException e) {
            quotaService.decrementStorage(orgId, file.getSize());
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "File upload failed", e);
        }

        // Decrement old file size, update doc
        quotaService.decrementStorage(orgId, doc.getFileSize());
        if (doc.getStorageKey() != null) {
            try { storageService.delete(doc.getStorageKey()); } catch (Exception ignored) {}
        }

        doc.setStorageKey(storageKey);
        doc.setFileSize(file.getSize());
        doc.setMimeType(file.getContentType());
        doc.setOriginalFilename(file.getOriginalFilename());
        doc.setVersionCount(doc.getVersionCount() + 1);
        Document saved = documentRepository.save(doc);

        DocumentVersion version = new DocumentVersion();
        version.setDocumentId(saved.getId());
        version.setOrganizationId(orgId);
        version.setVersionNumber(saved.getVersionCount());
        version.setStorageKey(storageKey);
        version.setFileSize(file.getSize());
        version.setChangeNote(changeNote);
        version.setChangedByUserId(userId);
        versionRepository.save(version);

        auditService.record(id, orgId, DocumentAuditEventType.VERSION_ADDED, userId, "Version " + saved.getVersionCount());
        return toDTO(saved);
    }

    // ==================== Sharing ====================

    @Transactional
    public DocumentShareDTO addShare(Long documentId, DocumentShareCreateDTO dto, Long sharedByUserId) {
        Long orgId = TenantContext.getCurrentOrganizationId();
        requireDocument(documentId);
        DocumentShare share = new DocumentShare();
        share.setDocumentId(documentId);
        share.setShareType(dto.getShareType());
        share.setTargetUserId(dto.getTargetUserId());
        share.setTargetRoleId(dto.getTargetRoleId());
        share.setAccessLevel(dto.getAccessLevel());
        share.setSharedByUserId(sharedByUserId);
        if (dto.getExpiresAt() != null && !dto.getExpiresAt().isBlank()) {
            share.setExpiresAt(LocalDateTime.parse(dto.getExpiresAt()));
        }
        DocumentShare saved = shareRepository.save(share);
        auditService.record(documentId, orgId, DocumentAuditEventType.SHARED, sharedByUserId,
            dto.getShareType().name() + " " + (dto.getTargetUserId() != null ? dto.getTargetUserId() : dto.getTargetRoleId()));
        return toShareDTO(saved);
    }

    @Transactional
    public void removeShare(Long shareId, Long userId) {
        DocumentShare share = shareRepository.findById(shareId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Share not found"));
        Long orgId = TenantContext.getCurrentOrganizationId();
        shareRepository.delete(share);
        auditService.record(share.getDocumentId(), orgId, DocumentAuditEventType.UNSHARED, userId, "Share #" + shareId);
    }

    // ==================== Comments ====================

    @Transactional
    public DocumentCommentDTO addComment(Long documentId, DocumentCommentCreateDTO dto, Long authorUserId) {
        Long orgId = TenantContext.getCurrentOrganizationId();
        requireDocument(documentId);
        DocumentComment comment = new DocumentComment();
        comment.setDocumentId(documentId);
        comment.setContent(dto.getContent());
        comment.setAuthorUserId(authorUserId);
        comment.setParentCommentId(dto.getParentCommentId());
        DocumentComment saved = commentRepository.save(comment);
        auditService.record(documentId, orgId, DocumentAuditEventType.COMMENT_ADDED, authorUserId, null);
        return toCommentDTO(saved);
    }

    @Transactional
    public DocumentCommentDTO resolveComment(Long commentId, Long userId) {
        Long orgId = TenantContext.getCurrentOrganizationId();
        DocumentComment comment = commentRepository.findById(commentId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Comment not found"));
        comment.setResolved(true);
        comment.setResolvedByUserId(userId);
        DocumentComment saved = commentRepository.save(comment);
        auditService.record(comment.getDocumentId(), orgId, DocumentAuditEventType.COMMENT_RESOLVED, userId, null);
        return toCommentDTO(saved);
    }

    // ==================== Record attachment links ====================

    @Transactional
    public DocumentLinkDTO linkDocument(DocumentLinkCreateDTO dto, Long userId) {
        Long orgId = TenantContext.getCurrentOrganizationId();
        requireDocument(dto.getDocumentId());
        DocumentLink link = new DocumentLink();
        link.setDocumentId(dto.getDocumentId());
        link.setEntityType(dto.getEntityType());
        link.setEntityId(dto.getEntityId());
        link.setAccessLevelOverride(dto.getAccessLevelOverride());
        link.setLinkedByUserId(userId);
        link.setNote(dto.getNote());
        DocumentLink saved = linkRepository.save(link);
        auditService.record(dto.getDocumentId(), orgId, DocumentAuditEventType.LINK_ADDED, userId,
            dto.getEntityType().name() + "#" + dto.getEntityId());
        return toLinkDTO(saved);
    }

    @Transactional
    public void removeLink(Long linkId, Long userId) {
        DocumentLink link = linkRepository.findById(linkId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Link not found"));
        Long orgId = TenantContext.getCurrentOrganizationId();
        linkRepository.delete(link);
        auditService.record(link.getDocumentId(), orgId, DocumentAuditEventType.LINK_REMOVED, userId, "Link #" + linkId);
    }

    @Transactional(readOnly = true)
    public List<DocumentLinkDTO> getLinksForEntity(String entityTypeStr, Long entityId) {
        Long orgId = TenantContext.getCurrentOrganizationId();
        com.mosque.crm.enums.DocumentLinkedEntityType entityType =
            com.mosque.crm.enums.DocumentLinkedEntityType.valueOf(entityTypeStr.toUpperCase());
        return linkRepository.findByOrganizationIdAndEntityTypeAndEntityId(orgId, entityType, entityId)
            .stream().map(link -> {
                DocumentLinkDTO dto = toLinkDTO(link);
                documentRepository.findById(link.getDocumentId()).ifPresent(doc -> dto.setDocument(toDTO(doc)));
                return dto;
            }).collect(Collectors.toList());
    }

    // ==================== Storage stream (for download) ====================

    public software.amazon.awssdk.core.ResponseInputStream<software.amazon.awssdk.services.s3.model.GetObjectResponse>
        streamDocument(Long id, Long userId) {
        Long orgId = TenantContext.getCurrentOrganizationId();
        Document doc = requireDocument(id);
        if (doc.getDocumentType() != DocumentType.FILE || doc.getStorageKey() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Document has no file to stream");
        }
        auditService.record(id, orgId, DocumentAuditEventType.DOWNLOADED, userId, "stream");
        quotaService.incrementBandwidth(orgId, doc.getFileSize());
        return storageService.download(doc.getStorageKey());
    }

    public Document requireDocumentEntity(Long id) {
        return requireDocument(id);
    }

    // ==================== Helpers ====================

    private Document requireDocument(Long id) {
        return documentRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found"));
    }

    private void saveVersionSnapshot(Document doc, Long userId, String changeNote) {
        Long orgId = doc.getOrganizationId() != null ? doc.getOrganizationId() : TenantContext.getCurrentOrganizationId();
        DocumentVersion version = new DocumentVersion();
        version.setDocumentId(doc.getId());
        version.setOrganizationId(orgId);
        version.setVersionNumber(doc.getVersionCount());
        version.setStorageKey(doc.getStorageKey());
        version.setFileSize(doc.getFileSize());
        version.setChangeNote(changeNote);
        version.setChangedByUserId(userId);
        versionRepository.save(version);
    }

    // ==================== Mappers ====================

    private DocumentFolderDTO toFolderDTO(DocumentFolder f) {
        DocumentFolderDTO dto = new DocumentFolderDTO();
        dto.setId(f.getId());
        dto.setOrganizationId(f.getOrganizationId());
        dto.setName(f.getName());
        dto.setDescription(f.getDescription());
        dto.setParentFolderId(f.getParentFolderId());
        dto.setOwnerUserId(f.getOwnerUserId());
        dto.setVisibility(f.getVisibility());
        dto.setMaxFileSizeMb(f.getMaxFileSizeMb());
        dto.setAllowedMimeTypes(f.getAllowedMimeTypes());
        dto.setCreatedAt(f.getCreatedAt() != null ? f.getCreatedAt().toString() : null);
        dto.setUpdatedAt(f.getUpdatedAt() != null ? f.getUpdatedAt().toString() : null);
        return dto;
    }

    private DocumentDTO toDTO(Document d) {
        DocumentDTO dto = new DocumentDTO();
        dto.setId(d.getId());
        dto.setOrganizationId(d.getOrganizationId());
        dto.setFolderId(d.getFolderId());
        dto.setTitle(d.getTitle());
        dto.setDescription(d.getDescription());
        dto.setDocumentType(d.getDocumentType());
        dto.setMimeType(d.getMimeType());
        dto.setFileSize(d.getFileSize());
        dto.setOriginalFilename(d.getOriginalFilename());
        dto.setStatus(d.getStatus());
        dto.setVisibility(d.getVisibility());
        dto.setOwnerUserId(d.getOwnerUserId());
        dto.setVersionCount(d.getVersionCount());
        dto.setExpiresAt(d.getExpiresAt() != null ? d.getExpiresAt().toString() : null);
        dto.setExpiryNotificationSent(d.isExpiryNotificationSent());
        dto.setDeletedAt(d.getDeletedAt() != null ? d.getDeletedAt().toString() : null);
        dto.setCreatedAt(d.getCreatedAt() != null ? d.getCreatedAt().toString() : null);
        dto.setUpdatedAt(d.getUpdatedAt() != null ? d.getUpdatedAt().toString() : null);
        return dto;
    }

    private DocumentDetailDTO toDetailDTO(Document d) {
        DocumentDetailDTO dto = new DocumentDetailDTO();
        dto.setId(d.getId());
        dto.setOrganizationId(d.getOrganizationId());
        dto.setFolderId(d.getFolderId());
        dto.setTitle(d.getTitle());
        dto.setDescription(d.getDescription());
        dto.setDocumentType(d.getDocumentType());
        dto.setMimeType(d.getMimeType());
        dto.setFileSize(d.getFileSize());
        dto.setOriginalFilename(d.getOriginalFilename());
        dto.setStatus(d.getStatus());
        dto.setVisibility(d.getVisibility());
        dto.setOwnerUserId(d.getOwnerUserId());
        dto.setVersionCount(d.getVersionCount());
        dto.setContentHtml(d.getContentHtml());
        dto.setExpiresAt(d.getExpiresAt() != null ? d.getExpiresAt().toString() : null);
        dto.setExpiryNotificationSent(d.isExpiryNotificationSent());
        dto.setDeletedAt(d.getDeletedAt() != null ? d.getDeletedAt().toString() : null);
        dto.setCreatedAt(d.getCreatedAt() != null ? d.getCreatedAt().toString() : null);
        dto.setUpdatedAt(d.getUpdatedAt() != null ? d.getUpdatedAt().toString() : null);
        return dto;
    }

    private DocumentVersionDTO toVersionDTO(DocumentVersion v) {
        DocumentVersionDTO dto = new DocumentVersionDTO();
        dto.setId(v.getId());
        dto.setDocumentId(v.getDocumentId());
        dto.setVersionNumber(v.getVersionNumber());
        dto.setFileSize(v.getFileSize());
        dto.setChangeNote(v.getChangeNote());
        dto.setChangedByUserId(v.getChangedByUserId());
        dto.setCreatedAt(v.getCreatedAt() != null ? v.getCreatedAt().toString() : null);
        return dto;
    }

    private DocumentShareDTO toShareDTO(DocumentShare s) {
        DocumentShareDTO dto = new DocumentShareDTO();
        dto.setId(s.getId());
        dto.setDocumentId(s.getDocumentId());
        dto.setShareType(s.getShareType());
        dto.setTargetUserId(s.getTargetUserId());
        dto.setTargetRoleId(s.getTargetRoleId());
        dto.setAccessLevel(s.getAccessLevel());
        dto.setSharedByUserId(s.getSharedByUserId());
        dto.setExpiresAt(s.getExpiresAt() != null ? s.getExpiresAt().toString() : null);
        dto.setSharedAt(s.getSharedAt() != null ? s.getSharedAt().toString() : null);
        return dto;
    }

    private DocumentCommentDTO toCommentDTO(DocumentComment c) {
        DocumentCommentDTO dto = new DocumentCommentDTO();
        dto.setId(c.getId());
        dto.setDocumentId(c.getDocumentId());
        dto.setContent(c.getContent());
        dto.setAuthorUserId(c.getAuthorUserId());
        dto.setParentCommentId(c.getParentCommentId());
        dto.setResolved(c.isResolved());
        dto.setResolvedByUserId(c.getResolvedByUserId());
        dto.setCreatedAt(c.getCreatedAt() != null ? c.getCreatedAt().toString() : null);
        dto.setUpdatedAt(c.getUpdatedAt() != null ? c.getUpdatedAt().toString() : null);
        return dto;
    }

    private DocumentLinkDTO toLinkDTO(DocumentLink l) {
        DocumentLinkDTO dto = new DocumentLinkDTO();
        dto.setId(l.getId());
        dto.setDocumentId(l.getDocumentId());
        dto.setEntityType(l.getEntityType());
        dto.setEntityId(l.getEntityId());
        dto.setAccessLevelOverride(l.getAccessLevelOverride());
        dto.setLinkedByUserId(l.getLinkedByUserId());
        dto.setNote(l.getNote());
        dto.setLinkedAt(l.getLinkedAt() != null ? l.getLinkedAt().toString() : null);
        return dto;
    }
}
