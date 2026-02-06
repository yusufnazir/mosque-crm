package com.mosque.crm.liquibase;

import java.sql.PreparedStatement;
import java.sql.SQLException;

import liquibase.exception.DatabaseException;

public class DataGedcomFamilyChild extends CustomDataTaskChange {

	private String familyId;
	private String childId;
	private String relationshipType;
	private String birthOrder;

	@Override
	public void handleUpdate() throws DatabaseException, SQLException {
		String insert = "insert into gedcom_family_children(family_id, child_id, relationship_type, birth_order) " +
				"values(?,?,?,?)";
		try (PreparedStatement prepareStatement = connection.prepareStatement(insert)) {
			setData(prepareStatement, 1, familyId);
			setData(prepareStatement, 2, childId);
			setData(prepareStatement, 3, relationshipType);
			setData(prepareStatement, 4, toInteger(birthOrder));
			prepareStatement.executeUpdate();
		}
	}

	private Integer toInteger(String value) {
		if (value == null || value.trim().isEmpty()) {
			return null;
		}
		return Integer.parseInt(value.trim());
	}

	// Getters and Setters
	public String getFamilyId() { return familyId; }
	public void setFamilyId(String familyId) { this.familyId = familyId; }

	public String getChildId() { return childId; }
	public void setChildId(String childId) { this.childId = childId; }

	public String getRelationshipType() { return relationshipType; }
	public void setRelationshipType(String relationshipType) { this.relationshipType = relationshipType; }

	public String getBirthOrder() { return birthOrder; }
	public void setBirthOrder(String birthOrder) { this.birthOrder = birthOrder; }
}
