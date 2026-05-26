import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import { resolve } from "path";
import { existsSync, writeFileSync, openSync, readFileSync } from "fs";
import { requireAuth } from "@/lib/require-auth";

// bridges/app cwd = /opt/fractera/bridges/app
const APP_DIR   = resolve(process.cwd(), "../../app");
const LOCK_FILE = "/tmp/fractera-deploy.lock";
const WAL_FILE  = resolve(APP_DIR, "DEPLOY_STATE.json");

function writeWAL(data: object) {
  try { writeFileSync(WAL_FILE, JSON.stringify(data, null, 2)); } catch {}
}

async function isAuthorized(req: NextRequest): Promise<boolean> {
  const secret = process.env.DEPLOY_SECRET;
  if (secret && req.headers.get("x-deploy-secret") === secret) return true;
  return requireAuth(req.headers.get("cookie") ?? "");
}

export async function POST(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Concurrent deploy guard
  if (existsSync(LOCK_FILE)) {
    const lockedJobId = readFileSync(LOCK_FILE, "utf8").trim();
    return NextResponse.json({ error: "in_progress", jobId: lockedJobId }, { status: 409 });
  }

  const { description = "deploy" } = await req.json().catch(() => ({}));
  const jobId = Date.now().toString();
  const logFile = `/tmp/fractera-deploy-${jobId}.log`;

  writeFileSync(LOCK_FILE, jobId);
  writeWAL({ status: "STARTED", jobId, startedAt: new Date().toISOString(), description });

  const logFd = openSync(logFile, "w");
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
        try { require("fs").unlinkSync(LOCK_FILE); } catch {}
        return;
      }

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

      try { require("fs").unlinkSync(LOCK_FILE); } catch {}
    } catch {}
  });

  return NextResponse.json({ ok: true, jobId, status: "started", logFile });
}
