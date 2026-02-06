package com.mosque.crm.util;

import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * One-time migration to add individual_id column to members table.
 * This will run once and then can be deleted.
 */
// Legacy one-time migration; disabled now that members table is removed
public class AddIndividualIdColumnMigration implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;

    public AddIndividualIdColumnMigration(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(String... args) {
        try {
            // Check if column exists
            jdbcTemplate.execute(
                "ALTER TABLE members ADD COLUMN IF NOT EXISTS individual_id VARCHAR(20) NULL"
            );
        } catch (Exception e) {
            System.err.println("⚠️ Could not add individual_id column (may already exist): " + e.getMessage());
        }
    }
}
