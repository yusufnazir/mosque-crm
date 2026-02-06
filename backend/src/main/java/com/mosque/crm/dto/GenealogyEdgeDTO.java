package com.mosque.crm.dto;

/**
 * Represents an edge in the genealogy graph.
 * PERSON → FAMILY (parent/spouse)
 * FAMILY → PERSON (child)
 */
public class GenealogyEdgeDTO {
    private String from;
    private String to;

    public GenealogyEdgeDTO() {
    }

    public GenealogyEdgeDTO(String from, String to) {
        this.from = from;
        this.to = to;
    }

    public String getFrom() {
        return from;
    }

    public void setFrom(String from) {
        this.from = from;
    }

    public String getTo() {
        return to;
    }

    public void setTo(String to) {
        this.to = to;
    }
}
