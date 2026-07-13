package com.mosque.crm.dto;

public class OrganizationShareSettingDTO {

    private Long id;
    private Long partnershipId;
    private String moduleKey;
    private boolean enabled;
    private String shareLevel;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getPartnershipId() { return partnershipId; }
    public void setPartnershipId(Long partnershipId) { this.partnershipId = partnershipId; }

    public String getModuleKey() { return moduleKey; }
    public void setModuleKey(String moduleKey) { this.moduleKey = moduleKey; }

    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }

    public String getShareLevel() { return shareLevel; }
    public void setShareLevel(String shareLevel) { this.shareLevel = shareLevel; }
}
