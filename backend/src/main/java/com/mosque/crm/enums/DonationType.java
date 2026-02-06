package com.mosque.crm.enums;

/**
 * Types of donations accepted by the mosque.
 */
public enum DonationType {
    /**
     * Obligatory charity (2.5% of wealth)
     */
    ZAKAT,

    /**
     * Voluntary charity
     */
    SADAQAH,

    /**
     * Building fund contribution
     */
    BUILDING_FUND,

    /**
     * Education fund
     */
    EDUCATION_FUND,

    /**
     * Ramadan food program
     */
    RAMADAN_PROGRAM,

    /**
     * General donation
     */
    GENERAL,

    /**
     * Other specific purpose
     */
    OTHER
}
