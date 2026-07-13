package com.mosque.crm.dto;

/**
 * General event enriched with organization attribution for federation views.
 */
public class FederatedGeneralEventDTO extends GeneralEventDTO {

    private String hostedByOrganizationName;
    private String hostedByOrganizationHandle;
    private Boolean federationHidden;
    private String federationHiddenReason;

    public String getHostedByOrganizationName() { return hostedByOrganizationName; }
    public void setHostedByOrganizationName(String hostedByOrganizationName) {
        this.hostedByOrganizationName = hostedByOrganizationName;
    }

    public String getHostedByOrganizationHandle() { return hostedByOrganizationHandle; }
    public void setHostedByOrganizationHandle(String hostedByOrganizationHandle) {
        this.hostedByOrganizationHandle = hostedByOrganizationHandle;
    }

    public Boolean getFederationHidden() { return federationHidden; }
    public void setFederationHidden(Boolean federationHidden) { this.federationHidden = federationHidden; }

    public String getFederationHiddenReason() { return federationHiddenReason; }
    public void setFederationHiddenReason(String federationHiddenReason) {
        this.federationHiddenReason = federationHiddenReason;
    }
}
