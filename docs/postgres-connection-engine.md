# PostgreSQL Connection Engine (Local, Docker, Service Mode)

## Root causes fixed

1. The frontend relied on a hard-coded local API URL (`http://localhost:3001`) which fails in deployed environments.
2. DB clients were created per request with `new Client()`, increasing connection churn and causing avoidable failures under load.
3. No dedicated DB health endpoint existed to validate app->DB connectivity.
4. No production-oriented server deployment artifacts (Docker/systemd/env template) were present.

## Runtime model

- React/Vite frontend (browser)
- Node/Express API server (server-only DB access)
- PostgreSQL accessed only by API server

## Environment variables

Copy `.env.example` to `.env` and set values.

- `DATABASE_URL` preferred; alternatively `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`
- `DB_SSL` / `PGSSLMODE` controls TLS
- `PGPOOL_*` controls pool sizing/timeouts
- `PORTFOLIO_SCHEMA`, `PORTFOLIO_TABLE` controls summary query source

## Local dev

```bash
npm install
npm run dev:api
npm run dev
```

Health checks:

```bash
curl -s http://localhost:3001/api/health
curl -s http://localhost:3001/api/health/db
curl -s http://localhost:3001/api/portfolio/summary
```

## Docker / self-hosted

Use service name `postgres` from inside containers (never `localhost`).

```bash
docker compose up --build
curl -s http://localhost:3001/api/health/db
```

## Production service mode (systemd)

```bash
npm ci
npm run build:api
sudo cp deploy/option-control-hub-api.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now option-control-hub-api
sudo systemctl status option-control-hub-api
```

Create `/etc/option-control-hub/api.env` with DB credentials and API config.

## Cloudflare Tunnel note

Tunnel only the web/app endpoints. Keep PostgreSQL private and reachable only on internal network/VPC from the API service.

## Troubleshooting matrix

| Error | Likely cause | Fix |
|---|---|---|
| `ECONNREFUSED` | Wrong host/port, DB down, using `localhost` inside container | Use `postgres` service hostname in Docker; verify DB listens on expected interface |
| `ENOTFOUND` | DNS hostname invalid in container/network | Use internal service DNS name or correct host |
| `password authentication failed` | Wrong credentials or wrong auth method | Verify username/password/db and `pg_hba.conf` rules |
| TLS errors (`self signed`, `no pg_hba entry for host ... SSL off`) | SSL mode mismatch | Set `DB_SSL=true` / `PGSSLMODE=require` or disable SSL to match server |
| Timeouts | Network ACL/firewall/security group | Open DB port between API host and DB host only |
| Too many clients | Creating clients per request | Use pooled singleton (`server/db.ts`) and tune `PGPOOL_MAX` |
