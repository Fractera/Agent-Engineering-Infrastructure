import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import https from "https";
import { requireAuth } from "@/lib/require-auth";
import { readEnvFile, writeEnvFile } from "@/lib/env-file";
import { writeNginxForDomain, readStoredCertExpiry } from "../route";
import { lockdownFirewall } from "@/lib/firewall";

const SECRETS_FILE = "/etc/fractera/secrets.env";
// Stable custom host (not *.vercel.app): lets L1 migrate off Vercel by
// re-pointing DNS without re-deploying every customer server. → ARCHITECTURE §2.1.
const STARTER_URL = process.env.FRACTERA_STARTER_URL ?? "https://www.fractera.ai";

function readServerToken(): string | null {
  try {
    const content = fs.readFileSync(SECRETS_FILE, "utf8");
    const match = content.match(/^SERVER_TOKEN=(.+)$/m);
    return match?.[1]?.trim() ?? null;
  } catch {
    return null;
  }
}

async function notifyStarterDomainActivated(domain: string): Promise<void> {
  const token = readServerToken();
  if (!token) return;
  const certExpiresAt = readStoredCertExpiry();
  try {
    await fetch(`${STARTER_URL}/api/server/domain-activated`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ domain, certExpiresAt }),
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    // best-effort
  }
}

const AUTH_ENV  = "/opt/fractera/services/auth/.env.local";
const ADMIN_ENV = "/opt/fractera/bridges/app/.env.local";
const APP_ENV   = "/opt/fractera/app/.env.local";
const DATA_ENV  = "/opt/fractera/services/data/.env";
const ENV_FILES = [AUTH_ENV, ADMIN_ENV, APP_ENV, DATA_ENV];

const BACKUP_ROOT = "/etc/fractera/backups/pre-domain-switch";

const DOMAIN_RE = /^[a-zA-Z0-9][a-zA-Z0-9\-\.]+\.[a-zA-Z]{2,}$/;

