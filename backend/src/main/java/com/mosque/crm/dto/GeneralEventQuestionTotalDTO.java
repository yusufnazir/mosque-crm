package com.mosque.crm.dto;

/** A single option tally entry for a registration question summary. */
public class GeneralEventQuestionTotalDTO {

    private Long optionId;
    private String optionLabel;
    private long count;

    public GeneralEventQuestionTotalDTO() {
    }

    public Long getOptionId() { return optionId; }
    public void setOptionId(Long optionId) { this.optionId = optionId; }

    public String getOptionLabel() { return optionLabel; }
    public void setOptionLabel(String optionLabel) { this.optionLabel = optionLabel; }

    public long getCount() { return count; }
    public void setCount(long count) { this.count = count; }
}
