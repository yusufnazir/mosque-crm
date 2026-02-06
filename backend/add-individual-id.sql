-- Add individual_id column to members table if it doesn't exist
ALTER TABLE members ADD COLUMN IF NOT EXISTS individual_id VARCHAR(20) NULL;

-- Add foreign key constraint if gedcom_individuals table exists
-- ALTER TABLE members ADD CONSTRAINT fk_member_gedcom_individual 
-- FOREIGN KEY (individual_id) REFERENCES gedcom_individuals(id) ON DELETE SET NULL;
