package com.mosque.crm.liquibase;

import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

import liquibase.exception.DatabaseException;

public class DataPlanEntitlement extends CustomDataTaskChange {

    private String id;
    private String planId;
    private String featureKey;
    private String enabled;
    private String limitValue;

    @Override
    public void handleUpdate() throws DatabaseException, SQLException {
        Long existingId = null;
        String query = "select id from plan_entitlements where plan_id=? and feature_key=?";
        try (PreparedStatement prepareStatement = connection.prepareStatement(query)) {
            setData(prepareStatement, 1, toLong(planId));
            setData(prepareStatement, 2, featureKey);
            try (ResultSet resultSet = prepareStatement.executeQuery()) {
                if (resultSet.next()) {
                    existingId = resultSet.getLong("id");
                }
            }
        }

        if (existingId != null) {
            String update = "update plan_entitlements set enabled=?, limit_value=? where id=?";
            try (PreparedStatement prepareStatement = connection.prepareStatement(update)) {
                setData(prepareStatement, 1, toBoolean(enabled));
                setData(prepareStatement, 2, toInteger(limitValue));
                setData(prepareStatement, 3, existingId);
                prepareStatement.executeUpdate();
            }
        } else {
            String insert = "insert into plan_entitlements(id, plan_id, feature_key, enabled, limit_value) values(?,?,?,?,?)";
            try (PreparedStatement prepareStatement = connection.prepareStatement(insert)) {
                setData(prepareStatement, 1, toLong(id));
                setData(prepareStatement, 2, toLong(planId));
                setData(prepareStatement, 3, featureKey);
                setData(prepareStatement, 4, toBoolean(enabled));
                setData(prepareStatement, 5, toInteger(limitValue));
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

    private Integer toInteger(String value) {
        if (value == null || value.trim().isEmpty()) {
            return null;
        }
        return Integer.parseInt(value.trim());
    }

    private Boolean toBoolean(String value) {
        if (value == null || value.trim().isEmpty()) {
            return Boolean.FALSE;
        }
        return Boolean.parseBoolean(value.trim());
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getPlanId() {
        return planId;
    }

    public void setPlanId(String planId) {
        this.planId = planId;
    }

    public String getFeatureKey() {
        return featureKey;
    }

    public void setFeatureKey(String featureKey) {
        this.featureKey = featureKey;
    }

    public String getEnabled() {
        return enabled;
    }

    public void setEnabled(String enabled) {
        this.enabled = enabled;
    }

    public String getLimitValue() {
        return limitValue;
    }

    public void setLimitValue(String limitValue) {
        this.limitValue = limitValue;
    }
}
