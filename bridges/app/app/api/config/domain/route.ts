import { NextRequest, NextResponse } from "next/server";
import { execSync, exec } from "child_process";
import { writeFileSync, mkdirSync } from "fs";
import Database from "better-sqlite3";
import { requireAuth } from "@/lib/require-auth";

const APP_DB = process.env.APP_DB_PATH ?? "/opt/fractera/app/data/app.db";

// The set of hostnames Fractera serves over HTTPS once a custom domain is
// attached. Apex + www → public site, the other five → internal services
// proxied behind their own subdomain so each gets a valid TLS certificate
// (and the admin iframe doesn't hit mixed-content errors).
// "chat" is the dedicated subdomain for the built-in Hermes Web Chat (:9120) —
// the friendly "Remote Command Post" the user manages the whole project from.
// It gets its own A-record, its own cert SAN (certbot --expand picks it up from
// this list), and an auth_request-gated nginx block. The legacy hermes/<domain>
// /chat/ path stays working too (back-compat).
const SUBDOMAINS = ["", "www", "auth", "admin", "data", "hermes", "lightrag", "chat"] as const;
const PROXY_PORTS: Record<string, number> = {
  "":         3000,
  "www":      3000,
  "auth":     3001,
  "admin":    3002,
  "data":     3300,
  "hermes":   9119,
  "lightrag": 9621,
  "chat":     9120,
};

// Where uploaded (non Let's Encrypt) certificates land. The same pair lives
// in /etc/letsencrypt/live/<domain>/{fullchain.pem,privkey.pem} when issued
// by certbot, so the nginx template just points at one canonical location
// depending on `cert_source`.
const CUSTOM_CERT_DIR = "/etc/fractera/certs";

// Bridge WebSocket servers (bridges/platforms/server.js) listen on these loopback
// ports. In domain/Secure mode the browser can't reach them directly (mixed
// content on HTTPS), so nginx proxies them as wss under the cert-covered admin
// host: wss://admin.<domain>/ws/<name>/ → 127.0.0.1:<port>/. The PTY bridge
// (/ws/pty/bridge/ → :3201/bridge/) drives every terminal; the rest mirror the
// IP-mode ports so the online-check and any per-platform bridge keep working.
const BRIDGE_WS_PORTS: Record<string, number> = {
  pty: 3201, claude: 3200, codex: 3202, gemini: 3203, qwen: 3204, kimi: 3205,
};
const ADMIN_WS_LOCATIONS = Object.entries(BRIDGE_WS_PORTS).map(([name, p]) =>
`    location /ws/${name}/ {
        proxy_pass http://127.0.0.1:${p}/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }
`).join("");

// "Powered by Fractera" footer injected at the nginx layer (no trace in app code,
// so the customer can't strip it from the app source). It is a PLAIN crawlable
// dofollow <a> — NOT obfuscated JS — so search engines see it and pass link
// equity to the repo (an earlier char-array/JS version was invisible to crawlers
// and passed ~zero weight). The <div> is inserted right before </body> in normal
// document flow → it sits at the bottom of the PAGE (visible on scroll), not
// pinned to the viewport. White strip, black 10px link, no underline, same-tab,
// no rel. Only the public-site hosts (apex + www on :3000) get it; the internal
// services (auth/admin/data/hermes/lightrag) stay untouched.
// The three directive lines below are load-bearing markers for White-Label removal
// (lib/bootstrap.sh + config/white-label/route.ts) — keep their exact form.
const FOOTER_HTML =
  `<div style="width:100%;background:#fff;text-align:center;padding:3px 0;line-height:1.4"><a href="https://github.com/Fractera/ai-workspace" style="font-size:10px;color:#000;text-decoration:none">Powered by Fractera</a></div>`;
const FOOTER_DIRECTIVES =
  `        proxy_set_header Accept-Encoding "";\n` +
  `        sub_filter_once on;\n` +
  `        sub_filter '</body>' '${FOOTER_HTML}</body>';\n`;

function getDb() {
  const db = new Database(APP_DB);
  db.exec(`CREATE TABLE IF NOT EXISTS site_settings (
    id              INTEGER PRIMARY KEY DEFAULT 1,
    custom_domain   TEXT,
    domain_status   TEXT NOT NULL DEFAULT 'idle',
    domain_error    TEXT,
    cert_source     TEXT NOT NULL DEFAULT 'auto',
    cert_expires_at TEXT,
    updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
  )`);
  // Best-effort ALTER for tables that pre-date these columns. Ignore if they
  // already exist (sqlite throws on duplicate column).
  try { db.exec("ALTER TABLE site_settings ADD COLUMN cert_source TEXT NOT NULL DEFAULT 'auto'"); } catch {}
  try { db.exec("ALTER TABLE site_settings ADD COLUMN cert_expires_at TEXT"); } catch {}
  return db;
}

