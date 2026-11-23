package com.mosque.crm.liquibase;

import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.mosque.crm.util.PhoneUtils;

import liquibase.change.custom.CustomTaskChange;
import liquibase.database.Database;
import liquibase.database.jvm.JdbcConnection;
import liquibase.exception.CustomChangeException;
import liquibase.exception.DatabaseException;
import liquibase.exception.ValidationErrors;
import liquibase.resource.ResourceAccessor;

public class DataBackfillSurinamePhones implements CustomTaskChange {

    private static final Logger log = LoggerFactory.getLogger(DataBackfillSurinamePhones.class);
    private static final Map<String, String> CONTACT_COLUMNS = Map.of(
            "persons", "phone",
            "organizations", "phone",
            "businesses", "phone",
            "join_requests", "phone",
            "org_event_recipients", "phone_number",
            "non_member_recipients", "phone_number",
            "org_general_event_registrations", "phone_number",
            "org_distribution_registrations", "phone_number");
    private static final Pattern FORMATTED_NUMBER = Pattern.compile(
            "^\\+?(?:[0-9]|\\([0-9]+\\))(?:[ .-]*(?:[0-9]|\\([0-9]+\\)))*$");
    private static final Pattern LOCAL_NUMBER = Pattern.compile("^[1-9][0-9]{5,6}$");
    private static final Pattern BARE_SURINAME_NUMBER = Pattern.compile("^597[1-9][0-9]{5,6}$");
    private static final int PAGE_SIZE = 500;

    private String tableName;

    public void setTableName(String tableName) {
        this.tableName = tableName;
    }

    @Override
    public void execute(Database database) throws CustomChangeException {
        if (!CONTACT_COLUMNS.containsKey(tableName == null ? "" : tableName)) {
            throw new CustomChangeException("Unsupported phone backfill table");
        }
        if (!(database.getConnection() instanceof JdbcConnection connection)) {
            throw new CustomChangeException("Phone backfill requires a JDBC connection");
        }

        String column = CONTACT_COLUMNS.get(tableName);
        String selectSql = "SELECT id, " + column + " FROM " + tableName
                + " WHERE id > ? ORDER BY id LIMIT " + PAGE_SIZE;
        String updateSql = "UPDATE " + tableName + " SET " + column
                + " = ? WHERE id = ? AND " + column + " = ?";
        long lastId = Long.MIN_VALUE;
        int updated = 0;
        int skipped = 0;
        int unchanged = 0;

        // Liquibase owns the transaction; never commit here or swallow a failed update.
        try (PreparedStatement select = connection.prepareStatement(selectSql);
                PreparedStatement update = connection.prepareStatement(updateSql)) {
            while (true) {
                select.setLong(1, lastId);
                List<ContactPhone> page = new ArrayList<>();
                try (ResultSet rows = select.executeQuery()) {
                    while (rows.next()) {
                        page.add(new ContactPhone(rows.getLong("id"), rows.getString(column)));
                    }
                }
                if (page.isEmpty()) {
                    break;
                }
                for (ContactPhone contact : page) {
                    Conversion conversion = convert(contact.phone());
                    if (conversion.reason() != null) {
                        skipped++;
                        log.warn("Phone backfill skipped {} id={}: {}",
                                tableName, contact.id(), conversion.reason());
                    } else if (conversion.phone() == null) {
                        unchanged++;
                    } else {
                        update.setString(1, conversion.phone());
                        update.setLong(2, contact.id());
                        update.setString(3, contact.phone());
                        if (update.executeUpdate() != 1) {
                            throw new CustomChangeException(
                                    "Phone backfill encountered a concurrent change in "
                                            + tableName + " id=" + contact.id());
                        }
                        updated++;
                    }
                    lastId = contact.id();
                }
            }
        } catch (SQLException | DatabaseException e) {
            throw new CustomChangeException("Phone backfill failed for " + tableName, e);
        }
        log.info("Phone backfill {}: updated={}, unchanged={}, skipped={}",
                tableName, updated, unchanged, skipped);
    }

    static Conversion convert(String raw) {
        if (raw == null || raw.isBlank()) {
            return new Conversion(null, null);
        }
        String trimmed = raw.trim();
        if (!FORMATTED_NUMBER.matcher(trimmed).matches()) {
            return new Conversion(null, "invalid formatting, extension or multiple numbers");
        }
        String compact = trimmed.replaceAll("[ ().-]", "");
        if (compact.startsWith("+") || compact.startsWith("00")) {
            String international = compact.startsWith("+") ? compact : "+" + compact.substring(2);
            return PhoneUtils.isValidE164(international)
                    ? new Conversion(null, null)
                    : new Conversion(null, "invalid explicit international number");
        }
        String candidate;
        String national;
        if (LOCAL_NUMBER.matcher(compact).matches()) {
            national = compact;
            candidate = "+597" + compact;
        } else if (BARE_SURINAME_NUMBER.matcher(compact).matches()) {
            national = compact.substring(3);
            candidate = "+" + compact;
        } else {
            return new Conversion(null, "ambiguous length or leading zero; manual review required");
        }
        if (national.chars().distinct().count() == 1) {
            return new Conversion(null, "repeated-digit placeholder");
        }
        return new Conversion(candidate, null);
    }

    record Conversion(String phone, String reason) {
    }

    private record ContactPhone(long id, String phone) {
    }

    @Override
    public ValidationErrors validate(Database database) {
        ValidationErrors errors = new ValidationErrors();
        if (!CONTACT_COLUMNS.containsKey(tableName == null ? "" : tableName)) {
            errors.addError("Unsupported phone backfill table");
        }
        return errors;
    }

    @Override
    public String getConfirmationMessage() {
        return "Completed one-time Suriname phone backfill for " + tableName;
    }

    @Override
    public void setUp() {
    }

    @Override
    public void setFileOpener(ResourceAccessor resourceAccessor) {
    }
}
