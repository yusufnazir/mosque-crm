#!/bin/bash
set -euo pipefail
echo "=== DNS ==="
for h in demo.memflox.com auth.demo.memflox.com admin.demo.memflox.com demo-baiturrochim.demo.memflox.com sis.demo.memflox.com; do
  printf '%-45s %s\n' "$h" "$(dig +short "$h" | tr '\n' ' ')"
done
echo "=== certbot ==="
certbot --version
certbot plugins 2>&1 | head -40
echo "=== nginx conf.d ==="
ls /var/lib/docker/volumes/nginx_data/_data/conf.d/
echo "=== map ==="
grep -n 'memberflow\|upstream\|proxy_pass\|server_name' /var/lib/docker/volumes/nginx_data/_data/conf.d/memflox.conf | head -40
echo "=== backup exists? ==="
ls -la /var/lib/docker/volumes/nginx_data/_data/conf.d/memflox.conf.bak* 2>/dev/null || true