function backupEnvs(): string {
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const dir = path.join(BACKUP_ROOT, ts);
  fs.mkdirSync(dir, { recursive: true });
  for (const f of ENV_FILES) {
    if (fs.existsSync(f)) {
      const target = path.join(dir, path.basename(f) + path.dirname(f).replace(/\//g, "_"));
      fs.copyFileSync(f, target);
    }
  }
  return dir;
}

function restoreFromBackup(backupDir: string): void {
  for (const f of ENV_FILES) {
    const target = path.join(backupDir, path.basename(f) + path.dirname(f).replace(/\//g, "_"));
    if (fs.existsSync(target)) {
      fs.copyFileSync(target, f);
    }
  }
}

function writeStrictEnvs(domain: string): void {
  // Keep in sync with the shared SUBDOMAINS (lib/server-ip.ts) minus the apex ("" is the domain
  // itself, prepended below). projects/design added in 197.1 — without them the two services'
  // subdomains were missing from ALLOWED_ORIGINS after activation (CORS failures).
  const subs = ["www", "auth", "admin", "projects", "design", "data", "hermes", "lightrag"];
  const allowedOrigins = [domain, ...subs.map((s) => `${s}.${domain}`)]
    .map((h) => `https://${h}`)
    .join(",");

  // services/auth/.env.local
  const auth = readEnvFile(AUTH_ENV);
  auth.COOKIE_SECURE = "true";
  auth.COOKIE_DOMAIN = `.${domain}`;
  auth.NEXTAUTH_URL = `https://auth.${domain}`;
  auth.ALLOWED_ORIGINS = allowedOrigins;
  auth.FRACTERA_IP_NODOMAIN_MODE = "false";
  writeEnvFile(AUTH_ENV, auth);

  // bridges/app/.env.local
  const admin = readEnvFile(ADMIN_ENV);
  admin.AUTH_SERVICE_URL = `https://auth.${domain}`;
  admin.FRACTERA_IP_NODOMAIN_MODE = "false";
  writeEnvFile(ADMIN_ENV, admin);

  // app/.env.local
  const app = readEnvFile(APP_ENV);
  app.FRACTERA_IP_NODOMAIN_MODE = "false";
  app.AUTH_SERVICE_URL = `https://auth.${domain}`;
  writeEnvFile(APP_ENV, app);

  // services/data/.env
  const data = readEnvFile(DATA_ENV);
  data.FRACTERA_IP_NODOMAIN_MODE = "false";
  writeEnvFile(DATA_ENV, data);
}

function pm2ReloadAllDetached(delayMs = 800): void {
  setTimeout(() => {
    const child = spawn("sh", ["-c", "pm2 reload all"], {
      detached: true,
      stdio: "ignore",
    });
    child.unref();
  }, delayMs);
}

// Health-check the admin endpoint after PM2 has had time to restart. If it
// doesn't respond 200/301/302 within the budget, we know strict mode broke
// something and roll back.
async function probeAdmin(adminHost: string, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    const req = https.request(
      { host: adminHost, port: 443, method: "HEAD", path: "/", timeout: timeoutMs },
      (res) => {
        const ok = !!res.statusCode && res.statusCode >= 200 && res.statusCode < 400;
        resolve(ok);
      },
    );
    req.on("timeout", () => { req.destroy(); resolve(false); });
    req.on("error", () => resolve(false));
    req.end();
  });
}

function scheduleRollbackWatch(domain: string, backupDir: string): void {
  // 30 seconds after the switch we probe https://admin.<domain>. If it's
  // still not answering, restore env files from backup and reload PM2 again.
  // This makes the user's worst case "broken admin for ~45 seconds" instead
  // of "admin permanently bricked, SSH-recovery required".
  setTimeout(async () => {
    const ok = await probeAdmin(`admin.${domain}`, 5000);
    if (ok) return;
    try {
      restoreFromBackup(backupDir);
      const child = spawn("sh", ["-c", "pm2 reload all"], {
        detached: true,
        stdio: "ignore",
      });
      child.unref();
      // Write a marker so the next wizard-state response shows that the
      // activation was rolled back (UI surfaces it).
      try {
        fs.writeFileSync(
          path.join(backupDir, "ROLLED_BACK_AT.txt"),
          new Date().toISOString(),
        );
      } catch { /* best-effort */ }
    } catch (e) {
      // Last-resort log; if even the rollback failed, the user has the
      // backup dir on disk and a documented SSH recovery procedure.
      console.error("[activate-rollback] restore failed:", e);
    }
  }, 30_000);
}

export async function POST(req: NextRequest) {
  const ok = await requireAuth(req.headers.get("cookie") ?? "");
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { domain?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const domain = (body.domain ?? "").trim().toLowerCase();
  if (!domain || !DOMAIN_RE.test(domain)) {
    return NextResponse.json({ error: "Invalid domain" }, { status: 400 });
  }

  // Idempotency: if all four env files already say strict-mode-true, the
  // wizard would normally route around this endpoint, but if a stale UI
  // calls it anyway we just return success without rewriting anything.
  const alreadyStrict = ENV_FILES.every((f) => readEnvFile(f).FRACTERA_IP_NODOMAIN_MODE === "false");
  if (alreadyStrict) {
    return NextResponse.json({
      ok: true,
      alreadyActive: true,
      redirectTo: `https://admin.${domain}`,
    });
  }

  let backupDir: string;
  try {
    backupDir = backupEnvs();
  } catch (e) {
    return NextResponse.json({ error: `Backup failed: ${e}` }, { status: 500 });
  }

  try {
    writeStrictEnvs(domain);
  } catch (e) {
    // Best-effort revert if half-written.
    try { restoreFromBackup(backupDir); } catch {}
    return NextResponse.json({ error: `Write failed: ${e}` }, { status: 500 });
  }

  // Guarantee the live nginx has the current HTTPS + bridge-wss block set
  // (the cert step may have written an older config). Best-effort: a stale but
  // present config still serves, and the rollback watcher covers a hard break.
  try {
    writeNginxForDomain(domain);
  } catch (e) {
    console.error("[activate] nginx rewrite failed (continuing):", e);
  }

  // Lock the host firewall down to 22/80/443 now that nginx serves HTTPS for
  // the domain. This stops raw http://<IP>:<port> from bypassing nginx (and its
  // auth_request gate on data/Hermes/LightRAG). Best-effort: a firewall failure
  // must not abort activation, and ufw allows 22 before enabling so SSH is safe.
  try {
    const fw = lockdownFirewall();
    if (!fw.ok) console.error("[activate] firewall lockdown skipped:", fw.detail);
  } catch (e) {
    console.error("[activate] firewall lockdown failed (continuing):", e);
  }

  // Notify Easy Starter: update subdomain in DB + send activation email.
  // AWAIT it (not fire-and-forget): pm2ReloadAllDetached below restarts
  // fractera-admin ~0.8s later, which kills this in-flight cross-internet POST
  // before it reaches L1 (TLS + Vercel cold start rarely complete in 0.8s) →
  // no subdomain update, no activation email. The function has its own 8s
  // timeout and swallows its own errors, so awaiting can't throw or hang.
  await notifyStarterDomainActivated(domain);

  // PM2 reload + 30s rollback-watcher. Both are detached so this HTTP
  // request returns immediately and the client gets a chance to redirect
  // before fractera-admin restarts itself.
  pm2ReloadAllDetached(800);
  scheduleRollbackWatch(domain, backupDir);

  return NextResponse.json({
    ok: true,
    redirectTo: `https://admin.${domain}`,
    backupDir,
    rollbackAfterMs: 30_000,
  });
}
