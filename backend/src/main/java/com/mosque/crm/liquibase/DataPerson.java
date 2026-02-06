package com.mosque.crm.liquibase;

import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

import liquibase.exception.DatabaseException;

/**
 * Custom Liquibase task for upserting Person data.
 * Person is the foundational identity layer for all individuals in the system.
 */
public class DataPerson extends CustomDataTaskChange {

	private String id;  // UUID
	private String firstName;
	private String lastName;
	private String gender;
	private String dateOfBirth;
	private String dateOfDeath;
	private String email;
	private String phone;
	private String address;
	private String city;
	private String country;
	private String postalCode;
	private String status;  // ACTIVE, INACTIVE, DECEASED

	@Override
	public void handleUpdate() throws DatabaseException, SQLException {
		// Convert string ID to Long for database operations
		Long longId = convertStringToLong(id);

		String query = "select id from persons where id=?";
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
			String update = "update persons set first_name=?, last_name=?, gender=?, date_of_birth=?, " +
					"date_of_death=?, email=?, phone=?, address=?, city=?, country=?, postal_code=?, " +
					"status=?, updated_at=NOW() where id=?";
			try (PreparedStatement prepareStatement = connection.prepareStatement(update)) {
				setData(prepareStatement, 1, firstName);
				setData(prepareStatement, 2, lastName);
				setData(prepareStatement, 3, gender);
				setData(prepareStatement, 4, dateOfBirth);
				setData(prepareStatement, 5, dateOfDeath);
				setData(prepareStatement, 6, email);
				setData(prepareStatement, 7, phone);
				setData(prepareStatement, 8, address);
				setData(prepareStatement, 9, city);
				setData(prepareStatement, 10, country);
				setData(prepareStatement, 11, postalCode);
				setData(prepareStatement, 12, status);
				setData(prepareStatement, 13, longId);
				prepareStatement.executeUpdate();
			}
		} else {
			String insert = "insert into persons (id, first_name, last_name, gender, date_of_birth, " +
					"date_of_death, email, phone, address, city, country, postal_code, status, " +
					"created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())";
			try (PreparedStatement prepareStatement = connection.prepareStatement(insert)) {
				setData(prepareStatement, 1, longId);
				setData(prepareStatement, 2, firstName);
				setData(prepareStatement, 3, lastName);
				setData(prepareStatement, 4, gender);
				setData(prepareStatement, 5, dateOfBirth);
				setData(prepareStatement, 6, dateOfDeath);
				setData(prepareStatement, 7, email);
				setData(prepareStatement, 8, phone);
				setData(prepareStatement, 9, address);
				setData(prepareStatement, 10, city);
				setData(prepareStatement, 11, country);
				setData(prepareStatement, 12, postalCode);
				setData(prepareStatement, 13, status);
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

	public String getFirstName() {
		return firstName;
	}

	public void setFirstName(String firstName) {
		this.firstName = firstName;
	}

	public String getLastName() {
		return lastName;
	}

	public void setLastName(String lastName) {
		this.lastName = lastName;
	}

	public String getGender() {
		return gender;
	}

	public void setGender(String gender) {
		this.gender = gender;
	}

	public String getDateOfBirth() {
		return dateOfBirth;
	}

	public void setDateOfBirth(String dateOfBirth) {
		this.dateOfBirth = dateOfBirth;
	}

	public String getDateOfDeath() {
		return dateOfDeath;
	}

	public void setDateOfDeath(String dateOfDeath) {
		this.dateOfDeath = dateOfDeath;
	}

	public String getEmail() {
		return email;
	}

	public void setEmail(String email) {
		this.email = email;
	}

	public String getPhone() {
		return phone;
	}

	public void setPhone(String phone) {
		this.phone = phone;
	}

	public String getAddress() {
		return address;
	}

	public void setAddress(String address) {
		this.address = address;
	}

	public String getCity() {
		return city;
	}

	public void setCity(String city) {
		this.city = city;
	}

	public String getCountry() {
		return country;
	}

	public void setCountry(String country) {
		this.country = country;
	}

	public String getPostalCode() {
		return postalCode;
	}

	public void setPostalCode(String postalCode) {
		this.postalCode = postalCode;
	}

	public String getStatus() {
		return status;
	}

	public void setStatus(String status) {
		this.status = status;
	}
}
