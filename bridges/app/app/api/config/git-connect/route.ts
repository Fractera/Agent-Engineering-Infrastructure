import { NextRequest, NextResponse } from "next/server";
import { hardenSecretFile } from "@/lib/env-file";
import fs from "fs";
import { exec } from "child_process";
import { promisify } from "util";
import { requireAuth } from "@/lib/require-auth";

const execAsync = promisify(exec);
const APP_ENV = process.env.APP_ENV_PATH ?? "/opt/fractera/app/.env.local";
const PROJECT_DIR = process.env.APP_DIR ?? "/opt/fractera/app";

const KEY_URL = "USER_GITHUB_REPO_URL";
const KEY_TOKEN = "USER_GITHUB_ACCESS_TOKEN";
const KEY_VERIFIED = "USER_GITHUB_VERIFIED_AT";

// Connecting a repository, in one place. (step 500)
//
// Until now the panel EXPLAINED how to connect and then sent the owner to the Env
// Variables screen to actually do it — the error text even said so. Reading in one
// tab and typing in another is where people give up, and this is the one setting
// they cannot skip: git is the only road by which their work leaves the server.
// The backup archive deliberately carries data, not source.
//
// The second thing this route fixes is honesty about state. Values being present
// is not a connection. A wrong token, a repository you can read but not write to,
// a name that does not exist — all of these used to read as "connected" until a
// push failed much later. So saving VERIFIES, and only a verified save is green.

function parseEnv(content: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    out[t.slice(0, eq).trim()] = t.slice(eq + 1);
  }
  return out;
}

function writeEnv(vars: Record<string, string>) {
  const body = Object.entries(vars).map(([k, v]) => `${k}=${v}`).join("\n") + "\n";
  fs.writeFileSync(APP_ENV, body, { mode: 0o600 });
  hardenSecretFile(APP_ENV);
}

function authUrl(repoUrl: string, token: string): string {
  const clean = repoUrl.trim();
  if (!token) return clean;
  return clean.replace(/^https:\/\//, `https://x-access-token:${token}@`);
}

/** Turn git's stderr into something a person can act on. */
function explain(raw: string, hasToken: boolean): string {
  const s = raw.toLowerCase();
  if (s.includes("could not read username") || s.includes("authentication failed") || s.includes("invalid username")) {
    return hasToken
      ? "GitHub rejected the token. Check that it has not expired and that it grants access to this repository."
      : "This repository is private, so it needs an access token. Create one and paste it above.";
  }
  if (s.includes("repository not found") || s.includes("not found")) {
    return "GitHub does not find this repository. Check the address, and — if it is private — that the token belongs to an account with access.";
  }
  if (s.includes("permission") || s.includes("403")) {
    return "The token can read this repository but not write to it. It needs repository write access.";
  }
  if (s.includes("could not resolve host") || s.includes("timed out")) {
    return "The server could not reach GitHub. This is a network problem, not a credentials problem.";
  }
  return raw.slice(0, 300) || "GitHub refused the connection without saying why.";
}

// GET — current state, with the token never sent back to the browser.
export async function GET(req: NextRequest) {
  const ok = await requireAuth(req.headers.get("cookie") ?? "");
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const vars = fs.existsSync(APP_ENV) ? parseEnv(fs.readFileSync(APP_ENV, "utf-8")) : {};
  const repoUrl = vars[KEY_URL] ?? "";
  const hasToken = Boolean(vars[KEY_TOKEN]);
  const verifiedAt = vars[KEY_VERIFIED] ?? null;

  // Three states, because the middle one is where the failures live.
  const state = !repoUrl ? "unconfigured" : verifiedAt ? "working" : "unverified";

  // What a first push would carry. Sending blind is the reason people hesitate.
  let pendingFiles = 0;
  let sample: string[] = [];
  try {
    const { stdout } = await execAsync(
      `git -C ${PROJECT_DIR} rev-parse --is-inside-work-tree >/dev/null 2>&1 && git -C ${PROJECT_DIR} status --porcelain || git -C ${PROJECT_DIR} ls-files --others --exclude-standard`,
      { timeout: 15000, maxBuffer: 4 * 1024 * 1024 },
    );
    const rows = stdout.split("\n").map((l) => l.slice(3).trim() || l.trim()).filter(Boolean);
    pendingFiles = rows.length;
    sample = rows.slice(0, 10);
  } catch {
    // A slot that is not a repository yet simply has nothing to report.
  }

  return NextResponse.json(
    { state, repoUrl, hasToken, verifiedAt, pendingFiles, sample },
    { headers: { "Cache-Control": "no-store" } },
  );
}

// POST { repoUrl, token? } — save AND verify. A save that cannot be verified is
// still written (so the owner does not lose the typing) but reported as failed.
export async function POST(req: NextRequest) {
  const ok = await requireAuth(req.headers.get("cookie") ?? "");
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const repoUrl = typeof body?.repoUrl === "string" ? body.repoUrl.trim() : "";
  const token = typeof body?.token === "string" ? body.token.trim() : "";

  if (!/^https:\/\/github\.com\/[^/]+\/[^/]+/.test(repoUrl)) {
    return NextResponse.json({ error: "Expected an address like https://github.com/owner/repository" }, { status: 400 });
  }

  const vars = fs.existsSync(APP_ENV) ? parseEnv(fs.readFileSync(APP_ENV, "utf-8")) : {};
  vars[KEY_URL] = repoUrl;
  // An empty token field means "keep what is saved", not "erase it" — the browser
  // never receives the token, so it cannot send it back.
  if (token) vars[KEY_TOKEN] = token;

  const effectiveToken = token || vars[KEY_TOKEN] || "";

  // The verification itself: ask GitHub, over the network, right now.
  try {
    await execAsync(`git ls-remote "${authUrl(repoUrl, effectiveToken)}" HEAD`, { timeout: 25000 });
  } catch (e) {
    delete vars[KEY_VERIFIED];
    writeEnv(vars);
    const raw = String((e as { stderr?: string; message?: string }).stderr ?? (e as Error).message ?? e);
    return NextResponse.json({ ok: false, state: "unverified", error: explain(raw, Boolean(effectiveToken)) }, { status: 422 });
  }

  vars[KEY_VERIFIED] = new Date().toISOString();
  writeEnv(vars);
  return NextResponse.json(
    { ok: true, state: "working", verifiedAt: vars[KEY_VERIFIED] },
    { headers: { "Cache-Control": "no-store" } },
  );
}
