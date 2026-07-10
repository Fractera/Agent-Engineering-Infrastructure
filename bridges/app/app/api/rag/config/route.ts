import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { requireAuth } from "@/lib/require-auth";
// Single-source OpenAI key (step 208): the key fans out to every store via propagateOpenAiKey.
import { propagateOpenAiKey, openaiKeyStatus, restartRagWithEnv } from "@/lib/openai-key";

const RAG_ENV = process.env.RAG_ENV_PATH ?? "/opt/fractera/services/rag/.env";
const HERMES_ENV = process.env.HERMES_ENV_PATH ?? "/root/.hermes/.env";
const ALLOWED_KEYS = new Set(["LLM_BINDING_API_KEY", "EMBEDDING_BINDING_API_KEY", "LLM_MODEL"]);

function parseEnv(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    result[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1);
  }
  return result;
}

function serializeEnv(vars: Record<string, string>): string {
  if (!Object.keys(vars).length) return "";
  return Object.entries(vars).map(([k, v]) => `${k}=${v}`).join("\n") + "\n";
}

export async function GET(req: NextRequest) {
  const ok = await requireAuth(req.headers.get("cookie") ?? "");
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const vars = fs.existsSync(RAG_ENV) ? parseEnv(fs.readFileSync(RAG_ENV, "utf-8")) : {};
    return NextResponse.json({
      // Unified status (step 208) — the ONE canonical key, so every surface agrees.
      configured: openaiKeyStatus().configured,
      model: vars.LLM_MODEL ?? "gpt-4o-mini",
    });
  } catch {
    return NextResponse.json({ configured: false, model: "gpt-4o-mini" });
  }
}

export async function POST(req: NextRequest) {
  const ok = await requireAuth(req.headers.get("cookie") ?? "");
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { vars } = await req.json() as { vars: Record<string, string> };
    const key = (vars.LLM_BINDING_API_KEY ?? "").trim();

    // Non-key rag settings (the Memory model / host) stay rag-local.
    const existing = fs.existsSync(RAG_ENV) ? parseEnv(fs.readFileSync(RAG_ENV, "utf-8")) : {};
    let wroteLocal = false;
    for (const [k, v] of Object.entries(vars)) {
      if (ALLOWED_KEYS.has(k) && k !== "LLM_BINDING_API_KEY") { existing[k] = v; wroteLocal = true; }
    }
    if (wroteLocal) {
      fs.mkdirSync(path.dirname(RAG_ENV), { recursive: true });
      fs.writeFileSync(RAG_ENV, serializeEnv(existing), "utf-8");
    }

    // The OpenAI key → the SINGLE unified writer (step 208). It writes RAG's three key names,
    // the Hermes credential pool, hermes .env, the slot, and the provider — so a key entered
    // HERE reaches Brain and the automations too (previously it did not).
    let alsoUpdated: "all" | null = null;
    if (key) {
      propagateOpenAiKey(key);
      alsoUpdated = "all";
    } else if (wroteLocal) {
      // Env-refreshing restart (step 208): rag settings are process-env values; a plain pm2
      // restart reuses the old cached environment and the change never reaches the server.
      restartRagWithEnv(500);
    }

    return NextResponse.json({ ok: true, alsoUpdated });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
