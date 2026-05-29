import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { readEnvFile, writeEnvFile, pm2RestartDetached } from "@/lib/env-file";

const HERMES_ENV = process.env.HERMES_ENV_PATH ?? "/root/.hermes/.env";
const RAG_ENV    = process.env.RAG_ENV_PATH    ?? "/opt/fractera/services/rag/.env";

const HERMES_KEY = "OPENAI_API_KEY";
const TELEGRAM_KEY = "TELEGRAM_BOT_TOKEN";
const RAG_LLM_KEY = "LLM_BINDING_API_KEY";
const RAG_EMB_KEY = "EMBEDDING_BINDING_API_KEY";

export async function GET(req: NextRequest) {
  const ok = await requireAuth(req.headers.get("cookie") ?? "");
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const vars = readEnvFile(HERMES_ENV);
  const key = vars[HERMES_KEY] ?? "";
  const tg  = vars[TELEGRAM_KEY] ?? "";
  return NextResponse.json({
    configured: !!key,
    keyMasked: key ? `${key.slice(0, 7)}…${key.slice(-4)}` : null,
    telegramConfigured: !!tg,
    telegramMasked: tg ? `${tg.slice(0, 6)}…${tg.slice(-4)}` : null,
  });
}

export async function POST(req: NextRequest) {
  const ok = await requireAuth(req.headers.get("cookie") ?? "");
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { apiKey?: string; telegramBotToken?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const hermesVars = readEnvFile(HERMES_ENV);
  const apiKeyRaw = (body.apiKey ?? "").trim();
  const tgRaw     = (body.telegramBotToken ?? "").trim();

  // Only validate fields the user actually sent. Empty string = leave existing
  // value untouched. The UI sends "" when the user didn't change a field.
  if (apiKeyRaw) {
    if (!apiKeyRaw.startsWith("sk-")) {
      return NextResponse.json({ error: "Invalid OpenAI key (expected sk-… format)" }, { status: 400 });
    }
    hermesVars[HERMES_KEY] = apiKeyRaw;
  }
  if (tgRaw) {
    // Telegram bot tokens are <bot_id>:<35-char-secret>, e.g. 1234567:ABC…
    if (!/^\d+:[A-Za-z0-9_-]{20,}$/.test(tgRaw)) {
      return NextResponse.json({ error: "Invalid Telegram bot token format" }, { status: 400 });
    }
    hermesVars[TELEGRAM_KEY] = tgRaw;
  }

  if (!apiKeyRaw && !tgRaw) {
    return NextResponse.json({ error: "Nothing to save" }, { status: 400 });
  }

  try {
    writeEnvFile(HERMES_ENV, hermesVars);
  } catch (e) {
    return NextResponse.json({ error: `Write failed: ${e}` }, { status: 500 });
  }

  // Autofill: if RAG has no OpenAI key yet AND we just saved one, propagate.
  // Never overwrite an existing RAG key — that's the user's choice.
  let alsoUpdated: "rag" | null = null;
  if (apiKeyRaw) {
    const ragVars = readEnvFile(RAG_ENV);
    if (!ragVars[RAG_LLM_KEY] && !ragVars[RAG_EMB_KEY]) {
      ragVars[RAG_LLM_KEY] = apiKeyRaw;
      ragVars[RAG_EMB_KEY] = apiKeyRaw;
      try {
        writeEnvFile(RAG_ENV, ragVars);
        pm2RestartDetached("fractera-rag", 500);
        alsoUpdated = "rag";
      } catch { /* best-effort */ }
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
