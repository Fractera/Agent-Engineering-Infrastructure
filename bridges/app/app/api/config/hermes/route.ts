import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import crypto from "crypto";
import { spawn } from "child_process";
import { requireAuth } from "@/lib/require-auth";
import { readEnvFile, writeEnvFile, pm2RestartDetached } from "@/lib/env-file";
import { addOpenAiKeyToPool } from "@/lib/hermes-credentials";

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

// Read the top-level `model:` line from Hermes' config.yaml. Hermes' config
// is a small YAML file written by bootstrap; we don't need a full parser,
// just to peek/replace this one field.
function readHermesModel(): string | null {
  try {
    if (!fs.existsSync(HERMES_CONFIG)) return null;
    const txt = fs.readFileSync(HERMES_CONFIG, "utf-8");
    // Match a top-level (no leading spaces / 2-spaces — bootstrap writes it
    // either at column 0 under provider, or indented under it).
    const m = txt.match(/^\s*model:\s*(\S+)\s*$/m);
    return m ? m[1] : null;
  } catch { return null; }
}

// Replace the FIRST `model:` line in Hermes' config.yaml with the requested
// value, preserving whatever indentation was already there. If no `model:`
// line exists at all we don't try to invent one — that means the user is on
// a config layout we don't recognise and should edit it manually.
function writeHermesModel(model: string): { ok: boolean; reason?: string } {
  try {
    if (!fs.existsSync(HERMES_CONFIG)) return { ok: false, reason: "config.yaml not found" };
    const txt = fs.readFileSync(HERMES_CONFIG, "utf-8");
    if (!/^\s*model:\s*\S+/m.test(txt)) {
      return { ok: false, reason: "no model: line in config.yaml" };
    }
    // Replace only the first occurrence so we don't accidentally touch
    // `fallback_model:` further down (it has a different key name anyway,
    // but defensive).
    let replaced = false;
    const out = txt.split("\n").map((line) => {
      if (replaced) return line;
      const m = line.match(/^(\s*)model:\s*\S+\s*$/);
      if (!m) return line;
      replaced = true;
      return `${m[1]}model: ${model}`;
    }).join("\n");
    fs.writeFileSync(HERMES_CONFIG, out, "utf-8");
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: String(e) };
  }
}

// Replace the FIRST top-level `provider:` line in config.yaml (the agent's
// active provider), preserving indentation. `fallback_provider:` is never
// matched (the regex anchors `provider:` to the start of the trimmed line).
function writeHermesProvider(provider: string): { ok: boolean; reason?: string } {
  try {
    if (!fs.existsSync(HERMES_CONFIG)) return { ok: false, reason: "config.yaml not found" };
    const txt = fs.readFileSync(HERMES_CONFIG, "utf-8");
    if (!/^\s*provider:\s*\S+/m.test(txt)) {
      return { ok: false, reason: "no provider: line in config.yaml" };
    }
    let replaced = false;
    const out = txt.split("\n").map((line) => {
      if (replaced) return line;
      const m = line.match(/^(\s*)provider:\s*\S+\s*$/);
      if (!m) return line;
      replaced = true;
      return `${m[1]}provider: ${provider}`;
    }).join("\n");
    fs.writeFileSync(HERMES_CONFIG, out, "utf-8");
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: String(e) };
  }
}

