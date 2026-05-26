import { NextResponse } from "next/server";
import { execSync } from "child_process";
import { resolve } from "path";

// process.cwd() is app/ — the git root is one level up
const REPO_DIR    = resolve(process.cwd(), "..");
const APP_DIR     = process.cwd();
const BRIDGES_DIR = resolve(REPO_DIR, "bridges/platforms");

function run(cmd: string, cwd: string): string {
  try {
    return execSync(cmd, { cwd, encoding: "utf8", timeout: 60000 }).trim();
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return `[error] ${msg.slice(0, 200)}`;
  }
}

export async function POST() {
  const log: string[] = [];

  // 1. Backup database
  const backupName = `database.backup.${new Date().toISOString().replace(/[:.]/g, "-")}.sqlite`;
  log.push(run(`cp database.sqlite ${backupName} 2>/dev/null || true`, APP_DIR));

  // 2. Pull upstream
  log.push(run("git fetch upstream", REPO_DIR));
  log.push(run("git merge upstream/main --no-edit -m 'chore: merge upstream update'", REPO_DIR));

  // 3. Install dependencies
  log.push(run("npm install --silent", APP_DIR));

  // 4. Run migrations if script exists
  const hasMigrate = run("npm run | grep migrate || true", APP_DIR);
  if (hasMigrate.includes("migrate")) {
    log.push(run("npm run migrate", APP_DIR));
  }

  // 5. Restart bridge
  const pm2 = run("pm2 restart all 2>/dev/null && echo ok || echo skip", APP_DIR);
  if (pm2.includes("skip")) {
    // No pm2 — respawn bridge
    run(`pkill -f 'node.*server.js' 2>/dev/null; sleep 1; nohup node ${BRIDGES_DIR}/server.js >> /tmp/bridge.log 2>&1 &`, APP_DIR);
  }
  log.push(pm2);

  // 6. Get new version info
  const commit = run("git log -1 --pretty='%h %s'", REPO_DIR);
  log.push(`Updated to: ${commit}`);

  return NextResponse.json({ ok: true, log: log.filter(Boolean) });
}
