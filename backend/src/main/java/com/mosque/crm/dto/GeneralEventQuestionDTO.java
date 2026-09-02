package com.mosque.crm.dto;

import java.util.ArrayList;
import java.util.List;

/**
 * A configurable registration question attached to a general event.
 * <p>
 * {@code inputType} is one of {@code SINGLE_CHOICE}, {@code MULTI_CHOICE}, {@code FREE_TEXT}.
 * Choice questions carry {@code options}; free-text questions do not.
 */
public class GeneralEventQuestionDTO {

    private Long id;
    private String label;
    private String inputType;
    private boolean required;
    private int sortOrder;
    private List<GeneralEventQuestionOptionDTO> options = new ArrayList<>();

    public GeneralEventQuestionDTO() {
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getLabel() { return label; }
    public void setLabel(String label) { this.label = label; }

    public String getInputType() { return inputType; }
    public void setInputType(String inputType) { this.inputType = inputType; }

    public boolean isRequired() { return required; }
    public void setRequired(boolean required) { this.required = required; }

    public int getSortOrder() { return sortOrder; }
    public void setSortOrder(int sortOrder) { this.sortOrder = sortOrder; }

    public List<GeneralEventQuestionOptionDTO> getOptions() { return options; }
    public void setOptions(List<GeneralEventQuestionOptionDTO> options) { this.options = options; }
}
