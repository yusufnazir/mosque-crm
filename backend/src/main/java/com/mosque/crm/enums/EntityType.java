package com.mosque.crm.enums;

/**
 * Type of entity that can be linked to notes.
 * Used in NoteLink for polymorphic note associations.
 */
public enum EntityType {
    INDI,   // Individual
    FAM,    // Family
    EVENT,  // Event
    SOUR,   // Source
    OBJE    // Media Object
}
