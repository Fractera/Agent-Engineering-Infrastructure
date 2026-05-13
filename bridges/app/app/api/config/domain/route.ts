import { NextRequest, NextResponse } from "next/server";
import { execSync, exec } from "child_process";
import { writeFileSync } from "fs";
import Database from "better-sqlite3";
import { requireAuth } from "@/lib/require-auth";

const APP_DB = process.env.APP_DB_PATH ?? "/opt/fractera/app/data/app.db";

function getDb() {
  const db = new Database(APP_DB);
  db.exec(`CREATE TABLE IF NOT EXISTS site_settings (
    id            INTEGER PRIMARY KEY DEFAULT 1,
    custom_domain TEXT,
    domain_status TEXT NOT NULL DEFAULT 'idle',
    domain_error  TEXT,
    updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
  )`);
  return db;
}

function upsert(db: Database.Database, domain: string, status: string, error: string | null) {
  db.prepare(
    `INSERT OR REPLACE INTO site_settings (id, custom_domain, domain_status, domain_error, updated_at)
     VALUES (1, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%SZ','now'))`
  ).run(domain, status, error);
}

function getServerIp(): string {
  try { return execSync("hostname -I", { timeout: 3000 }).toString().trim().split(/\s+/)[0] ?? ""; }
  catch { return ""; }
}

function getFracteraHost(): string {
  try { return new URL(process.env.NEXTAUTH_URL ?? "http://localhost").hostname; }
  catch { return ""; }
}

export async function GET(req: NextRequest) {
  const ok = await requireAuth(req.headers.get("cookie") ?? "");
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  const row = db.prepare("SELECT * FROM site_settings WHERE id = 1").get() as Record<string, unknown> | undefined;
  db.close();

  return NextResponse.json({
    custom_domain: row?.custom_domain ?? null,
    domain_status: row?.domain_status ?? "idle",
    domain_error:  row?.domain_error ?? null,
    server_ip:     getServerIp(),
    fractera_host: getFracteraHost(),
  });
}

const DOMAIN_RE = /^[a-zA-Z0-9][a-zA-Z0-9\-\.]+\.[a-zA-Z]{2,}$/;

export async function POST(req: NextRequest) {
  const ok = await requireAuth(req.headers.get("cookie") ?? "");
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { domain } = await req.json().catch(() => ({})) as { domain?: string };
  if (!domain || !DOMAIN_RE.test(domain)) {
    return NextResponse.json({ error: "Invalid domain" }, { status: 400 });
  }

  // DNS check
  const serverIp = getServerIp();
  try {
    const resolved = execSync(`dig +short ${domain} A`, { timeout: 8000 }).toString().trim();
    if (serverIp && !resolved.includes(serverIp)) {
      return NextResponse.json({ error: "DNS not propagated yet. Point an A-record to " + serverIp }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "DNS lookup failed" }, { status: 400 });
  }

  const db = getDb();
  upsert(db, domain, "pending", null);
  db.close();

  // Async: write Nginx config + certbot
  const nginxBlock = `# fractera custom domain — managed by fractera
server {
    listen 80;
    server_name ${domain} www.${domain};
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }
}
`;

  exec("true", () => {
    const db2 = getDb();
    try {
      writeFileSync("/etc/nginx/sites-enabled/fractera-custom", nginxBlock);
      execSync("nginx -t && nginx -s reload", { timeout: 10000 });
      execSync(
        `certbot --nginx -d ${domain} -d www.${domain} --non-interactive --agree-tos -m admin@fractera.ai`,
        { timeout: 120000 }
      );
      upsert(db2, domain, "active", null);
    } catch (e) {
      upsert(db2, domain, "error", String(e));
    } finally {
      db2.close();
    }
  });

  return NextResponse.json({ ok: true, status: "pending" });
}
