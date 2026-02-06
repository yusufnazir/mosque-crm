package com.mosque.crm.dto;


/**
 * Response DTO for family relationships.
 */
public class RelationshipResponse {

    private String relationshipId;  // Can be familyId or familyChildId
    private Long relatedPersonId;
    private String relatedPersonName;
    private String relationshipType;  // FATHER, MOTHER, SPOUSE, CHILD

    public RelationshipResponse() {
    }

    public RelationshipResponse(String relationshipId, Long relatedPersonId, String relatedPersonName, String relationshipType) {
        this.relationshipId = relationshipId;
        this.relatedPersonId = relatedPersonId;
        this.relatedPersonName = relatedPersonName;
        this.relationshipType = relationshipType;
    }

    public String getRelationshipId() {
        return relationshipId;
    }

    public void setRelationshipId(String relationshipId) {
        this.relationshipId = relationshipId;
    }

    public Long getRelatedPersonId() {
        return relatedPersonId;
    }

    public void setRelatedPersonId(Long relatedPersonId) {
        this.relatedPersonId = relatedPersonId;
    }

    public String getRelatedPersonName() {
        return relatedPersonName;
    }

    public void setRelatedPersonName(String relatedPersonName) {
        this.relatedPersonName = relatedPersonName;
    }

    public String getRelationshipType() {
        return relationshipType;
    }

    public void setRelationshipType(String relationshipType) {
        this.relationshipType = relationshipType;
    }
}
