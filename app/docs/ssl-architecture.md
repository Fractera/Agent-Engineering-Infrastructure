# SSL Architecture — LEGACY (Cloudflare era, 2026-05-15 → 2026-05-28)

> **STATUS: SUPERSEDED.** Kept for historical reference only. As of the IP-first
> migration (commits `7bc0182` and onwards) Fractera no longer uses Cloudflare,
> Cloudflare DNS, or Cloudflare Origin Certificates. New deploys are HTTP on the
> public IP until the user attaches their own domain, at which point the admin
> app provisions Let's Encrypt directly on the server.
>
> Do not build new logic from this document. Refer to it only when investigating
> servers deployed before 2026-05-28.

## Overview

Fractera deploys behind **Cloudflare proxy**. The server **does not run certbot**
and **does not hold Let's Encrypt certificates**. Edge SSL is handled by Cloudflare
Total TLS; the origin connection (Cloudflare → server) is secured with a long-lived
Cloudflare Origin Certificate.

## Architecture

```
User browser
    ↓ HTTPS (Edge cert from Total TLS / Universal SSL)
Cloudflare edge
    ↓ HTTPS (Origin cert *.fractera.ai, *..fractera.ai)
nginx on origin server (port 443)
    ↓ HTTP (loopback)
Service (3000/3001/3002/3300/9119/9621)
```

## Component breakdown

| Layer | What | Where |
|---|---|---|
| Edge SSL (browser ↔ Cloudflare) | Total TLS via Google Trust Services | Managed in Cloudflare Dashboard (free with ACM subscription) |
| Origin SSL (Cloudflare ↔ server) | Cloudflare Origin Certificate, 15-year validity | `/etc/ssl/cloudflare/origin.{crt,key}` |
| Origin cert delivery | Easy Starter API `/api/ssl-cert` returns `CF_ORIGIN_CERT` + `CF_ORIGIN_KEY` from Vercel env | Bootstrap downloads on each install |
| DNS records | Created via Cloudflare API with `proxied: true` | `lib/cloudflare.ts` in Easy Starter |
| nginx SSL config | `/etc/nginx/cf-ssl.conf` (shared include block) | Written by bootstrap.sh `get_cf_cert` step |

## Required Cloudflare zone configuration (one-time, manual)

These are **not in code** — they must be set in Cloudflare Dashboard for the
zone `fractera.ai`:

1. **Advanced Certificate Manager** subscription — $10/month
   `dash.cloudflare.com → fractera.ai → SSL/TLS → Edge Certificates → Subscribe to ACM`

2. **Total TLS** enabled with CA = **Google Trust Services**
   - Google Trust Services is required because Let's Encrypt does not issue
     multi-level wildcards (`*.*.fractera.ai`).
   - Universal SSL alone covers only first-level subdomains.

3. **SSL/TLS Mode** = **Full** (NOT Full strict)
   - Full strict validates origin cert hostname strictly — multi-level wildcards
     in Origin Cert fail strict validation through Cloudflare's edge.

4. **Cloudflare Origin Certificate** generated in Origin Server section:
   - Hostnames: `*.fractera.ai`, `fractera.ai`, `*..fractera.ai` (Cloudflare's
     notation for second-level wildcard)
   - Validity: 15 years
   - Stored as `CF_ORIGIN_CERT` and `CF_ORIGIN_KEY` Vercel env vars.

## Per-server flow (automatic)

1. Bootstrap detects server IP
2. Calls Easy Starter `/api/register` → Cloudflare DNS record created
   for `SUBDOMAIN.fractera.ai` with `proxied: true`
3. Calls `/api/register-subdomain` 5× for `auth.`, `admin.`, `data.`,
   `lightrag.`, `hermes.` — all proxied
4. Total TLS immediately starts provisioning edge certs (5-15 min async)
5. Bootstrap calls Easy Starter `/api/ssl-cert` with `INSTALL_SECRET`
6. Saves origin cert to `/etc/ssl/cloudflare/origin.{crt,key}`
7. nginx writes HTTPS config using the origin cert
8. By the time bootstrap finishes (~15-20 min), Total TLS certs are ready
9. User can access all six subdomains over HTTPS

## What CHANGED from the old setup

| Aspect | Before (≤2026-05-14) | After (2026-05-15+) |
|---|---|---|
| Server-side SSL | Let's Encrypt via certbot | Cloudflare Origin Certificate |
| Rate limit | 50 certs/week per `fractera.ai` | None |
| Renewal | certbot auto on server | Cloudflare auto (server cert valid 15y, edge certs auto-renewed) |
| DNS proxy | `proxied: false` (grey cloud) | `proxied: true` (orange cloud) |
| nginx packages | `certbot python3-certbot-nginx` | none |
| Failure modes | Rate-limit lockout, cert expiry on server | Cloudflare service issues only |

## Capacity & limits

| Limit | Value |
|---|---|
| Edge certs (Total TLS) | Unlimited within ACM |
| Origin cert SANs | 100 hostnames per cert (we use 3 wildcards) |
| Origin cert validity | 15 years (one-time renewal) |
| Cost | $10/month for ACM subscription on `fractera.ai` zone |

## Hermes Web Dashboard — special note

Hermes runs at `127.0.0.1:9119` with FastAPI **DNS rebinding protection**:
it rejects requests whose `Host` header does not match the bound interface.

When nginx proxies `https://hermes.SUBDOMAIN.fractera.ai/` to Hermes, the
original `Host` header would be `hermes.SUBDOMAIN.fractera.ai` — Hermes
rejects it with `400 Invalid Host header`.

**Fix:** nginx hermes block rewrites `Host: 127.0.0.1:9119` for the upstream
connection. Original hostname is preserved in `X-Forwarded-Host` for any
application logic that needs it.

```nginx
proxy_set_header Host 127.0.0.1:9119;
proxy_set_header X-Forwarded-Host $host;
```

This is the cleanest fix — Hermes stays bound to loopback (no `--insecure`
flag needed), and the dashboard is reachable through nginx.

## Hermes PM2 startup — special note

Hermes is a Python application but its binary at
`/usr/local/lib/hermes-agent/venv/bin/hermes` is a Python script with shebang.
PM2 defaults to Node.js interpreter — running the script as JS causes
`SyntaxError: Invalid or unexpected token` on the `# -*- coding: utf-8 -*-`
comment line.

**Fix:** PM2 start command includes `--interpreter $HERMES_PY` pointing to
the venv Python interpreter (same pattern as `fractera-rag`).

```bash
HERMES_PY=/usr/local/lib/hermes-agent/venv/bin/python
HERMES_BIN=/usr/local/lib/hermes-agent/venv/bin/hermes
pm2 start $HERMES_BIN --name fractera-hermes --interpreter $HERMES_PY \
  -- dashboard --host 127.0.0.1 --port 9119 --no-open
```

## DO NOT do these on the server

- ❌ Install certbot (`apt install certbot`)
- ❌ Run `certbot --nginx` for any reason
- ❌ Replace `/etc/ssl/cloudflare/origin.crt` with a Let's Encrypt cert
- ❌ Set Cloudflare DNS records to grey cloud (`proxied: false`)
- ❌ Change SSL/TLS mode in Cloudflare Dashboard away from "Full"

If something seems wrong with SSL, the fix is in Cloudflare Dashboard, not
on the server.
