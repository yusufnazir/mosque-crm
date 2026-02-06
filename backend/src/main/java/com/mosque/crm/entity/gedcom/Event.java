package com.mosque.crm.entity.gedcom;

import java.time.LocalDate;

import com.mosque.crm.enums.EventType;

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
 * Event - Represents a genealogical event.
 *
 * GEDCOM treats everything as events:
 * - Birth, death, marriage, divorce
 * - Census, burial, christening
 * - Residence, emigration, naturalization
 *
 * Events are linked to individuals via EventParticipant join table.
 */
@Entity
@Table(name = "gedcom_events")
@Data
public class Event {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 20)
    private EventType type;

    @Column(name = "date")
    private LocalDate date;

    @Column(name = "place", length = 255)
    private String place;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "family_id", length = 20)
    private String familyId;  // Optional: for family events (MARR, DIV)

    /**
     * Usage examples:
     *
     * Birth event: type=BIRT, link to 1 individual (role=PRINCIPAL)
     * Marriage: type=MARR, link to 2 individuals (both role=PRINCIPAL), familyId set
     * Census: type=CENS, link to many individuals (role=PRINCIPAL or CHILD)
     * Death with witnesses: type=DEAT, 1 PRINCIPAL + N WITNESS participants
     */
}
