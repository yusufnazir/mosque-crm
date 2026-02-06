package com.mosque.crm.util;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Arrays;

public class HashUtil {

	public String computeDigestHex(Object... values) {
		try {
			MessageDigest digest = MessageDigest.getInstance("SHA-256");

			String canonicalInput = String.join(":",
					Arrays.stream(values).map(o -> o == null ? "" : o.toString().trim()).toArray(String[]::new));

			byte[] hashBytes = digest.digest(canonicalInput.getBytes(StandardCharsets.UTF_8));

			// Convert to hex
			StringBuilder hex = new StringBuilder();
			for (byte b : hashBytes) {
				hex.append(String.format("%02x", b));
			}

			return hex.toString();
		} catch (NoSuchAlgorithmException e) {
			e.printStackTrace();
			return "0"; // Handle the exception as needed
		}
	}

	// Static method for PersonCreateDTO
    public static String generateHash(com.mosque.crm.dto.PersonCreateDTO dto) {
        // Use relevant fields for uniqueness
        String firstName = dto.getFirstName();
        String lastName = dto.getLastName();
        String dob = dto.getDateOfBirth() != null ? dto.getDateOfBirth().toString() : "";
        // You can add more fields if needed
        return new HashUtil().computeDigestHex(firstName, lastName, dob);
    }
}
