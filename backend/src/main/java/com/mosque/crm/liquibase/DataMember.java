package com.mosque.crm.liquibase;

import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

import liquibase.exception.DatabaseException;

/**
 * Custom Liquibase task for upserting Member data.
 * Members contain membership management data (contact info, status, fees).
 * Optionally link to GEDCOM Individual for biographical/genealogical data.
 */
public class DataMember extends CustomDataTaskChange {

	private String id;
	private String individualId;  // Optional link to GEDCOM @I1@, @I2@, etc.
	private String email;
	private String phone;
	private String address;
	private String city;
	private String country;
	private String postalCode;
	private String membershipStatus;  // ACTIVE, INACTIVE, PENDING
	private String memberSince;

	@Override
	public void handleUpdate() throws DatabaseException, SQLException {
		String query = "select id from members where id=?";
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
			String update = "update members set individual_id=?, email=?, phone=?, address=?, city=?, country=?, " +
					"postal_code=?, membership_status=?, member_since=? where id=?";
			try (PreparedStatement prepareStatement = connection.prepareStatement(update)) {
				setData(prepareStatement, 1, individualId);
				setData(prepareStatement, 2, email);
				setData(prepareStatement, 3, phone);
				setData(prepareStatement, 4, address);
				setData(prepareStatement, 5, city);
				setData(prepareStatement, 6, country);
				setData(prepareStatement, 7, postalCode);
				setData(prepareStatement, 8, membershipStatus);
				setData(prepareStatement, 9, memberSince);
				setData(prepareStatement, 10, toLong(id));
				prepareStatement.executeUpdate();
			}
		} else {
			String insert = "insert into members(id, individual_id, email, phone, address, city, country, " +
					"postal_code, membership_status, member_since) values(?,?,?,?,?,?,?,?,?,?)";
			try (PreparedStatement prepareStatement = connection.prepareStatement(insert)) {
				setData(prepareStatement, 1, toLong(id));
				setData(prepareStatement, 2, individualId);
				setData(prepareStatement, 3, email);
				setData(prepareStatement, 4, phone);
				setData(prepareStatement, 5, address);
				setData(prepareStatement, 6, city);
				setData(prepareStatement, 7, country);
				setData(prepareStatement, 8, postalCode);
				setData(prepareStatement, 9, membershipStatus);
				setData(prepareStatement, 10, memberSince);
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
	public String getId() {
		return id;
	}

	public void setId(String id) {
		this.id = id;
	}

	public String getIndividualId() {
		return individualId;
	}

	public void setIndividualId(String individualId) {
		this.individualId = individualId;
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

	public String getMembershipStatus() {
		return membershipStatus;
	}

	public void setMembershipStatus(String membershipStatus) {
		this.membershipStatus = membershipStatus;
	}

	public String getMemberSince() {
		return memberSince;
	}

	public void setMemberSince(String memberSince) {
		this.memberSince = memberSince;
	}
}
