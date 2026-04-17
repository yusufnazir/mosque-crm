package com.mosque.crm.dto;

import com.mosque.crm.enums.DocumentStatus;
import com.mosque.crm.enums.DocumentVisibility;

import java.util.List;

public class DocumentDetailDTO extends DocumentDTO {
    private String contentHtml;
    private List<DocumentVersionDTO> versions;
    private List<DocumentShareDTO> shares;
    private List<DocumentCommentDTO> comments;

    public String getContentHtml() { return contentHtml; }
    public void setContentHtml(String contentHtml) { this.contentHtml = contentHtml; }
    public List<DocumentVersionDTO> getVersions() { return versions; }
    public void setVersions(List<DocumentVersionDTO> versions) { this.versions = versions; }
    public List<DocumentShareDTO> getShares() { return shares; }
    public void setShares(List<DocumentShareDTO> shares) { this.shares = shares; }
    public List<DocumentCommentDTO> getComments() { return comments; }
    public void setComments(List<DocumentCommentDTO> comments) { this.comments = comments; }
}
