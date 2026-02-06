package com.mosque.crm.entity.gedcom;

// Lombok removed. Explicit getters/setters/constructors below.
import java.time.LocalDate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Family (FAM) - Represents a relationship unit in GEDCOM format.
 *
 * A family represents:
 * - A marriage/partnership between two individuals
 * - A parent-child relationship unit
 * - Can exist even with only one parent (single parent families)
 *
 * GEDCOM RULES:
 * - A person may belong to multiple families (remarriage)
 * - Children belong to a Family, not directly to parents
 * - Supports divorce through divorceDate field
 */
@Entity
@Table(name = "gedcom_families")
public class Family {

    @Id
    @Column(name = "id", length = 20)
    private String id;  // GEDCOM xref format: @F1@, @F2@, etc.

    @Column(name = "husband_id", length = 20)
    private String husbandId;  // Reference to Individual.id

    @Column(name = "wife_id", length = 20)
    private String wifeId;  // Reference to Individual.id

    @Column(name = "marriage_date")
    private LocalDate marriageDate;

    @Column(name = "marriage_place", length = 255)
    private String marriagePlace;

    @Column(name = "divorce_date")
    private LocalDate divorceDate;

    @Column(name = "divorce_place", length = 255)
    private String divorcePlace;

    /**
     * Note: To find children of this family, query:
     * FamilyChild where familyId = this.id
     *
     * DO NOT add a children collection here - use join table for flexibility.
     */

    public Family() {}

    public Family(String id, String husbandId, String wifeId, LocalDate marriageDate, String marriagePlace, LocalDate divorceDate, String divorcePlace) {
        this.id = id;
        this.husbandId = husbandId;
        this.wifeId = wifeId;
        this.marriageDate = marriageDate;
        this.marriagePlace = marriagePlace;
        this.divorceDate = divorceDate;
        this.divorcePlace = divorcePlace;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getHusbandId() { return husbandId; }
    public void setHusbandId(String husbandId) { this.husbandId = husbandId; }

    public String getWifeId() { return wifeId; }
    public void setWifeId(String wifeId) { this.wifeId = wifeId; }

    public LocalDate getMarriageDate() { return marriageDate; }
    public void setMarriageDate(LocalDate marriageDate) { this.marriageDate = marriageDate; }

    public String getMarriagePlace() { return marriagePlace; }
    public void setMarriagePlace(String marriagePlace) { this.marriagePlace = marriagePlace; }

    public LocalDate getDivorceDate() { return divorceDate; }
    public void setDivorceDate(LocalDate divorceDate) { this.divorceDate = divorceDate; }

    public String getDivorcePlace() { return divorcePlace; }
    public void setDivorcePlace(String divorcePlace) { this.divorcePlace = divorcePlace; }
}
