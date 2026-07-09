import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { requireAuth } from "@/lib/require-auth";
import { readEnvFile, writeEnvFile, pm2RestartDetached } from "@/lib/env-file";

const RAG_ENV    = process.env.RAG_ENV_PATH    ?? "/opt/fractera/services/rag/.env";
const HERMES_ENV = process.env.HERMES_ENV_PATH ?? "/root/.hermes/.env";

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
    // Step 207.10 item 2: the panel may send an OpenAI key AND/OR a Memory (LLM) model. Each field is
    // optional — an empty value leaves the existing one untouched (the model dropdown can be changed
    // without re-pasting the key). At least one must be present.
    const { apiKey, llmModel } = await req.json() as { apiKey?: string; llmModel?: string };
    const trimmed = (apiKey ?? "").trim();
    const model = (llmModel ?? "").trim();
    if (!trimmed && !model) {
      return NextResponse.json({ error: "Nothing to save" }, { status: 400 });
    }
    if (trimmed && !trimmed.startsWith("sk-")) {
      return NextResponse.json({ error: "Invalid key (expected sk-… format)" }, { status: 400 });
    }
    if (model && !/^[a-z0-9][a-z0-9.\-_]+$/i.test(model)) {
      return NextResponse.json({ error: "Invalid model id" }, { status: 400 });
    }

    const existing = readEnv();
    if (trimmed) {
      existing.LLM_BINDING_API_KEY = trimmed;
      existing.EMBEDDING_BINDING_API_KEY = trimmed;
    }
    if (model) {
      existing.LLM_MODEL = model;
    }

    fs.mkdirSync(path.dirname(RAG_ENV), { recursive: true });
    fs.writeFileSync(RAG_ENV, serializeEnv(existing), "utf-8");

    // Reload the RAG service so it picks up the new key/model. pm2 reload
    // is graceful (no downtime).
    await new Promise<void>((resolve) => {
      exec("pm2 reload fractera-rag", (err) => {
        if (err) console.error("[rag-config] pm2 reload failed", err);
        resolve();
      });
    });

    // Autofill: if Hermes has no OpenAI key yet, propagate the same one.
    // Never overwrite an existing Hermes key — that's the user's choice
    // (two services may want different keys). Best-effort: Hermes failure
    // doesn't fail the RAG save. Only when a key was actually sent.
    let alsoUpdated: "hermes" | null = null;
    if (trimmed) {
      const hermesVars = readEnvFile(HERMES_ENV);
      if (!hermesVars.OPENAI_API_KEY) {
        hermesVars.OPENAI_API_KEY = trimmed;
        try {
          writeEnvFile(HERMES_ENV, hermesVars);
          pm2RestartDetached("fractera-hermes", 500);
          alsoUpdated = "hermes";
        } catch {
          // ignore — RAG save above already succeeded
        }
      }
    }

    return NextResponse.json({ ok: true, alsoUpdated });
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
