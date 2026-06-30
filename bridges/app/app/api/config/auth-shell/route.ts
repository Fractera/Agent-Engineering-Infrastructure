import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { requireAuth } from "@/lib/require-auth";

// Key-scoped writer for the Shell's PUBLIC AUTH toggle (step 161). NEXT_PUBLIC_APP_SHELL_AUTH is
// BUILD-TIME (it force-renders the header and bakes the account-drawer side into the bundle), so the
// source of truth is the Shell's .env.local, NOT a runtime file. Valid values: "left" | "right"
// (public auth ON, account drawer side) or "off" (key removed → no public auth, smaller bundle).
// Line-preserving upsert/remove so it never clobbers the rest of .env.local (the way the general
// /api/config/env route does). Mirrors the choice into platform-config.json (appShellAuth) for the
// Platform panel; env stays authoritative. A change requires a REBUILD (same coalescing deploy as
// the language set, step 138). The admin login always exists separately — this governs only the
// public app shell. Writes are owner-tier (requireAuth).

const APP_ENV = process.env.APP_ENV_PATH ?? "/opt/fractera/app/.env.local";
const PLATFORM_CONFIG_PATH =
  process.env.PLATFORM_CONFIG_PATH ??
  "/opt/fractera/app/PLATFORM-CONFIG/platform-config.json";

const AUTH_KEY = "NEXT_PUBLIC_APP_SHELL_AUTH";
const VALID_SIDES = new Set(["left", "right"]);

function readEnvValue(content: string, key: string): string | null {
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    if (trimmed.slice(0, eq).trim() === key) return trimmed.slice(eq + 1).trim();
  }
  return null;
}

// Replace the line for `key` if present, otherwise append it. Preserves all other lines/comments.
function upsertEnvLine(content: string, key: string, value: string): string {
  const lines = content.length ? content.split("\n") : [];
  let found = false;
  const next = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return line;
    const eq = trimmed.indexOf("=");
    if (eq < 0) return line;
    if (trimmed.slice(0, eq).trim() === key) {
      found = true;
      return `${key}=${value}`;
    }
    return line;
  });
  if (!found) next.push(`${key}=${value}`);
  while (next.length && next[next.length - 1] === "") next.pop();
  return next.join("\n") + "\n";
}

// Drop the line for `key` entirely (used for the "off" state). Preserves everything else.
function removeEnvLine(content: string, key: string): string {
  const lines = content.length ? content.split("\n") : [];
  const next = lines.filter((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return true;
    const eq = trimmed.indexOf("=");
    if (eq < 0) return true;
    return trimmed.slice(0, eq).trim() !== key;
  });
  while (next.length && next[next.length - 1] === "") next.pop();
  return next.length ? next.join("\n") + "\n" : "";
}

function normalize(raw: string | null): "left" | "right" | "off" {
  const v = (raw ?? "").trim().toLowerCase();
  return VALID_SIDES.has(v) ? (v as "left" | "right") : "off";
}

// Build-time toggle → a change only takes effect after the app is REBUILT. Fire the existing
// coalescing deploy pipeline (POST :3002/api/deploy) so the new state actually bakes; if a build is
// in flight the deploy route reruns for the latest state on finish (last write wins). Background;
// never blocks the save (env is already written). → step 138 (deploy/route.ts runBuild + DIRTY_FILE).
function ensureRebuild(): void {
  const url = process.env.DEPLOY_TRIGGER_URL ?? "http://127.0.0.1:3002/api/deploy";
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const secret = process.env.DEPLOY_SECRET;
  if (secret) headers["x-deploy-secret"] = secret;
  void fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ description: "App-shell auth changed → rebuild" }),
  }).catch(() => { /* coalescing in the deploy route guarantees the rebuild regardless */ });
}

export async function GET(req: NextRequest) {
  const ok = await requireAuth(req.headers.get("cookie") ?? "");
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const content = fs.existsSync(APP_ENV) ? fs.readFileSync(APP_ENV, "utf-8") : "";
    return NextResponse.json({ value: normalize(readEnvValue(content, AUTH_KEY)) });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const ok = await requireAuth(req.headers.get("cookie") ?? "");
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = (await req.json()) as { value?: unknown };
    const value = typeof body.value === "string" ? body.value.trim().toLowerCase() : "";
    if (value !== "off" && !VALID_SIDES.has(value)) {
      return NextResponse.json(
        { error: `Invalid value "${value}". Use "left", "right", or "off".` },
        { status: 400 }
      );
    }

    // 1) Line-preserving write into the Shell's .env.local (authoritative for the build).
    const existing = fs.existsSync(APP_ENV) ? fs.readFileSync(APP_ENV, "utf-8") : "";
    const nextEnv = value === "off" ? removeEnvLine(existing, AUTH_KEY) : upsertEnvLine(existing, AUTH_KEY, value);
    fs.mkdirSync(path.dirname(APP_ENV), { recursive: true });
    fs.writeFileSync(APP_ENV, nextEnv, "utf-8");

    // 2) Mirror into platform-config.json so the Platform panel reflects the choice (env wins).
    try {
      let cfg: Record<string, unknown> = {};
      if (fs.existsSync(PLATFORM_CONFIG_PATH)) {
        cfg = JSON.parse(fs.readFileSync(PLATFORM_CONFIG_PATH, "utf-8")) as Record<string, unknown>;
      }
      cfg.appShellAuth = value === "off" ? null : value;
      fs.mkdirSync(path.dirname(PLATFORM_CONFIG_PATH), { recursive: true });
      fs.writeFileSync(PLATFORM_CONFIG_PATH, JSON.stringify(cfg, null, 2), "utf-8");
    } catch {
      /* best-effort mirror; env is the source of truth */
    }

    ensureRebuild();
    return NextResponse.json({ ok: true, value, rebuildRequired: true, rebuildScheduled: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
