package com.mosque.crm.liquibase;

import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

import liquibase.exception.DatabaseException;

public class DataGedcomIndividual extends CustomDataTaskChange {

	private String id;
	private String givenName;
	private String surname;
	private String sex;
	private String birthDate;
	private String birthPlace;
	private String deathDate;
	private String deathPlace;
	private String living;

	@Override
	public void handleUpdate() throws DatabaseException, SQLException {
		String query = "select id from gedcom_individuals where id=?";
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
			String update = "update gedcom_individuals set given_name=?, surname=?, sex=?, birth_date=?, " +
					"birth_place=?, death_date=?, death_place=?, living=? where id=?";
			try (PreparedStatement prepareStatement = connection.prepareStatement(update)) {
				setData(prepareStatement, 1, givenName);
				setData(prepareStatement, 2, surname);
				setData(prepareStatement, 3, sex);
				setData(prepareStatement, 4, birthDate);
				setData(prepareStatement, 5, birthPlace);
				setData(prepareStatement, 6, deathDate);
				setData(prepareStatement, 7, deathPlace);
				setData(prepareStatement, 8, toBoolean(living));
				setData(prepareStatement, 9, id);
				prepareStatement.executeUpdate();
			}
		} else {
			String insert = "insert into gedcom_individuals(id, given_name, surname, sex, birth_date, " +
					"birth_place, death_date, death_place, living) values(?,?,?,?,?,?,?,?,?)";
			try (PreparedStatement prepareStatement = connection.prepareStatement(insert)) {
				setData(prepareStatement, 1, id);
				setData(prepareStatement, 2, givenName);
				setData(prepareStatement, 3, surname);
				setData(prepareStatement, 4, sex);
				setData(prepareStatement, 5, birthDate);
				setData(prepareStatement, 6, birthPlace);
				setData(prepareStatement, 7, deathDate);
				setData(prepareStatement, 8, deathPlace);
				setData(prepareStatement, 9, toBoolean(living));
				prepareStatement.executeUpdate();
			}
		}
	}

	private Boolean toBoolean(String value) {
		if (value == null || value.trim().isEmpty()) {
			return null;
		}
		return Boolean.parseBoolean(value.trim());
	}

	// Getters and Setters
	public String getId() { return id; }
	public void setId(String id) { this.id = id; }

	public String getGivenName() { return givenName; }
	public void setGivenName(String givenName) { this.givenName = givenName; }

	public String getSurname() { return surname; }
	public void setSurname(String surname) { this.surname = surname; }

	public String getSex() { return sex; }
	public void setSex(String sex) { this.sex = sex; }

	public String getBirthDate() { return birthDate; }
	public void setBirthDate(String birthDate) { this.birthDate = birthDate; }

	public String getBirthPlace() { return birthPlace; }
	public void setBirthPlace(String birthPlace) { this.birthPlace = birthPlace; }

	public String getDeathDate() { return deathDate; }
	public void setDeathDate(String deathDate) { this.deathDate = deathDate; }

	public String getDeathPlace() { return deathPlace; }
	public void setDeathPlace(String deathPlace) { this.deathPlace = deathPlace; }

	public String getLiving() { return living; }
	public void setLiving(String living) { this.living = living; }
}
