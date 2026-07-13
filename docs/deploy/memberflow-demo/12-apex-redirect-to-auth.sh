#!/bin/bash
# Point demo apex to auth subdomain (apex cannot be inferred as a multi-label base).
set -euo pipefail
CONF=/var/lib/docker/volumes/nginx_data/_data/conf.d/memflox-demo.conf
cp -a "$CONF" "$CONF.bak.before-apex-redirect"
python3 - <<'PY'
from pathlib import Path
path = Path("/var/lib/docker/volumes/nginx_data/_data/conf.d/memflox-demo.conf")
text = path.read_text()
old = """server {
    listen 443 ssl;
    server_name demo.memflox.com;

    ssl_certificate     /etc/letsencrypt/live/demo.memflox.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/demo.memflox.com/privkey.pem;

    location / {
        resolver 127.0.0.11 valid=30s;
        proxy_pass http://memberflow_demo_frontend;
"""
new = """server {
    listen 443 ssl;
    server_name demo.memflox.com;

    ssl_certificate     /etc/letsencrypt/live/demo.memflox.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/demo.memflox.com/privkey.pem;

    # Apex is the base domain itself — send users to the auth entrypoint.
    location = / {
        return 302 https://auth.demo.memflox.com/login;
    }
    location / {
        resolver 127.0.0.11 valid=30s;
        proxy_pass http://memberflow_demo_frontend;
"""
if "auth.demo.memflox.com/login" in text:
    print("apex redirect already present")
elif old not in text:
    raise SystemExit("unexpected memflox-demo.conf shape")
else:
    path.write_text(text.replace(old, new, 1))
    print("apex redirect added")
PY
docker exec nginx-base nginx -t
docker exec nginx-base nginx -s reload
echo "nginx reloaded"