type SiteSettingsRow = {
  custom_domain?: string | null;
  domain_status?: string;
  domain_error?: string | null;
  cert_source?: string;
  cert_expires_at?: string | null;
};

function upsert(db: Database.Database, domain: string, status: string, error: string | null, opts?: { certSource?: "auto" | "upload"; certExpiresAt?: string | null }) {
  const prev = db.prepare("SELECT cert_source, cert_expires_at FROM site_settings WHERE id = 1").get() as { cert_source?: string; cert_expires_at?: string | null } | undefined;
  const certSource     = opts?.certSource     ?? prev?.cert_source     ?? "auto";
  const certExpiresAt  = opts?.certExpiresAt  ?? prev?.cert_expires_at ?? null;
  db.prepare(
    `INSERT OR REPLACE INTO site_settings (id, custom_domain, domain_status, domain_error, cert_source, cert_expires_at, updated_at)
     VALUES (1, ?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%SZ','now'))`
  ).run(domain, status, error, certSource, certExpiresAt);
}

function getServerIp(): string {
  try { return execSync("hostname -I", { timeout: 3000 }).toString().trim().split(/\s+/)[0] ?? ""; }
  catch { return ""; }
}

// Read the TLS cert expiry already computed + stored in site_settings (the SSL
// step writes it via readCertExpiry). Exported so the activate flow can relay
// it to Easy Starter, which surfaces a countdown on the dashboard. Returns an
// ISO string or null.
export function readStoredCertExpiry(): string | null {
  try {
    const db = getDb();
    const row = db.prepare("SELECT cert_expires_at FROM site_settings WHERE id = 1").get() as { cert_expires_at?: string | null } | undefined;
    db.close();
    return row?.cert_expires_at ?? null;
  } catch {
    return null;
  }
}

function readCertExpiry(certPath: string): string | null {
  try {
    const out = execSync(`openssl x509 -enddate -noout -in ${certPath}`, { timeout: 3000 }).toString().trim();
    // notAfter=May 29 12:34:56 2026 GMT
    const m = out.match(/notAfter=(.+)/);
    if (!m) return null;
    return new Date(m[1]).toISOString();
  } catch { return null; }
}

function hostFor(prefix: string, domain: string): string {
  return prefix ? `${prefix}.${domain}` : domain;
}

function buildNginxConfig(domain: string, certSource: "auto" | "upload"): string {
  // Certificate file paths depend on who issued: Let's Encrypt → standard
  // certbot layout; upload → user-supplied PEM/KEY at a fixed location.
  const certPath = certSource === "upload"
    ? `${CUSTOM_CERT_DIR}/${domain}/fullchain.pem`
    : `/etc/letsencrypt/live/${domain}/fullchain.pem`;
  const keyPath = certSource === "upload"
    ? `${CUSTOM_CERT_DIR}/${domain}/privkey.pem`
    : `/etc/letsencrypt/live/${domain}/privkey.pem`;

  const blocks = SUBDOMAINS.map((prefix) => {
    const host = hostFor(prefix, domain);
    const port = PROXY_PORTS[prefix];
    // Footer only on the public site (apex + www → shell on :3000), never on
    // the internal-service hosts.
    const footer = (prefix === "" || prefix === "www") ? FOOTER_DIRECTIVES : "";
    // Auth gating for the internal-service hosts. hermes (agent dashboard :9119 +
    // chat /chat/→:9120) and lightrag (:9621) must NOT be reachable anonymously —
    // each proxied location requires a valid Fractera session (nginx auth_request
    // → services/auth /api/session/verify). The session cookie is shared across
    // *.${domain} (COOKIE_DOMAIN=.${domain}), so the admin iframes pass; a cold
    // visitor is sent to the login flow and bounced back after signing in (admin
    // role required). → reports/errors/hermes-lightrag-auth-gating-regression.md
    const gated = prefix === "hermes" || prefix === "lightrag" || prefix === "chat";
    // The chat subdomain proxies the webui (:9120) which streams over SSE — turn
    // off proxy buffering so tokens render live (mirrors the hermes /chat/ block).
    const bufferOff = prefix === "chat" ? "        proxy_buffering off;\n" : "";
    const authVerify = gated ? `    location = /auth-verify {
        internal;
        proxy_pass http://127.0.0.1:3001/api/session/verify;
        proxy_pass_request_body off;
        proxy_set_header Content-Length "";
        proxy_set_header Host $host;
        proxy_set_header Cookie $http_cookie;
    }
    location @login_redirect {
        return 302 https://auth.${domain}/login?callbackUrl=$scheme://$host$request_uri&requireRole=admin;
    }
` : "";
    // Injected INTO a proxied location to require a valid session before proxying.
    const gate = gated ? `        auth_request /auth-verify;
        error_page 401 = @login_redirect;
` : "";
    // hermes also serves the built-in chat (webui :9120) under /chat/ — same gate,
    // SSE-friendly (proxy_buffering off), trailing slash strips the prefix so the
    // webui sees "/".
    const chatBlock = prefix === "hermes" ? `    location /chat/ {
${gate}        proxy_pass http://127.0.0.1:9120/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
        proxy_buffering off;
    }
` : "";
    return `# fractera ${host} — managed by fractera
server {
    listen 80;
    server_name ${host};
    location / { return 301 https://$host$request_uri; }
}
server {
    listen 443 ssl http2;
    server_name ${host};
    ssl_certificate     ${certPath};
    ssl_certificate_key ${keyPath};

    # OCSP stapling — server fetches the OCSP response itself and attaches
    # it to the TLS handshake. Without this, browsers ask Let's Encrypt's
    # OCSP responder directly (hosted on Cloudflare). In Russia / restricted
    # networks Cloudflare OCSP is intermittently unreachable, which makes
    # browsers show "certificate invalid" even when the cert is fine.
    # Stapling fixes that without touching the cert itself.
    ssl_stapling on;
    ssl_stapling_verify on;
    resolver 1.1.1.1 8.8.8.8 valid=300s;
    resolver_timeout 5s;

${authVerify}${chatBlock}${prefix === "admin" ? ADMIN_WS_LOCATIONS : ""}    location / {
${gate}        proxy_pass http://127.0.0.1:${port};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
${bufferOff}${footer}    }
}`;
  });

  return blocks.join("\n\n") + "\n";
}

