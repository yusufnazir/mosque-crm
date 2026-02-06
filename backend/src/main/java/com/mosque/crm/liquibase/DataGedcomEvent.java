package com.mosque.crm.liquibase;

import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

import liquibase.exception.DatabaseException;

public class DataGedcomEvent extends CustomDataTaskChange {

	private String id;
	private String type;
	private String date;
	private String place;
	private String description;
	private String familyId;

	@Override
	public void handleUpdate() throws DatabaseException, SQLException {
		String query = "select id from gedcom_events where id=?";
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
			String update = "update gedcom_events set type=?, date=?, place=?, description=?, family_id=? where id=?";
			try (PreparedStatement prepareStatement = connection.prepareStatement(update)) {
				setData(prepareStatement, 1, type);
				setData(prepareStatement, 2, date);
				setData(prepareStatement, 3, place);
				setData(prepareStatement, 4, description);
				setData(prepareStatement, 5, familyId);
				setData(prepareStatement, 6, toLong(id));
				prepareStatement.executeUpdate();
			}
		} else {
			String insert = "insert into gedcom_events(id, type, date, place, description, family_id) values(?,?,?,?,?,?)";
			try (PreparedStatement prepareStatement = connection.prepareStatement(insert)) {
				setData(prepareStatement, 1, toLong(id));
				setData(prepareStatement, 2, type);
				setData(prepareStatement, 3, date);
				setData(prepareStatement, 4, place);
				setData(prepareStatement, 5, description);
				setData(prepareStatement, 6, familyId);
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

	public String getType() { return type; }
	public void setType(String type) { this.type = type; }

	public String getDate() { return date; }
	public void setDate(String date) { this.date = date; }

	public String getPlace() { return place; }
	public void setPlace(String place) { this.place = place; }

	public String getDescription() { return description; }
	public void setDescription(String description) { this.description = description; }

	public String getFamilyId() { return familyId; }
	public void setFamilyId(String familyId) { this.familyId = familyId; }
}
