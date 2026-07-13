package com.mosque.crm.liquibase;

import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

import liquibase.exception.DatabaseException;

/**
 * UPSERT a global business category and its EN/NL translations.
 */
public class DataBusinessCategory extends CustomDataTaskChange {

    private String id;
    private String code;
    private String sortOrder;
    private String active;
    private String nameEn;
    private String nameNl;

    @Override
    public void handleUpdate() throws DatabaseException, SQLException {
        upsertCategory();
        upsertTranslation("en", nameEn);
        upsertTranslation("nl", nameNl);
    }

    private void upsertCategory() throws DatabaseException, SQLException {
        String query = "SELECT id FROM business_categories WHERE id = ?";
        boolean exists = false;
        try (PreparedStatement ps = connection.prepareStatement(query)) {
            setData(ps, 1, toLong(id));
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) exists = true;
            }
        }

        if (exists) {
            String update = "UPDATE business_categories SET code = ?, sort_order = ?, active = ? WHERE id = ?";
            try (PreparedStatement ps = connection.prepareStatement(update)) {
                setData(ps, 1, code);
                setData(ps, 2, toInt(sortOrder));
                setData(ps, 3, toBoolean(active));
                setData(ps, 4, toLong(id));
                ps.executeUpdate();
            }
        } else {
            String insert = "INSERT INTO business_categories(id, code, sort_order, active) VALUES(?, ?, ?, ?)";
            try (PreparedStatement ps = connection.prepareStatement(insert)) {
                setData(ps, 1, toLong(id));
                setData(ps, 2, code);
                setData(ps, 3, toInt(sortOrder));
                setData(ps, 4, toBoolean(active));
                ps.executeUpdate();
            }
        }
    }

    private void upsertTranslation(String locale, String name) throws DatabaseException, SQLException {
        String query = "SELECT id FROM business_category_translations WHERE category_id = ? AND locale = ?";
        boolean exists = false;
        try (PreparedStatement ps = connection.prepareStatement(query)) {
            setData(ps, 1, toLong(id));
            setData(ps, 2, locale);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) exists = true;
            }
        }

        if (exists) {
            String update = "UPDATE business_category_translations SET name = ? WHERE category_id = ? AND locale = ?";
            try (PreparedStatement ps = connection.prepareStatement(update)) {
                setData(ps, 1, name);
                setData(ps, 2, toLong(id));
                setData(ps, 3, locale);
                ps.executeUpdate();
            }
        } else {
            String insert = "INSERT INTO business_category_translations(category_id, locale, name) VALUES(?, ?, ?)";
            try (PreparedStatement ps = connection.prepareStatement(insert)) {
                setData(ps, 1, toLong(id));
                setData(ps, 2, locale);
                setData(ps, 3, name);
                ps.executeUpdate();
            }
        }
    }

    private Long toLong(String value) {
        if (value == null || value.trim().isEmpty()) return null;
        return Long.parseLong(value.trim());
    }

    private Integer toInt(String value) {
        if (value == null || value.trim().isEmpty()) return 0;
        return Integer.parseInt(value.trim());
    }

    private Boolean toBoolean(String value) {
        if (value == null || value.trim().isEmpty()) return Boolean.TRUE;
        return Boolean.parseBoolean(value.trim());
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public String getSortOrder() { return sortOrder; }
    public void setSortOrder(String sortOrder) { this.sortOrder = sortOrder; }

    public String getActive() { return active; }
    public void setActive(String active) { this.active = active; }

    public String getNameEn() { return nameEn; }
    public void setNameEn(String nameEn) { this.nameEn = nameEn; }

    public String getNameNl() { return nameNl; }
    public void setNameNl(String nameNl) { this.nameNl = nameNl; }
}
