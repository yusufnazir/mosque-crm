-- Add hash column to person table
ALTER TABLE person ADD COLUMN hash VARCHAR(128) UNIQUE;
