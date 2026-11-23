package com.mosque.crm.liquibase;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import liquibase.database.Database;
import liquibase.database.jvm.JdbcConnection;
import liquibase.exception.CustomChangeException;

class DataBackfillUserPhonesTest {
    @Test
    void normalizesUniquePhonesAndSkipsSharedInvalidOrAlreadyPopulatedAccounts() {
        assertThat(DataBackfillUserPhones.eligiblePhones(List.of(
                row(1L, "email@example.test", null, "+597 8123456"),
                row(2L, "+31612345678", null, null),
                row(3L, "shared-one", null, "+5978223456"),
                row(4L, "shared-two", null, "005978223456"),
                row(5L, "invalid", null, "8323456"),
                row(6L, "preserved", "+5978423456", "+5978523456"),
                row(7L, "collision", null, "+5978423456"),
                row(8L, "username-collision", null, "+31612345678"),
                row(9L, "1234567", null, null))))
                .containsExactlyInAnyOrderEntriesOf(java.util.Map.of(1L, "+5978123456"));
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    void propagatesSqlErrorsAndConcurrentChangesWithoutCommitting(boolean sqlFailure) throws Exception {
        Database database = mock(Database.class);
        JdbcConnection connection = mock(JdbcConnection.class);
        PreparedStatement select = mock(PreparedStatement.class);
        PreparedStatement update = mock(PreparedStatement.class);
        ResultSet rows = mock(ResultSet.class);
        when(database.getConnection()).thenReturn(connection);
        when(connection.prepareStatement(anyString())).thenReturn(select, update);
        when(select.executeQuery()).thenReturn(rows);
        when(rows.next()).thenReturn(true, false);
        when(rows.getLong("id")).thenReturn(1L);
        when(rows.getString("username")).thenReturn("member");
        when(rows.getString("member_phone")).thenReturn("+5978123456");
        if (sqlFailure) {
            when(update.executeUpdate()).thenThrow(new SQLException("Update failed"));
        } else {
            when(update.executeUpdate()).thenReturn(0);
        }

        assertThatThrownBy(() -> new DataBackfillUserPhones().execute(database))
                .isInstanceOf(CustomChangeException.class);
        verify(connection, never()).commit();
    }

    private DataBackfillUserPhones.AccountPhone row(Long id, String username, String phone, String memberPhone) {
        return new DataBackfillUserPhones.AccountPhone(id, username, phone, memberPhone);
    }
}
