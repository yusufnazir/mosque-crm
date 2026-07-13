#!/bin/bash
set -euo pipefail
set -a
# shellcheck disable=SC1091
. /opt/memberflow/.registry-env
set +a
echo "$NEXUS_PASSWORD" | docker login registry.cxode.com -u "$NEXUS_USER" --password-stdin
cd /opt/memberflow-demo
docker compose pull
docker compose up -d
echo "=== memberflow containers ==="
docker ps --filter name=memberflow --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}'
