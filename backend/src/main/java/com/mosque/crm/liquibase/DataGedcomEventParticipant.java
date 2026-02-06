package com.mosque.crm.liquibase;

import java.sql.PreparedStatement;
import java.sql.SQLException;

import liquibase.exception.DatabaseException;

public class DataGedcomEventParticipant extends CustomDataTaskChange {

	private String eventId;
	private String individualId;
	private String role;

	@Override
	public void handleUpdate() throws DatabaseException, SQLException {
		String insert = "insert into gedcom_event_participants(event_id, individual_id, role) values(?,?,?)";
		try (PreparedStatement prepareStatement = connection.prepareStatement(insert)) {
			setData(prepareStatement, 1, toLong(eventId));
			setData(prepareStatement, 2, individualId);
			setData(prepareStatement, 3, role);
			prepareStatement.executeUpdate();
		}
	}

	private Long toLong(String value) {
		if (value == null || value.trim().isEmpty()) {
			return null;
		}
		return Long.parseLong(value.trim());
	}

	// Getters and Setters
	public String getEventId() { return eventId; }
	public void setEventId(String eventId) { this.eventId = eventId; }

	public String getIndividualId() { return individualId; }
	public void setIndividualId(String individualId) { this.individualId = individualId; }

	public String getRole() { return role; }
	public void setRole(String role) { this.role = role; }
}
