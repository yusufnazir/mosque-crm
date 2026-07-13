#!/bin/bash
# Create isolated demo DB on mariadb-prod. Does NOT touch the memberflow (prod) schema.
set -euo pipefail

ROOT_PW="$(docker inspect mariadb-prod --format '{{range .Config.Env}}{{println .}}{{end}}' | sed -n 's/^MYSQL_ROOT_PASSWORD=//p')"
DEMO_DB_PASSWORD="$(openssl rand -base64 24 | tr -d '/+=' | head -c 24)"
DEMO_JWT_SECRET="$(openssl rand -base64 48 | tr -d '\n')"

docker exec -i mariadb-prod mariadb -uroot -p"$ROOT_PW" <<SQL
CREATE DATABASE IF NOT EXISTS memberflow_demo CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'memberflow_demo'@'%' IDENTIFIED BY '${DEMO_DB_PASSWORD}';
ALTER USER 'memberflow_demo'@'%' IDENTIFIED BY '${DEMO_DB_PASSWORD}';
GRANT ALL PRIVILEGES ON memberflow_demo.* TO 'memberflow_demo'@'%';
FLUSH PRIVILEGES;
SQL

umask 077
cat > /opt/memberflow-demo/.env <<EOF
DEMO_DB_PASSWORD=${DEMO_DB_PASSWORD}
DEMO_JWT_SECRET=${DEMO_JWT_SECRET}
EOF
chmod 600 /opt/memberflow-demo/.env

echo "Demo database memberflow_demo ready. Secrets written to /opt/memberflow-demo/.env"
