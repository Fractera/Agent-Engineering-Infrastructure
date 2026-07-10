import { NextRequest, NextResponse } from "next/server"
import { spawn } from "node:child_process"
import { readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { getSession } from "@/lib/auth/get-session"

// Slot-scoped, single-key env setter for the Projects layer (step 186.4).
// The admin whole-file setter (bridges/app .../api/config/env) rewrites the ENTIRE
// .env.local — unsuitable for the native "missing keys" modal (186.3), which must
// add ONE runtime key without clobbering the rest. This route does a safe
// read-modify-write of the slot's OWN app/.env.local, then triggers a DETACHED
// `pm2 restart fractera-app` (runtime var → restart, ~3-5s; NOT a rebuild — that
// is rule 143's build-time path). GET reports present/absent flags (never values)
// for the modal's on-mount check.
//
// Node runtime: child_process + fs.
export const runtime = "nodejs"

// Roles allowed to write project env — the /projects zone is architect/manager
// gated (requireRole in app/(projects)/layout.tsx); agents (Hermes) too.
const WRITE_ROLES = ["architect", "manager", "agent"]

// Keys this route refuses to touch: build-time public vars (their path is a rebuild,
// not a restart — rule 143) and platform-locked secrets (owned by the admin/platform,
// never a project key). Everything else that is a well-formed UPPER_SNAKE key is allowed.
const LOCKED_KEYS = new Set([
  "AUTH_SERVICE_URL",
  "NEXT_PUBLIC_AUTH_URL",
  "DEPLOY_SECRET",
  "DATA_TOKEN",
  "DATABASE_URL",
  "APP_ENV_PATH",
])
const KEY_RE = /^[A-Z][A-Z0-9_]*$/

function envPath(): string {
  return process.env.APP_ENV_PATH ?? join(process.cwd(), ".env.local")
}

function keyRejection(key: string): string | null {
  if (!KEY_RE.test(key)) return "key must be UPPER_SNAKE_CASE"
  if (key.startsWith("NEXT_PUBLIC_")) return "public build-time keys need a rebuild, not this route"
  if (LOCKED_KEYS.has(key)) return "key is platform-locked"
  return null
}

async function readEnvLines(): Promise<string[]> {
  try {
    const raw = await readFile(envPath(), "utf8")
    return raw.length ? raw.split(/\r?\n/) : []
  } catch {
    return []
  }
}

function serializeValue(value: string): string {
  // Quote only when the value carries characters dotenv would mis-parse.
  return /[\s#"'\\]/.test(value) ? `"${value.replace(/(["\\])/g, "\\$1")}"` : value
}

function presentFromLines(lines: string[], keys: string[]): Record<string, boolean> {
  const found: Record<string, string> = {}
  for (const line of lines) {
    const m = /^\s*([A-Z][A-Z0-9_]*)\s*=(.*)$/.exec(line)
    if (m) found[m[1]] = m[2].trim().replace(/^["']|["']$/g, "")
  }
  const out: Record<string, boolean> = {}
  for (const k of keys) out[k] = Boolean(found[k] && found[k].length)
  return out
}

async function authorize(req: NextRequest): Promise<boolean> {
  const session = await getSession(req)
  return Boolean(session?.roles?.some((r) => WRITE_ROLES.includes(r)))
}

// Non-secret keys whose VALUE may be returned (step 207.19 — the model picker must show the CURRENT
// model, not an empty placeholder). Anything smelling of a credential is presence-only, as before.
function valueReadable(key: string): boolean {
  return !/TOKEN|KEY|SECRET|PASSWORD|AUTH/i.test(key)
}

export async function GET(req: NextRequest) {
  if (!(await authorize(req))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }
  const keysParam = req.nextUrl.searchParams.get("keys") ?? ""
  const keys = keysParam.split(",").map((k) => k.trim()).filter(Boolean)
  const lines = await readEnvLines()
  // values: only for explicitly requested, non-secret keys (model ids etc.) — presence stays the
  // contract for everything credential-shaped.
  const values: Record<string, string> = {}
  for (const k of keys) {
    if (!valueReadable(k) || !KEY_RE.test(k)) continue
    const line = lines.find((l) => l.startsWith(`${k}=`))
    if (line) values[k] = line.slice(k.length + 1).trim()
  }
  return NextResponse.json({ present: presentFromLines(lines, keys), values })
}

export async function POST(req: NextRequest) {
  if (!(await authorize(req))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  let body: { key?: string; value?: string; restart?: boolean }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 })
  }

  const key = (body.key ?? "").trim()
  const value = body.value ?? ""
  // Optional restart deferral (default true = restart, so existing single-key callers are
  // unchanged). A caller writing SEVERAL keys in one flow passes restart:false on all but the
  // final trigger, so fractera-app — the very process serving THIS request and the caller's page —
  // bounces exactly ONCE at the end instead of mid-flow. A mid-flow bounce killed the follow-up
  // request (the OpenAI save) and blanked the page (the missing-keys-modal red-toast race).
  const doRestart = body.restart !== false
  if (!key) return NextResponse.json({ error: "key is required" }, { status: 400 })

  const rejection = keyRejection(key)
  if (rejection) return NextResponse.json({ error: rejection }, { status: 422 })

  // Read-modify-write: replace the line if the key exists, else append it, leaving
  // every other line (values, comments, blanks) byte-untouched.
  const lines = await readEnvLines()
  const rendered = `${key}=${serializeValue(String(value))}`
  let replaced = false
  const next = lines.map((line) => {
    const m = /^\s*([A-Z][A-Z0-9_]*)\s*=/.exec(line)
    if (m && m[1] === key) {
      replaced = true
      return rendered
    }
    return line
  })
  if (!replaced) {
    if (next.length && next[next.length - 1] !== "") next.push("")
    // insert before a trailing blank so the file keeps a single terminal newline
    next.splice(next.length - 1, 0, rendered)
  }
  await writeFile(envPath(), next.join("\n"), "utf8")

  // Runtime var → detached restart so it takes effect without a rebuild. A tiny
  // sleep lets THIS response flush before pm2 recycles the process. Production only;
  // in dev (hot-reload, no pm2) the value is already live on next read. Skipped when
  // the caller deferred (restart:false) — it will trigger the single restart itself.
  const willRestart = doRestart && process.env.NODE_ENV === "production"
  if (willRestart) {
    try {
      spawn("sh", ["-c", "sleep 1; pm2 restart fractera-app"], {
        detached: true,
        stdio: "ignore",
      }).unref()
    } catch {
      // best-effort: the value is written; a manual restart still applies it
    }
  }

  return NextResponse.json({ ok: true, key, restarting: willRestart })
}
