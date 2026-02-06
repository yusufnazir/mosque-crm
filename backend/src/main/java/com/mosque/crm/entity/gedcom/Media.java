package com.mosque.crm.entity.gedcom;

import com.mosque.crm.enums.MediaType;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;

/**
 * Media (OBJE) - Represents multimedia objects.
 *
 * Used for:
 * - Photographs
 * - Scanned documents/certificates
 * - Audio recordings (interviews)
 * - Video recordings
 *
 * Can be linked to individuals, families, events via separate link tables.
 */
@Entity
@Table(name = "gedcom_media")
@Data
public class Media {

    @Id
    @Column(name = "id", length = 20)
    private String id;  // GEDCOM xref format: @M1@, @M2@, etc.

    @Column(name = "file_path", nullable = false, length = 500)
    private String filePath;  // Relative or absolute path to media file

    @Column(name = "title", length = 255)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(name = "media_type", nullable = false, length = 20)
    private MediaType mediaType;

    @Column(name = "mime_type", length = 100)
    private String mimeType;  // e.g., image/jpeg, application/pdf

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "file_size")
    private Long fileSize;  // Size in bytes

    /**
     * Note: Link to entities via separate tables:
     * - MediaLink (similar to NoteLink for polymorphic associations)
     *
     * Common usage:
     * - Link to Individual for portraits
     * - Link to Event for event photos (wedding, funeral, etc.)
     * - Link to Source for scanned documents
     */
}
