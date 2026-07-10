import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import { resolve } from "path";
import { existsSync, writeFileSync, openSync, readFileSync, unlinkSync } from "fs";
import { requireAuth } from "@/lib/require-auth";

// bridges/app cwd = /opt/fractera/bridges/app
const APP_DIR   = resolve(process.cwd(), "../../app");

// Deploy targets (step 197). The historical single target is the app slot; the Projects and
// Design layers are their own processes (fractera-projects :3003 / fractera-design :3004) with
// their own build dirs. `target` is OPTIONAL in the POST body and defaults to "app", so every
// existing caller (the build-loop, MCP :3225) keeps its exact behavior. One shared lock
// serializes builds across targets on purpose — parallel `next build`s OOM a small VPS.
// Health URLs: the slot has /api/health; projects "/" answers 307 (redirect into the zone) and
// design "/" answers 200 — both pass `curl -sf` (it only fails on HTTP >= 400).
const TARGETS = {
  app:      { dir: APP_DIR,                                pm2: "fractera-app",      health: "http://localhost:3000/api/health" },
  projects: { dir: resolve(process.cwd(), "../../projects-app"), pm2: "fractera-projects", health: "http://localhost:3003/" },
  design:   { dir: resolve(process.cwd(), "../../design-app"),   pm2: "fractera-design",   health: "http://localhost:3004/" },
} as const;
type DeployTarget = keyof typeof TARGETS;

const LOCK_FILE = "/tmp/fractera-deploy.lock";
// Coalescing marker: a build request that arrives WHILE a build is running writes this
// (with the latest description). When the running build finishes, it consumes the marker
// and runs ONE more build — so the LATEST on-disk state (e.g. a just-changed language set
// in app/.env.local) is always built, with no reliance on the caller retrying or staying
// alive. This deterministically fixes "added a language but the build baked the old set"
// (the language change raced an in-flight build, its trigger got 409'd and was dropped). → step 138.
const DIRTY_FILE = "/tmp/fractera-deploy.dirty";

// The WAL lives in the TARGET's dir (historically APP_DIR/DEPLOY_STATE.json — unchanged for "app").
function writeWAL(targetDir: string, data: object) {
  try { writeFileSync(resolve(targetDir, "DEPLOY_STATE.json"), JSON.stringify(data, null, 2)); } catch {}
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
function slotBuildEnv(targetDir: string): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env, FORCE_COLOR: "0" };
  delete env.__NEXT_PROCESSED_ENV;
  try {
    const slotEnvFile = resolve(targetDir, ".env.local");
    for (const line of readFileSync(slotEnvFile, "utf8").split("\n")) {
      const m = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/.exec(line);
      if (m) delete env[m[1]];
    }
  } catch { /* no .env.local yet — child @next/env will use defaults */ }
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
function runBuild(description: string, target: DeployTarget): string {
  const { dir, pm2, health } = TARGETS[target];
  const jobId = Date.now().toString();
  const logFile = `/tmp/fractera-deploy-${jobId}.log`;
  writeFileSync(LOCK_FILE, jobId);
  writeWAL(dir, { status: "STARTED", jobId, target, startedAt: new Date().toISOString(), description });

  const logFd = openSync(logFile, "w");
  // Spawn the build with a TARGET-SCOPED env so the target's own .env.local fully governs
  // every build-time variable it declares (languages, Stripe keys, any custom app var). → step 143.
  const proc = spawn("npm", ["run", "build", "--prefix", dir], {
    stdio: ["ignore", logFd, logFd],
    env: slotBuildEnv(dir),
  });

  proc.on("exit", (code) => {
    try {
      const { closeSync, appendFileSync } = require("fs");
      closeSync(logFd);

      if (code !== 0) {
        writeWAL(dir, { status: "FAILED", jobId, target, failedAt: new Date().toISOString(), description });
        writeFileSync(LOCK_FILE + ".failed", jobId);
      } else {
        // pm2 reload (graceful)
        const { execSync } = require("child_process");
        try {
          execSync(`pm2 reload ${pm2}`, { timeout: 30000 });
        } catch (e) {
          appendFileSync(logFile, `\n[deploy] pm2 reload error: ${e}\n`);
        }

        // Health check
        let healthy = false;
        for (let i = 0; i < 3; i++) {
          try {
            execSync(`curl -sf ${health}`, { timeout: 10000 });
            healthy = true;
            break;
          } catch {
            execSync("sleep 10");
          }
        }

        if (!healthy) {
          writeWAL(dir, { status: "HEALTH_FAILED", jobId, target, failedAt: new Date().toISOString(), description });
        } else {
          // Commit deploy success
          try {
            execSync(`git -C ${dir}/.. add -A && git -C ${dir}/.. commit -m "DEPLOY_SUCCESS: ${description}" --allow-empty`, { timeout: 15000 });
          } catch {}
          writeWAL(dir, { status: "COMPLETED", jobId, target, completedAt: new Date().toISOString(), description });
          appendFileSync(logFile, "\n[deploy] COMPLETED\n");
        }
      }

      try { unlinkSync(LOCK_FILE); } catch {}

      // Coalesced rerun: a request arrived during this build → build the latest state once.
      // The marker's first line is the TARGET, the rest is the description (step 197).
      if (existsSync(DIRTY_FILE)) {
        let nextDesc = "deploy (coalesced)";
        let nextTarget: DeployTarget = "app";
        try {
          const raw = readFileSync(DIRTY_FILE, "utf8");
          const nl = raw.indexOf("\n");
          const t = (nl === -1 ? raw : raw.slice(0, nl)).trim();
          if (t in TARGETS) nextTarget = t as DeployTarget;
          const d = nl === -1 ? "" : raw.slice(nl + 1).trim();
          if (d) nextDesc = d;
        } catch {}
        try { unlinkSync(DIRTY_FILE); } catch {}
        runBuild(nextDesc, nextTarget);
      }
    } catch {}
  });

  return jobId;
}

export async function POST(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { description = "deploy", target = "app" } = await req.json().catch(() => ({}));
  if (!(target in TARGETS)) {
    return NextResponse.json(
      { error: `unknown target "${target}" — expected one of: ${Object.keys(TARGETS).join(", ")}` },
      { status: 400 },
    );
  }
  const deployTarget = target as DeployTarget;
  if (!existsSync(TARGETS[deployTarget].dir)) {
    return NextResponse.json({ error: `target dir missing: ${TARGETS[deployTarget].dir}` }, { status: 409 });
  }

  // Concurrent deploy guard + coalescing: if a build is running, record this request as the
  // pending latest state (so the running build reruns for it on finish) and report in_progress.
  if (existsSync(LOCK_FILE)) {
    const lockedJobId = readFileSync(LOCK_FILE, "utf8").trim();
    try { writeFileSync(DIRTY_FILE, `${deployTarget}\n${description}`); } catch {}
    return NextResponse.json({ error: "in_progress", jobId: lockedJobId, queued: true }, { status: 409 });
  }

  // Fresh build start — clear any stale dirty marker; this build covers the current state.
  try { if (existsSync(DIRTY_FILE)) unlinkSync(DIRTY_FILE); } catch {}
  const jobId = runBuild(description, deployTarget);
  return NextResponse.json({ ok: true, jobId, target: deployTarget, status: "started", logFile: `/tmp/fractera-deploy-${jobId}.log` });
}
