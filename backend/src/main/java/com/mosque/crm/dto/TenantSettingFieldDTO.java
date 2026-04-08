package com.mosque.crm.dto;

public class TenantSettingFieldDTO {

    private Long id;
    private String fieldKey;
    private String label;
    private String category;
    private boolean tenantEditable;
    private int displayOrder;
    private String currentValue;

    public TenantSettingFieldDTO() {
    }

    public TenantSettingFieldDTO(Long id, String fieldKey, String label, String category, boolean tenantEditable, int displayOrder, String currentValue) {
        this.id = id;
        this.fieldKey = fieldKey;
        this.label = label;
        this.category = category;
        this.tenantEditable = tenantEditable;
        this.displayOrder = displayOrder;
        this.currentValue = currentValue;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getFieldKey() { return fieldKey; }
    public void setFieldKey(String fieldKey) { this.fieldKey = fieldKey; }

    public String getLabel() { return label; }
    public void setLabel(String label) { this.label = label; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public boolean isTenantEditable() { return tenantEditable; }
    public void setTenantEditable(boolean tenantEditable) { this.tenantEditable = tenantEditable; }

    public int getDisplayOrder() { return displayOrder; }
    public void setDisplayOrder(int displayOrder) { this.displayOrder = displayOrder; }

    public String getCurrentValue() { return currentValue; }
    public void setCurrentValue(String currentValue) { this.currentValue = currentValue; }
}
