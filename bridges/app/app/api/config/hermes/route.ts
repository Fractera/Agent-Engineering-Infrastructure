import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import crypto from "crypto";
import { spawn } from "child_process";
import { requireAuth } from "@/lib/require-auth";
import { readEnvFile, writeEnvFile, pm2RestartDetached } from "@/lib/env-file";
// Single-source OpenAI key writer/status (step 208): config/hermes, config/rag and rag/config
// ALL fan the key out through propagateOpenAiKey, so the entry point never changes the result.
import { propagateOpenAiKey, readHermesModel, writeHermesModel, clearOpenAiKey } from "@/lib/openai-key";

const HERMES_ENV    = process.env.HERMES_ENV_PATH ?? "/root/.hermes/.env";
const HERMES_CONFIG = process.env.HERMES_CONFIG_PATH ?? "/root/.hermes/config.yaml";
const RAG_ENV       = process.env.RAG_ENV_PATH    ?? "/opt/fractera/services/rag/.env";
// Owner trust-on-first-use file — shared contract with the fractera-platforms
// Hermes plugin (gateway hook reads {secret, claimed}). When the user saves a
// Telegram token we mint a one-time secret here and hand back a deep link
// (https://t.me/<bot>?start=<secret>); the plugin auto-approves whoever sends
// that /start as the owner, so no manual pairing-code approval is needed.
const OWNER_PAIRING = process.env.HERMES_OWNER_PAIRING_PATH ?? "/root/.hermes/fractera-owner-pairing.json";
// Hermes stores subscription OAuth/device credentials (Codex/Claude/…) here,
// in a per-provider pool. Used to decide whether to auto-switch the agent to
// the API-key provider — we never hijack a connected subscription.
const HERMES_AUTH = process.env.HERMES_AUTH_PATH ?? "/root/.hermes/auth.json";

const HERMES_KEY = "OPENAI_API_KEY";
const TELEGRAM_KEY = "TELEGRAM_BOT_TOKEN";
const RAG_LLM_KEY = "LLM_BINDING_API_KEY";
const RAG_EMB_KEY = "EMBEDDING_BINDING_API_KEY";
// LightRAG's OpenAI client (lightrag/llm/openai.py create_openai_async_client)
// reads the key from os.environ["OPENAI_API_KEY"] DIRECTLY — the binding-specific
// names above are NOT enough on their own. Without this plain name every document
// fails to embed (KeyError: 'OPENAI_API_KEY') and Company Memory stays empty while
// Hermes reports "Entry added". Always write it alongside the binding keys.
// → step 207.15 finding (8/8 docs Failed until OPENAI_API_KEY was set).
const RAG_OPENAI_KEY = "OPENAI_API_KEY";
// The guest slot's own env — automations read process.env.OPENAI_API_KEY /
// TELEGRAM_BOT_TOKEN from HERE at runtime (step 199 unified-key contract). The
// substrate save propagates the ONE key down to this file too, closing the
// false-green gap where the UI showed configured but the slot had no key.
const SLOT_ENV = process.env.SLOT_ENV_PATH ?? "/opt/fractera/app/.env.local";
// (step 205) The automations-bot token is NO LONGER set here: each automation owns its OWN Telegram
// bot, configured in that automation's connect modal (which writes <PROJECT>_BOT_TOKEN to the slot +
// an entry to the fractera-automations listener registry). This route is Hermes-only.

type OwnerPairing = {
  secret?: string;
  claimed?: boolean;
  botUsername?: string | null;
  owner_user_id?: string;
};

function readOwnerPairing(): OwnerPairing {
  try {
    return JSON.parse(fs.readFileSync(OWNER_PAIRING, "utf-8")) as OwnerPairing;
  } catch {
    return {};
  }
}

function writeOwnerPairing(data: OwnerPairing): void {
  fs.writeFileSync(OWNER_PAIRING, JSON.stringify(data, null, 2), "utf-8");
}

// Build the t.me link shown in the panel. While the owner is unclaimed the link
// carries the one-time secret (clicking + Start claims ownership). Once claimed
// it degrades to a plain chat link so the user can always re-find their bot.
function buildDeepLink(owner: OwnerPairing): string | null {
  if (!owner.botUsername) return null;
  if (owner.secret && !owner.claimed) {
    return `https://t.me/${owner.botUsername}?start=${owner.secret}`;
  }
  return `https://t.me/${owner.botUsername}`;
}

