package com.mosque.crm.liquibase;

import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

import liquibase.exception.DatabaseException;

public class DataUserMemberLink extends CustomDataTaskChange {

	private String id;
	private String userId;
	private String memberId;

	@Override
	public void handleUpdate() throws DatabaseException, SQLException {
		String query = "select id from user_member_link where id=?";
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
			String update = "update user_member_link set user_id=?, member_id=? where id=?";
			try (PreparedStatement prepareStatement = connection.prepareStatement(update)) {
				setData(prepareStatement, 1, toLong(userId));
				setData(prepareStatement, 2, toLong(memberId));
				setData(prepareStatement, 3, toLong(id));
				prepareStatement.executeUpdate();
			}
		} else {
			String insert = "insert into user_member_link(id, user_id, member_id) values(?,?,?)";
			try (PreparedStatement prepareStatement = connection.prepareStatement(insert)) {
				setData(prepareStatement, 1, toLong(id));
				setData(prepareStatement, 2, toLong(userId));
				setData(prepareStatement, 3, toLong(memberId));
				prepareStatement.executeUpdate();
			}
		}
	}

	private Long toLong(String value) {
		if (value == null || value.trim().isEmpty()) {
			return null;
		}

		// If it's a UUID string, convert it to a Long representation
		if (value.contains("-")) { // Likely a UUID
			// Use hash code to convert UUID to Long while maintaining uniqueness
			return Math.abs((long) value.hashCode());
		} else {
			// If it's already a number string, parse it directly
			try {
				return Long.parseLong(value.trim());
			} catch (NumberFormatException e) {
				// If it's not a valid number, use hash code
				return Math.abs((long) value.hashCode());
			}
		}
	}

	// Getters and Setters
	public String getId() {
		return id;
	}

	public void setId(String id) {
		this.id = id;
	}

	public String getUserId() {
		return userId;
	}

	public void setUserId(String userId) {
		this.userId = userId;
	}

	public String getMemberId() {
		return memberId;
	}

	public void setMemberId(String memberId) {
		this.memberId = memberId;
	}
}
