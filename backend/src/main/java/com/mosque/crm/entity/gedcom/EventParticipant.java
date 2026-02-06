package com.mosque.crm.entity.gedcom;

import com.mosque.crm.enums.ParticipantRole;

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
 * EventParticipant - Join table linking individuals to events.
 *
 * Allows multiple people to participate in a single event:
 * - Marriage: 2 principals (bride and groom)
 * - Birth: 1 principal (child), optionally witnesses/midwife
 * - Census: Many individuals with various roles
 * - Funeral: 1 principal (deceased), many witnesses
 */
@Entity
@Table(name = "gedcom_event_participants")
@Data
public class EventParticipant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "event_id", nullable = false)
    private Long eventId;  // Reference to Event.id

    @Column(name = "individual_id", nullable = false, length = 20)
    private String individualId;  // Reference to Individual.id

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 20)
    private ParticipantRole role;

    /**
     * Query examples:
     *
     * Find all events for a person:
     *   SELECT e.* FROM gedcom_events e
     *   JOIN gedcom_event_participants ep ON e.id = ep.event_id
     *   WHERE ep.individual_id = '@I5@'
     *
     * Find all marriages a person participated in:
     *   SELECT e.* FROM gedcom_events e
     *   JOIN gedcom_event_participants ep ON e.id = ep.event_id
     *   WHERE ep.individual_id = '@I5@'
     *   AND e.type = 'MARR'
     *   AND ep.role = 'PRINCIPAL'
     */
}
