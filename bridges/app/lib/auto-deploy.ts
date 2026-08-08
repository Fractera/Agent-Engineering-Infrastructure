import { exec } from "child_process";
import { promisify } from "util";
import { existsSync } from "fs";

// Automatic deployment — the server asks the repository whether it moved, instead of the repository
// telling the server. Same visible behaviour as a hosting platform that deploys on push, with nothing
// to configure on GitHub: no webhook, no public URL, works in IP mode too.
//
// Off by default, on purpose. Unlike a hosting platform, this server BUILDS on the same machine that
// serves visitors — frequent pushes cost responsiveness, not just restarts. That is the owner's
// decision and the reason the three modes exist rather than one switch.

const execAsync = promisify(exec);

const PROJECT_DIR = "/opt/fractera/app";
const LOCK_FILE   = "/tmp/fractera-deploy.lock";
const DATA_URL    = process.env.NEXT_PUBLIC_MEDIA_URL ?? "http://localhost:3300";
const DATA_SECRET = process.env.DATA_SECRET ?? "";
const SETTINGS_KEY = "autoDeploy";

const TICK_MS  = 60_000;   // how often the repository is asked
const QUIET_MS = 120_000;  // how long it must stay still before anything is done

export type AutoDeployMode = "off" | "pull" | "pull+deploy";

export type AutoDeployState = {
  mode: AutoDeployMode;
  lastCheckAt?: string | null;
  lastResult?: string | null;   // short machine word: idle | up-to-date | pulled | deployed | skipped | error
  lastReason?: string | null;   // one sentence a human can act on
};

const DEFAULT_STATE: AutoDeployState = { mode: "off", lastCheckAt: null, lastResult: null, lastReason: null };

// ── settings, kept in the data layer ─────────────────────────────────────────

export async function readState(): Promise<AutoDeployState> {
  try {
    const res = await fetch(`${DATA_URL}/panel-settings/${SETTINGS_KEY}`, {
      headers: { "x-data-secret": DATA_SECRET },
      cache: "no-store",
    });
    if (!res.ok) return DEFAULT_STATE;
    const data = await res.json();
    return { ...DEFAULT_STATE, ...(data.value ?? {}) } as AutoDeployState;
  } catch {
    // Unreachable storage means "we do not know the mode", and an unknown mode must not act.
    return DEFAULT_STATE;
  }
}

export async function writeState(next: AutoDeployState): Promise<void> {
  const res = await fetch(`${DATA_URL}/panel-settings/${SETTINGS_KEY}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", "x-data-secret": DATA_SECRET },
    body: JSON.stringify({ value: next }),
  });
  if (!res.ok) throw new Error(`could not store the mode: ${res.status} ${await res.text()}`);
}

// ── the deploy journal, reused rather than duplicated ────────────────────────

async function record(id: string, status: string, description: string, log: string) {
  try {
    const h = { "Content-Type": "application/json", "x-data-secret": DATA_SECRET };
    await fetch(`${DATA_URL}/deploy-runs`, { method: "POST", headers: h, body: JSON.stringify({ id, status, description }) });
    await fetch(`${DATA_URL}/deploy-runs/${id}`, { method: "PATCH", headers: h, body: JSON.stringify({ status, log, durationMs: 0 }) });
  } catch (e) {
    console.error(`[auto-deploy] could not write to the journal: ${e}`);
  }
}

// ── the watch ────────────────────────────────────────────────────────────────

const git = (cmd: string) =>
  execAsync(`git -C ${PROJECT_DIR} ${cmd}`, { timeout: 30_000 })
    .then(r => r.stdout.trim())
    .catch(() => null);

let started = false;
// Remembered between ticks so the same refusal is written to the journal ONCE. A watch that repeats
// itself every minute turns the history into noise and hides the runs that matter.
let lastSkipReason: string | null = null;
// When the remote was first seen ahead. The quiet period is measured from here, so ten pushes in a
// row become one build instead of ten.
let aheadSince = 0;

export function startAutoDeployWatch() {
  if (started) return;
  started = true;
  console.log("[auto-deploy] watch started");
  setInterval(() => { void tick(); }, TICK_MS).unref?.();
}

async function tick() {
  const state = await readState();
  if (state.mode === "off") return;

  const stamp = async (result: string, reason: string | null) => {
    try { await writeState({ ...state, lastCheckAt: new Date().toISOString(), lastResult: result, lastReason: reason }); }
    catch (e) { console.error(`[auto-deploy] ${e}`); }
  };

  // A repository is required — until GitHub is connected there is nothing to watch.
  const remote = await git("config --get remote.origin.url");
  if (!existsSync(`${PROJECT_DIR}/.git`) || !remote) {
    await skip("no-repository", "No repository is connected, so there is nothing to watch.", stamp);
    return;
  }

  const fetched = await git("fetch origin main --quiet");
  if (fetched === null) {
    await skip("fetch-failed", "The repository could not be reached — check the access token.", stamp);
    return;
  }

  const counts = await git("rev-list --left-right --count origin/main...HEAD");
  if (!counts) {
    await skip("no-comparison", "The repository could not be compared with this server.", stamp);
    return;
  }
  const [behind, ahead] = counts.split(/\s+/).map(Number);

  if (!behind) {
    aheadSince = 0;
    lastSkipReason = null;
    await stamp("up-to-date", null);
    return;
  }

  // From here the repository IS ahead. Everything below decides whether it is safe to act.
  if (ahead > 0) {
    await skip("diverged", "This server has commits the repository does not — histories have diverged, so nothing is pulled automatically.", stamp);
    return;
  }

  const dirty = await git("status --porcelain");
  if (dirty) {
    const n = dirty.split("\n").filter(Boolean).length;
    await skip("dirty", `This server holds ${n} uncommitted file${n === 1 ? "" : "s"} — pulling would bury that work, so the turn is skipped.`, stamp);
    return;
  }

  if (existsSync(LOCK_FILE)) {
    await skip("busy", "A build is already running; this turn is skipped.", stamp);
    return;
  }

  // The quiet period: act only once the repository has stopped moving.
  const now = Date.now();
  if (!aheadSince) aheadSince = now;
  if (now - aheadSince < QUIET_MS) {
    await stamp("waiting", "The repository moved; waiting for it to settle before acting.");
    return;
  }

  const merged = await git("merge --ff-only origin/main");
  if (merged === null) {
    await skip("merge-failed", "Fast-forward failed — the repository and this server cannot be reconciled automatically.", stamp);
    return;
  }
  aheadSince = 0;
  lastSkipReason = null;

  const head = (await git("rev-parse --short HEAD")) ?? "unknown";

  if (state.mode === "pull") {
    await record(`auto-${now}`, "PULLED", "auto: pull", `Fast-forwarded to ${head}.\n${merged}`);
    await stamp("pulled", `Pulled to ${head}. Press Deploy when the code should go live.`);
    return;
  }

  // pull+deploy — the same build the Deploy button runs, with its lock, its journal entry and its
  // fallback to the last working artifact. Imported lazily so this module can be loaded by the
  // instrumentation hook without dragging a route into the server bundle at startup.
  const { runBuild } = await import("@/app/api/deploy/route");
  const jobId = runBuild("auto: deploy");
  await stamp("deployed", `Pulled to ${head} and started a build (${jobId}).`);
}

async function skip(
  result: string,
  reason: string,
  stamp: (result: string, reason: string | null) => Promise<void>,
) {
  await stamp("skipped", reason);
  if (lastSkipReason === result) return; // said once, not every minute
  lastSkipReason = result;
  await record(`auto-skip-${Date.now()}`, "SKIPPED", "auto: skipped", reason);
}
