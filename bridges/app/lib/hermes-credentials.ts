import { spawnSync } from "child_process";

// Populate the Hermes credential pool (~/.hermes/auth.json) with an OpenAI API
// key. The migrated Hermes agent reads provider credentials from the POOL, not
// from ~/.hermes/.env — writing only .env produces an unreliable env-seeded
// entry that can 401. We register the key as a managed manual entry through the
// hermes CLI (the path proven to work), de-duped by a fixed label so repeated
// saves don't pile up. Best-effort: never throws.
// → reports/errors/hermes-key-pool-and-model-default.md (step 89)
export const POOL_LABEL = "fractera-openai";

export function addOpenAiKeyToPool(key: string): { ok: boolean; reason?: string } {
  const env = { ...process.env, HOME: "/root", PATH: `/usr/local/bin:${process.env.PATH ?? ""}` };
  // Remove our previous managed entry first so repeated saves don't accumulate.
  try {
    spawnSync("hermes", ["auth", "remove", "openai-api", POOL_LABEL], { env, timeout: 15000 });
  } catch { /* best-effort — entry may not exist yet */ }
  try {
    const r = spawnSync(
      "hermes",
      ["auth", "add", "openai-api", "--type", "api-key", "--label", POOL_LABEL, "--api-key", key],
      { env, timeout: 25000 },
    );
    if (r.status === 0) return { ok: true };
    return { ok: false, reason: (r.stderr?.toString() || r.stdout?.toString() || `exit ${r.status}`).slice(0, 200) };
  } catch (e) {
    return { ok: false, reason: String(e) };
  }
}
