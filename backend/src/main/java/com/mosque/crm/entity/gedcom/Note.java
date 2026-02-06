package com.mosque.crm.entity.gedcom;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.Data;

/**
 * Note - Represents textual annotations.
 *
 * Can be attached to any entity via NoteLink.
 * Used for:
 * - Research notes
 * - Uncertainties
 * - Story fragments
 * - Data conflicts
 */
@Entity
@Table(name = "gedcom_notes")
@Data
public class Note {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "text", columnDefinition = "TEXT", nullable = false)
    private String text;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "created_by", length = 100)
    private String createdBy;  // User who created the note

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
