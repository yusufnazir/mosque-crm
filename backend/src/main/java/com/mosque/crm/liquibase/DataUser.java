package com.mosque.crm.liquibase;

import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

import liquibase.exception.DatabaseException;

public class DataUser extends CustomDataTaskChange {

	private String id;
	private String username;
	private String password;
	private String email;
	private String accountEnabled;
	private String accountLocked;
	private String credentialsExpired;

	@Override
	public void handleUpdate() throws DatabaseException, SQLException {
		String query = "select id from users where id=?";
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
			String update = "update users set username=?, password=?, email=?, " +
					"account_enabled=?, account_locked=?, credentials_expired=? where id=?";
			try (PreparedStatement prepareStatement = connection.prepareStatement(update)) {
				setData(prepareStatement, 1, username);
				setData(prepareStatement, 2, password);
				setData(prepareStatement, 3, email);
				setData(prepareStatement, 4, toBoolean(accountEnabled));
				setData(prepareStatement, 5, toBoolean(accountLocked));
				setData(prepareStatement, 6, toBoolean(credentialsExpired));
				setData(prepareStatement, 7, toLong(id));
				prepareStatement.executeUpdate();
			}
		} else {
			String insert = "insert into users(id, username, password, email, " +
					"account_enabled, account_locked, credentials_expired) " +
					"values(?,?,?,?,?,?,?)";
			try (PreparedStatement prepareStatement = connection.prepareStatement(insert)) {
				setData(prepareStatement, 1, toLong(id));
				setData(prepareStatement, 2, username);
				setData(prepareStatement, 3, password);
				setData(prepareStatement, 4, email);
				setData(prepareStatement, 5, toBoolean(accountEnabled));
				setData(prepareStatement, 6, toBoolean(accountLocked));
				setData(prepareStatement, 7, toBoolean(credentialsExpired));
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
			return null;
		}
		return Boolean.parseBoolean(value.trim());
	}

	// Getters and Setters
	public String getId() {
		return id;
	}

	public void setId(String id) {
		this.id = id;
	}

	public String getUsername() {
		return username;
	}

	public void setUsername(String username) {
		this.username = username;
	}

	public String getPassword() {
		return password;
	}

	public void setPassword(String password) {
		this.password = password;
	}

	public String getEmail() {
		return email;
	}

	public void setEmail(String email) {
		this.email = email;
	}

	public String getAccountEnabled() {
		return accountEnabled;
	}

	public void setAccountEnabled(String accountEnabled) {
		this.accountEnabled = accountEnabled;
	}

	public String getAccountLocked() {
		return accountLocked;
	}

	public void setAccountLocked(String accountLocked) {
		this.accountLocked = accountLocked;
	}

	public String getCredentialsExpired() {
		return credentialsExpired;
	}

	public void setCredentialsExpired(String credentialsExpired) {
		this.credentialsExpired = credentialsExpired;
	}
}
