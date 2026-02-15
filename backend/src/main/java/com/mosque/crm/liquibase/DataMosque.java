package com.mosque.crm.liquibase;

import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

import liquibase.exception.DatabaseException;

public class DataMosque extends CustomDataTaskChange {

	private String id;
	private String name;
	private String shortName;
	private String address;
	private String city;
	private String country;
	private String postalCode;
	private String phone;
	private String email;
	private String website;
	private String active;

	@Override
	public void handleUpdate() throws DatabaseException, SQLException {
		String query = "select id from mosques where id=?";
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
			String update = "update mosques set name=?, short_name=?, address=?, city=?, country=?, postal_code=?, phone=?, email=?, website=?, active=? where id=?";
			try (PreparedStatement prepareStatement = connection.prepareStatement(update)) {
				setData(prepareStatement, 1, name);
				setData(prepareStatement, 2, shortName);
				setData(prepareStatement, 3, address);
				setData(prepareStatement, 4, city);
				setData(prepareStatement, 5, country);
				setData(prepareStatement, 6, postalCode);
				setData(prepareStatement, 7, phone);
				setData(prepareStatement, 8, email);
				setData(prepareStatement, 9, website);
				setData(prepareStatement, 10, toBoolean(active));
				setData(prepareStatement, 11, toLong(id));
				prepareStatement.executeUpdate();
			}
		} else {
			String insert = "insert into mosques(id, name, short_name, address, city, country, postal_code, phone, email, website, active) values(?,?,?,?,?,?,?,?,?,?,?)";
			try (PreparedStatement prepareStatement = connection.prepareStatement(insert)) {
				setData(prepareStatement, 1, toLong(id));
				setData(prepareStatement, 2, name);
				setData(prepareStatement, 3, shortName);
				setData(prepareStatement, 4, address);
				setData(prepareStatement, 5, city);
				setData(prepareStatement, 6, country);
				setData(prepareStatement, 7, postalCode);
				setData(prepareStatement, 8, phone);
				setData(prepareStatement, 9, email);
				setData(prepareStatement, 10, website);
				setData(prepareStatement, 11, toBoolean(active));
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
			return true;
		}
		return Boolean.parseBoolean(value.trim());
	}

	// Getters and Setters
	public String getId() { return id; }
	public void setId(String id) { this.id = id; }

	public String getName() { return name; }
	public void setName(String name) { this.name = name; }

	public String getShortName() { return shortName; }
	public void setShortName(String shortName) { this.shortName = shortName; }

	public String getAddress() { return address; }
	public void setAddress(String address) { this.address = address; }

	public String getCity() { return city; }
	public void setCity(String city) { this.city = city; }

	public String getCountry() { return country; }
	public void setCountry(String country) { this.country = country; }

	public String getPostalCode() { return postalCode; }
	public void setPostalCode(String postalCode) { this.postalCode = postalCode; }

	public String getPhone() { return phone; }
	public void setPhone(String phone) { this.phone = phone; }

	public String getEmail() { return email; }
	public void setEmail(String email) { this.email = email; }

	public String getWebsite() { return website; }
	public void setWebsite(String website) { this.website = website; }

	public String getActive() { return active; }
	public void setActive(String active) { this.active = active; }
}
