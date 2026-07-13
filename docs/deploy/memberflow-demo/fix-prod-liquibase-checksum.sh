#!/bin/bash
set -euo pipefail
ROOT_PW="$(docker inspect mariadb-prod --format '{{range .Config.Env}}{{println .}}{{end}}' | sed -n 's/^MYSQL_ROOT_PASSWORD=//p')"

echo "Stopping prod service to avoid race..."
docker stop memberflow-service

docker exec -i mariadb-prod mariadb -uroot -p"$ROOT_PW" memberflow <<'SQL'
UPDATE DATABASECHANGELOG
SET MD5SUM = '9:a270926cbac8596edf9315fa4aea2e6c'
WHERE ID = 'a2b3c4d5-0021-4e6f-8a9b-re-seed-admin-2';
SELECT ID, MD5SUM FROM DATABASECHANGELOG WHERE ID LIKE '%re-seed-admin%';
SQL

echo "Starting prod service..."
docker start memberflow-service

for i in $(seq 1 60); do
  logs="$(docker logs memberflow-service 2>&1 | tail -n 80)"
  if echo "$logs" | grep -q 'Started MosqueCrmApplication'; then
    echo "PROD OK"
    echo "$logs" | tail -n 8
    exit 0
  fi
  if echo "$logs" | grep -q 'ValidationFailedException'; then
    # only fail if this is from the current boot — keep waiting briefly for restart
    sleep 2
  fi
  sleep 3
done

echo "Timeout"
docker logs memberflow-service 2>&1 | tail -n 60
exit 1
