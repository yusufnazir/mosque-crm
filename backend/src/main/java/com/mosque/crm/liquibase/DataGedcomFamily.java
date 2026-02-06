package com.mosque.crm.liquibase;

import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

import liquibase.exception.DatabaseException;

public class DataGedcomFamily extends CustomDataTaskChange {

	private String id;
	private String husbandId;
	private String wifeId;
	private String marriageDate;
	private String marriagePlace;
	private String divorceDate;
	private String divorcePlace;

	@Override
	public void handleUpdate() throws DatabaseException, SQLException {
		String query = "select id from gedcom_families where id=?";
		boolean exists = false;
		try (PreparedStatement prepareStatement = connection.prepareStatement(query)) {
			setData(prepareStatement, 1, id);
			try (ResultSet resultSet = prepareStatement.executeQuery()) {
				while (resultSet.next()) {
					exists = true;
				}
			}
		}

		if (exists) {
			String update = "update gedcom_families set husband_id=?, wife_id=?, marriage_date=?, " +
					"marriage_place=?, divorce_date=?, divorce_place=? where id=?";
			try (PreparedStatement prepareStatement = connection.prepareStatement(update)) {
				setData(prepareStatement, 1, husbandId);
				setData(prepareStatement, 2, wifeId);
				setData(prepareStatement, 3, marriageDate);
				setData(prepareStatement, 4, marriagePlace);
				setData(prepareStatement, 5, divorceDate);
				setData(prepareStatement, 6, divorcePlace);
				setData(prepareStatement, 7, id);
				prepareStatement.executeUpdate();
			}
		} else {
			String insert = "insert into gedcom_families(id, husband_id, wife_id, marriage_date, " +
					"marriage_place, divorce_date, divorce_place) values(?,?,?,?,?,?,?)";
			try (PreparedStatement prepareStatement = connection.prepareStatement(insert)) {
				setData(prepareStatement, 1, id);
				setData(prepareStatement, 2, husbandId);
				setData(prepareStatement, 3, wifeId);
				setData(prepareStatement, 4, marriageDate);
				setData(prepareStatement, 5, marriagePlace);
				setData(prepareStatement, 6, divorceDate);
				setData(prepareStatement, 7, divorcePlace);
				prepareStatement.executeUpdate();
			}
		}
	}

	// Getters and Setters
	public String getId() { return id; }
	public void setId(String id) { this.id = id; }

	public String getHusbandId() { return husbandId; }
	public void setHusbandId(String husbandId) { this.husbandId = husbandId; }

	public String getWifeId() { return wifeId; }
	public void setWifeId(String wifeId) { this.wifeId = wifeId; }

	public String getMarriageDate() { return marriageDate; }
	public void setMarriageDate(String marriageDate) { this.marriageDate = marriageDate; }

	public String getMarriagePlace() { return marriagePlace; }
	public void setMarriagePlace(String marriagePlace) { this.marriagePlace = marriagePlace; }

	public String getDivorceDate() { return divorceDate; }
	public void setDivorceDate(String divorceDate) { this.divorceDate = divorceDate; }

	public String getDivorcePlace() { return divorcePlace; }
	public void setDivorcePlace(String divorcePlace) { this.divorcePlace = divorcePlace; }
}