// Resolve the bot's @username from its token via Telegram getMe. Stateless call
// (no conflict with the gateway's long-poll). Returns null on any failure — the
// panel still works, it just won't render the one-tap "Message your bot" link.
async function fetchBotUsername(token: string): Promise<string | null> {
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/getMe`, {
      signal: AbortSignal.timeout(8000),
    });
    const d = await r.json();
    return d?.ok && d?.result?.username ? String(d.result.username) : null;
  } catch {
    return null;
  }
}

// config.yaml helpers (readHermesModel / writeHermesModel / writeHermesProvider) and the
// key fan-out (pool, RAG, slot, provider) moved to lib/openai-key.ts (step 208) so every
// write route shares ONE implementation. This route only orchestrates parse/validate + the
// Telegram-token + owner-pairing concerns that are Hermes-specific.

export async function GET(req: NextRequest) {
  const ok = await requireAuth(req.headers.get("cookie") ?? "");
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const vars = readEnvFile(HERMES_ENV);
  const key = vars[HERMES_KEY] ?? "";
  const tg  = vars[TELEGRAM_KEY] ?? "";
  const model = readHermesModel();
  const owner = readOwnerPairing();
  return NextResponse.json({
    configured: !!key,
    keyMasked: key ? `${key.slice(0, 7)}…${key.slice(-4)}` : null,
    telegramConfigured: !!tg,
    telegramMasked: tg ? `${tg.slice(0, 6)}…${tg.slice(-4)}` : null,
    model,
    // Owner-pairing surface for the "Message your bot" one-tap flow.
    botUsername: owner.botUsername ?? null,
    ownerClaimed: !!owner.claimed,
    telegramDeepLink: tg ? buildDeepLink(owner) : null,
  });
}

export async function POST(req: NextRequest) {
  const ok = await requireAuth(req.headers.get("cookie") ?? "");
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { apiKey?: string; telegramBotToken?: string; model?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const apiKeyRaw = (body.apiKey ?? "").trim();
  const tgRaw     = (body.telegramBotToken ?? "").trim();
  const modelRaw  = (body.model ?? "").trim();

  // Only validate fields the user actually sent. Empty string = leave existing value untouched.
  if (apiKeyRaw && !apiKeyRaw.startsWith("sk-")) {
    return NextResponse.json({ error: "Invalid OpenAI key (expected sk-… format)" }, { status: 400 });
  }
  if (tgRaw && !/^\d+:[A-Za-z0-9_-]{20,}$/.test(tgRaw)) {
    return NextResponse.json({ error: "Invalid Telegram bot token format" }, { status: 400 });
  }
  if (modelRaw && !/^[a-z0-9][a-z0-9.\-_]+$/i.test(modelRaw)) {
    return NextResponse.json({ error: "Invalid model id" }, { status: 400 });
  }
  if (!apiKeyRaw && !tgRaw && !modelRaw) {
    return NextResponse.json({ error: "Nothing to save" }, { status: 400 });
  }

  // OpenAI key → the SINGLE unified writer (step 208). Identical outcome whether the key is
  // entered here, in the Memory panel, or in a project's key modal: hermes .env + credential
  // pool + RAG + slot + provider/model, with the right restarts.
  let providerSwitched: string | null = null;
  let poolAdded: boolean | null = null;
  let alsoUpdated: "rag" | null = null;
  let slotUpdated = false;
  if (apiKeyRaw) {
    const r = propagateOpenAiKey(apiKeyRaw, { model: modelRaw });
    providerSwitched = r.providerSwitched;
    poolAdded = r.pool;
    alsoUpdated = r.rag ? "rag" : null;
    slotUpdated = r.slot;
  }

  // Brain model-only change (no key): config.yaml only.
  let modelWrite: { ok: boolean; reason?: string } | null = null;
  if (modelRaw && !apiKeyRaw) {
    modelWrite = writeHermesModel(modelRaw);
  }

  // Telegram bot token (the Hermes chat bot) → hermes .env; a fresh token resets owner-pairing
  // (mint a one-time secret + resolve the @username for the one-tap "Message your bot" deep link).
  let telegram: { botUsername: string | null; deepLink: string | null } | null = null;
  if (tgRaw) {
    const hermesVars = readEnvFile(HERMES_ENV);
    hermesVars[TELEGRAM_KEY] = tgRaw;
    try {
      writeEnvFile(HERMES_ENV, hermesVars);
    } catch (e) {
      return NextResponse.json({ error: `Write failed: ${e}` }, { status: 500 });
    }
    const botUsername = await fetchBotUsername(tgRaw);
    const owner: OwnerPairing = {
      secret: crypto.randomBytes(18).toString("base64url"),
      claimed: false,
      botUsername,
    };
    try {
      writeOwnerPairing(owner);
    } catch { /* best-effort — panel still works without the deep link */ }
    telegram = { botUsername, deepLink: buildDeepLink(owner) };

    // Restart Hermes + its Telegram gateway so the new token reconnects. (If an OpenAI key was
    // ALSO sent, propagateOpenAiKey already restarted these — a second detached restart is harmless.)
    pm2RestartDetached("fractera-hermes", 500);
    try {
      spawn("sh", ["-c", "pm2 restart fractera-hermes-gateway --update-env"], {
        detached: true,
        stdio: "ignore",
      }).unref();
    } catch { /* best-effort — credentials are saved regardless */ }
  }

  return NextResponse.json({
    ok: true,
    alsoUpdated,
    slotUpdated,
    modelWriteError: modelWrite && !modelWrite.ok ? modelWrite.reason : null,
    telegram,
    providerSwitched,
    poolAdded,
  });
}

export async function DELETE(req: NextRequest) {
  const ok = await requireAuth(req.headers.get("cookie") ?? "");
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Full symmetric clear across EVERY store (step 208) — not just hermes .env — so a delete
  // from any surface truly removes the one key everywhere (pool, RAG, slot, hermes .env).
  clearOpenAiKey();
  return NextResponse.json({ ok: true });
}
