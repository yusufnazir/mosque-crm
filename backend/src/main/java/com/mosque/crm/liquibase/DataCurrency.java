package com.mosque.crm.liquibase;

import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import liquibase.exception.DatabaseException;

public class DataCurrency extends CustomDataTaskChange {

    private String id;
    private String code;
    private String name;
    private String symbol;
    private String decimalPlaces;

    @Override
    public void handleUpdate() throws DatabaseException, SQLException {
        String query = "select id from currencies where id=?";
        boolean exists = false;
        try (PreparedStatement ps = connection.prepareStatement(query)) {
            setData(ps, 1, toLong(id));
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    exists = true;
                }
            }
        }

        if (exists) {
            String update = "update currencies set code=?, name=?, symbol=?, decimal_places=? where id=?";
            try (PreparedStatement ps = connection.prepareStatement(update)) {
                setData(ps, 1, code);
                setData(ps, 2, name);
                setData(ps, 3, symbol);
                setData(ps, 4, toInt(decimalPlaces));
                setData(ps, 5, toLong(id));
                ps.executeUpdate();
            }
        } else {
            String insert = "insert into currencies(id, code, name, symbol, decimal_places) values(?,?,?,?,?)";
            try (PreparedStatement ps = connection.prepareStatement(insert)) {
                setData(ps, 1, toLong(id));
                setData(ps, 2, code);
                setData(ps, 3, name);
                setData(ps, 4, symbol);
                setData(ps, 5, toInt(decimalPlaces));
                ps.executeUpdate();
            }
        }
    }

    private Long toLong(String value) {
        if (value == null || value.trim().isEmpty()) return null;
        return Long.parseLong(value.trim());
    }

    private Integer toInt(String value) {
        if (value == null || value.trim().isEmpty()) return 2;
        return Integer.parseInt(value.trim());
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getSymbol() { return symbol; }
    public void setSymbol(String symbol) { this.symbol = symbol; }

    public String getDecimalPlaces() { return decimalPlaces; }
    public void setDecimalPlaces(String decimalPlaces) { this.decimalPlaces = decimalPlaces; }
}
