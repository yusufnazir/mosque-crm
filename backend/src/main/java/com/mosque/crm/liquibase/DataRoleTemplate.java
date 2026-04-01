package com.mosque.crm.liquibase;

import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

import liquibase.exception.DatabaseException;

public class DataRoleTemplate extends CustomDataTaskChange {

	private String id;
	private String name;
	private String description;
	private String isActive;
	private String sortOrder;

	@Override
	public void handleUpdate() throws DatabaseException, SQLException {
		String query = "select id from role_templates where id=?";
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
			String update = "update role_templates set name=?, description=?, is_active=?, sort_order=?, updated_at=NOW() where id=?";
			try (PreparedStatement prepareStatement = connection.prepareStatement(update)) {
				setData(prepareStatement, 1, name);
				setData(prepareStatement, 2, description);
				setData(prepareStatement, 3, toBoolean(isActive));
				setData(prepareStatement, 4, toInt(sortOrder));
				setData(prepareStatement, 5, toLong(id));
				prepareStatement.executeUpdate();
			}
		} else {
			String insert = "insert into role_templates(id, name, description, is_active, sort_order, created_at, updated_at) values(?,?,?,?,?,NOW(),NOW())";
			try (PreparedStatement prepareStatement = connection.prepareStatement(insert)) {
				setData(prepareStatement, 1, toLong(id));
				setData(prepareStatement, 2, name);
				setData(prepareStatement, 3, description);
				setData(prepareStatement, 4, toBoolean(isActive));
				setData(prepareStatement, 5, toInt(sortOrder));
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

	private Integer toInt(String value) {
		if (value == null || value.trim().isEmpty()) {
			return null;
		}
		return Integer.parseInt(value.trim());
	}

	private Boolean toBoolean(String value) {
		if (value == null || value.trim().isEmpty()) {
			return Boolean.TRUE;
		}
		return Boolean.parseBoolean(value.trim());
	}

	// Getters and Setters
	public String getId() { return id; }
	public void setId(String id) { this.id = id; }
	public String getName() { return name; }
	public void setName(String name) { this.name = name; }
	public String getDescription() { return description; }
	public void setDescription(String description) { this.description = description; }
	public String getIsActive() { return isActive; }
	public void setIsActive(String isActive) { this.isActive = isActive; }
	public String getSortOrder() { return sortOrder; }
	public void setSortOrder(String sortOrder) { this.sortOrder = sortOrder; }
}
