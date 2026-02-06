package com.mosque.crm.dto;

import java.util.List;

/**
 * Response DTO for genealogy graph rendering.
 * Contains nodes (PERSON and FAMILY) and edges for d3-dag visualization.
 */
public class GenealogyGraphDTO {
    private List<GenealogyNodeDTO> nodes;
    private List<GenealogyEdgeDTO> edges;

    public GenealogyGraphDTO() {
    }

    public GenealogyGraphDTO(List<GenealogyNodeDTO> nodes, List<GenealogyEdgeDTO> edges) {
        this.nodes = nodes;
        this.edges = edges;
    }

    public List<GenealogyNodeDTO> getNodes() {
        return nodes;
    }

    public void setNodes(List<GenealogyNodeDTO> nodes) {
        this.nodes = nodes;
    }

    public List<GenealogyEdgeDTO> getEdges() {
        return edges;
    }

    public void setEdges(List<GenealogyEdgeDTO> edges) {
        this.edges = edges;
    }
}
