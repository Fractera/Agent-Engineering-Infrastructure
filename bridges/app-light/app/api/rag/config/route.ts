import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import { execSync } from "child_process";
import { requireAuth } from "@/lib/require-auth";

const RAG_ENV = process.env.RAG_ENV_PATH ?? "/opt/fractera/services/rag/.env";
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

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
