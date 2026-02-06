package com.mosque.crm.util;

import java.util.Date;

import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.DateUtil;
import org.apache.poi.ss.usermodel.Row;

import com.mosque.crm.constants.Constant;

public class ExcelParserUtil {
	
	public static String getCellValueAsString(Row row, Integer columnIndex) {
		if (columnIndex == null || row == null) {
			return null;
		}

		Cell cell = row.getCell(columnIndex);
		return getCellValueAsString(cell);
	}

	public static String getCellValueAsString(Cell cell) {
		if (cell == null) {
			return null;
		}

		switch (cell.getCellType()) {
		case STRING:
			return cell.getStringCellValue();
		case NUMERIC:
			if (DateUtil.isCellDateFormatted(cell)) {
				Date dateCellValue = cell.getDateCellValue();
				if (dateCellValue != null) {
					return Constant.DATE_FORMAT.format(dateCellValue);
				} else {
					return null;
				}
			} else {
				// Handle numeric values - convert to string
				double numericValue = cell.getNumericCellValue();
				// Check if it's a whole number
				if (numericValue == Math.floor(numericValue)) {
					return String.valueOf((long) numericValue);
				} else {
					return String.valueOf(numericValue);
				}
			}
		case BOOLEAN:
			return String.valueOf(cell.getBooleanCellValue());
		case FORMULA:
			return cell.getCellFormula();
		case BLANK:
			return null;
		default:
			return null;
		}
	}
}
