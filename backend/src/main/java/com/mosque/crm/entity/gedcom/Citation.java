package com.mosque.crm.entity.gedcom;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;

/**
 * Citation - Links sources to events.
 *
 * Allows multiple sources to cite the same event,
 * and the same source to be cited for multiple events.
 *
 * Example: A census record (1 source) may document
 * multiple people's residence (multiple events).
 */
@Entity
@Table(name = "gedcom_citations")
@Data
public class Citation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "source_id", nullable = false, length = 20)
    private String sourceId;  // Reference to Source.id

    @Column(name = "event_id", nullable = false)
    private Long eventId;  // Reference to Event.id

    @Column(name = "page", length = 100)
    private String page;  // Page number or section reference

    @Column(name = "text", columnDefinition = "TEXT")
    private String text;  // Transcription or extract

    @Column(name = "confidence", length = 20)
    private String confidence;  // HIGH, MEDIUM, LOW - data quality
}
