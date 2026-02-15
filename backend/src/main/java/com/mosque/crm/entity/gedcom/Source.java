package com.mosque.crm.entity.gedcom;

import org.hibernate.annotations.Filter;

import com.mosque.crm.multitenancy.MosqueAware;
import com.mosque.crm.multitenancy.MosqueEntityListener;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;

/**
 * Source (SOUR) - Represents a citation source.
 *
 * Used to document where genealogical information came from:
 * - Birth certificates
 * - Census records
 * - Church records
 * - Family bibles
 * - Interviews
 *
 * Linked to events via Citation join table.
 */
@Entity
@Table(name = "gedcom_sources")
@Filter(name = "mosqueFilter", condition = "mosque_id = :mosqueId")
@EntityListeners(MosqueEntityListener.class)
@Data
public class Source implements MosqueAware {

    @Id
    @Column(name = "id", length = 20)
    private String id;  // GEDCOM xref format: @S1@, @S2@, etc.

    @Column(name = "title", nullable = false, length = 255)
    private String title;

    @Column(name = "author", length = 255)
    private String author;

    @Column(name = "publication", length = 255)
    private String publication;

    @Column(name = "repository", length = 255)
    private String repository;  // Where the source is kept

    @Column(name = "call_number", length = 100)
    private String callNumber;  // Archive/library reference number

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "mosque_id")
    private Long mosqueId;

    @Override
    public Long getMosqueId() {
        return mosqueId;
    }

    @Override
    public void setMosqueId(Long mosqueId) {
        this.mosqueId = mosqueId;
    }
}
