package com.mosque.crm.enums;

/**
 * Type of contribution exemption for a member.
 *
 * FULL - Member is fully exempt (pays nothing)
 * FIXED_AMOUNT - Member pays a custom fixed amount instead of the obligation
 * DISCOUNT_AMOUNT - Member gets a fixed amount discount off the obligation
 * DISCOUNT_PERCENTAGE - Member gets a percentage discount off the obligation
 */
public enum ExemptionType {
    FULL,
    FIXED_AMOUNT,
    DISCOUNT_AMOUNT,
    DISCOUNT_PERCENTAGE
}
