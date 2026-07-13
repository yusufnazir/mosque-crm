#!/bin/bash
set -euo pipefail
ROOT_PW="$(docker inspect mariadb-prod --format '{{range .Config.Env}}{{println .}}{{end}}' | sed -n 's/^MYSQL_ROOT_PASSWORD=//p')"

docker exec -i mariadb-prod mariadb -uroot -p"$ROOT_PW" memberflow_demo <<'SQL'
SELECT name, value FROM configurations WHERE organization_id IS NULL AND (name LIKE '%DOMAIN%' OR name LIKE '%URL%' OR name LIKE '%BASE%');
SQL

# Ensure APP_BASE_DOMAIN is memflox.com for cookie/subdomain routing
EXISTS=$(docker exec -i mariadb-prod mariadb -uroot -p"$ROOT_PW" -N memberflow_demo -e "SELECT COUNT(*) FROM configurations WHERE name='APP_BASE_DOMAIN' AND organization_id IS NULL")
if [ "$EXISTS" = "0" ]; then
  docker exec -i mariadb-prod mariadb -uroot -p"$ROOT_PW" memberflow_demo -e "INSERT INTO configurations(name, value, organization_id) VALUES('APP_BASE_DOMAIN', 'memflox.com', NULL)"
  echo "Inserted APP_BASE_DOMAIN=memflox.com"
else
  docker exec -i mariadb-prod mariadb -uroot -p"$ROOT_PW" memberflow_demo -e "UPDATE configurations SET value='memflox.com' WHERE name='APP_BASE_DOMAIN' AND organization_id IS NULL"
  echo "Updated APP_BASE_DOMAIN=memflox.com"
fi

echo "=== member login smoke test ==="
HTTP=$(curl -s -o /tmp/member-login.json -w "%{http_code}" -X POST "https://demo-baiturrochim.memflox.com/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"username":"demo_baitur_member","password":"DemoPass123!"}')
echo "member_login=$HTTP"
python3 -c "import json; d=json.load(open('/tmp/member-login.json')); print('org=', d.get('organizationHandle'), 'appBaseDomain=', d.get('appBaseDomain'))"

echo
echo "=== prod still up ==="
curl -s -o /dev/null -w "admin=%{http_code}\n" https://admin.memflox.com/login
curl -s -o /dev/null -w "prod_api=%{http_code}\n" -X POST https://admin.memflox.com/api/auth/login -H 'Content-Type: application/json' -d '{"username":"x","password":"y"}'

echo "=== memory ==="
docker stats --no-stream --format 'table {{.Name}}\t{{.MemUsage}}' memberflow-web memberflow-service memberflow-demo-web memberflow-demo-service mariadb-prod
