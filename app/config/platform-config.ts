import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { cache } from "react";
import { PlatformConfig, DEFAULT_PLATFORM_CONFIG } from "./platform-config.defaults";

// Server-only loader for the live PLATFORM config (routing / languages / theme).
// The config is a REAL JSON file on disk (PLATFORM-CONFIG/platform-config.json at the
// project working dir = /opt/fractera/app), edited via Admin -> Platform. It is read
// fresh per request (deduped within one render by React cache()), so a save shows up on
// the next page load — no rebuild for the runtime flags (parallelRouting / theme).
//
// Same source-of-truth-on-disk pattern as config/app-config.ts (step 115).
// NEVER import this from a client component (it uses fs). Client code receives values as
// props from a server component; the pure types/defaults live in platform-config.defaults.ts
// which IS client-safe.

const CONFIG_PATH =
  process.env.PLATFORM_CONFIG_PATH ??
  join(process.cwd(), "PLATFORM-CONFIG", "platform-config.json");

// Recursively merge a partial on-disk object over the code defaults so a missing or stale
// key never breaks rendering (the file may hold only the keys the owner changed).
function deepMerge<T>(base: T, over: unknown): T {
  if (over === null || over === undefined) return base;
  if (typeof base !== "object" || Array.isArray(base) || typeof over !== "object") {
    return over as T;
  }
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [k, v] of Object.entries(over as Record<string, unknown>)) {
    out[k] = k in out ? deepMerge((base as Record<string, unknown>)[k], v) : v;
  }
  return out as T;
}

// Create the file from defaults on first read (like ensureConfig for Site Settings).
// Best-effort: a read-only fs must never crash a render — fall back to in-memory defaults.
export function ensurePlatformConfig(): void {
  try {
    if (existsSync(CONFIG_PATH)) return;
    mkdirSync(dirname(CONFIG_PATH), { recursive: true });
    writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULT_PLATFORM_CONFIG, null, 2), "utf8");
  } catch {
    /* fall back to defaults in memory */
  }
}

// Read + merge the live config. Cached per request render pass; fresh across requests.
export const getPlatformConfig = cache((): PlatformConfig => {
  ensurePlatformConfig();
  try {
    const raw = readFileSync(CONFIG_PATH, "utf8");
    return deepMerge(DEFAULT_PLATFORM_CONFIG, JSON.parse(raw));
  } catch {
    return DEFAULT_PLATFORM_CONFIG;
  }
});

export function getPlatformConfigPath(): string {
  return CONFIG_PATH;
}
