import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import { execSync } from "child_process";
import { requireAuth } from "@/lib/require-auth";
import { readEnvFile, writeEnvFile, pm2RestartDetached } from "@/lib/env-file";
import { addOpenAiKeyToPool } from "@/lib/hermes-credentials";

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
      configured: !!(vars.LLM_BINDING_API_KEY?.trim()),
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
    const existing = fs.existsSync(RAG_ENV) ? parseEnv(fs.readFileSync(RAG_ENV, "utf-8")) : {};

    for (const [k, v] of Object.entries(vars)) {
      if (ALLOWED_KEYS.has(k)) existing[k] = v;
    }
    if (vars.LLM_BINDING_API_KEY) {
      existing.EMBEDDING_BINDING_API_KEY = vars.LLM_BINDING_API_KEY;
      existing.EMBEDDING_BINDING_HOST = existing.LLM_BINDING_HOST ?? "https://api.openai.com/v1";
    }

    fs.mkdirSync(require("path").dirname(RAG_ENV), { recursive: true });
    fs.writeFileSync(RAG_ENV, serializeEnv(existing), "utf-8");

    try { execSync("pm2 restart fractera-rag", { timeout: 5000 }); } catch {}

    // Autofill into Hermes env if it has no OpenAI key yet. Never overwrite
    // an existing Hermes key — that's the user's deliberate choice.
    let alsoUpdated: "hermes" | null = null;
    if (vars.LLM_BINDING_API_KEY) {
      const hermesVars = readEnvFile(HERMES_ENV);
      if (!hermesVars.OPENAI_API_KEY) {
        hermesVars.OPENAI_API_KEY = vars.LLM_BINDING_API_KEY;
        try {
          writeEnvFile(HERMES_ENV, hermesVars);
          // The agent reads the key from the credential pool, not .env — register
          // it there too, or Brain stays unauthenticated. → step 89 error doc.
          addOpenAiKeyToPool(vars.LLM_BINDING_API_KEY);
          pm2RestartDetached("fractera-hermes", 500);
          // (step 205) The web chat (:9120) is removed — only the agent restarts.
          alsoUpdated = "hermes";
        } catch { /* best-effort */ }
      }
    }

    return NextResponse.json({ ok: true, alsoUpdated });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
