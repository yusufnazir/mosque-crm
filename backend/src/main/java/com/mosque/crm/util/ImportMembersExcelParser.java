package com.mosque.crm.util;

import java.io.IOException;
import java.io.InputStream;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;

import org.apache.commons.lang3.StringUtils;
import org.apache.poi.hssf.usermodel.HSSFWorkbook;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.web.multipart.MultipartFile;

import com.mosque.crm.dto.ExcelImportResult;
import com.mosque.crm.dto.PersonCreateDTO;
import com.mosque.crm.models.RowData;

public class ImportMembersExcelParser {

	private List<String> errors = new ArrayList<>();
	private List<String> warnings = new ArrayList<>();

	public ExcelImportResult parseExcel(MultipartFile file) {
		int successfullyProcessed = 0;
		int skipped = 0;

		try (InputStream inputStream = file.getInputStream()) {
			Workbook workbook;

			// Determine if file is .xlsx or .xls
			if (file.getOriginalFilename().toLowerCase().endsWith(".xlsx")) {
				workbook = new XSSFWorkbook(inputStream);
			} else if (file.getOriginalFilename().toLowerCase().endsWith(".xls")) {
				workbook = new HSSFWorkbook(inputStream);
			} else {
				errors.add("Unsupported file format. Please upload an Excel file (.xls or .xlsx)");
				return new ExcelImportResult(0, 0, 0, errors, warnings);
			}

			Sheet sheet = workbook.getSheetAt(0); // Use first sheet
			Iterator<Row> rows = sheet.iterator();

			if (!rows.hasNext()) {
				errors.add("Excel file is empty");
				return new ExcelImportResult(0, 0, 0, errors, warnings);
			}

			// Skip header row
			Row headerRow = rows.next();
			Map<String, Integer> columnIndexMap = getColumnIndexMap(headerRow);

			// First pass: collect all data to organize by gezinnen
			List<RowData> allRows = new ArrayList<>();
			int totalRecords = 0;
			while (rows.hasNext()) {
				Row row = rows.next();
				totalRecords++;

				try {
					PersonCreateDTO personDto = extractPersonData(row, columnIndexMap);
					String gezinnen = ExcelParserUtil.getCellValueAsString(row, columnIndexMap.get("Gezinnen"));

					if (personDto != null) {
						allRows.add(new RowData(row, personDto, gezinnen, totalRecords));
					} else {
						skipped++;
					}
				} catch (Exception e) {
					errors.add("Error processing row " + (totalRecords + 1) + ": " + e.getMessage());
					skipped++;
				}
			}

			System.out.println("Total records to process: " + allRows.size());

			return new ExcelImportResult(allRows, totalRecords, successfullyProcessed, skipped, errors, warnings);
		} catch (IOException e) {
			errors.add("Error reading Excel file: " + e.getMessage());
			return new ExcelImportResult(0, 0, 0, errors, warnings);
		}
	}

	private Map<String, Integer> getColumnIndexMap(Row headerRow) {
		Map<String, Integer> columnIndexMap = new HashMap<>();

// Common column names in Dutch and English variations
		String[] expectedHeaders = { "No", "NAAM", "VOORNAMEN", "Gezinnen", "ADRES", "GEB.DAT.", "GEB DAT", "DOB",
				"DATE OF BIRTH", "LEEFTIJD", "Heengegaan", "HEENGEGAAN", "DATE OF DEATH", "DOD", "CBB ID#", "GESL",
				"Mobiel no", "EMAIL", "PARAAF", "Burgerlijke Staat", "Geboorte plaats", "Beroep", "Werkgever",
				"Lid vanaf" };

		for (Cell cell : headerRow) {
			String headerValue = ExcelParserUtil.getCellValueAsString(cell);
			if (headerValue != null) {
				for (String expectedHeader : expectedHeaders) {
					if (expectedHeader.equalsIgnoreCase(headerValue.trim())) {
						columnIndexMap.put(expectedHeader, cell.getColumnIndex());
						break;
					}
				}
			}
		}

		return columnIndexMap;
	}

