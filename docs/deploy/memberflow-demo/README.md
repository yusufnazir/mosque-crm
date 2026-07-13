# MemberFlow DEMO environment (Contabo)

Isolated from production. Prod stack remains in `/opt/memberflow`.

## Routing (target layout)

```text
Prod:  *.memflox.com        → memberflow-web      → memberflow-service      → DB memberflow
Demo:  *.demo.memflox.com    → memberflow-demo-web → memberflow-demo-service → DB memberflow_demo
Site:  www.memflox.com      → memberflow-site
```

| Item | Value |
|------|--------|
| Compose | `/opt/memberflow-demo/docker-compose.yml` |
| Containers | `memberflow-demo-web`, `memberflow-demo-service` |
| Database | `memberflow_demo` on `mariadb-prod` |
| Secrets | `/opt/memberflow-demo/.env` (chmod 600) |
| Nginx | `memflox-demo.conf` |
| TLS | `demo.memflox.com` + `*.demo.memflox.com` (acme.sh / Namecheap DNS) |
| App base domain | `demo.memflox.com` |
| Federation parent | **RBSIS Paramaribo** (`rbsis-paramaribo`) |

## URLs

| URL | Purpose |
|-----|---------|
| https://auth.demo.memflox.com/login | Demo login entry |
| https://admin.demo.memflox.com/login | Demo superadmin |
| https://rbsis-paramaribo.demo.memflox.com | RBSIS Paramaribo (federation) |
| https://demo-baiturrochim.demo.memflox.com | Mosque Baitur Rochim |
| https://demo.memflox.com | Redirects to auth.demo.memflox.com |

## Demo credentials

Password for all demo_* users: `DemoPass123!`

- `demo_baitur_member` — My Businesses
- `demo_baitur_admin` — Directory Admin
- `demo_rbsis_admin` — Partnerships (RBSIS Paramaribo)

## Ops

```bash
cd /opt/memberflow-demo
docker compose ps
docker compose pull && docker compose up -d
# Full demo reset + reseed:
# bash 14-reseed-demo-rbsis.sh
```

Cert renewal is handled by acme.sh (reloadcmd reloads `nginx-base`).
