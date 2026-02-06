package com.mosque.crm.enums;

/**
 * GEDCOM event types.
 * Follows GEDCOM 5.5.1 specification for individual and family events.
 */
public enum EventType {
    // Individual Events
    BIRT,  // Birth
    DEAT,  // Death
    CHR,   // Christening/Naming
    BURI,  // Burial
    CENS,  // Census

    // Family Events
    MARR,  // Marriage
    DIV,   // Divorce
    ANUL,  // Annulment
    ENGA,  // Engagement

    // Other Events
    RESI,  // Residence
    EMIG,  // Emigration
    IMMI,  // Immigration
    NATU,  // Naturalization
    GRAD,  // Graduation
    RETI,  // Retirement
    EVEN   // Generic event
}
