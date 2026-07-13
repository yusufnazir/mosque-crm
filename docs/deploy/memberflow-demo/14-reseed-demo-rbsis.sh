#!/bin/bash
# Build memberflow-backend, recreate demo service, wipe memberflow_demo, reseed as RBSIS Paramaribo.
set -euo pipefail

WORK=/tmp/memberflow-backend-build-$$
REGISTRY=registry.cxode.com
IMAGE=${REGISTRY}/memberflow-backend:latest

cleanup() { rm -rf "$WORK"; }
trap cleanup EXIT

set -a
# shellcheck disable=SC1091
. /opt/memberflow/.registry-env
set +a

echo "$NEXUS_PASSWORD" | docker login "$REGISTRY" -u "$NEXUS_USER" --password-stdin

echo "==> Clone mosque-crm main"
git clone --depth 1 --branch main https://github.com/yusufnazir/mosque-crm.git "$WORK"

echo "==> Build $IMAGE"
docker build -t "$IMAGE" "$WORK/backend"

echo "==> Push $IMAGE"
docker push "$IMAGE"

echo "==> Stop demo service"
cd /opt/memberflow-demo
docker compose stop memberflow-demo-service

echo "==> Reset database memberflow_demo"
ROOT_PW="$(docker inspect mariadb-prod --format '{{range .Config.Env}}{{println .}}{{end}}' | sed -n 's/^MYSQL_ROOT_PASSWORD=//p')"
# shellcheck disable=SC1091
. /opt/memberflow-demo/.env
docker exec -i mariadb-prod mariadb -uroot -p"$ROOT_PW" <<SQL
DROP DATABASE IF EXISTS memberflow_demo;
CREATE DATABASE memberflow_demo CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL PRIVILEGES ON memberflow_demo.* TO 'memberflow_demo'@'%';
FLUSH PRIVILEGES;
SQL

echo "==> Pull + start demo service (Liquibase will run)"
docker compose pull memberflow-demo-service
docker compose up -d --no-deps --force-recreate memberflow-demo-service

echo "==> Wait for startup"
for i in $(seq 1 60); do
  if docker logs memberflow-demo-service 2>&1 | tail -n 40 | grep -q 'Started MosqueCrmApplication'; then
    echo "Demo service up"
    break
  fi
  sleep 5
  if [ "$i" -eq 60 ]; then
    echo "Timeout waiting for demo service"
    docker logs memberflow-demo-service 2>&1 | tail -n 80
    exit 1
  fi
done

# Ensure APP_BASE_DOMAIN after liquibase
docker exec -i mariadb-prod mariadb -uroot -p"$ROOT_PW" memberflow_demo <<'SQL'
UPDATE configurations SET value='demo.memflox.com' WHERE name='APP_BASE_DOMAIN' AND organization_id IS NULL;
INSERT INTO configurations(name, value, organization_id)
SELECT 'APP_BASE_DOMAIN', 'demo.memflox.com', NULL FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM configurations WHERE name='APP_BASE_DOMAIN' AND organization_id IS NULL);
SQL

echo "==> Seed demo data (RBSIS Paramaribo)"
COOKIE_JAR=/tmp/demo-reseed-cookies.txt
rm -f "$COOKIE_JAR"
HTTP=$(curl -s -c "$COOKIE_JAR" -b "$COOKIE_JAR" -o /tmp/demo-login.json -w "%{http_code}" \
  -X POST "https://admin.demo.memflox.com/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"username":"administrator","password":"13Jul1980"}')
echo "login=$HTTP"
if [ "$HTTP" != "200" ]; then
  # try legacy password
  HTTP=$(curl -s -c "$COOKIE_JAR" -b "$COOKIE_JAR" -o /tmp/demo-login.json -w "%{http_code}" \
    -X POST "https://admin.demo.memflox.com/api/auth/login" \
    -H 'Content-Type: application/json' \
    -d '{"username":"administrator","password":"admin123"}')
  echo "login_retry=$HTTP"
fi
[ "$HTTP" = "200" ] || { cat /tmp/demo-login.json; exit 1; }

curl -s -c "$COOKIE_JAR" -b "$COOKIE_JAR" "https://admin.demo.memflox.com/api/demo-data/status" | tee /tmp/demo-status.json
echo
HTTP=$(curl -s -c "$COOKIE_JAR" -b "$COOKIE_JAR" -o /tmp/demo-seed.json -w "%{http_code}" \
  -X POST "https://admin.demo.memflox.com/api/demo-data/seed")
echo "seed=$HTTP"
cat /tmp/demo-seed.json
echo
[ "$HTTP" = "200" ] || exit 1

echo "==> Verify RBSIS login"
HTTP=$(curl -s -o /tmp/rbsis-login.json -w "%{http_code}" \
  -X POST "https://rbsis-paramaribo.demo.memflox.com/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"username":"demo_rbsis_admin","password":"DemoPass123!"}')
echo "rbsis_admin_login=$HTTP"
python3 -c "import json; d=json.load(open('/tmp/rbsis-login.json')); print('org=', d.get('organizationHandle'), 'name=', d.get('organizationName'))"

echo "DONE — use https://rbsis-paramaribo.demo.memflox.com  (demo_rbsis_admin / DemoPass123!)"
