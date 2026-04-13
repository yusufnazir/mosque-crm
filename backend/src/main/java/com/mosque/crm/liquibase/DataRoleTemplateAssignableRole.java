package com.mosque.crm.liquibase;

import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

import liquibase.exception.DatabaseException;

public class DataRoleTemplateAssignableRole extends CustomDataTaskChange {

	private String templateId;
	private String assignableTemplateId;

	@Override
	public void handleUpdate() throws DatabaseException, SQLException {
		Long templateIdValue = toLong(templateId);
		Long assignableTemplateIdValue = toLong(assignableTemplateId);

		// Skip invalid seed rows gracefully when referenced templates are absent.
		if (!templateExists(templateIdValue) || !templateExists(assignableTemplateIdValue)) {
			return;
		}

		String query = "select template_id from role_template_assignable_roles where template_id=? and assignable_template_id=?";
		boolean exists = false;
		try (PreparedStatement prepareStatement = connection.prepareStatement(query)) {
			setData(prepareStatement, 1, templateIdValue);
			setData(prepareStatement, 2, assignableTemplateIdValue);
			try (ResultSet resultSet = prepareStatement.executeQuery()) {
				while (resultSet.next()) {
					exists = true;
				}
			}
		}

		if (!exists) {
			String insert = "insert into role_template_assignable_roles(template_id, assignable_template_id) values(?,?)";
			try (PreparedStatement prepareStatement = connection.prepareStatement(insert)) {
				setData(prepareStatement, 1, templateIdValue);
				setData(prepareStatement, 2, assignableTemplateIdValue);
				prepareStatement.executeUpdate();
			}
		}
	}

	private boolean templateExists(Long id) throws DatabaseException, SQLException {
		if (id == null) {
			return false;
		}
		String query = "select id from role_templates where id=?";
		try (PreparedStatement prepareStatement = connection.prepareStatement(query)) {
			setData(prepareStatement, 1, id);
			try (ResultSet resultSet = prepareStatement.executeQuery()) {
				return resultSet.next();
			}
		}
	}

	private Long toLong(String value) {
		if (value == null || value.trim().isEmpty()) {
			return null;
		}
		return Long.parseLong(value.trim());
	}

	// Getters and Setters
	public String getTemplateId() { return templateId; }
	public void setTemplateId(String templateId) { this.templateId = templateId; }
	public String getAssignableTemplateId() { return assignableTemplateId; }
	public void setAssignableTemplateId(String assignableTemplateId) { this.assignableTemplateId = assignableTemplateId; }
}
