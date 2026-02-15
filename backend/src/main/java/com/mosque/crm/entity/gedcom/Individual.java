package com.mosque.crm.entity.gedcom;

// Lombok removed. Explicit getters/setters/constructors below.
import java.time.LocalDate;

import org.hibernate.annotations.Filter;

import com.mosque.crm.enums.GenderEnum;
import com.mosque.crm.multitenancy.MosqueAware;
import com.mosque.crm.multitenancy.MosqueEntityListener;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Individual (INDI) - Represents a person in GEDCOM format.
 *
 * CRITICAL GEDCOM RULES:
 * - NO direct spouse field
 * - NO parent fields
 * - All relationships go through Family and Event entities
 * - ID format compatible with GEDCOM xref (@I1@, @I2@, etc.)
 */
@Entity
@Table(name = "gedcom_individuals")
@Filter(name = "mosqueFilter", condition = "mosque_id = :mosqueId")
@EntityListeners(MosqueEntityListener.class)
public class Individual implements MosqueAware {

    @Id
    @Column(name = "id", length = 20)
    private String id;  // GEDCOM xref format: @I1@, @I2@, etc.

    @Column(name = "given_name", nullable = false, length = 100)
    private String givenName;

    @Column(name = "surname", length = 100)
    private String surname;

    @Enumerated(EnumType.STRING)
    @Column(name = "sex", length = 1)
    private GenderEnum sex;

    @Column(name = "birth_date")
    private LocalDate birthDate;

    @Column(name = "birth_place", length = 255)
    private String birthPlace;

    @Column(name = "death_date")
    private LocalDate deathDate;

    @Column(name = "death_place", length = 255)
    private String deathPlace;

    @Column(name = "living")
    private Boolean living = true;

    @Column(name = "mosque_id")
    private Long mosqueId;

    /**
     * Note: To find relationships, query:
     * - FamilyChild where childId = this.id (to find parents via Family)
     * - Family where husbandId = this.id or wifeId = this.id (to find spouse(s))
     *
     * DO NOT add parent/spouse fields here - it violates GEDCOM model.
     */

    public Individual() {}

    public Individual(String id, String givenName, String surname, GenderEnum sex, LocalDate birthDate, String birthPlace, LocalDate deathDate, String deathPlace, Boolean living) {
        this.id = id;
        this.givenName = givenName;
        this.surname = surname;
        this.sex = sex;
        this.birthDate = birthDate;
        this.birthPlace = birthPlace;
        this.deathDate = deathDate;
        this.deathPlace = deathPlace;
        this.living = living;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getGivenName() { return givenName; }
    public void setGivenName(String givenName) { this.givenName = givenName; }

    public String getSurname() { return surname; }
    public void setSurname(String surname) { this.surname = surname; }

    public GenderEnum getSex() { return sex; }
    public void setSex(GenderEnum sex) { this.sex = sex; }

    public LocalDate getBirthDate() { return birthDate; }
    public void setBirthDate(LocalDate birthDate) { this.birthDate = birthDate; }

    public String getBirthPlace() { return birthPlace; }
    public void setBirthPlace(String birthPlace) { this.birthPlace = birthPlace; }

    public LocalDate getDeathDate() { return deathDate; }
    public void setDeathDate(LocalDate deathDate) { this.deathDate = deathDate; }

    public String getDeathPlace() { return deathPlace; }
    public void setDeathPlace(String deathPlace) { this.deathPlace = deathPlace; }

    public Boolean getLiving() { return living; }
    public void setLiving(Boolean living) { this.living = living; }

    @Override
    public Long getMosqueId() { return mosqueId; }
    @Override
    public void setMosqueId(Long mosqueId) { this.mosqueId = mosqueId; }
}
