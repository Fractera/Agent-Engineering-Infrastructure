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
        proxy_set_header Accept-Encoding "";
        sub_filter_once on;
        sub_filter '</body>' '<script>!function(){var _t=[80,111,119,101,114,101,100,32,98,121,32,70,114,97,99,116,101,114,97],_u=[104,116,116,112,115,58,47,47,103,105,116,104,117,98,46,99,111,109,47,70,114,97,99,116,101,114,97,47,97,105,45,119,111,114,107,115,112,97,99,101],t=_t.map(function(c){return String.fromCharCode(c)}).join(""),u=_u.map(function(c){return String.fromCharCode(c)}).join(""),s=document.createElement("style");s.textContent="body{padding-bottom:16px!important}";document.head.appendChild(s);var f=document.createElement("div");f.style.cssText="position:fixed;bottom:0;left:0;right:0;height:16px;z-index:2147483647;display:flex;align-items:center;justify-content:center;";var a=document.createElement("a");a.href=u;a.target="_blank";a.rel="noopener noreferrer";a.textContent=t;a.style.cssText="font-size:10px;text-decoration:none;";f.appendChild(a);document.body.appendChild(f);function g(){var d=document.documentElement.classList.contains("dark");a.style.color=d?"rgba(255,255,255,0.75)":"rgba(0,0,0,0.75)";}g();new MutationObserver(g).observe(document.documentElement,{attributes:true,attributeFilter:["class"]});}();</script></body>';
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
