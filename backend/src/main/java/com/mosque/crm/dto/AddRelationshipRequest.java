package com.mosque.crm.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * Request DTO for adding a family relationship.
 */
public class AddRelationshipRequest {

    @NotNull(message = "Related person ID is required")
    private Long relatedPersonId;

    @NotBlank(message = "Relationship type is required")
    private String relationshipType;  // FATHER, MOTHER, SPOUSE, CHILD

    public Long getRelatedPersonId() {
        return relatedPersonId;
    }

    public void setRelatedPersonId(Long relatedPersonId) {
        this.relatedPersonId = relatedPersonId;
    }

    public String getRelationshipType() {
        return relationshipType;
    }

    public void setRelationshipType(String relationshipType) {
        this.relationshipType = relationshipType;
    }
}
