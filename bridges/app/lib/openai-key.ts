import fs from "fs";
import { spawn } from "child_process";
import { readEnvFile, writeEnvFile, pm2RestartDetached } from "@/lib/env-file";
import { addOpenAiKeyToPool } from "@/lib/hermes-credentials";

// ─────────────────────────────────────────────────────────────────────────────
// SINGLE SOURCE OF TRUTH for the OpenAI API key (step 208 unification).
//
// The key has FOUR physical homes on the server because its consumers are separate
// processes with separate config files — there cannot be one literal file:
//   1. Hermes .env            OPENAI_API_KEY            (back-compat + the "configured" signal)
//   2. Hermes credential pool auth.json openai-api       — the AGENT's real auth (:9119)
//   3. RAG .env               LLM/EMBEDDING_BINDING + OPENAI_API_KEY — Memory/LightRAG (:9621)
//   4. Slot .env.local        OPENAI_API_KEY            — the project automations (:3000)
// (+ Hermes config.yaml provider/model — gates whether the agent uses openai-api.)
//
// "ONE record readable/writable from anywhere" therefore means: ONE writer that fans the key
// out to ALL of the above atomically, and ONE status read. BEFORE this module, three routes
// (config/hermes = full; config/rag + rag/config = partial) diverged, so entering the key in
// one place left other consumers keyless while a "configured" check showed green (the false
// green / "полное безумие"). Every write route now calls propagateOpenAiKey; every configured
// check reads openaiKeyStatus. → next-step/208-openai-key-unification-and-arch-refactor.
// ─────────────────────────────────────────────────────────────────────────────

const HERMES_ENV    = process.env.HERMES_ENV_PATH    ?? "/root/.hermes/.env";
const HERMES_CONFIG = process.env.HERMES_CONFIG_PATH ?? "/root/.hermes/config.yaml";
const HERMES_AUTH   = process.env.HERMES_AUTH_PATH   ?? "/root/.hermes/auth.json";
const RAG_ENV       = process.env.RAG_ENV_PATH       ?? "/opt/fractera/services/rag/.env";
const SLOT_ENV      = process.env.SLOT_ENV_PATH      ?? "/opt/fractera/app/.env.local";

const HERMES_KEY     = "OPENAI_API_KEY";
const RAG_LLM_KEY    = "LLM_BINDING_API_KEY";
const RAG_EMB_KEY    = "EMBEDDING_BINDING_API_KEY";
const RAG_OPENAI_KEY = "OPENAI_API_KEY"; // LightRAG reads os.environ["OPENAI_API_KEY"] (step 207.15)

// LightRAG takes its credentials ONLY from the PROCESS environment (os.environ) — it does not
// re-read .env at runtime, and a plain `pm2 reload/restart` reuses the OLD cached env. So a key
// written to rag/.env never reached the running server: every embed kept failing with
// KeyError: 'OPENAI_API_KEY' even though the file was correct (proven live, step 208). The ONLY
// reliable restart is: source the .env into the shell, then `pm2 restart --update-env` so pm2
// refreshes the process environment from it. Use THIS for fractera-rag, never pm2RestartDetached.
export function restartRagWithEnv(delayMs = 500): void {
  const dir = RAG_ENV.slice(0, RAG_ENV.lastIndexOf("/")) || "/opt/fractera/services/rag";
  try {
    spawn("sh", ["-c", `sleep ${Math.max(delayMs, 0) / 1000}; cd ${dir} && set -a && . ./.env && set +a && pm2 restart fractera-rag --update-env`], {
      detached: true,
      stdio: "ignore",
    }).unref();
  } catch { /* best-effort */ }
}

// ── config.yaml helpers (moved here from config/hermes/route.ts so every writer shares them) ──

export function readHermesModel(): string | null {
  try {
    if (!fs.existsSync(HERMES_CONFIG)) return null;
    const txt = fs.readFileSync(HERMES_CONFIG, "utf-8");
    const m = txt.match(/^\s*model:\s*(\S+)\s*$/m);
    return m ? m[1] : null;
  } catch { return null; }
}

