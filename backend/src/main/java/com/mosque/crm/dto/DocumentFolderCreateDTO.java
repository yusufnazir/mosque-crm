package com.mosque.crm.dto;

import com.mosque.crm.enums.FolderVisibility;

public class DocumentFolderCreateDTO {
    private String name;
    private String description;
    private Long parentFolderId;
    private FolderVisibility visibility;
    private Integer maxFileSizeMb;
    private String allowedMimeTypes;

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public Long getParentFolderId() { return parentFolderId; }
    public void setParentFolderId(Long parentFolderId) { this.parentFolderId = parentFolderId; }
    public FolderVisibility getVisibility() { return visibility; }
    public void setVisibility(FolderVisibility visibility) { this.visibility = visibility; }
    public Integer getMaxFileSizeMb() { return maxFileSizeMb; }
    public void setMaxFileSizeMb(Integer maxFileSizeMb) { this.maxFileSizeMb = maxFileSizeMb; }
    public String getAllowedMimeTypes() { return allowedMimeTypes; }
    public void setAllowedMimeTypes(String allowedMimeTypes) { this.allowedMimeTypes = allowedMimeTypes; }
}
