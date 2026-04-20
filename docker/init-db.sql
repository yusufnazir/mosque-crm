-- MariaDB initialisation script — runs once on first container start
-- Creates the test database and grants the application user full access to it.
-- The main `mcrm` database is created by the MARIADB_DATABASE env var in docker-compose.

CREATE DATABASE IF NOT EXISTS `mcrm-test`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

GRANT ALL PRIVILEGES ON `mcrm-test`.* TO 'mcrm'@'%';

FLUSH PRIVILEGES;
