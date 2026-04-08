package com.mosque.crm.liquibase;

import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

import liquibase.exception.DatabaseException;

public class DataTenantSettingField extends CustomDataTaskChange {

	private String id;
	private String fieldKey;
	private String label;
	private String category;
	private String tenantEditable;
	private String displayOrder;

	@Override
	public void handleUpdate() throws DatabaseException, SQLException {
		String query = "select id from tenant_setting_fields where id=?";
		boolean exists = false;
		try (PreparedStatement prepareStatement = connection.prepareStatement(query)) {
			setData(prepareStatement, 1, toLong(id));
			try (ResultSet resultSet = prepareStatement.executeQuery()) {
				while (resultSet.next()) {
					exists = true;
				}
			}
		}

		if (exists) {
			String update = "update tenant_setting_fields set field_key=?, label=?, category=?, tenant_editable=?, display_order=? where id=?";
			try (PreparedStatement prepareStatement = connection.prepareStatement(update)) {
				setData(prepareStatement, 1, fieldKey);
				setData(prepareStatement, 2, label);
				setData(prepareStatement, 3, category);
				setData(prepareStatement, 4, toBoolean(tenantEditable));
				setData(prepareStatement, 5, toLong(displayOrder));
				setData(prepareStatement, 6, toLong(id));
				prepareStatement.executeUpdate();
			}
		} else {
			String insert = "insert into tenant_setting_fields(id, field_key, label, category, tenant_editable, display_order) values(?,?,?,?,?,?)";
			try (PreparedStatement prepareStatement = connection.prepareStatement(insert)) {
				setData(prepareStatement, 1, toLong(id));
				setData(prepareStatement, 2, fieldKey);
				setData(prepareStatement, 3, label);
				setData(prepareStatement, 4, category);
				setData(prepareStatement, 5, toBoolean(tenantEditable));
				setData(prepareStatement, 6, toLong(displayOrder));
				prepareStatement.executeUpdate();
			}
		}
	}

	private Long toLong(String value) {
		if (value == null || value.trim().isEmpty()) {
			return null;
		}
		return Long.parseLong(value.trim());
	}

	private Boolean toBoolean(String value) {
		if (value == null || value.trim().isEmpty()) {
			return false;
		}
		return Boolean.parseBoolean(value.trim());
	}

	// Getters and Setters
	public String getId() { return id; }
	public void setId(String id) { this.id = id; }
	public String getFieldKey() { return fieldKey; }
	public void setFieldKey(String fieldKey) { this.fieldKey = fieldKey; }
	public String getLabel() { return label; }
	public void setLabel(String label) { this.label = label; }
	public String getCategory() { return category; }
	public void setCategory(String category) { this.category = category; }
	public String getTenantEditable() { return tenantEditable; }
	public void setTenantEditable(String tenantEditable) { this.tenantEditable = tenantEditable; }
	public String getDisplayOrder() { return displayOrder; }
	public void setDisplayOrder(String displayOrder) { this.displayOrder = displayOrder; }
}
