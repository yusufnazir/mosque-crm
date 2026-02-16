package com.mosque.crm.liquibase;

import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

import liquibase.exception.DatabaseException;

public class DataRoleAssignablePermission extends CustomDataTaskChange {

	private String roleId;
	private String permissionId;

	@Override
	public void handleUpdate() throws DatabaseException, SQLException {
		String query = "select role_id from role_assignable_permissions where role_id=? and permission_id=?";
		boolean exists = false;
		try (PreparedStatement prepareStatement = connection.prepareStatement(query)) {
			setData(prepareStatement, 1, toLong(roleId));
			setData(prepareStatement, 2, toLong(permissionId));
			try (ResultSet resultSet = prepareStatement.executeQuery()) {
				while (resultSet.next()) {
					exists = true;
				}
			}
		}

		if (!exists) {
			String insert = "insert into role_assignable_permissions(role_id, permission_id) values(?,?)";
			try (PreparedStatement prepareStatement = connection.prepareStatement(insert)) {
				setData(prepareStatement, 1, toLong(roleId));
				setData(prepareStatement, 2, toLong(permissionId));
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

	// Getters and Setters
	public String getRoleId() { return roleId; }
	public void setRoleId(String roleId) { this.roleId = roleId; }
	public String getPermissionId() { return permissionId; }
	public void setPermissionId(String permissionId) { this.permissionId = permissionId; }
}
