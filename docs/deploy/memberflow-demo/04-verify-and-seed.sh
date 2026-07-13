#!/bin/bash
set -euo pipefail

echo "Hit demo host (should log on demo-web)..."
BEFORE="$(docker logs memberflow-demo-web 2>&1 | wc -l)"
curl -s -o /dev/null -w "demo_http=%{http_code}\n" "https://demo.memflox.com/login"
sleep 1
AFTER="$(docker logs memberflow-demo-web 2>&1 | wc -l)"
echo "demo-web log lines before=$BEFORE after=$AFTER"

echo "Hit prod admin (should NOT increase demo-web much)..."
BEFORE2="$(docker logs memberflow-demo-web 2>&1 | wc -l)"
curl -s -o /dev/null -w "admin_http=%{http_code}\n" "https://admin.memflox.com/login"
sleep 1
AFTER2="$(docker logs memberflow-demo-web 2>&1 | wc -l)"
echo "demo-web log lines before=$BEFORE2 after=$AFTER2"

echo "Prod API health via admin host login API path..."
curl -s -o /dev/null -w "prod_api=%{http_code}\n" -X POST "https://admin.memflox.com/api/auth/login" -H 'Content-Type: application/json' -d '{"username":"x","password":"y"}' || true

echo "Demo API via demo host..."
curl -s -o /dev/null -w "demo_api=%{http_code}\n" -X POST "https://demo.memflox.com/api/auth/login" -H 'Content-Type: application/json' -d '{"username":"x","password":"y"}' || true

echo "Try seed login as administrator on demo (try known passwords)..."
for pw in '13Jul1980' 'admin123' 'DemoPass123!'; do
  CODE=$(curl -s -o /tmp/demo-login.json -w "%{http_code}" -X POST "https://demo.memflox.com/api/auth/login" \
    -H 'Content-Type: application/json' \
    -d "{\"username\":\"administrator\",\"password\":\"$pw\"}")
  echo "password_try http=$CODE"
  if [ "$CODE" = "200" ]; then
    echo "LOGIN_OK with one of the tried passwords"
    # extract cookie if any — BFF may set cookie; also try Authorization from body
    cat /tmp/demo-login.json | head -c 300; echo
    break
  fi
done
