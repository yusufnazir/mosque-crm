package com.mosque.crm.models;

import org.apache.poi.ss.usermodel.Row;

import com.mosque.crm.dto.PersonCreateDTO;

public class RowData {

	private final Row row;
	private final PersonCreateDTO personDto;
	private final String gezinnenId;
	private final int rowNumber;

	public RowData(Row row, PersonCreateDTO personDto, String gezinnenId, int rowNumber) {
		this.row = row;
		this.personDto = personDto;
		this.gezinnenId = gezinnenId;
		this.rowNumber = rowNumber;
	}

	public Row getRow() {
		return row;
	}

	public PersonCreateDTO getPersonDto() {
		return personDto;
	}

	public String getGezinnenId() {
		return gezinnenId;
	}

	public int getRowNumber() {
		return rowNumber;
	}

}