// True when the user has connected a subscription (Codex/Claude/…) via the
// Hermes /env panel — Hermes records those credentials in auth.json under a
// per-provider pool. Best-effort: any read/parse failure → false, so a fresh
// server (no auth.json) takes the API-key path.
function subscriptionConnected(): boolean {
  try {
    const a = JSON.parse(fs.readFileSync(HERMES_AUTH, "utf-8"));
    const pools = [a?.providers, a?.credential_pool].filter(
      (p) => p && typeof p === "object",
    );
    return pools.some((p) => Object.keys(p as object).length > 0);
  } catch {
    return false;
  }
}

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

  const hermesVars = readEnvFile(HERMES_ENV);
  const apiKeyRaw = (body.apiKey ?? "").trim();
  const tgRaw     = (body.telegramBotToken ?? "").trim();
  const modelRaw  = (body.model ?? "").trim();

  // Only validate fields the user actually sent. Empty string = leave existing
  // value untouched. The UI sends "" when the user didn't change a field.
  if (apiKeyRaw) {
    if (!apiKeyRaw.startsWith("sk-")) {
      return NextResponse.json({ error: "Invalid OpenAI key (expected sk-… format)" }, { status: 400 });
    }
    hermesVars[HERMES_KEY] = apiKeyRaw;
  }
  if (tgRaw) {
    if (!/^\d+:[A-Za-z0-9_-]{20,}$/.test(tgRaw)) {
      return NextResponse.json({ error: "Invalid Telegram bot token format" }, { status: 400 });
    }
    hermesVars[TELEGRAM_KEY] = tgRaw;
  }
  if (modelRaw) {
    if (!/^[a-z0-9][a-z0-9.\-_]+$/i.test(modelRaw)) {
      return NextResponse.json({ error: "Invalid model id" }, { status: 400 });
    }
  }

  if (!apiKeyRaw && !tgRaw && !modelRaw) {
    return NextResponse.json({ error: "Nothing to save" }, { status: 400 });
  }

  if (apiKeyRaw || tgRaw) {
    try {
      writeEnvFile(HERMES_ENV, hermesVars);
    } catch (e) {
      return NextResponse.json({ error: `Write failed: ${e}` }, { status: 500 });
    }
  }

  // Register the OpenAI key in the Hermes credential pool (the reliable path —
  // see addOpenAiKeyToPool). .env above is kept for backward-compat; the pool
  // entry is what the agent + web chat actually authenticate with.
  let poolAdded: boolean | null = null;
  if (apiKeyRaw) {
    poolAdded = addOpenAiKeyToPool(apiKeyRaw).ok;
  }

  // A fresh Telegram token resets owner-pairing: mint a new one-time secret and
  // resolve the bot @username so the panel can offer a one-tap "Message your
  // bot" deep link. The fractera-platforms gateway hook auto-approves whoever
  // sends `/start <secret>` as the owner — no manual pairing-code approval.
  let telegram: { botUsername: string | null; deepLink: string | null } | null = null;
  if (tgRaw) {
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
  }

  let modelWrite: { ok: boolean; reason?: string } | null = null;
  if (modelRaw) {
    modelWrite = writeHermesModel(modelRaw);
  }

  // Point A — "paste key → bot replies". When an OpenAI API key is saved and no
  // subscription is connected, switch the chat agent from the subscription
  // default (`openai-codex`) to the direct OpenAI API provider (`openai-api`)
  // with a cheap default model. Without this the agent stays on `openai-codex`,
  // has no credentials, and answers "Provider authentication failed" until the
  // user manually runs /model in chat. We respect an explicit model choice and
  // never override a connected subscription.
  let providerSwitched: string | null = null;
  if (apiKeyRaw && !subscriptionConnected()) {
    const pw = writeHermesProvider("openai-api");
    if (pw.ok) {
      providerSwitched = "openai-api";
      if (!modelRaw) writeHermesModel("gpt-5-mini");
    }
  }

  // Unified key contract (step 199): ONE OpenAI key is AUTHORITATIVE for EVERY
  // consumer — Hermes (written above), Memory/LightRAG, and the slot automations.
  // Memory is no longer an independently-editable key: always overwrite RAG with
  // the saved value (a single paste in one field drives all three).
  let alsoUpdated: "rag" | null = null;
  if (apiKeyRaw) {
    const ragVars = readEnvFile(RAG_ENV);
    ragVars[RAG_LLM_KEY] = apiKeyRaw;
    ragVars[RAG_EMB_KEY] = apiKeyRaw;
    // Plain OPENAI_API_KEY too — LightRAG's client reads this exact name (step 207.15).
    ragVars[RAG_OPENAI_KEY] = apiKeyRaw;
    try {
      writeEnvFile(RAG_ENV, ragVars);
      pm2RestartDetached("fractera-rag", 500);
      alsoUpdated = "rag";
    } catch { /* best-effort */ }
  }

  // Propagate the OpenAI key to the SLOT — the missing bridge that made the UI green while the
  // automation had no key (step 199). Runtime, server-only key (NOT NEXT_PUBLIC_) → a fractera-app
  // restart re-loads app/.env.local, no rebuild. Guarded on the slot file existing (self-sufficiency).
  // NOTE (step 205): only the OpenAI key is propagated to the slot. Telegram bot tokens are NOT set
  // here — each automation owns its bot, configured in that automation's own connect modal.
  let slotUpdated = false;
  if (apiKeyRaw && fs.existsSync(SLOT_ENV)) {
    try {
      const slotVars = readEnvFile(SLOT_ENV);
      slotVars[HERMES_KEY] = apiKeyRaw;
      writeEnvFile(SLOT_ENV, slotVars);
      pm2RestartDetached("fractera-app", 500);
      slotUpdated = true;
    } catch { /* best-effort — the substrate save already succeeded */ }
  }

  // (step 205) Automations-bot tokens are NOT set here anymore — each automation configures its OWN
  // bot in its connect modal (<PROJECT>_BOT_TOKEN + the fractera-automations registry). This route is
  // Hermes-only: the Hermes chat-bot token + the one global OpenAI key.

  pm2RestartDetached("fractera-hermes", 500);
  // The gateway is the process that actually connects to Telegram; restart it
  // so a newly-saved token is picked up and it reconnects to Telegram.
  // Spawned synchronously + detached (NOT via setTimeout): the admin process
  // serving this request is a DIFFERENT process, so there is no self-kill risk
  // and nothing to defer — and a deferred setTimeout after the response proved
  // unreliable in the App Router (the timer didn't fire, gateway never
  // restarted). A detached+unref'd child outlives the request regardless.
  // --update-env refreshes pm2's cached environment. No-op on servers that
  // predate the fractera-hermes-gateway process. Restart on a new token (to
  // reconnect to Telegram) OR a new key (so the gateway reloads OPENAI_API_KEY
  // and the switched `openai-api` provider — otherwise the running gateway
  // keeps the old empty-credential state and the bot stays silent).
  if (tgRaw || apiKeyRaw) {
    try {
      spawn("sh", ["-c", "pm2 restart fractera-hermes-gateway --update-env"], {
        detached: true,
        stdio: "ignore",
      }).unref();
    } catch { /* best-effort — credentials are saved regardless */ }
  }

  // (step 205) The built-in web chat (fractera-hermes-webui, :9120) is removed — only the Hermes
  // Agent remains, so there is no separate chat process to restart on a new key.

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

  const vars = readEnvFile(HERMES_ENV);
  vars[HERMES_KEY] = "";
  writeEnvFile(HERMES_ENV, vars);
  pm2RestartDetached("fractera-hermes", 500);
  return NextResponse.json({ ok: true });
}
