import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { requireAuth } from "@/lib/require-auth";
import { ALL_LANGUAGE_METADATA } from "@/config/translations/language-metadata";

// The catalog of valid language codes. The UI picks from a checklist of these, so
// a real save is always valid — but we validate server-side too, so a direct API
// call cannot write an unknown code into NEXT_PUBLIC_SUPPORTED_LANGUAGES (which
// would feed generateStaticParams a bogus [lang] and break the build).
const VALID_CODES = new Set(Object.keys(ALL_LANGUAGE_METADATA));

// Key-scoped writer for the Shell's LANGUAGE set. The language SET is build-time env (it feeds
// generateStaticParams for [lang] and bakes into SINGLE_LANG_MODE) — the source of truth is the
// Shell's .env.local, NOT a runtime file. This route reads/writes ONLY the two NEXT_PUBLIC_*
// language keys with a line-preserving upsert, so it never clobbers the rest of .env.local the way
// the general /api/config/env route does (that one re-serialises the whole file from the payload).
// It also mirrors the choice into platform-config.json (languages/defaultLanguage) so the Platform
// panel stays consistent, but env remains authoritative. Changing the set requires a rebuild.

const APP_ENV = process.env.APP_ENV_PATH ?? "/opt/fractera/app/.env.local";
const PLATFORM_CONFIG_PATH =
  process.env.PLATFORM_CONFIG_PATH ??
  "/opt/fractera/app/PLATFORM-CONFIG/platform-config.json";

const SUPPORTED_KEY = "NEXT_PUBLIC_SUPPORTED_LANGUAGES";
const DEFAULT_KEY = "NEXT_PUBLIC_DEFAULT_LOCALE";

function readEnvValue(content: string, key: string): string | null {
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    if (trimmed.slice(0, eq).trim() === key) return trimmed.slice(eq + 1).trim();
  }
  return null;
}

// Replace the line for `key` if present, otherwise append it. Preserves all other lines/comments.
function upsertEnvLine(content: string, key: string, value: string): string {
  const lines = content.length ? content.split("\n") : [];
  let found = false;
  const next = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return line;
    const eq = trimmed.indexOf("=");
    if (eq < 0) return line;
    if (trimmed.slice(0, eq).trim() === key) {
      found = true;
      return `${key}=${value}`;
    }
    return line;
  });
  if (!found) next.push(`${key}=${value}`);
  // Drop a trailing empty entry from a final newline, then re-add a single trailing newline.
  while (next.length && next[next.length - 1] === "") next.pop();
  return next.join("\n") + "\n";
}

function parseList(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export async function GET(req: NextRequest) {
  const ok = await requireAuth(req.headers.get("cookie") ?? "");
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const content = fs.existsSync(APP_ENV) ? fs.readFileSync(APP_ENV, "utf-8") : "";
    const languages = parseList(readEnvValue(content, SUPPORTED_KEY));
    const defaultLanguage = (readEnvValue(content, DEFAULT_KEY) ?? "").toLowerCase();
    return NextResponse.json({
      languages: languages.length ? languages : ["en"],
      defaultLanguage: defaultLanguage || (languages[0] ?? "en"),
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const ok = await requireAuth(req.headers.get("cookie") ?? "");
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = (await req.json()) as { languages?: unknown; defaultLanguage?: unknown };
    const languages = Array.isArray(body.languages)
      ? Array.from(
          new Set(
            body.languages
              .filter((l): l is string => typeof l === "string")
              .map((l) => l.trim().toLowerCase())
              .filter(Boolean)
          )
        )
      : [];
    if (languages.length === 0) {
      return NextResponse.json({ error: "At least one language is required" }, { status: 400 });
    }
    // Reject any code that is not in the catalog (defence against a direct API
    // call — the UI checklist can only submit valid codes).
    const invalid = languages.filter((l) => !VALID_CODES.has(l));
    if (invalid.length > 0) {
      return NextResponse.json(
        { error: `Unknown language code(s): ${invalid.join(", ")}. Use ISO 639-1 codes from the catalog.` },
        { status: 400 }
      );
    }
    let defaultLanguage =
      typeof body.defaultLanguage === "string" ? body.defaultLanguage.trim().toLowerCase() : "";
    if (!defaultLanguage || !languages.includes(defaultLanguage)) defaultLanguage = languages[0];

    // 1) Line-preserving upsert into the Shell's .env.local (authoritative for the build).
    const existing = fs.existsSync(APP_ENV) ? fs.readFileSync(APP_ENV, "utf-8") : "";
    let nextEnv = upsertEnvLine(existing, SUPPORTED_KEY, languages.join(","));
    nextEnv = upsertEnvLine(nextEnv, DEFAULT_KEY, defaultLanguage);
    fs.mkdirSync(path.dirname(APP_ENV), { recursive: true });
    fs.writeFileSync(APP_ENV, nextEnv, "utf-8");

    // 2) Mirror into platform-config.json so the Platform panel reflects the choice (env wins).
    try {
      let cfg: Record<string, unknown> = {};
      if (fs.existsSync(PLATFORM_CONFIG_PATH)) {
        cfg = JSON.parse(fs.readFileSync(PLATFORM_CONFIG_PATH, "utf-8")) as Record<string, unknown>;
      }
      cfg.languages = languages;
      cfg.defaultLanguage = defaultLanguage;
      fs.mkdirSync(path.dirname(PLATFORM_CONFIG_PATH), { recursive: true });
      fs.writeFileSync(PLATFORM_CONFIG_PATH, JSON.stringify(cfg, null, 2), "utf-8");
    } catch {
      /* best-effort mirror; env is the source of truth */
    }

    return NextResponse.json({ ok: true, languages, defaultLanguage, rebuildRequired: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
