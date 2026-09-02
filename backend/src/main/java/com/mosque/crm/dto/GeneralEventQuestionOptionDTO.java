package com.mosque.crm.dto;

/** A single selectable choice of a registration question (single/multi choice). */
public class GeneralEventQuestionOptionDTO {

    private Long id;
    private String label;
    private int sortOrder;

    public GeneralEventQuestionOptionDTO() {
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getLabel() { return label; }
    public void setLabel(String label) { this.label = label; }

    public int getSortOrder() { return sortOrder; }
    public void setSortOrder(int sortOrder) { this.sortOrder = sortOrder; }
}
