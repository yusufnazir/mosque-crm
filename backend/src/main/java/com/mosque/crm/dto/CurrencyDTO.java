package com.mosque.crm.dto;

/**
 * DTO for Currency - response object for global currency reference data.
 */
public class CurrencyDTO {

    private Long id;
    private String code;
    private String name;
    private String symbol;
    private Integer decimalPlaces;

    public CurrencyDTO() {
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getSymbol() { return symbol; }
    public void setSymbol(String symbol) { this.symbol = symbol; }

    public Integer getDecimalPlaces() { return decimalPlaces; }
    public void setDecimalPlaces(Integer decimalPlaces) { this.decimalPlaces = decimalPlaces; }
}
