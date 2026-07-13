#!/bin/bash
set -euo pipefail

COOKIE_JAR=/tmp/demo-cookies.txt
rm -f "$COOKIE_JAR"

# First password that worked in verify script
PASS='13Jul1980'

echo "Logging in as administrator on demo..."
HTTP=$(curl -s -c "$COOKIE_JAR" -b "$COOKIE_JAR" -o /tmp/demo-login.json -w "%{http_code}" \
  -X POST "https://demo.memflox.com/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"username\":\"administrator\",\"password\":\"$PASS\"}")
echo "login=$HTTP"
if [ "$HTTP" != "200" ]; then
  echo "Login failed"; cat /tmp/demo-login.json; exit 1
fi

echo "Demo-data status..."
curl -s -c "$COOKIE_JAR" -b "$COOKIE_JAR" "https://demo.memflox.com/api/demo-data/status" | tee /tmp/demo-status.json
echo

CAN=$(python3 -c "import json; print(json.load(open('/tmp/demo-status.json')).get('canCreate'))")
echo "canCreate=$CAN"

if [ "$CAN" != "True" ] && [ "$CAN" != "true" ]; then
  echo "Cannot seed (already seeded or orgs exist). Status above."
  exit 0
fi

echo "Seeding demo data (may take a minute)..."
HTTP=$(curl -s -c "$COOKIE_JAR" -b "$COOKIE_JAR" -o /tmp/demo-seed.json -w "%{http_code}" \
  -X POST "https://demo.memflox.com/api/demo-data/seed")
echo "seed=$HTTP"
cat /tmp/demo-seed.json
echo

if [ "$HTTP" != "200" ]; then
  exit 1
fi

echo "DONE. Try: https://demo-baiturrochim.memflox.com/login  (demo_baitur_member / DemoPass123!)"
