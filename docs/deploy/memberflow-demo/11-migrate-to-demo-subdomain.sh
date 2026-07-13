#!/bin/bash
# Migrate demo to *.demo.memflox.com (isolated hostname + cert).
# Restores prod *.memflox.com routing. Does not touch prod DB data.
set -euo pipefail

NGINX_CONF_DIR=/var/lib/docker/volumes/nginx_data/_data/conf.d
PROD_CONF="$NGINX_CONF_DIR/memflox.conf"
DEMO_CONF="$NGINX_CONF_DIR/memflox-demo.conf"
PROD_BAK="$NGINX_CONF_DIR/memflox.conf.bak.before-demo"
ACME=/root/.acme.sh/acme.sh
CERT_LIVE=/etc/letsencrypt/live/demo.memflox.com

echo "==> 1) Restore prod memflox.conf (remove demo* map)"
if [[ -f "$PROD_BAK" ]]; then
  cp -a "$PROD_CONF" "$NGINX_CONF_DIR/memflox.conf.bak.before-demo-domain-migration"
  cp -a "$PROD_BAK" "$PROD_CONF"
  echo "Restored from bak.before-demo"
else
  echo "ERROR: missing $PROD_BAK"; exit 1
fi

echo "==> 2) Issue TLS cert for demo.memflox.com + *.demo.memflox.com"
# shellcheck disable=SC1091
source /root/.acme.sh/acme.sh.env 2>/dev/null || true
if [[ -f "$CERT_LIVE/fullchain.pem" ]]; then
  echo "Cert already present at $CERT_LIVE — skipping issue"
else
  "$ACME" --issue \
    -d demo.memflox.com \
    -d '*.demo.memflox.com' \
    --dns dns_namecheap \
    --server letsencrypt
  mkdir -p "$CERT_LIVE"
  "$ACME" --install-cert -d demo.memflox.com \
    --fullchain-file "$CERT_LIVE/fullchain.pem" \
    --cert-file "$CERT_LIVE/cert.pem" \
    --key-file "$CERT_LIVE/privkey.pem" \
    --ca-file "$CERT_LIVE/chain.pem" \
    --reloadcmd "docker exec nginx-base nginx -t && docker exec nginx-base nginx -s reload"
fi

echo "==> 3) Write memflox-demo.conf"
cat > "$DEMO_CONF" <<'EOF'
map $http_upgrade $connection_upgrade_demo {
    default upgrade;
    ''      close;
}

upstream memberflow_demo_frontend {
    server memberflow-demo-web:3000;
    keepalive 32;
}

server {
    listen 443 ssl;
    server_name demo.memflox.com;

    ssl_certificate     /etc/letsencrypt/live/demo.memflox.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/demo.memflox.com/privkey.pem;

    location / {
        resolver 127.0.0.11 valid=30s;
        proxy_pass http://memberflow_demo_frontend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade_demo;
        proxy_buffering off;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
        proxy_connect_timeout 60s;
        add_header Content-Security-Policy "
          default-src 'self' 'unsafe-inline' 'unsafe-eval';
          style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
          font-src 'self' https://fonts.gstatic.com data:;
          connect-src 'self' https://demo.memflox.com https://*.demo.memflox.com;
          img-src 'self' data: blob: *;
          object-src 'none';
        ";
    }
}

server {
    listen 443 ssl;
    server_name ~^(?<tenant>.+)\.demo\.memflox\.com$;

    ssl_certificate     /etc/letsencrypt/live/demo.memflox.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/demo.memflox.com/privkey.pem;

    location / {
        resolver 127.0.0.11 valid=30s;
        proxy_pass http://memberflow_demo_frontend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Tenant $tenant;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade_demo;
        proxy_buffering off;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
        proxy_connect_timeout 60s;
        add_header Content-Security-Policy "
          default-src 'self' 'unsafe-inline' 'unsafe-eval';
          style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
          font-src 'self' https://fonts.gstatic.com data:;
          connect-src 'self' https://demo.memflox.com https://*.demo.memflox.com;
          img-src 'self' data: blob: *;
          object-src 'none';
        ";
    }
}

server {
    listen 80;
    server_name demo.memflox.com *.demo.memflox.com;
    return 301 https://$host$request_uri;
}
EOF

echo "==> 4) Set demo APP_BASE_DOMAIN=demo.memflox.com"
ROOT_PW="$(docker inspect mariadb-prod --format '{{range .Config.Env}}{{println .}}{{end}}' | sed -n 's/^MYSQL_ROOT_PASSWORD=//p')"
docker exec -i mariadb-prod mariadb -uroot -p"$ROOT_PW" memberflow_demo <<'SQL'
UPDATE configurations SET value='demo.memflox.com' WHERE name='APP_BASE_DOMAIN' AND organization_id IS NULL;
INSERT INTO configurations(name, value, organization_id)
SELECT 'APP_BASE_DOMAIN', 'demo.memflox.com', NULL
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM configurations WHERE name='APP_BASE_DOMAIN' AND organization_id IS NULL
);
SELECT name, value FROM configurations WHERE name IN ('APP_BASE_DOMAIN','SUPERADMIN_SUBDOMAIN') AND organization_id IS NULL;
SQL

echo "==> 5) Reload nginx"
docker exec nginx-base nginx -t
docker exec nginx-base nginx -s reload

echo "==> 6) Smoke tests"
curl -s -o /dev/null -w "prod_admin=%{http_code}\n" https://admin.memflox.com/login
curl -s -o /dev/null -w "demo_apex=%{http_code}\n" https://demo.memflox.com/login
curl -s -o /dev/null -w "demo_auth=%{http_code}\n" https://auth.demo.memflox.com/login
curl -s -o /dev/null -w "demo_tenant=%{http_code}\n" https://demo-baiturrochim.demo.memflox.com/login

echo "Cert SANs:"
openssl x509 -in "$CERT_LIVE/fullchain.pem" -noout -text | grep -A1 'Subject Alternative Name'

HTTP=$(curl -s -o /tmp/demo-member.json -w "%{http_code}" -X POST \
  https://demo-baiturrochim.demo.memflox.com/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"demo_baitur_member","password":"DemoPass123!"}')
echo "member_login=$HTTP"
python3 -c "import json; d=json.load(open('/tmp/demo-member.json')); print('org=',d.get('organizationHandle'),'domain=',d.get('appBaseDomain'))"

echo "DONE"
