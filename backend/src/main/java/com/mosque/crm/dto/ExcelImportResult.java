package com.mosque.crm.dto;

import java.util.ArrayList;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.mosque.crm.models.RowData;

public class ExcelImportResult {
	private int totalRecords;
	private int successfullyProcessed;
	private int skipped;
	private List<String> errors;
	private List<String> warnings;

	@JsonIgnore
	private List<RowData> rows;

	public ExcelImportResult(List<RowData> rows, int totalRecords, int successfullyProcessed, int skipped,
			List<String> errors, List<String> warnings) {
		this.rows = rows;
		this.totalRecords = totalRecords;
		this.successfullyProcessed = successfullyProcessed;
		this.skipped = skipped;
		this.errors = errors;
		this.warnings = warnings;
	}

	public ExcelImportResult(int totalRecords, int successfullyProcessed, int skipped, List<String> errors,
			List<String> warnings) {
		this(new ArrayList<>(), totalRecords, successfullyProcessed, skipped, errors, warnings);
	}

	// Getters and setters
	public int getTotalRecords() {
		return totalRecords;
	}

	public void setTotalRecords(int totalRecords) {
		this.totalRecords = totalRecords;
	}

	public int getSuccessfullyProcessed() {
		return successfullyProcessed;
	}

	public void setSuccessfullyProcessed(int successfullyProcessed) {
		this.successfullyProcessed = successfullyProcessed;
	}

	public int getSkipped() {
		return skipped;
	}

	public void setSkipped(int skipped) {
		this.skipped = skipped;
	}

	public List<String> getErrors() {
		return errors;
	}

	public void setErrors(List<String> errors) {
		this.errors = errors;
	}

	public List<String> getWarnings() {
		return warnings;
	}

	public void setWarnings(List<String> warnings) {
		this.warnings = warnings;
	}

	public List<RowData> getRows() {
		return rows;
	}

	public void setRows(List<RowData> rows) {
		this.rows = rows;
	}

}