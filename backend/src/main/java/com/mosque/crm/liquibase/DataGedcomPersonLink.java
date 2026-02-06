package com.mosque.crm.liquibase;

import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

import liquibase.exception.DatabaseException;

/**
 * Custom Liquibase task for upserting GEDCOM Person Link data.
 * Links Person records to GEDCOM Individual records for genealogy integration.
 */
public class DataGedcomPersonLink extends CustomDataTaskChange {

	private String id;  // UUID
	private String personId;  // UUID of Person
	private String gedcomIndividualId;  // GEDCOM ID like @I1@
	private String linkedBy;
	private String linkReason;

	@Override
	public void handleUpdate() throws DatabaseException, SQLException {
		// Convert string IDs to Long for database operations
		Long longId = convertStringToLong(id);
		Long longPersonId = convertStringToLong(personId);

		String query = "select id from gedcom_person_links where id=?";
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
			String update = "update gedcom_person_links set person_id=?, gedcom_individual_id=?, " +
					"linked_by=?, link_reason=?, updated_at=NOW() where id=?";
			try (PreparedStatement prepareStatement = connection.prepareStatement(update)) {
				setData(prepareStatement, 1, longPersonId);
				setData(prepareStatement, 2, gedcomIndividualId);
				setData(prepareStatement, 3, linkedBy);
				setData(prepareStatement, 4, linkReason);
				setData(prepareStatement, 5, longId);
				prepareStatement.executeUpdate();
			}
		} else {
			String insert = "insert into gedcom_person_links (id, person_id, gedcom_individual_id, " +
					"linked_by, link_reason, linked_at, updated_at) values (?, ?, ?, ?, ?, NOW(), NOW())";
			try (PreparedStatement prepareStatement = connection.prepareStatement(insert)) {
				setData(prepareStatement, 1, longId);
				setData(prepareStatement, 2, longPersonId);
				setData(prepareStatement, 3, gedcomIndividualId);
				setData(prepareStatement, 4, linkedBy);
				setData(prepareStatement, 5, linkReason);
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

	// Getters and setters
	public String getId() {
		return id;
	}

	public void setId(String id) {
		this.id = id;
	}

	public String getPersonId() {
		return personId;
	}

	public void setPersonId(String personId) {
		this.personId = personId;
	}

	public String getGedcomIndividualId() {
		return gedcomIndividualId;
	}

	public void setGedcomIndividualId(String gedcomIndividualId) {
		this.gedcomIndividualId = gedcomIndividualId;
	}

	public String getLinkedBy() {
		return linkedBy;
	}

	public void setLinkedBy(String linkedBy) {
		this.linkedBy = linkedBy;
	}

	public String getLinkReason() {
		return linkReason;
	}

	public void setLinkReason(String linkReason) {
		this.linkReason = linkReason;
	}
}
