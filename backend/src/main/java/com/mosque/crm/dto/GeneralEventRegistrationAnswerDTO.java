package com.mosque.crm.dto;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * Read-model of a registrant's answers to one question, used on registration lists,
 * exports and the admin registration table.
 */
public class GeneralEventRegistrationAnswerDTO {

    private Long questionId;
    private String questionLabel;
    private String inputType;
    /** Chosen option ids (single/multi choice) — used to prefill the edit form. */
    private List<Long> optionIds = new ArrayList<>();
    /** The raw free-text answer (FREE_TEXT questions). */
    private String freeText;
    /** The numeric answer value (NUMBER questions). */
    private BigDecimal numericValue;
    /** Chosen option labels, free-text value or number, for display/export. */
    private List<String> values = new ArrayList<>();

    public GeneralEventRegistrationAnswerDTO() {
    }

    public Long getQuestionId() { return questionId; }
    public void setQuestionId(Long questionId) { this.questionId = questionId; }

    public String getQuestionLabel() { return questionLabel; }
    public void setQuestionLabel(String questionLabel) { this.questionLabel = questionLabel; }

    public String getInputType() { return inputType; }
    public void setInputType(String inputType) { this.inputType = inputType; }

    public List<Long> getOptionIds() { return optionIds; }
    public void setOptionIds(List<Long> optionIds) { this.optionIds = optionIds; }

    public String getFreeText() { return freeText; }
    public void setFreeText(String freeText) { this.freeText = freeText; }

    public BigDecimal getNumericValue() { return numericValue; }
    public void setNumericValue(BigDecimal numericValue) { this.numericValue = numericValue; }

    public List<String> getValues() { return values; }
    public void setValues(List<String> values) { this.values = values; }
}
