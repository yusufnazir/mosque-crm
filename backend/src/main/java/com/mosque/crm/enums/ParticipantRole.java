package com.mosque.crm.enums;

/**
 * Role of an individual in an event.
 * Used in EventParticipant to distinguish principals from witnesses, etc.
 */
public enum ParticipantRole {
    PRINCIPAL,  // Main participant (e.g., person being married, born, etc.)
    WITNESS,    // Witness to the event
    OFFICIANT,  // Person officiating (e.g., clergy)
    CHILD       // Child in a family event (e.g., census)
}
