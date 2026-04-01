package com.mosque.crm.liquibase;

import java.math.BigDecimal;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

import liquibase.exception.DatabaseException;

public class DataSubscriptionPlan extends CustomDataTaskChange {

    private String id;
    private String code;
    private String name;
    private String description;
    private String monthlyPrice;
    private String yearlyPrice;
    private String isActive;

    @Override
    public void handleUpdate() throws DatabaseException, SQLException {
        String normalizedCode = code == null ? null : code.trim().toUpperCase();

        Long existingId = null;
        String query = "select id from subscription_plans where code=?";
        try (PreparedStatement prepareStatement = connection.prepareStatement(query)) {
            setData(prepareStatement, 1, normalizedCode);
            try (ResultSet resultSet = prepareStatement.executeQuery()) {
                if (resultSet.next()) {
                    existingId = resultSet.getLong("id");
                }
            }
        }

        if (existingId != null) {
            String update = "update subscription_plans set name=?, description=?, monthly_price=?, yearly_price=?, is_active=? where id=?";
            try (PreparedStatement prepareStatement = connection.prepareStatement(update)) {
                setData(prepareStatement, 1, name);
                setData(prepareStatement, 2, description);
                setData(prepareStatement, 3, toBigDecimal(monthlyPrice));
                setData(prepareStatement, 4, toBigDecimal(yearlyPrice));
                setData(prepareStatement, 5, toBoolean(isActive));
                setData(prepareStatement, 6, existingId);
                prepareStatement.executeUpdate();
            }
        } else {
            String insert = "insert into subscription_plans(id, code, name, description, monthly_price, yearly_price, is_active) values(?,?,?,?,?,?,?)";
            try (PreparedStatement prepareStatement = connection.prepareStatement(insert)) {
                setData(prepareStatement, 1, toLong(id));
                setData(prepareStatement, 2, normalizedCode);
                setData(prepareStatement, 3, name);
                setData(prepareStatement, 4, description);
                setData(prepareStatement, 5, toBigDecimal(monthlyPrice));
                setData(prepareStatement, 6, toBigDecimal(yearlyPrice));
                setData(prepareStatement, 7, toBoolean(isActive));
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

    private BigDecimal toBigDecimal(String value) {
        if (value == null || value.trim().isEmpty()) {
            return null;
        }
        return new BigDecimal(value.trim());
    }

    private Boolean toBoolean(String value) {
        if (value == null || value.trim().isEmpty()) {
            return Boolean.TRUE;
        }
        return Boolean.parseBoolean(value.trim());
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
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

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getMonthlyPrice() {
        return monthlyPrice;
    }

    public void setMonthlyPrice(String monthlyPrice) {
        this.monthlyPrice = monthlyPrice;
    }

    public String getYearlyPrice() {
        return yearlyPrice;
    }

    public void setYearlyPrice(String yearlyPrice) {
        this.yearlyPrice = yearlyPrice;
    }

    public String getIsActive() {
        return isActive;
    }

    public void setIsActive(String isActive) {
        this.isActive = isActive;
    }
}
