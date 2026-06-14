import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { cache } from "react";
import { AppConfig, DEFAULT_APP_CONFIG } from "./app-config.defaults";

// Server-only loader for the live site config. The config is a REAL JSON file on disk
// (APP-CONFIG/app-config.json at the project working dir = /opt/fractera/app), edited via
// Admin -> Site Settings. It is read fresh per request (deduped within one render by React
// cache()), so a save shows up on the next page load — no rebuild, no NEXT_PUBLIC bake-in.
// Same source-of-truth-on-disk pattern as glossary-file.ts / crud-docs (steps 107-112).
//
// NEVER import this from a client component (it uses fs). Client code receives config
// values as props from a server component; the pure types/defaults live in
// app-config.defaults.ts which IS client-safe.

const CONFIG_PATH =
  process.env.APP_CONFIG_PATH ?? join(process.cwd(), "APP-CONFIG", "app-config.json");

// Recursively merge a partial on-disk object over the code defaults so a missing or stale
// key never breaks rendering (the file is allowed to hold only the keys the owner changed).
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

// Create the file from defaults on first read (like ensureRoot for CRUD-DOCS). Best-effort:
// a read-only fs must never crash a render — we fall back to in-memory defaults.
export function ensureConfig(): void {
  try {
    if (existsSync(CONFIG_PATH)) return;
    mkdirSync(dirname(CONFIG_PATH), { recursive: true });
    writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULT_APP_CONFIG, null, 2), "utf8");
  } catch {
    /* fall back to defaults in memory */
  }
}

// Keep fields that feed `new URL(...)` valid so a blank value can never 500 a render.
function normalize(cfg: AppConfig): AppConfig {
  const isUrl = (v: unknown): v is string => typeof v === "string" && /^https?:\/\//.test(v);
  if (!isUrl(cfg.url)) cfg.url = DEFAULT_APP_CONFIG.url;
  if (cfg.seo.canonicalBase !== undefined && !isUrl(cfg.seo.canonicalBase)) {
    cfg.seo.canonicalBase = cfg.url;
  }
  if (!cfg.lang) cfg.lang = DEFAULT_APP_CONFIG.lang;
  return cfg;
}

// Read + merge the live config. Cached per request render pass; fresh across requests.
export const getAppConfig = cache((): AppConfig => {
  ensureConfig();
  try {
    const raw = readFileSync(CONFIG_PATH, "utf8");
    return normalize(deepMerge(DEFAULT_APP_CONFIG, JSON.parse(raw)));
  } catch {
    return DEFAULT_APP_CONFIG;
  }
});

export function getConfigPath(): string {
  return CONFIG_PATH;
}
