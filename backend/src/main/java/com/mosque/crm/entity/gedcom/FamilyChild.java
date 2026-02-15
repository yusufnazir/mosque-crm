package com.mosque.crm.entity.gedcom;

import com.mosque.crm.enums.RelationshipType;
import com.mosque.crm.multitenancy.MosqueAware;
import com.mosque.crm.multitenancy.MosqueEntityListener;

// Lombok removed. Explicit getters/setters/constructors below.
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.TableGenerator;

import org.hibernate.annotations.Filter;

/**
 * FamilyChild - Join table linking children to families.
 *
 * CRITICAL for GEDCOM compliance:
 * - Children belong to families, not directly to parents
 * - Supports complex relationships (adoption, foster, biological)
 * - Allows for half-siblings (same family, different relationship types)
 * - Birth order tracking within a family
 */
@Entity
@Table(name = "gedcom_family_children")
@Filter(name = "mosqueFilter", condition = "mosque_id = :mosqueId")
@EntityListeners(MosqueEntityListener.class)
public class FamilyChild implements MosqueAware {

    @Id
    @TableGenerator(name = "gedcom_family_children_seq", table = "sequences_", pkColumnName = "PK_NAME", valueColumnName = "PK_VALUE", initialValue = 1000, allocationSize = 1)
    @GeneratedValue(generator = "gedcom_family_children_seq", strategy = GenerationType.TABLE)
    private Long id;

    @Column(name = "family_id", nullable = false, length = 20)
    private String familyId;  // Reference to Family.id

    @Column(name = "child_id", nullable = false, length = 20)
    private String childId;  // Reference to Individual.id

    @Enumerated(EnumType.STRING)
    @Column(name = "relationship_type", nullable = false, length = 20)
    private RelationshipType relationshipType = RelationshipType.BIOLOGICAL;

    @Column(name = "birth_order")
    private Integer birthOrder;  // Optional: order of birth within family

    @Column(name = "mosque_id")
    private Long mosqueId;

    /**
     * Example queries:
     *
     * Find parents of child:
     *   SELECT f.* FROM gedcom_families f
     *   JOIN gedcom_family_children fc ON f.id = fc.family_id
     *   WHERE fc.child_id = '@I5@'
     *
     * Find siblings of child (same family):
     *   SELECT i.* FROM gedcom_individuals i
     *   JOIN gedcom_family_children fc ON i.id = fc.child_id
     *   WHERE fc.family_id = '@F1@' AND fc.child_id != '@I5@'
     */

    public FamilyChild() {}

    public FamilyChild(Long id, String familyId, String childId, RelationshipType relationshipType, Integer birthOrder) {
        this.id = id;
        this.familyId = familyId;
        this.childId = childId;
        this.relationshipType = relationshipType;
        this.birthOrder = birthOrder;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getFamilyId() { return familyId; }
    public void setFamilyId(String familyId) { this.familyId = familyId; }

    public String getChildId() { return childId; }
    public void setChildId(String childId) { this.childId = childId; }

    public RelationshipType getRelationshipType() { return relationshipType; }
    public void setRelationshipType(RelationshipType relationshipType) { this.relationshipType = relationshipType; }

    public Integer getBirthOrder() { return birthOrder; }
    public void setBirthOrder(Integer birthOrder) { this.birthOrder = birthOrder; }

    @Override
    public Long getMosqueId() { return mosqueId; }
    @Override
    public void setMosqueId(Long mosqueId) { this.mosqueId = mosqueId; }
}
