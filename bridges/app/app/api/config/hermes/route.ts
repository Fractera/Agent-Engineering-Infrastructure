import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { readEnvFile, writeEnvFile, pm2RestartDetached } from "@/lib/env-file";

const HERMES_ENV = process.env.HERMES_ENV_PATH ?? "/root/.hermes/.env";
const RAG_ENV    = process.env.RAG_ENV_PATH    ?? "/opt/fractera/services/rag/.env";

const HERMES_KEY = "OPENAI_API_KEY";
const RAG_LLM_KEY = "LLM_BINDING_API_KEY";
const RAG_EMB_KEY = "EMBEDDING_BINDING_API_KEY";

export async function GET(req: NextRequest) {
  const ok = await requireAuth(req.headers.get("cookie") ?? "");
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const vars = readEnvFile(HERMES_ENV);
  const key = vars[HERMES_KEY] ?? "";
  return NextResponse.json({
    configured: !!key,
    keyMasked: key ? `${key.slice(0, 7)}…${key.slice(-4)}` : null,
  });
}

export async function POST(req: NextRequest) {
  const ok = await requireAuth(req.headers.get("cookie") ?? "");
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { apiKey?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const trimmed = (body.apiKey ?? "").trim();
  if (!trimmed.startsWith("sk-")) {
    return NextResponse.json({ error: "Invalid key (expected sk-… format)" }, { status: 400 });
  }

  const hermesVars = readEnvFile(HERMES_ENV);
  hermesVars[HERMES_KEY] = trimmed;
  try {
    writeEnvFile(HERMES_ENV, hermesVars);
  } catch (e) {
    return NextResponse.json({ error: `Write failed: ${e}` }, { status: 500 });
  }

  // Autofill: if RAG has no key yet, propagate the same one across.
  // We never overwrite an existing RAG key — that's the user's choice.
  let alsoUpdated: "rag" | null = null;
  const ragVars = readEnvFile(RAG_ENV);
  if (!ragVars[RAG_LLM_KEY] && !ragVars[RAG_EMB_KEY]) {
    ragVars[RAG_LLM_KEY] = trimmed;
    ragVars[RAG_EMB_KEY] = trimmed;
    try {
      writeEnvFile(RAG_ENV, ragVars);
      pm2RestartDetached("fractera-rag", 500);
      alsoUpdated = "rag";
    } catch {
      // Best-effort — Hermes save already succeeded.
    }
  }

  pm2RestartDetached("fractera-hermes", 500);

  return NextResponse.json({ ok: true, alsoUpdated });
}

export async function DELETE(req: NextRequest) {
  const ok = await requireAuth(req.headers.get("cookie") ?? "");
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const vars = readEnvFile(HERMES_ENV);
  vars[HERMES_KEY] = "";
  writeEnvFile(HERMES_ENV, vars);
  pm2RestartDetached("fractera-hermes", 500);
  return NextResponse.json({ ok: true });
}
