package com.mosque.crm.dto;

import java.util.ArrayList;
import java.util.List;

/** Per-question answer summary used by the organizer tally view. */
public class GeneralEventQuestionSummaryDTO {

    private Long questionId;
    private String questionLabel;
    private String inputType;
    /** Number of registrations that answered (non-blank). */
    private long answeredCount;
    private List<GeneralEventQuestionTotalDTO> totals = new ArrayList<>();

    public GeneralEventQuestionSummaryDTO() {
    }

    public Long getQuestionId() { return questionId; }
    public void setQuestionId(Long questionId) { this.questionId = questionId; }

    public String getQuestionLabel() { return questionLabel; }
    public void setQuestionLabel(String questionLabel) { this.questionLabel = questionLabel; }

    public String getInputType() { return inputType; }
    public void setInputType(String inputType) { this.inputType = inputType; }

    public long getAnsweredCount() { return answeredCount; }
    public void setAnsweredCount(long answeredCount) { this.answeredCount = answeredCount; }

    public List<GeneralEventQuestionTotalDTO> getTotals() { return totals; }
    public void setTotals(List<GeneralEventQuestionTotalDTO> totals) { this.totals = totals; }
}
