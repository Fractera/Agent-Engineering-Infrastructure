import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import { resolve } from "path";
import { existsSync, writeFileSync, openSync, readFileSync, unlinkSync } from "fs";
import { requireAuth } from "@/lib/require-auth";

// bridges/app cwd = /opt/fractera/bridges/app
const APP_DIR   = resolve(process.cwd(), "../../app");
const LOCK_FILE = "/tmp/fractera-deploy.lock";
// Coalescing marker: a build request that arrives WHILE a build is running writes this
// (with the latest description). When the running build finishes, it consumes the marker
// and runs ONE more build — so the LATEST on-disk state (e.g. a just-changed language set
// in app/.env.local) is always built, with no reliance on the caller retrying or staying
// alive. This deterministically fixes "added a language but the build baked the old set"
// (the language change raced an in-flight build, its trigger got 409'd and was dropped). → step 138.
const DIRTY_FILE = "/tmp/fractera-deploy.dirty";
const WAL_FILE  = resolve(APP_DIR, "DEPLOY_STATE.json");

function writeWAL(data: object) {
  try { writeFileSync(WAL_FILE, JSON.stringify(data, null, 2)); } catch {}
}

// Build a SLOT-SCOPED environment for the spawned `next build`.
//
// WHY (root cause, step 143): this Admin route runs inside its OWN Next process, which at
// `next start` already ran @next/env. @next/env (a) sets the cross-process sentinel
// `__NEXT_PROCESSED_ENV` in process.env, and (b) injects this Admin's env vars. If we spawn the
// slot build with `{ ...process.env }`, the child inherits BOTH problems:
//   1. the sentinel makes the child's @next/env SKIP loading the slot's app/.env.local entirely;
//   2. any inherited key shadows the slot's value (@next/env never overrides an already-set var).
// Either way the slot bakes stale/missing build-time vars — e.g. NEXT_PUBLIC_SUPPORTED_LANGUAGES
// falls back to ["en"], SINGLE_LANG_MODE becomes true, and the language switcher disappears on the
// default route. This is GENERAL: it would silently break ANY build-time env the slot owns
// (languages, Stripe keys + product ids, custom app vars), not just languages.
//
// FIX: hand the child a clean env where the slot's own app/.env.local wins for every key it
// declares — drop the sentinel (so @next/env loads the file fresh) and drop every key the slot
// declares (so no inherited copy shadows it). All other inherited vars (PATH, HOME, …) are kept.
function slotBuildEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env, FORCE_COLOR: "0" };
  delete env.__NEXT_PROCESSED_ENV;
  try {
    const slotEnvFile = resolve(APP_DIR, ".env.local");
    for (const line of readFileSync(slotEnvFile, "utf8").split("\n")) {
      const m = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/.exec(line);
      if (m) delete env[m[1]];
    }
  } catch { /* no slot .env.local yet — child @next/env will use defaults */ }
  return env;
}

async function isAuthorized(req: NextRequest): Promise<boolean> {
  const secret = process.env.DEPLOY_SECRET;
  if (secret && req.headers.get("x-deploy-secret") === secret) return true;
  return requireAuth(req.headers.get("cookie") ?? "");
}

// Spawn `next build` for the app slot, then pm2-reload + health-check + record the result.
// On finish, if a coalescing marker is present (a request arrived mid-build), consume it and
// run ONE more build for the latest state. Bounded: the marker is cleared before the rerun,
// so each pending request yields exactly one extra build (no infinite loop on repeated failures).
function runBuild(description: string): string {
  const jobId = Date.now().toString();
  const logFile = `/tmp/fractera-deploy-${jobId}.log`;
  writeFileSync(LOCK_FILE, jobId);
  writeWAL({ status: "STARTED", jobId, startedAt: new Date().toISOString(), description });

  const logFd = openSync(logFile, "w");
  // Spawn the slot build with a SLOT-SCOPED env so the slot's own app/.env.local fully governs
  // every build-time variable it declares (languages, Stripe keys, any custom app var). → step 143.
  const proc = spawn("npm", ["run", "build", "--prefix", APP_DIR], {
    stdio: ["ignore", logFd, logFd],
    env: slotBuildEnv(),
  });

  proc.on("exit", (code) => {
    try {
      const { closeSync, appendFileSync } = require("fs");
      closeSync(logFd);

      if (code !== 0) {
        writeWAL({ status: "FAILED", jobId, failedAt: new Date().toISOString(), description });
        writeFileSync(LOCK_FILE + ".failed", jobId);
      } else {
        // pm2 reload (graceful)
        const { execSync } = require("child_process");
        try {
          execSync("pm2 reload fractera-app", { timeout: 30000 });
        } catch (e) {
          appendFileSync(logFile, `\n[deploy] pm2 reload error: ${e}\n`);
        }

        // Health check
        let healthy = false;
        for (let i = 0; i < 3; i++) {
          try {
            execSync("curl -sf http://localhost:3000/api/health", { timeout: 10000 });
            healthy = true;
            break;
          } catch {
            execSync("sleep 10");
          }
        }

        if (!healthy) {
          writeWAL({ status: "HEALTH_FAILED", jobId, failedAt: new Date().toISOString(), description });
        } else {
          // Commit deploy success
          try {
            execSync(`git -C ${APP_DIR}/.. add -A && git -C ${APP_DIR}/.. commit -m "DEPLOY_SUCCESS: ${description}" --allow-empty`, { timeout: 15000 });
          } catch {}
          writeWAL({ status: "COMPLETED", jobId, completedAt: new Date().toISOString(), description });
          appendFileSync(logFile, "\n[deploy] COMPLETED\n");
        }
      }

      try { unlinkSync(LOCK_FILE); } catch {}

      // Coalesced rerun: a request arrived during this build → build the latest state once.
      if (existsSync(DIRTY_FILE)) {
        let nextDesc = "deploy (coalesced)";
        try { nextDesc = readFileSync(DIRTY_FILE, "utf8").trim() || nextDesc; } catch {}
        try { unlinkSync(DIRTY_FILE); } catch {}
        runBuild(nextDesc);
      }
    } catch {}
  });

  return jobId;
}

export async function POST(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { description = "deploy" } = await req.json().catch(() => ({}));

  // Concurrent deploy guard + coalescing: if a build is running, record this request as the
  // pending latest state (so the running build reruns for it on finish) and report in_progress.
  if (existsSync(LOCK_FILE)) {
    const lockedJobId = readFileSync(LOCK_FILE, "utf8").trim();
    try { writeFileSync(DIRTY_FILE, description); } catch {}
    return NextResponse.json({ error: "in_progress", jobId: lockedJobId, queued: true }, { status: 409 });
  }

  // Fresh build start — clear any stale dirty marker; this build covers the current state.
  try { if (existsSync(DIRTY_FILE)) unlinkSync(DIRTY_FILE); } catch {}
  const jobId = runBuild(description);
  return NextResponse.json({ ok: true, jobId, status: "started", logFile: `/tmp/fractera-deploy-${jobId}.log` });
}
