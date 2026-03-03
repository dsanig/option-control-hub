# PostgreSQL Connection Engine (Local, Docker, Service Mode)

## Root causes fixed

1. The frontend connection test path used an absolute HTTP API URL (`http://localhost:3001/...`) in browser code, causing browser-level `TypeError: Failed to fetch` in deployed environments.
2. Absolute local URLs broke remote clients and Cloudflare Tunnel usage (`localhost` pointed to the viewer's machine, not the API host).
3. HTTPS frontend + HTTP API created mixed-content blocking when hardcoded `http://...` URLs were used.

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

Vite proxies `/api/*` to `http://127.0.0.1:3001` in development, so browser fetches stay same-origin from the browser perspective.

Health checks:

```bash
curl -i http://127.0.0.1:3001/api/health
curl -i http://127.0.0.1:3001/api/health/db
curl -i http://127.0.0.1:3001/api/portfolio/summary
```

Expected status codes:
- `/api/health` => `HTTP/1.1 200 OK`
- `/api/health/db` => `HTTP/1.1 200 OK` when DB is reachable; `HTTP/1.1 503 Service Unavailable` when DB is not reachable.

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

## Cloudflare Tunnel routing (single hostname)

Prefer one public hostname and route by path to avoid CORS and mixed-content problems:

- `https://option-control-hub.example.com/` -> frontend service
- `https://option-control-hub.example.com/api/*` -> API service

Example ingress config is provided at `deploy/cloudflared-ingress.example.yml`.

Keep PostgreSQL private and reachable only on internal network/VPC from the API service. Never expose PostgreSQL to the browser.

## Deterministic verification checklist

1. **Server-local HTTP checks**
   ```bash
   curl -i http://127.0.0.1:${PORT:-3001}/api/health
   curl -i http://127.0.0.1:${PORT:-3001}/api/health/db
   ```

2. **From another LAN machine**
   ```bash
   curl -i http://SERVER_IP:${PORT:-3001}/api/health
   ```
   Expected: `HTTP/1.1 200 OK` (confirms bind on `0.0.0.0` + network reachability).

3. **In browser console (app origin)**
   ```js
   fetch('/api/health').then((r) => r.text()).then(console.log)
   ```

4. **DevTools network validation**
   - Open DevTools -> Network.
   - Trigger the connection test UI action.
   - Confirm request URL is relative (`/api/...`) and response code is `200` (or `503` for DB-down scenarios, but not `(failed)`).

## Troubleshooting matrix

| Error | Likely cause | Fix |
|---|---|---|
| `ECONNREFUSED` | Wrong host/port, DB down, using `localhost` inside container | Use `postgres` service hostname in Docker; verify DB listens on expected interface |
| `ENOTFOUND` | DNS hostname invalid in container/network | Use internal service DNS name or correct host |
| `password authentication failed` | Wrong credentials or wrong auth method | Verify username/password/db and `pg_hba.conf` rules |
| TLS errors (`self signed`, `no pg_hba entry for host ... SSL off`) | SSL mode mismatch | Set `DB_SSL=true` / `PGSSLMODE=require` or disable SSL to match server |
| Timeouts | Network ACL/firewall/security group | Open DB port between API host and DB host only |
| Too many clients | Creating clients per request | Use pooled singleton (`server/db.ts`) and tune `PGPOOL_MAX` |
