import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { requireAuth } from "@/lib/require-auth";

const APP_ENV  = process.env.APP_ENV_PATH  ?? "/opt/fractera/app/.env.local";
const AUTH_ENV = process.env.AUTH_ENV_PATH ?? "/opt/fractera/services/auth/.env.local";

const AUTH_KEYS = new Set(["AUTH_SECRET", "NEXTAUTH_URL", "COOKIE_DOMAIN", "COOKIE_SECURE", "DATABASE_URL", "ALLOWED_ORIGINS", "AUTH_TRUST_HOST"]);

// Ключи, значения которых нельзя менять через UI (только чтение)
const LOCKED_KEYS = new Set(["DATABASE_URL", "COOKIE_DOMAIN", "AUTH_TRUST_HOST", "NEXTAUTH_URL", "NEXT_PUBLIC_ADMIN_URL", "NEXT_PUBLIC_AUTH_URL", "ALLOWED_ORIGINS"]);

function parseEnv(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    result[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1);
  }
  return result;
}

function serializeEnv(vars: Record<string, string>): string {
  if (!Object.keys(vars).length) return "";
  return Object.entries(vars).map(([k, v]) => `${k}=${v}`).join("\n") + "\n";
}

function readFile(p: string): Record<string, string> {
  try {
    return fs.existsSync(p) ? parseEnv(fs.readFileSync(p, "utf-8")) : {};
  } catch {
    return {};
  }
}

export async function GET(req: NextRequest) {
  const ok = await requireAuth(req.headers.get("cookie") ?? "");
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const appVars  = readFile(APP_ENV);
  const authVars = readFile(AUTH_ENV);
  const merged   = { ...appVars };
  for (const key of AUTH_KEYS) {
    if (key in authVars) merged[key] = authVars[key];
  }
  return NextResponse.json({ vars: merged });
}

export async function POST(req: NextRequest) {
  const ok = await requireAuth(req.headers.get("cookie") ?? "");
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { vars } = await req.json() as { vars: Record<string, string> };
    if (!vars || typeof vars !== "object") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const appVars:  Record<string, string> = {};
    const authVars: Record<string, string> = {};

    // Читаем существующие значения locked-ключей, чтобы не перезаписывать
    const existingApp  = readFile(APP_ENV);
    const existingAuth = readFile(AUTH_ENV);

    for (const [k, v] of Object.entries(vars)) {
      if (k.trim() === "") continue;
      // Заблокированные ключи — берём существующее значение, игнорируем переданное
      if (LOCKED_KEYS.has(k)) {
        const existing = existingAuth[k] ?? existingApp[k];
        if (existing !== undefined) {
          if (AUTH_KEYS.has(k)) authVars[k] = existing;
          else appVars[k] = existing;
        }
        continue;
      }
      if (AUTH_KEYS.has(k)) authVars[k] = v;
      else appVars[k] = v;
    }

    fs.mkdirSync(path.dirname(APP_ENV),  { recursive: true });
    fs.mkdirSync(path.dirname(AUTH_ENV), { recursive: true });

    const mergedAuth = { ...existingAuth, ...authVars };
    fs.writeFileSync(APP_ENV,  serializeEnv(appVars),   "utf-8");
    fs.writeFileSync(AUTH_ENV, serializeEnv(mergedAuth), "utf-8");

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
