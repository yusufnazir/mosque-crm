package com.mosque.crm.dto;

public class UpdateShareSettingDTO {

    private boolean enabled;
    private String shareLevel;

    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }

    public String getShareLevel() { return shareLevel; }
    public void setShareLevel(String shareLevel) { this.shareLevel = shareLevel; }
}
