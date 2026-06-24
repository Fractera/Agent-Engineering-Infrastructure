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
  // next build reads app/.env.local at build start, so it always bakes the CURRENT language
  // set — a rerun triggered after a change picks up the new value.
  const proc = spawn("npm", ["run", "build", "--prefix", APP_DIR], {
    stdio: ["ignore", logFd, logFd],
    env: { ...process.env, FORCE_COLOR: "0" },
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
