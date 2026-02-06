package com.mosque.crm.enums;

/**
 * Type of child-to-family relationship.
 * Used in FamilyChild join table to support adoption, foster care, etc.
 */
public enum RelationshipType {
    BIOLOGICAL,  // Natural birth relationship
    ADOPTED,     // Legal adoption
    FOSTER       // Foster care relationship
}
