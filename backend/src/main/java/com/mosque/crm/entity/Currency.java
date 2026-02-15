package com.mosque.crm.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.TableGenerator;

/**
 * Currency - Global reference table of ISO 4217 currencies.
 * 
 * NOT mosque-scoped. This is a system-wide reference table.
 * Individual mosques select which currencies they use via MosqueCurrency.
 */
@Entity
@Table(name = "currencies")
public class Currency {

    @Id
    @TableGenerator(name = "currencies_seq", table = "sequences_",
            pkColumnName = "PK_NAME", valueColumnName = "PK_VALUE",
            initialValue = 1000, allocationSize = 1)
    @GeneratedValue(generator = "currencies_seq", strategy = GenerationType.TABLE)
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    @Column(name = "code", nullable = false, unique = true, length = 3)
    private String code;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Column(name = "symbol", length = 10)
    private String symbol;

    @Column(name = "decimal_places", nullable = false)
    private Integer decimalPlaces = 2;

    // Constructors
    public Currency() {
    }

    public Currency(String code, String name, String symbol, Integer decimalPlaces) {
        this.code = code;
        this.name = name;
        this.symbol = symbol;
        this.decimalPlaces = decimalPlaces;
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getSymbol() {
        return symbol;
    }

    public void setSymbol(String symbol) {
        this.symbol = symbol;
    }

    public Integer getDecimalPlaces() {
        return decimalPlaces;
    }

    public void setDecimalPlaces(Integer decimalPlaces) {
        this.decimalPlaces = decimalPlaces;
    }
}