	private PersonCreateDTO extractPersonData(Row row, Map<String, Integer> columnIndexMap) {
		PersonCreateDTO dto = new PersonCreateDTO();

		// Extract NAAM (surname)
		String naam = ExcelParserUtil.getCellValueAsString(row, columnIndexMap.get("NAAM"));
		if (StringUtils.isNotBlank(naam)) {
			dto.setLastName(naam.trim());
		}

		// Extract VOORNAMEN (first names)
		String voornamen = ExcelParserUtil.getCellValueAsString(row, columnIndexMap.get("VOORNAMEN"));
		if (StringUtils.isNotBlank(voornamen)) {
			dto.setFirstName(voornamen.trim());
		}

		// Extract ADRES (address)
		String adres = ExcelParserUtil.getCellValueAsString(row, columnIndexMap.get("ADRES"));
		if (StringUtils.isNotBlank(adres)) {
			dto.setAddress(adres.trim());
		}

		// Extract GEB.DAT. (date of birth) - handle missing dates gracefully
		String gebDatStr = null;
		// Check for multiple possible column names for date of birth
		if (columnIndexMap.containsKey("GEB.DAT.")) {
			gebDatStr = ExcelParserUtil.getCellValueAsString(row, columnIndexMap.get("GEB.DAT."));
		}

		if (StringUtils.isNotBlank(gebDatStr)) {
			LocalDate dateOfBirth = DateUtil.parseDate(gebDatStr);
			if (dateOfBirth != null) {
				dto.setDateOfBirth(dateOfBirth);
			}
		}

		// Extract EMAIL
		String email = ExcelParserUtil.getCellValueAsString(row, columnIndexMap.get("EMAIL"));
		if (StringUtils.isNotBlank(email)) {
			dto.setEmail(email.trim());
		}

		// Extract Mobiel no (phone)
		String mobielNo = ExcelParserUtil.getCellValueAsString(row, columnIndexMap.get("Mobiel no"));
		if (StringUtils.isNotBlank(mobielNo)) {
			// Extract phone number from formats like "8407043/ +31616255904" to get just
			// the phone part
//			String phoneValue = extractPhoneNumber(mobielNo.trim());
//			if (phoneValue != null && phoneValue.length() > 20) {
//				phoneValue = phoneValue.substring(0, 20);
//			}
			dto.setPhone(mobielNo.trim());
		}

		// Extract GESL (gender)
		String gesl = ExcelParserUtil.getCellValueAsString(row, columnIndexMap.get("GESL"));
		if (StringUtils.isNotBlank(gesl)) {
			dto.setGender(gesl.trim());
		}

		// Extract Heengegaan (date of death) - handle missing dates gracefully
		String heengegaanStr = null;
		// Check for multiple possible column names for date of death
		if (columnIndexMap.containsKey("Heengegaan")) {
			heengegaanStr = ExcelParserUtil.getCellValueAsString(row, columnIndexMap.get("Heengegaan"));
		}

		if (StringUtils.isNotBlank(heengegaanStr)) {
			LocalDate dateOfDeath = DateUtil.parseDate(heengegaanStr);
			if (dateOfDeath != null) {
				dto.setDateOfDeath(dateOfDeath);
			}
		}

		// Extract Lid vanaf (member since)
		String lidVanafStr = ExcelParserUtil.getCellValueAsString(row, columnIndexMap.get("Lid vanaf"));
		if (StringUtils.isNotBlank(lidVanafStr)) {
			LocalDate lidVanaf = DateUtil.parseDate(lidVanafStr);
			if (lidVanaf != null) {
				// Note: This field is not in PersonCreateDTO, but we could create a membership
			}
		}

		// Extract Geboorte plaats (birth place) - not in PersonCreateDTO but could be
		// stored in GEDCOM
		String geboortePlaats = ExcelParserUtil.getCellValueAsString(row, columnIndexMap.get("Geboorte plaats"));
		if (StringUtils.isNotBlank(geboortePlaats)) {
			// This would be stored in GEDCOM Individual entity
		}

		// Validate required fields - we need at least a firstName
		if (StringUtils.isBlank(dto.getFirstName())) {
			return null; // Skip this record if no firstName
		}

		return dto;
	}

}
