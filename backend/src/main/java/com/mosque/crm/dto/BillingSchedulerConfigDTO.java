package com.mosque.crm.dto;

public class BillingSchedulerConfigDTO {

    private boolean enabled;
    private String cron;

    public BillingSchedulerConfigDTO() {
    }

    public BillingSchedulerConfigDTO(boolean enabled, String cron) {
        this.enabled = enabled;
        this.cron = cron;
    }

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public String getCron() {
        return cron;
    }

    public void setCron(String cron) {
        this.cron = cron;
    }
}
