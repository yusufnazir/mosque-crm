package com.mosque.crm.liquibase;

import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

import liquibase.exception.DatabaseException;

/**
 * Liquibase UPSERT handler for the {@code feature_definitions} table.
 * Looks up by {@code feature_key} (the primary key) and updates the row
 * if it exists, otherwise inserts a new row.
 */
public class DataFeatureDefinition extends CustomDataTaskChange {

    private String featureKey;
    private String displayLabel;
    private String sortOrder;
    private String featureType;

    @Override
    public void handleUpdate() throws DatabaseException, SQLException {
        boolean exists = false;
        String query = "SELECT feature_key FROM feature_definitions WHERE feature_key = ?";
        try (PreparedStatement ps = connection.prepareStatement(query)) {
            setData(ps, 1, featureKey);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    exists = true;
                }
            }
        }

        if (exists) {
            String update = "UPDATE feature_definitions SET display_label = ?, sort_order = ?, feature_type = ? WHERE feature_key = ?";
            try (PreparedStatement ps = connection.prepareStatement(update)) {
                setData(ps, 1, displayLabel);
                setData(ps, 2, toInteger(sortOrder));
                setData(ps, 3, featureType);
                setData(ps, 4, featureKey);
                ps.executeUpdate();
            }
        } else {
            String insert = "INSERT INTO feature_definitions(feature_key, display_label, sort_order, feature_type) VALUES(?, ?, ?, ?)";
            try (PreparedStatement ps = connection.prepareStatement(insert)) {
                setData(ps, 1, featureKey);
                setData(ps, 2, displayLabel);
                setData(ps, 3, toInteger(sortOrder));
                setData(ps, 4, featureType);
                ps.executeUpdate();
            }
        }
    }

    private Integer toInteger(String value) {
        if (value == null || value.trim().isEmpty()) {
            return 0;
        }
        return Integer.parseInt(value.trim());
    }

    public String getFeatureKey() { return featureKey; }
    public void setFeatureKey(String featureKey) { this.featureKey = featureKey; }

    public String getDisplayLabel() { return displayLabel; }
    public void setDisplayLabel(String displayLabel) { this.displayLabel = displayLabel; }

    public String getSortOrder() { return sortOrder; }
    public void setSortOrder(String sortOrder) { this.sortOrder = sortOrder; }

    public String getFeatureType() { return featureType; }
    public void setFeatureType(String featureType) { this.featureType = featureType; }
}
