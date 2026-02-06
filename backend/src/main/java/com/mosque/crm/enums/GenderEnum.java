package com.mosque.crm.enums;

/**
 * GEDCOM-compliant sex/gender enumeration.
 * Follows GEDCOM 5.5.1 specification for SEX tag.
 */
public enum GenderEnum {
    M,  // Male
    F,  // Female
    U;   // Unknown/Undetermined
    
	public static GenderEnum mapToSexEnum(String gender) {
		if (gender == null) {
			return null;
		}

		switch (gender.toUpperCase()) {
		case "M":
			return GenderEnum.M;
		case "V":
			return GenderEnum.F;
		default:
			return GenderEnum.U; // Unknown
		}
	}
    
    
}
