package com.mosque.crm.liquibase;

import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import liquibase.exception.DatabaseException;

/**
 * Liquibase custom task change for UPSERT of a country record
 * (countries table) and its translations (country_translations table).
 * Each changeset inserts one country with EN and NL translations.
 */
public class DataCountry extends CustomDataTaskChange {

    private String id;
    private String isoCode;
    private String sortOrder;
    private String nameEn;
    private String nameNl;

    @Override
    public void handleUpdate() throws DatabaseException, SQLException {
        upsertCountry();
        upsertTranslation("en", nameEn);
        upsertTranslation("nl", nameNl);
    }

    private void upsertCountry() throws DatabaseException, SQLException {
        String query = "SELECT id FROM countries WHERE id = ?";
        boolean exists = false;
        try (PreparedStatement ps = connection.prepareStatement(query)) {
            setData(ps, 1, toLong(id));
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) exists = true;
            }
        }

        if (exists) {
            String update = "UPDATE countries SET iso_code = ?, sort_order = ? WHERE id = ?";
            try (PreparedStatement ps = connection.prepareStatement(update)) {
                setData(ps, 1, isoCode);
                setData(ps, 2, toInt(sortOrder));
                setData(ps, 3, toLong(id));
                ps.executeUpdate();
            }
        } else {
            String insert = "INSERT INTO countries(id, iso_code, sort_order) VALUES(?, ?, ?)";
            try (PreparedStatement ps = connection.prepareStatement(insert)) {
                setData(ps, 1, toLong(id));
                setData(ps, 2, isoCode);
                setData(ps, 3, toInt(sortOrder));
                ps.executeUpdate();
            }
        }
    }

    private void upsertTranslation(String locale, String name) throws DatabaseException, SQLException {
        String query = "SELECT id FROM country_translations WHERE country_id = ? AND locale = ?";
        boolean exists = false;
        try (PreparedStatement ps = connection.prepareStatement(query)) {
            setData(ps, 1, toLong(id));
            setData(ps, 2, locale);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) exists = true;
            }
        }

        if (exists) {
            String update = "UPDATE country_translations SET name = ? WHERE country_id = ? AND locale = ?";
            try (PreparedStatement ps = connection.prepareStatement(update)) {
                setData(ps, 1, name);
                setData(ps, 2, toLong(id));
                setData(ps, 3, locale);
                ps.executeUpdate();
            }
        } else {
            String insert = "INSERT INTO country_translations(country_id, locale, name) VALUES(?, ?, ?)";
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

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getIsoCode() { return isoCode; }
    public void setIsoCode(String isoCode) { this.isoCode = isoCode; }

    public String getSortOrder() { return sortOrder; }
    public void setSortOrder(String sortOrder) { this.sortOrder = sortOrder; }

    public String getNameEn() { return nameEn; }
    public void setNameEn(String nameEn) { this.nameEn = nameEn; }

    public String getNameNl() { return nameNl; }
    public void setNameNl(String nameNl) { this.nameNl = nameNl; }
}
