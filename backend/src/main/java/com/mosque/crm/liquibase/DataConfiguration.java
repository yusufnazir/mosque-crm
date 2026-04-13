package com.mosque.crm.liquibase;

import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

import liquibase.exception.DatabaseException;

public class DataConfiguration extends CustomDataTaskChange {

    private String name;
    private String value;

    @Override
    public void handleUpdate() throws DatabaseException, SQLException {
        String query = "SELECT id FROM configurations WHERE name=? AND organization_id IS NULL";
        boolean exists = false;
        try (PreparedStatement ps = connection.prepareStatement(query)) {
            setData(ps, 1, name);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    exists = true;
                }
            }
        }

        if (exists) {
            String update = "UPDATE configurations SET value=? WHERE name=? AND organization_id IS NULL";
            try (PreparedStatement ps = connection.prepareStatement(update)) {
                setData(ps, 1, value);
                setData(ps, 2, name);
                ps.executeUpdate();
            }
        } else {
            String insert = "INSERT INTO configurations(name, value, organization_id) VALUES(?, ?, NULL)";
            try (PreparedStatement ps = connection.prepareStatement(insert)) {
                setData(ps, 1, name);
                setData(ps, 2, value);
                ps.executeUpdate();
            }
        }
    }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getValue() { return value; }
    public void setValue(String value) { this.value = value; }
}