export function writeHermesModel(model: string): { ok: boolean; reason?: string } {
  try {
    if (!fs.existsSync(HERMES_CONFIG)) return { ok: false, reason: "config.yaml not found" };
    const txt = fs.readFileSync(HERMES_CONFIG, "utf-8");
    if (!/^\s*model:\s*\S+/m.test(txt)) return { ok: false, reason: "no model: line in config.yaml" };
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

export function writeHermesProvider(provider: string): { ok: boolean; reason?: string } {
  try {
    if (!fs.existsSync(HERMES_CONFIG)) return { ok: false, reason: "config.yaml not found" };
    const txt = fs.readFileSync(HERMES_CONFIG, "utf-8");
    if (!/^\s*provider:\s*\S+/m.test(txt)) return { ok: false, reason: "no provider: line in config.yaml" };
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

// True when the user connected a subscription (Codex/Claude/…) — recorded in auth.json.
// A fresh server (no auth.json) takes the API-key path. Best-effort → false on any error.
export function subscriptionConnected(): boolean {
  try {
    const a = JSON.parse(fs.readFileSync(HERMES_AUTH, "utf-8"));
    const pools = [a?.providers, a?.credential_pool].filter((p) => p && typeof p === "object");
    // A pool that ONLY holds our managed OpenAI api-key entry is NOT a subscription — otherwise
    // re-saving the key would stop switching the provider to openai-api on a keyless agent.
    return pools.some((p) =>
      Object.entries(p as Record<string, unknown>).some(([k]) => !/openai/i.test(k)),
    );
  } catch {
    return false;
  }
}

export type PropagateResult = {
  hermesEnv: boolean;
  pool: boolean | null;
  rag: boolean;
  slot: boolean;
  providerSwitched: string | null;
};

// THE single writer. Fans ONE OpenAI key out to every consumer store + switches the provider,
// then restarts the affected processes. Idempotent; best-effort per store (a store failing
// never blocks the others). `model` optionally sets the Brain model; otherwise a fresh
// api-key switch defaults to gpt-5-mini.
export function propagateOpenAiKey(key: string, opts?: { model?: string }): PropagateResult {
  const apiKey = key.trim();
  const model = (opts?.model ?? "").trim();
  const result: PropagateResult = { hermesEnv: false, pool: null, rag: false, slot: false, providerSwitched: null };
  if (!apiKey) return result;

  // 1. Hermes .env (back-compat + the canonical "configured" signal read by openaiKeyStatus).
  try {
    const hermesVars = readEnvFile(HERMES_ENV);
    hermesVars[HERMES_KEY] = apiKey;
    writeEnvFile(HERMES_ENV, hermesVars);
    result.hermesEnv = true;
  } catch { /* best-effort */ }

  // 2. Hermes credential pool — the agent's ACTUAL authentication.
  result.pool = addOpenAiKeyToPool(apiKey).ok;

  // 3. Provider switch: only when no subscription is connected (never hijack a connected sub).
  if (!subscriptionConnected()) {
    const pw = writeHermesProvider("openai-api");
    if (pw.ok) {
      result.providerSwitched = "openai-api";
      writeHermesModel(model || "gpt-5-mini");
    } else if (model) {
      writeHermesModel(model);
    }
  } else if (model) {
    writeHermesModel(model);
  }

  // 4. RAG / Memory — all three names LightRAG needs.
  try {
    const ragVars = readEnvFile(RAG_ENV);
    ragVars[RAG_LLM_KEY] = apiKey;
    ragVars[RAG_EMB_KEY] = apiKey;
    ragVars[RAG_OPENAI_KEY] = apiKey;
    writeEnvFile(RAG_ENV, ragVars);
    restartRagWithEnv(500); // NOT pm2RestartDetached — LightRAG needs the env refreshed (see above)
    result.rag = true;
  } catch { /* best-effort */ }

  // 5. Slot — the project automations read process.env.OPENAI_API_KEY from here.
  try {
    if (fs.existsSync(SLOT_ENV)) {
      const slotVars = readEnvFile(SLOT_ENV);
      slotVars[HERMES_KEY] = apiKey;
      writeEnvFile(SLOT_ENV, slotVars);
      pm2RestartDetached("fractera-app", 500);
      result.slot = true;
    }
  } catch { /* best-effort */ }

  // 6. Restart Hermes agent + its Telegram gateway so they reload the key/provider.
  pm2RestartDetached("fractera-hermes", 500);
  try {
    spawn("sh", ["-c", "pm2 restart fractera-hermes-gateway --update-env"], {
      detached: true, stdio: "ignore",
    }).unref();
  } catch { /* best-effort — the gateway may not exist on older servers */ }

  return result;
}

// THE single status read. Canonical signal = Hermes .env OPENAI_API_KEY (propagateOpenAiKey
// always writes it first). Every "configured" check — Projects modal, Brain card, Memory card,
// OpenAI/Memory panels — reads THIS, so all surfaces agree no matter where the key was entered.
export function openaiKeyStatus(): { configured: boolean; keyMasked: string | null } {
  const key = readEnvFile(HERMES_ENV)[HERMES_KEY] ?? "";
  return {
    configured: !!key,
    keyMasked: key ? `${key.slice(0, 7)}…${key.slice(-4)}` : null,
  };
}

// Full clear across every store (for the DELETE paths / from-scratch). Symmetric to propagate.
export function clearOpenAiKey(): void {
  try { const v = readEnvFile(HERMES_ENV); delete v[HERMES_KEY]; writeEnvFile(HERMES_ENV, v); } catch { /* noop */ }
  try {
    const v = readEnvFile(RAG_ENV);
    delete v[RAG_LLM_KEY]; delete v[RAG_EMB_KEY]; delete v[RAG_OPENAI_KEY];
    writeEnvFile(RAG_ENV, v); restartRagWithEnv(500);
  } catch { /* noop */ }
  try {
    if (fs.existsSync(SLOT_ENV)) { const v = readEnvFile(SLOT_ENV); delete v[HERMES_KEY]; writeEnvFile(SLOT_ENV, v); pm2RestartDetached("fractera-app", 500); }
  } catch { /* noop */ }
  try {
    const a = JSON.parse(fs.readFileSync(HERMES_AUTH, "utf-8"));
    for (const poolName of ["credential_pool", "providers"]) {
      const p = a[poolName];
      if (p && typeof p === "object") for (const k of Object.keys(p)) if (/openai/i.test(k)) delete p[k];
    }
    fs.writeFileSync(HERMES_AUTH, JSON.stringify(a, null, 2));
  } catch { /* noop */ }
  pm2RestartDetached("fractera-hermes", 500);
}
