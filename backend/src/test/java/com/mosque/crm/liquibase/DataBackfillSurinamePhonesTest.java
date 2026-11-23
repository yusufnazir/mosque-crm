package com.mosque.crm.liquibase;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.HashSet;
import java.util.Set;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

import liquibase.change.custom.CustomChangeWrapper;
import liquibase.database.Database;
import liquibase.database.jvm.JdbcConnection;
import liquibase.exception.CustomChangeException;
import liquibase.exception.DatabaseException;
import liquibase.parser.core.xml.XMLChangeLogSAXParser;
import liquibase.changelog.ChangeLogParameters;
import liquibase.resource.ClassLoaderResourceAccessor;

class DataBackfillSurinamePhonesTest {

    @ParameterizedTest
    @CsvSource({
            "8123456, +5978123456",
            "412345, +597412345",
            "' (812) 34-56 ', +5978123456",
            "'(812)3456', +5978123456",
            "'41.23.45', +597412345",
            "597123, +597597123",
            "597412345, +597412345",
            "'597 812-3456', +5978123456"
    })
    void convertsOnlyPlausibleLocalAndBareSurinameNumbers(String raw, String expected) {
        var conversion = DataBackfillSurinamePhones.convert(raw);
        assertEquals(expected, conversion.phone());
        assertNull(conversion.reason());
        var secondPass = DataBackfillSurinamePhones.convert(expected);
        assertNull(secondPass.phone());
        assertNull(secondPass.reason());
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {" ", "+5978123456", "+31 (6) 1234-5678",
            "0031612345678", "00 597 8123456", "+1 202 555 0123"})
    void leavesBlankAndExplicitInternationalNumbersUntouched(String raw) {
        var conversion = DataBackfillSurinamePhones.convert(raw);
        assertNull(conversion.phone());
        assertNull(conversion.reason());
    }

    @ParameterizedTest
    @ValueSource(strings = {"08123456", "12345", "81234567", "31612345678",
            "111111", "9999999", "597111111", "5979999999",
            "8123456 ext 2", "8123456/412345", "8123456,412345",
            "+", "+012345678", "001234", "++5978123456", "59+78123456",
            "(8123456", "812)3456", "8123456-", "unknown"})
    void reportsAmbiguousOrMalformedValuesWithoutGuessing(String raw) {
        var conversion = DataBackfillSurinamePhones.convert(raw);
        assertNull(conversion.phone());
        assertNotNull(conversion.reason());
    }

    @Test
    void rejectsLongMalformedContactValues() {
        var conversion = DataBackfillSurinamePhones.convert("8".repeat(99) + "x");
        assertNull(conversion.phone());
        assertNotNull(conversion.reason());
    }

    @Test
    void updatesWithOriginalValueGuardAndPagesWithoutCommitting() throws Exception {
        Database database = mock(Database.class);
        JdbcConnection connection = mock(JdbcConnection.class);
        PreparedStatement select = mock(PreparedStatement.class);
        PreparedStatement update = mock(PreparedStatement.class);
        ResultSet firstPage = mock(ResultSet.class);
        ResultSet secondPage = mock(ResultSet.class);
        ResultSet emptyPage = mock(ResultSet.class);
        when(database.getConnection()).thenReturn(connection);
        when(connection.prepareStatement("SELECT id, phone FROM persons WHERE id > ? ORDER BY id LIMIT 500"))
                .thenReturn(select);
        when(connection.prepareStatement("UPDATE persons SET phone = ? WHERE id = ? AND phone = ?"))
                .thenReturn(update);
        when(select.executeQuery()).thenReturn(firstPage, secondPage, emptyPage);
        when(firstPage.next()).thenReturn(true, true, true, false);
        when(firstPage.getLong("id")).thenReturn(1L, 2L, 3L);
        when(firstPage.getString("phone")).thenReturn("8123456", "+31 6 12345678", "ambiguous");
        when(secondPage.next()).thenReturn(true, false);
        when(secondPage.getLong("id")).thenReturn(4L);
        when(secondPage.getString("phone")).thenReturn(null);
        when(update.executeUpdate()).thenReturn(1);

        changeFor("persons").execute(database);

        verify(update).setString(1, "+5978123456");
        verify(update).setLong(2, 1L);
        verify(update).setString(3, "8123456");
        verify(update).executeUpdate();
        verify(select).setLong(1, Long.MIN_VALUE);
        verify(select).setLong(1, 3L);
        verify(select).setLong(1, 4L);
        verify(firstPage).close();
        verify(secondPage).close();
        verify(emptyPage).close();
        verify(select).close();
        verify(update).close();
        verify(connection, never()).commit();
        verify(connection, never()).rollback();
    }

