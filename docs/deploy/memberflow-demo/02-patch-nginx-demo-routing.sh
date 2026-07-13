#!/bin/bash
# Patch nginx memflox.conf to route only demo* tenants to memberflow-demo-web.
# Prod default upstream stays memberflow-web. Reloads nginx only (no recreate).
set -euo pipefail

CONF="/var/lib/docker/volumes/nginx_data/_data/conf.d/memflox.conf"
BACKUP="/var/lib/docker/volumes/nginx_data/_data/conf.d/memflox.conf.bak.before-demo"

if grep -q 'memberflow-demo-web' "$CONF"; then
  echo "Demo routing already present in memflox.conf — skipping patch."
  exit 0
fi

cp -a "$CONF" "$BACKUP"

python3 - <<'PY'
from pathlib import Path
path = Path("/var/lib/docker/volumes/nginx_data/_data/conf.d/memflox.conf")
text = path.read_text()

if "memberflow-demo-web" in text:
    raise SystemExit(0)

map_block = """map $tenant $memberflow_ui {
    default                 memberflow-web:3000;
    demo                    memberflow-demo-web:3000;
    demo-sis                memberflow-demo-web:3000;
    demo-baiturrochim       memberflow-demo-web:3000;
    demo-daruliman          memberflow-demo-web:3000;
    demo-annur              memberflow-demo-web:3000;
}

"""

# Insert map after connection_upgrade map block (after first closing brace section)
if "map $http_upgrade $connection_upgrade" not in text:
    raise SystemExit("unexpected nginx config shape")

# Remove fixed upstream block if present — variable proxy_pass will be used
import re
text2 = re.sub(
    r"upstream memberflow_frontend \{\s*server memberflow-web:3000;\s*keepalive 32;\s*\}\s*",
    map_block,
    text,
    count=1,
)
if text2 == text:
    # insert map at top if upstream pattern differed
    text2 = map_block + text

text2 = text2.replace(
    "proxy_pass http://memberflow_frontend;",
    "proxy_pass http://$memberflow_ui;",
)
if "proxy_pass http://$memberflow_ui;" not in text2:
    raise SystemExit("failed to rewrite proxy_pass")

path.write_text(text2)
print("memflox.conf updated")
PY

docker exec nginx-base nginx -t
docker exec nginx-base nginx -s reload
echo "nginx reloaded with demo routing"
