package com.mosque.crm.entity;

import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.Filter;
import org.hibernate.annotations.UpdateTimestamp;

import com.mosque.crm.entity.gedcom.Individual;
import com.mosque.crm.multitenancy.MosqueAware;
import com.mosque.crm.multitenancy.MosqueEntityListener;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import jakarta.persistence.TableGenerator;

/**
 * GedcomPersonLink - Optional link between Person and GEDCOM Individual.
 *
 * CRITICAL RULES:
 * - A Person can exist without GEDCOM data
 * - GEDCOM Individual can exist without a Person link
 * - This link is optional and reversible
 * - Deleting GEDCOM data must NOT cascade to Person
 * - One-to-one relationship (one Person → one GEDCOM Individual)
 */
@Entity
@Table(name = "gedcom_person_links")
@Filter(name = "mosqueFilter", condition = "mosque_id = :mosqueId")
@EntityListeners(MosqueEntityListener.class)
public class GedcomPersonLink implements MosqueAware {

    @Id
    @TableGenerator(name = "gedcom_person_links_seq", table = "sequences_", pkColumnName = "PK_NAME", valueColumnName = "PK_VALUE", initialValue = 1000, allocationSize = 1)
    @GeneratedValue(generator = "gedcom_person_links_seq", strategy = GenerationType.TABLE)
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    @OneToOne
    @JoinColumn(name = "person_id", nullable = false, unique = true)
    private Person person;

    @OneToOne
    @JoinColumn(name = "gedcom_individual_id", nullable = false, unique = true)
    private Individual gedcomIndividual;

    @Column(name = "linked_by", length = 100)
    private String linkedBy;

    @Column(name = "link_reason", length = 500)
    private String linkReason;

    @CreationTimestamp
    @Column(name = "linked_at", updatable = false, nullable = false)
    private LocalDateTime linkedAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "mosque_id")
    private Long mosqueId;

    // Constructors
    public GedcomPersonLink() {
    }

    public GedcomPersonLink(Person person, Individual gedcomIndividual) {
        this.person = person;
        this.gedcomIndividual = gedcomIndividual;
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Person getPerson() {
        return person;
    }

    public void setPerson(Person person) {
        this.person = person;
    }

    public Individual getGedcomIndividual() {
        return gedcomIndividual;
    }

    public void setGedcomIndividual(Individual gedcomIndividual) {
        this.gedcomIndividual = gedcomIndividual;
    }

    public String getLinkedBy() {
        return linkedBy;
    }

    public void setLinkedBy(String linkedBy) {
        this.linkedBy = linkedBy;
    }

    public String getLinkReason() {
        return linkReason;
    }

    public void setLinkReason(String linkReason) {
        this.linkReason = linkReason;
    }

    public LocalDateTime getLinkedAt() {
        return linkedAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    @Override
    public Long getMosqueId() {
        return mosqueId;
    }

    @Override
    public void setMosqueId(Long mosqueId) {
        this.mosqueId = mosqueId;
    }
}
