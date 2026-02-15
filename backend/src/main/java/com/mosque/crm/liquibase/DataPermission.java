package com.mosque.crm.liquibase;

import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

import liquibase.exception.DatabaseException;

public class DataPermission extends CustomDataTaskChange {

	private String id;
	private String code;
	private String description;
	private String category;

	@Override
	public void handleUpdate() throws DatabaseException, SQLException {
		String query = "select id from permissions where id=?";
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
			String update = "update permissions set code=?, description=?, category=? where id=?";
			try (PreparedStatement prepareStatement = connection.prepareStatement(update)) {
				setData(prepareStatement, 1, code);
				setData(prepareStatement, 2, description);
				setData(prepareStatement, 3, category);
				setData(prepareStatement, 4, toLong(id));
				prepareStatement.executeUpdate();
			}
		} else {
			String insert = "insert into permissions(id, code, description, category) values(?,?,?,?)";
			try (PreparedStatement prepareStatement = connection.prepareStatement(insert)) {
				setData(prepareStatement, 1, toLong(id));
				setData(prepareStatement, 2, code);
				setData(prepareStatement, 3, description);
				setData(prepareStatement, 4, category);
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
	public String getId() { return id; }
	public void setId(String id) { this.id = id; }
	public String getCode() { return code; }
	public void setCode(String code) { this.code = code; }
	public String getDescription() { return description; }
	public void setDescription(String description) { this.description = description; }
	public String getCategory() { return category; }
	public void setCategory(String category) { this.category = category; }
}
