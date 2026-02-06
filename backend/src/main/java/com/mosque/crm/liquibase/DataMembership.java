package com.mosque.crm.liquibase;

import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

import liquibase.exception.DatabaseException;

/**
 * Custom Liquibase task for upserting Membership data.
 * Memberships track mosque membership status for persons.
 */
public class DataMembership extends CustomDataTaskChange {

	private String id;  // UUID
	private String personId;  // FK to persons
	private String membershipType;  // REGULAR, FAMILY, STUDENT, SENIOR, HONORARY
	private String startDate;
	private String endDate;
	private String status;  // ACTIVE, INACTIVE, SUSPENDED
	private String notes;

	@Override
	public void handleUpdate() throws DatabaseException, SQLException {
		// Convert string IDs to Long for database operations
		Long longId = convertStringToLong(id);
		Long longPersonId = convertStringToLong(personId);

		String query = "select id from memberships where id=?";
		boolean exists = false;
		try (PreparedStatement prepareStatement = connection.prepareStatement(query)) {
			setData(prepareStatement, 1, longId);
			try (ResultSet resultSet = prepareStatement.executeQuery()) {
				while (resultSet.next()) {
					exists = true;
				}
			}
		}

		if (exists) {
			String update = "update memberships set person_id=?, membership_type=?, start_date=?, " +
					"end_date=?, status=?, notes=?, updated_at=NOW() where id=?";
			try (PreparedStatement prepareStatement = connection.prepareStatement(update)) {
				setData(prepareStatement, 1, longPersonId);
				setData(prepareStatement, 2, membershipType);
				setData(prepareStatement, 3, startDate);
				setData(prepareStatement, 4, endDate);
				setData(prepareStatement, 5, status);
				setData(prepareStatement, 6, notes);
				setData(prepareStatement, 7, longId);
				prepareStatement.executeUpdate();
			}
		} else {
			String insert = "insert into memberships(id, person_id, membership_type, start_date, " +
					"end_date, status, notes, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())";
			try (PreparedStatement prepareStatement = connection.prepareStatement(insert)) {
				setData(prepareStatement, 1, longId);
				setData(prepareStatement, 2, longPersonId);
				setData(prepareStatement, 3, membershipType);
				setData(prepareStatement, 4, startDate);
				setData(prepareStatement, 5, endDate);
				setData(prepareStatement, 6, status);
				setData(prepareStatement, 7, notes);
				prepareStatement.executeUpdate();
			}
		}
	}

	// Helper method to convert string ID to Long
	private Long convertStringToLong(String id) {
		if (id == null || id.trim().isEmpty()) {
			return null;
		}

		// If it's a UUID string, convert it to a Long representation
		if (id.contains("-")) { // Likely a UUID
			// Use hash code to convert UUID to Long while maintaining uniqueness
			return Math.abs((long) id.hashCode());
		} else {
			// If it's already a number string, parse it directly
			try {
				return Long.parseLong(id);
			} catch (NumberFormatException e) {
				// If it's not a valid number, use hash code
				return Math.abs((long) id.hashCode());
			}
		}
	}

	// Getters and Setters
	public String getId() { return id; }
	public void setId(String id) { this.id = id; }

	public String getPersonId() { return personId; }
	public void setPersonId(String personId) { this.personId = personId; }

	public String getMembershipType() { return membershipType; }
	public void setMembershipType(String membershipType) { this.membershipType = membershipType; }

	public String getStartDate() { return startDate; }
	public void setStartDate(String startDate) { this.startDate = startDate; }

	public String getEndDate() { return endDate; }
	public void setEndDate(String endDate) { this.endDate = endDate; }

	public String getStatus() { return status; }
	public void setStatus(String status) { this.status = status; }

	public String getNotes() { return notes; }
	public void setNotes(String notes) { this.notes = notes; }
}
