package com.mosque.crm.enums;

/**
 * How a general-event registration question is answered.
 * <ul>
 *   <li>{@code SINGLE_CHOICE} — radio buttons, exactly one option selected</li>
 *   <li>{@code MULTI_CHOICE} — checkboxes, any number of options selected</li>
 *   <li>{@code FREE_TEXT} — a short free-form answer (no options)</li>
 * </ul>
 */
public enum GeneralEventQuestionType {
    SINGLE_CHOICE,
    MULTI_CHOICE,
    FREE_TEXT
}
