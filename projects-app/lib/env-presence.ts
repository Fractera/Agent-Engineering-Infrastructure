import { readFile } from "node:fs/promises";
import { join } from "node:path";

// ENV PRESENCE (step 248) — the ONE shared reader of the projects-app's own .env.local, extracted from
// app/api/project-config/env/route.ts so the architecture bundle (passport.credentials) and the
// credential-warning auto-resolve can answer "is this key set?" without duplicating the parser.
// PRESENCE ONLY — this module never exposes a value to a caller that ships it anywhere.

export function envPath(): string {
  return process.env.APP_ENV_PATH ?? join(process.cwd(), ".env.local");
}

export async function readEnvLines(): Promise<string[]> {
  try {
    const raw = await readFile(envPath(), "utf8");
    return raw.length ? raw.split(/\r?\n/) : [];
  } catch {
    return [];
  }
}

export function presentFromLines(lines: string[], keys: string[]): Record<string, boolean> {
  const found: Record<string, string> = {};
  for (const line of lines) {
    const m = /^\s*([A-Z][A-Z0-9_]*)\s*=(.*)$/.exec(line);
    if (m) found[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  const out: Record<string, boolean> = {};
  for (const k of keys) out[k] = Boolean(found[k] && found[k].length);
  return out;
}

/** Presence flags for the given env keys — true ⟺ the key exists with a non-empty value. */
export async function readEnvPresence(keys: string[]): Promise<Record<string, boolean>> {
  return presentFromLines(await readEnvLines(), keys);
}
