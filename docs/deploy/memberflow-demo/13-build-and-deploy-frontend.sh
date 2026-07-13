#!/bin/bash
# Build memberflow-frontend from GitHub and deploy demo (+ prod) web containers.
set -euo pipefail

WORK=/tmp/memberflow-frontend-build-$$
REGISTRY=registry.cxode.com
IMAGE=${REGISTRY}/memberflow-frontend:latest

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
docker build -t "$IMAGE" "$WORK/frontend"

echo "==> Push $IMAGE"
docker push "$IMAGE"

echo "==> Recreate demo web"
cd /opt/memberflow-demo
docker compose pull memberflow-demo-web
docker compose up -d --no-deps --force-recreate memberflow-demo-web

echo "==> Recreate prod web (same image/tag; base-domain fix is safe for prod)"
cd /opt/memberflow
docker compose pull memberflow-web
docker compose up -d --no-deps --force-recreate memberflow-web

echo "==> Status"
docker ps --filter name=memberflow --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}'

echo "==> Smoke: demo admin login page"
curl -s -o /dev/null -w "admin.demo=%{http_code}\n" https://admin.demo.memflox.com/login
curl -s -o /dev/null -w "admin.prod=%{http_code}\n" https://admin.memflox.com/login

echo "DONE"
