import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { requireAuth } from "@/lib/require-auth";

const RAG_ENV = process.env.RAG_ENV_PATH ?? "/opt/fractera/services/rag/.env";

// LightRAG (Company Brain) needs an OpenAI API key for both LLM and
// embeddings. The same key is written to LLM_BINDING_API_KEY and
// EMBEDDING_BINDING_API_KEY — we don't expose them as two separate
// fields in the UI because partners ship one key.

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

function readEnv(): Record<string, string> {
  try {
    return fs.existsSync(RAG_ENV) ? parseEnv(fs.readFileSync(RAG_ENV, "utf-8")) : {};
  } catch {
    return {};
  }
}

export async function GET(req: NextRequest) {
  const ok = await requireAuth(req.headers.get("cookie") ?? "");
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const vars = readEnv();
  const llmKey = vars.LLM_BINDING_API_KEY ?? "";
  const embKey = vars.EMBEDDING_BINDING_API_KEY ?? "";
  // The UI only needs to know "is a key configured" + a masked preview.
  // Returning the raw key would let a leaked admin cookie exfiltrate it.
  const configuredKey = llmKey || embKey;
  return NextResponse.json({
    configured: !!configuredKey,
    keyMasked: configuredKey ? `${configuredKey.slice(0, 7)}…${configuredKey.slice(-4)}` : null,
    llmModel: vars.LLM_MODEL ?? "",
    embeddingModel: vars.EMBEDDING_MODEL ?? "",
  });
}

export async function POST(req: NextRequest) {
  const ok = await requireAuth(req.headers.get("cookie") ?? "");
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { apiKey } = await req.json() as { apiKey?: string };
    const trimmed = (apiKey ?? "").trim();
    if (!trimmed.startsWith("sk-")) {
      return NextResponse.json({ error: "Invalid key (expected sk-… format)" }, { status: 400 });
    }

    const existing = readEnv();
    existing.LLM_BINDING_API_KEY = trimmed;
    existing.EMBEDDING_BINDING_API_KEY = trimmed;

    fs.mkdirSync(path.dirname(RAG_ENV), { recursive: true });
    fs.writeFileSync(RAG_ENV, serializeEnv(existing), "utf-8");

    // Reload the RAG service so it picks up the new key. pm2 reload
    // is graceful (no downtime).
    await new Promise<void>((resolve) => {
      exec("pm2 reload fractera-rag", (err) => {
        if (err) console.error("[rag-config] pm2 reload failed", err);
        resolve();
      });
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const ok = await requireAuth(req.headers.get("cookie") ?? "");
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = readEnv();
  existing.LLM_BINDING_API_KEY = "";
  existing.EMBEDDING_BINDING_API_KEY = "";
  fs.mkdirSync(path.dirname(RAG_ENV), { recursive: true });
  fs.writeFileSync(RAG_ENV, serializeEnv(existing), "utf-8");
  await new Promise<void>((resolve) => {
    exec("pm2 reload fractera-rag", () => resolve());
  });
  return NextResponse.json({ ok: true });
}
