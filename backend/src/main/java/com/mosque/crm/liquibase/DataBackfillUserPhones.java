package com.mosque.crm.liquibase;

import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

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

public class DataBackfillUserPhones implements CustomTaskChange {
    private static final Logger log = LoggerFactory.getLogger(DataBackfillUserPhones.class);

    @Override
    public void execute(Database database) throws CustomChangeException {
        if (!(database.getConnection() instanceof JdbcConnection connection)) {
            throw new CustomChangeException("Account phone backfill requires a JDBC connection");
        }
        List<AccountPhone> accounts = new ArrayList<>();
        try (PreparedStatement select = connection.prepareStatement(
                "SELECT u.id, u.username, u.phone, p.phone AS member_phone FROM users u "
                        + "LEFT JOIN user_member_link l ON l.user_id = u.id "
                        + "LEFT JOIN persons p ON p.id = l.person_id AND p.organization_id = u.organization_id");
                PreparedStatement update = connection.prepareStatement(
                        "UPDATE users SET phone = ? WHERE id = ? AND phone IS NULL")) {
            try (ResultSet rows = select.executeQuery()) {
                while (rows.next()) {
                    accounts.add(new AccountPhone(rows.getLong("id"), rows.getString("username"),
                            rows.getString("phone"), rows.getString("member_phone")));
                }
            }
            for (Map.Entry<Long, String> entry : eligiblePhones(accounts).entrySet()) {
                update.setString(1, entry.getValue());
                update.setLong(2, entry.getKey());
                if (update.executeUpdate() != 1) {
                    throw new CustomChangeException("Concurrent account phone change for user id=" + entry.getKey());
                }
            }
        } catch (SQLException | DatabaseException e) {
            throw new CustomChangeException("Account phone backfill failed", e);
        }
    }

    static Map<Long, String> eligiblePhones(List<AccountPhone> accounts) {
        Map<String, Set<Long>> owners = new HashMap<>();
        Map<Long, String> candidates = new HashMap<>();
        for (AccountPhone account : accounts) {
            String usernamePhone = internationalPhone(account.username());
            addOwner(owners, usernamePhone, account.id());
            addOwner(owners, PhoneUtils.toE164(account.phone(), null), account.id());
            if (account.phone() != null) {
                continue;
            }
            String memberPhone = internationalPhone(account.memberPhone());
            String candidate = memberPhone != null ? memberPhone : usernamePhone;
            if (candidate != null) {
                candidates.put(account.id(), candidate);
                addOwner(owners, candidate, account.id());
            } else if (account.memberPhone() != null && !account.memberPhone().isBlank()) {
                log.warn("Account phone backfill skipped user id={}: invalid international member phone", account.id());
            }
        }
        candidates.entrySet().removeIf(entry -> {
            if (owners.get(entry.getValue()).size() > 1) {
                log.warn("Account phone backfill skipped user id={}: phone shared with another account", entry.getKey());
                return true;
            }
            return false;
        });
        log.info("Account phone backfill: {} of {} accounts eligible for copying", candidates.size(), accounts.size());
        return candidates;
    }

    private static void addOwner(Map<String, Set<Long>> owners, String phone, Long id) {
        if (phone != null) {
            owners.computeIfAbsent(phone, ignored -> new HashSet<>()).add(id);
        }
    }

    private static String internationalPhone(String raw) {
        return raw != null && (raw.trim().startsWith("+") || raw.trim().startsWith("00"))
                ? PhoneUtils.toE164(raw, null) : null;
    }

    record AccountPhone(Long id, String username, String phone, String memberPhone) {
    }

    @Override
    public String getConfirmationMessage() {
        return "Copied unique international member/username phones to user accounts";
    }

    @Override
    public void setUp() {
    }

    @Override
    public void setFileOpener(ResourceAccessor resourceAccessor) {
    }

    @Override
    public ValidationErrors validate(Database database) {
        return new ValidationErrors();
    }
}
