import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { requireAuth } from "@/lib/require-auth";
import { readEnvFile, writeEnvFile } from "@/lib/env-file";

// Reverse of /activate — switch the project back to IP / demo mode.
// Prefer restoring the exact pre-activation env snapshot the activate flow
// saved; fall back to flipping the demo flag if no backup exists. Then drop the
// custom HTTPS nginx config and reload everything. Detached pm2 reload because
// it restarts THIS (admin) process.

const ENV_FILES = [
  "/opt/fractera/services/auth/.env.local",
  "/opt/fractera/bridges/app/.env.local",
  "/opt/fractera/app/.env.local",
  "/opt/fractera/services/data/.env",
];
const BACKUP_ROOT = "/etc/fractera/backups/pre-domain-switch";
const CUSTOM_NGINX = "/etc/nginx/sites-enabled/fractera-custom";

function latestBackupDir(): string | null {
  try {
    const dirs = fs.readdirSync(BACKUP_ROOT)
      .map((d) => path.join(BACKUP_ROOT, d))
      .filter((p) => fs.statSync(p).isDirectory())
      .sort();
    return dirs.length ? dirs[dirs.length - 1] : null;
  } catch {
    return null;
  }
}

function restoreFromBackup(backupDir: string): boolean {
  let restored = false;
  for (const f of ENV_FILES) {
    const target = path.join(backupDir, path.basename(f) + path.dirname(f).replace(/\//g, "_"));
    if (fs.existsSync(target)) {
      fs.copyFileSync(target, f);
      restored = true;
    }
  }
  return restored;
}

// Fallback: force demo mode in-place without a backup.
function forceDemoEnvs(): void {
  for (const f of ENV_FILES) {
    const vars = readEnvFile(f);
    vars.FRACTERA_IP_NODOMAIN_MODE = "true";
    if ("COOKIE_SECURE" in vars) vars.COOKIE_SECURE = "false";
    if ("COOKIE_DOMAIN" in vars) vars.COOKIE_DOMAIN = "";
    writeEnvFile(f, vars);
  }
}

export async function POST(req: NextRequest) {
  const ok = await requireAuth(req.headers.get("cookie") ?? "");
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const backupDir = latestBackupDir();
  try {
    if (!backupDir || !restoreFromBackup(backupDir)) {
      forceDemoEnvs();
    }
  } catch (e) {
    return NextResponse.json({ error: `Env restore failed: ${e}` }, { status: 500 });
  }

  // Drop the HTTPS nginx config so services are served on their IP ports again.
  try {
    if (fs.existsSync(CUSTOM_NGINX)) {
      fs.unlinkSync(CUSTOM_NGINX);
      spawn("sh", ["-c", "nginx -t && nginx -s reload"], { detached: true, stdio: "ignore" }).unref();
    }
  } catch (e) {
    console.error("[deactivate] nginx cleanup failed (continuing):", e);
  }

  // Detached: this reload restarts fractera-admin (this process) too.
  setTimeout(() => {
    spawn("sh", ["-c", "pm2 reload all"], { detached: true, stdio: "ignore" }).unref();
  }, 500);

  return NextResponse.json({ ok: true, restoredFrom: backupDir ?? "in-place", reloading: true });
}
