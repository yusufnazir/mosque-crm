package com.mosque.crm.dto;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * A registrant's answer to one registration question (used in create/update payloads).
 * <ul>
 *   <li>SINGLE_CHOICE → {@code optionIds} contains exactly one id</li>
 *   <li>MULTI_CHOICE → {@code optionIds} contains the selected ids</li>
 *   <li>FREE_TEXT → {@code freeText} holds the answer text</li>
 *   <li>NUMBER → {@code numericValue} holds the numeric value</li>
 * </ul>
 */
public class GeneralEventQuestionAnswerDTO {

    private Long questionId;
    private List<Long> optionIds = new ArrayList<>();
    private String freeText;
    private BigDecimal numericValue;

    public GeneralEventQuestionAnswerDTO() {
    }

    public Long getQuestionId() { return questionId; }
    public void setQuestionId(Long questionId) { this.questionId = questionId; }

    public List<Long> getOptionIds() { return optionIds; }
    public void setOptionIds(List<Long> optionIds) { this.optionIds = optionIds; }

    public String getFreeText() { return freeText; }
    public void setFreeText(String freeText) { this.freeText = freeText; }

    public BigDecimal getNumericValue() { return numericValue; }
    public void setNumericValue(BigDecimal numericValue) { this.numericValue = numericValue; }
}
