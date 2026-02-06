package com.mosque.crm.entity.gedcom;

import com.mosque.crm.enums.EntityType;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;

/**
 * NoteLink - Polymorphic link between notes and any entity.
 *
 * Allows notes to be attached to:
 * - Individuals (INDI)
 * - Families (FAM)
 * - Events (EVENT)
 * - Sources (SOUR)
 * - Media (OBJE)
 */
@Entity
@Table(name = "gedcom_note_links")
@Data
public class NoteLink {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "note_id", nullable = false)
    private Long noteId;  // Reference to Note.id

    @Enumerated(EnumType.STRING)
    @Column(name = "entity_type", nullable = false, length = 20)
    private EntityType entityType;

    @Column(name = "entity_id", nullable = false, length = 50)
    private String entityId;  // Polymorphic reference to any entity

    /**
     * Query examples:
     *
     * Get all notes for an individual:
     *   SELECT n.* FROM gedcom_notes n
     *   JOIN gedcom_note_links nl ON n.id = nl.note_id
     *   WHERE nl.entity_type = 'INDI' AND nl.entity_id = '@I5@'
     *
     * Get all notes for a family:
     *   WHERE nl.entity_type = 'FAM' AND nl.entity_id = '@F1@'
     */
}
