-- Run this ONCE with your MariaDB root (or admin) credentials to prepare
-- the local test database.
--
-- Example (adjust port / path as needed):
--   mysql -u root -p -P 3307 --protocol=TCP < scripts\create-test-db.sql
--
-- After this you never need to run it again.  The JDBC connection string
-- in application-test.properties already includes createDatabaseIfNotExist=true
-- so Spring will recreate the schema if it's ever dropped.

CREATE DATABASE IF NOT EXISTS `mcrm-test`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- Grant the application user full access to the test database.
-- The user "mcrm" already exists (it owns the dev database).
GRANT ALL PRIVILEGES ON `mcrm-test`.* TO 'mcrm'@'%';
GRANT ALL PRIVILEGES ON `mcrm-test`.* TO 'mcrm'@'localhost';

FLUSH PRIVILEGES;