    @Test
    void failsChangesetOnDatabaseErrorsInsteadOfMarkingItComplete() throws Exception {
        Database database = mock(Database.class);
        JdbcConnection connection = mock(JdbcConnection.class);
        when(database.getConnection()).thenReturn(connection);
        DatabaseException failure = new DatabaseException("database unavailable");
        when(connection.prepareStatement(anyString())).thenThrow(failure);

        CustomChangeException thrown = assertThrows(CustomChangeException.class,
                () -> changeFor("persons").execute(database));

        assertEquals(failure, thrown.getCause());
        verify(connection, never()).commit();
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    void failsChangesetOnConcurrentEditOrUpdateError(boolean databaseFailure) throws Exception {
        Database database = mock(Database.class);
        JdbcConnection connection = mock(JdbcConnection.class);
        PreparedStatement select = mock(PreparedStatement.class);
        PreparedStatement update = mock(PreparedStatement.class);
        ResultSet rows = mock(ResultSet.class);
        when(database.getConnection()).thenReturn(connection);
        when(connection.prepareStatement(anyString())).thenReturn(select, update);
        when(select.executeQuery()).thenReturn(rows);
        when(rows.next()).thenReturn(true, false);
        when(rows.getLong("id")).thenReturn(1229L);
        when(rows.getString("phone")).thenReturn("8123456");
        if (databaseFailure) {
            when(update.executeUpdate()).thenThrow(new SQLException("update failed"));
        } else {
            when(update.executeUpdate()).thenReturn(0);
        }

        assertThrows(CustomChangeException.class, () -> changeFor("persons").execute(database));

        verify(connection, never()).commit();
        verify(update).close();
    }

    @Test
    void rejectsTablesOutsideContactScopeBeforeAccessingDatabase() {
        Database database = mock(Database.class);
        for (String table : new String[] {null, "users", "whatsapp_outbound_messages", "persons; DROP TABLE users"}) {
            var change = changeFor(table);
            assertFalse(change.validate(database).getErrorMessages().isEmpty());
            assertThrows(CustomChangeException.class, () -> change.execute(database));
        }
        verifyNoInteractions(database);
    }

    @Test
    void liquibaseLoadsEachRegisteredContactChangesetWithValidParameters() throws Exception {
        String[] files = {
                "230-backfill-persons-phone-country-code.xml",
                "231-backfill-organizations-phone-country-code.xml",
                "232-backfill-businesses-phone-country-code.xml",
                "233-backfill-join-requests-phone-country-code.xml",
                "234-backfill-org-event-recipients-phone-country-code.xml",
                "235-backfill-non-member-recipients-phone-country-code.xml",
                "236-backfill-general-event-registrations-phone-country-code.xml",
                "237-backfill-distribution-registrations-phone-country-code.xml"
        };
        Set<String> tables = new HashSet<>();
        Set<String> ids = new HashSet<>();
        Database database = mock(Database.class);
        String consolidation;
        try (var input = getClass().getResourceAsStream(
                "/db/changelog/changes/dml/db.changelog-dml.xml")) {
            assertNotNull(input);
            consolidation = new String(input.readAllBytes(), java.nio.charset.StandardCharsets.UTF_8);
        }
        try (var resources = new ClassLoaderResourceAccessor()) {
            for (String file : files) {
                String path = "db/changelog/changes/dml/" + file;
                assertTrue(consolidation.contains("<include file=\"" + path + "\"/>"));
                var changelog = new XMLChangeLogSAXParser().parse(path, new ChangeLogParameters(), resources);
                assertEquals(1, changelog.getChangeSets().size());
                var changeset = changelog.getChangeSets().get(0);
                assertFalse(changeset.isAlwaysRun());
                assertFalse(changeset.isRunOnChange());
                assertEquals(1, changeset.getChanges().size());
                var wrapper = (CustomChangeWrapper) changeset.getChanges().get(0);
                assertEquals(0, wrapper.validate(database).getErrorMessages().size());
                var change = (DataBackfillSurinamePhones) wrapper.getCustomChange();
                assertEquals(0, change.validate(database).getErrorMessages().size());
                tables.add(wrapper.getParamValue("tableName"));
                ids.add(changeset.getId());
            }
        }
        assertEquals(Set.of("persons", "organizations", "businesses", "join_requests",
                "org_event_recipients", "non_member_recipients",
                "org_general_event_registrations", "org_distribution_registrations"), tables);
        assertEquals(8, ids.size());
    }

    private DataBackfillSurinamePhones changeFor(String table) {
        var change = new DataBackfillSurinamePhones();
        change.setTableName(table);
        return change;
    }
}