// (Re)write the HTTPS+WSS nginx config for an already-issued domain and reload.
// Exported so the activate flow can guarantee the live nginx has the current
// block set (incl. the bridge wss locations) without re-running certbot.
export function writeNginxForDomain(domain: string): void {
  const db = getDb();
  const row = db.prepare("SELECT cert_source FROM site_settings WHERE id = 1").get() as { cert_source?: "auto" | "upload" } | undefined;
  db.close();
  const certSource = row?.cert_source === "upload" ? "upload" : "auto";
  writeFileSync("/etc/nginx/sites-enabled/fractera-custom", buildNginxConfig(domain, certSource));
  execSync("nginx -t && nginx -s reload", { timeout: 10000 });
}

export async function GET(req: NextRequest) {
  const ok = await requireAuth(req.headers.get("cookie") ?? "");
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  const row = db.prepare("SELECT * FROM site_settings WHERE id = 1").get() as SiteSettingsRow | undefined;
  db.close();

  return NextResponse.json({
    custom_domain:   row?.custom_domain ?? null,
    domain_status:   row?.domain_status ?? "idle",
    domain_error:    row?.domain_error ?? null,
    cert_source:     row?.cert_source ?? "auto",
    cert_expires_at: row?.cert_expires_at ?? null,
    server_ip:       getServerIp(),
    hostnames:       SUBDOMAINS.map((p) => p || "@"),
  });
}

const DOMAIN_RE = /^[a-zA-Z0-9][a-zA-Z0-9\-\.]+\.[a-zA-Z]{2,}$/;

