package com.mosque.crm.liquibase;

import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

import liquibase.exception.DatabaseException;

/**
 * Upserts a row in the sequences_ table used by Hibernate TableGenerator.
 * The value stored is GREATEST(existingSequenceValue, MAX(id) from tableName, initialValue).
 * This ensures Hibernate never generates an ID that already exists in the target table.
 */
public class DataSequence extends CustomDataTaskChange {

    private String name;
    private String tableName;
    private String initialValue;

    @Override
    public void handleUpdate() throws DatabaseException, SQLException {
        long init = toLong(initialValue);

        // Find the max existing id in the target table (if provided)
        long tableMax = init;
        if (tableName != null && !tableName.trim().isEmpty()) {
            String maxQuery = "SELECT COALESCE(MAX(id), 0) FROM " + tableName.trim();
            try (PreparedStatement ps = connection.prepareStatement(maxQuery);
                 ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    tableMax = Math.max(rs.getLong(1), init);
                }
            }
        }

        // Find the current value in sequences_ (if any)
        String select = "SELECT PK_VALUE FROM sequences_ WHERE PK_NAME = ?";
        Long existing = null;
        try (PreparedStatement ps = connection.prepareStatement(select)) {
            ps.setString(1, name);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    existing = rs.getLong("PK_VALUE");
                }
            }
        }

        long newValue = Math.max(tableMax, existing != null ? existing : 0L);

        if (existing == null) {
            String insert = "INSERT INTO sequences_ (PK_NAME, PK_VALUE) VALUES (?, ?)";
            try (PreparedStatement ps = connection.prepareStatement(insert)) {
                ps.setString(1, name);
                ps.setLong(2, newValue);
                ps.executeUpdate();
            }
        } else if (newValue > existing) {
            String update = "UPDATE sequences_ SET PK_VALUE = ? WHERE PK_NAME = ?";
            try (PreparedStatement ps = connection.prepareStatement(update)) {
                ps.setLong(1, newValue);
                ps.setString(2, name);
                ps.executeUpdate();
            }
        }
    }

    private long toLong(String value) {
        if (value == null || value.trim().isEmpty()) {
            return 1000L;
        }
        return Long.parseLong(value.trim());
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getTableName() {
        return tableName;
    }

    public void setTableName(String tableName) {
        this.tableName = tableName;
    }

    public String getInitialValue() {
        return initialValue;
    }

    public void setInitialValue(String initialValue) {
        this.initialValue = initialValue;
    }
}
