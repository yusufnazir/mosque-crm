package com.mosque.crm.util;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;

import com.mosque.crm.constants.Constant;

public class DateUtil {

	public static LocalDate parseDate(String dateString) {
		if (dateString == null || dateString.trim().isEmpty()) {
			return null;
		}

		try {
			DateTimeFormatter formatter = DateTimeFormatter.ofPattern(Constant.DATE_FORMAT.toPattern());
			return LocalDate.parse(dateString.trim(), formatter);
		} catch (DateTimeParseException e) {
			// Try next format
		}

		// If no format worked, return null
		return null;
	}
}