// POST — auto mode: certbot issues a single multi-SAN cert for all 8 hostnames.
// Body: { domain: string }
export async function POST(req: NextRequest) {
  const ok = await requireAuth(req.headers.get("cookie") ?? "");
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { domain } = await req.json().catch(() => ({})) as { domain?: string };
  if (!domain || !DOMAIN_RE.test(domain)) {
    return NextResponse.json({ error: "Invalid domain" }, { status: 400 });
  }

  const db = getDb();
  upsert(db, domain, "pending", null, { certSource: "auto" });
  db.close();

  // Detached so the HTTP request doesn't time out (certbot can take 60-90s).
  setTimeout(() => {
    const db2 = getDb();
    try {
      // 1. HTTP-only stub config so certbot --nginx can find the server_name
      //    blocks and complete the HTTP-01 challenge.
      const httpStub = SUBDOMAINS.map((p) => {
        const host = hostFor(p, domain);
        const port = PROXY_PORTS[p];
        return `server {
    listen 80;
    server_name ${host};
    location /.well-known/acme-challenge/ { root /var/www/html; }
    location / { proxy_pass http://127.0.0.1:${port}; proxy_set_header Host $host; proxy_set_header X-Forwarded-Proto $scheme; }
}`;
      }).join("\n");
      writeFileSync("/etc/nginx/sites-enabled/fractera-custom", httpStub);
      execSync("mkdir -p /var/www/html && nginx -t && nginx -s reload", { timeout: 10000 });

      // 2. Issue / renew one multi-SAN cert. The same `-d <host>` flag set
      //    keeps the same lineage (no new dir each run) so subsequent
      //    renewals via the system certbot cron just work.
      const dFlags = SUBDOMAINS.map((p) => `-d ${hostFor(p, domain)}`).join(" ");
      // --cert-name pins the lineage to the apex domain; --expand lets certbot
      // replace an existing certificate that covers only a subset of these
      // hostnames (e.g. an earlier apex+www cert) WITHOUT the interactive
      // "expand & replace?" prompt — which otherwise aborts under
      // --non-interactive. --keep-until-expiring still short-circuits when the
      // cert already covers everything and isn't near expiry (idempotent).
      execSync(
        `certbot certonly --nginx ${dFlags} --cert-name ${domain} --expand --non-interactive --agree-tos --keep-until-expiring -m admin@fractera.ai`,
        { timeout: 180000 }
      );

      // 3. Write final HTTPS config and reload.
      writeFileSync("/etc/nginx/sites-enabled/fractera-custom", buildNginxConfig(domain, "auto"));
      execSync("nginx -t && nginx -s reload", { timeout: 10000 });

      const expires = readCertExpiry(`/etc/letsencrypt/live/${domain}/fullchain.pem`);
      upsert(db2, domain, "active", null, { certSource: "auto", certExpiresAt: expires });
    } catch (e) {
      upsert(db2, domain, "error", String(e), { certSource: "auto" });
    } finally {
      db2.close();
    }
  }, 200);

  return NextResponse.json({ ok: true, status: "pending" });
}

// PUT — upload custom cert. Used for regions (RU, sanctioned networks, etc.)
// where Let's Encrypt is unreachable, or when the user already holds an EV/OV
// cert from another CA. Stores PEM + KEY in /etc/fractera/certs/<domain>/
// and switches nginx to that source.
//
// Body: { domain: string, fullchainPem: string, privateKeyPem: string }
export async function PUT(req: NextRequest) {
  const ok = await requireAuth(req.headers.get("cookie") ?? "");
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({})) as {
    domain?: string;
    fullchainPem?: string;
    privateKeyPem?: string;
  };
  const { domain, fullchainPem, privateKeyPem } = body;
  if (!domain || !DOMAIN_RE.test(domain)) {
    return NextResponse.json({ error: "Invalid domain" }, { status: 400 });
  }
  if (!fullchainPem || !privateKeyPem) {
    return NextResponse.json({ error: "Both fullchainPem and privateKeyPem are required" }, { status: 400 });
  }
  if (!/-----BEGIN CERTIFICATE-----/.test(fullchainPem)) {
    return NextResponse.json({ error: "fullchainPem does not look like a PEM certificate" }, { status: 400 });
  }
  if (!/-----BEGIN (RSA |EC )?PRIVATE KEY-----/.test(privateKeyPem)) {
    return NextResponse.json({ error: "privateKeyPem does not look like a PEM private key" }, { status: 400 });
  }

  const db = getDb();
  upsert(db, domain, "pending", null, { certSource: "upload" });
  db.close();

  setTimeout(() => {
    const db2 = getDb();
    try {
      const dir = `${CUSTOM_CERT_DIR}/${domain}`;
      mkdirSync(dir, { recursive: true, mode: 0o700 });
      writeFileSync(`${dir}/fullchain.pem`, fullchainPem, { mode: 0o600 });
      writeFileSync(`${dir}/privkey.pem`,   privateKeyPem, { mode: 0o600 });

      // Validate by asking openssl to parse the chain — fail early if garbage.
      execSync(`openssl x509 -in ${dir}/fullchain.pem -noout -subject`, { timeout: 3000 });
      execSync(`openssl rsa -in ${dir}/privkey.pem -check -noout`,      { timeout: 3000 });

      writeFileSync("/etc/nginx/sites-enabled/fractera-custom", buildNginxConfig(domain, "upload"));
      execSync("nginx -t && nginx -s reload", { timeout: 10000 });

      const expires = readCertExpiry(`${dir}/fullchain.pem`);
      upsert(db2, domain, "active", null, { certSource: "upload", certExpiresAt: expires });
    } catch (e) {
      upsert(db2, domain, "error", String(e), { certSource: "upload" });
    } finally {
      db2.close();
    }
  }, 200);

  return NextResponse.json({ ok: true, status: "pending" });
}
