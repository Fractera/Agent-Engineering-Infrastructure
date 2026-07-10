import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { requireAuth } from "@/lib/require-auth";
// Single-source OpenAI key (step 208): entering the key in the Memory panel fans out to ALL
// stores through propagateOpenAiKey, exactly like the Brain/Projects paths; the "configured"
// signal comes from the one canonical status.
import { propagateOpenAiKey, openaiKeyStatus, restartRagWithEnv, clearOpenAiKey } from "@/lib/openai-key";

const RAG_ENV    = process.env.RAG_ENV_PATH    ?? "/opt/fractera/services/rag/.env";
const HERMES_ENV = process.env.HERMES_ENV_PATH ?? "/root/.hermes/.env";

// LightRAG (Company Brain) needs an OpenAI API key for both LLM and
// embeddings. The same key is written to LLM_BINDING_API_KEY and
// EMBEDDING_BINDING_API_KEY — we don't expose them as two separate
// fields in the UI because partners ship one key. It is ALSO written to the
// plain OPENAI_API_KEY: LightRAG's OpenAI client reads that exact env name
// directly (os.environ["OPENAI_API_KEY"]); without it every document fails to
// embed (KeyError) and the vector memory silently stays empty. → step 207.15.
const RAG_OPENAI_KEY = "OPENAI_API_KEY";

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
  // Unified status (step 208): "configured" reflects the ONE canonical key so Memory agrees with
  // Brain/Projects no matter where it was entered. Models stay rag-specific.
  const status = openaiKeyStatus();
  return NextResponse.json({
    configured: status.configured,
    keyMasked: status.keyMasked,
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

    // Memory model (rag-specific) — write it first so the propagate restart below loads it too.
    if (model) {
      const existing = readEnv();
      existing.LLM_MODEL = model;
      fs.mkdirSync(path.dirname(RAG_ENV), { recursive: true });
      fs.writeFileSync(RAG_ENV, serializeEnv(existing), "utf-8");
    }

    // OpenAI key → the SINGLE unified writer (step 208). Entering it in the Memory panel now
    // fans out to hermes .env + credential pool + RAG + slot + provider — EXACTLY like the
    // Brain/Projects paths. No more partial "rag-only, hermes-only-if-empty" propagation that
    // left the agent's pool and the slot automations keyless (the "полное безумие" divergence).
    let alsoUpdated: "all" | null = null;
    if (trimmed) {
      propagateOpenAiKey(trimmed);
      alsoUpdated = "all";
    } else if (model) {
      // Model-only change: restart RAG with the env refreshed (LLM_MODEL is process-env too —
      // a plain pm2 reload keeps the old cached environment, step 208 finding).
      restartRagWithEnv(500);
    }

    return NextResponse.json({ ok: true, alsoUpdated });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const ok = await requireAuth(req.headers.get("cookie") ?? "");
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // ONE record → one delete (step 208): removing the key from the Memory surface clears it
  // everywhere (hermes .env + pool + rag + slot), exactly like the Brain-surface DELETE.
  clearOpenAiKey();
  return NextResponse.json({ ok: true });
}
