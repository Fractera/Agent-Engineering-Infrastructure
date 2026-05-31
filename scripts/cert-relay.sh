#!/usr/bin/env bash
# cert-relay.sh — daily relay of the FRESH TLS certificate expiry to Easy Starter.
#
# Runs from a daily cron/systemd timer on the customer VPS (installed by
# bootstrap.sh). It reads the real notAfter date off disk (openssl), so L1 stays
# in sync after certbot auto-renewal AND can fire the cert-expiry warning email
# when the cert drops to <= 14 days. Same server -> L1 channel as the activation
# notify (Bearer SERVER_TOKEN -> /api/server/cert-status).
#
# Self-guarding: exits 0 (no-op) unless the server is in Secure mode with a cert,
# so it is harmless to schedule unconditionally and to run in IP/insecure mode.
# NOTE: no `set -e` on purpose — grep in $(...) returns 1 when a key is absent,
# which would abort before the explicit `[ -n ... ] || exit 0` guards below.
set -uo pipefail

APP_ENV="/opt/fractera/app/.env.local"
ADMIN_ENV="/opt/fractera/bridges/app/.env.local"
SECRETS="/etc/fractera/secrets.env"
UPLOAD_CERT="/etc/fractera/certs/fullchain.pem"

log() { echo "[cert-relay $(date -u +%FT%TZ)] $*"; }

# 1. Secure mode only — IP/insecure mode has no domain cert.
[ -f "$APP_ENV" ] || { log "no app env; skip"; exit 0; }
if ! grep -q '^FRACTERA_IP_NODOMAIN_MODE=false' "$APP_ENV"; then
  log "not in Secure mode; skip"; exit 0
fi

# 2. Domain — derived from AUTH_SERVICE_URL (https://auth.<domain>) set on activation.
auth_url="$(grep -E '^AUTH_SERVICE_URL=' "$APP_ENV" | head -1 | cut -d= -f2- | tr -d '"')"
domain="${auth_url#https://auth.}"
domain="${domain#http://auth.}"
domain="${domain%%/*}"
[ -n "$domain" ] || { log "could not derive domain; skip"; exit 0; }

# 3. SERVER_TOKEN — authenticates the relay to L1.
SERVER_TOKEN="$(grep -E '^SERVER_TOKEN=' "$SECRETS" 2>/dev/null | head -1 | cut -d= -f2- | tr -d '"')"
[ -n "$SERVER_TOKEN" ] || { log "no SERVER_TOKEN; skip"; exit 0; }

# 4. STARTER_URL — same default as the activate route.
STARTER_URL="$(grep -E '^FRACTERA_STARTER_URL=' "$ADMIN_ENV" 2>/dev/null | head -1 | cut -d= -f2- | tr -d '"')"
# Default to the STABLE custom host (not *.vercel.app) so L1 can migrate off
# Vercel by re-pointing DNS, without editing this on every customer server.
[ -n "$STARTER_URL" ] || STARTER_URL="https://www.fractera.ai"

# 5. Cert file — prefer Let's Encrypt live, fall back to an uploaded cert.
cert=""
if [ -f "/etc/letsencrypt/live/$domain/fullchain.pem" ]; then
  cert="/etc/letsencrypt/live/$domain/fullchain.pem"
elif [ -f "$UPLOAD_CERT" ]; then
  cert="$UPLOAD_CERT"
else
  log "no cert on disk for $domain; skip"; exit 0
fi

# 6. notAfter -> ISO 8601 (UTC).
not_after="$(openssl x509 -enddate -noout -in "$cert" | cut -d= -f2-)"
cert_iso="$(date -u -d "$not_after" +%Y-%m-%dT%H:%M:%SZ 2>/dev/null)" || { log "cannot parse notAfter '$not_after'; skip"; exit 0; }

# 7. Relay to L1 (best-effort; cron will retry tomorrow).
code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 \
  -X POST "$STARTER_URL/api/server/cert-status" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $SERVER_TOKEN" \
  -d "{\"certExpiresAt\":\"$cert_iso\",\"domain\":\"$domain\"}" || echo "000")"

log "relayed $domain expiry=$cert_iso -> $STARTER_URL HTTP $code"
[ "$code" = "200" ] || exit 1
