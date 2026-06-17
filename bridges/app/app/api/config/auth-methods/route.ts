import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import { requireAuth } from "@/lib/require-auth";
import { readEnvFile, writeEnvFile, pm2RestartDetached } from "@/lib/env-file";

// Owner-editable Google OAuth + Resend magic-link credentials for the auth
// service. These live in the auth service env file and drive which sign-in
// buttons appear on /login (empty credential → hidden button).
//
// Gating: editable ONLY in secure mode (custom domain + HTTPS active). In the
// IP/insecure onboarding mode these methods can't work (OAuth needs an HTTPS
// callback; magic-link needs a real domain), so POST is rejected with 403.
const AUTH_ENV = process.env.AUTH_ENV_PATH ?? "/opt/fractera/services/auth/.env.local";
const APP_DB = process.env.APP_DB_PATH ?? "/opt/fractera/app/data/app.db";

// Same four files / same rule as the domain wizard's isStrictMode(): secure mode
// is active only when FRACTERA_IP_NODOMAIN_MODE is "false" in ALL of them.
const ENV_FILES = [
  "/opt/fractera/services/auth/.env.local",
  "/opt/fractera/bridges/app/.env.local",
  "/opt/fractera/app/.env.local",
  "/opt/fractera/services/data/.env",
];

function isSecureMode(): boolean {
  for (const f of ENV_FILES) {
    const vars = readEnvFile(f);
    if (vars.FRACTERA_IP_NODOMAIN_MODE !== "false") return false;
  }
  return true;
}

function readDomain(): string | null {
  try {
    const db = new Database(APP_DB, { readonly: true });
    const row = db.prepare("SELECT custom_domain FROM site_settings WHERE id = 1").get() as
      | { custom_domain?: string | null }
      | undefined;
    db.close();
    return row?.custom_domain ?? null;
  } catch {
    return null;
  }
}

function mask(v: string): string {
  if (!v) return "";
  return v.length <= 8 ? "•".repeat(v.length) : `${v.slice(0, 4)}…${v.slice(-4)}`;
}

export async function GET(req: NextRequest) {
  const ok = await requireAuth(req.headers.get("cookie") ?? "");
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const vars = readEnvFile(AUTH_ENV);
  const clientId = vars.GOOGLE_CLIENT_ID ?? "";
  const clientSecret = vars.GOOGLE_CLIENT_SECRET ?? "";
  const resendKey = vars.RESEND_API_KEY ?? "";
  const from = vars.AUTH_RESEND_FROM ?? "";
  const domain = readDomain();

  return NextResponse.json({
    secure: isSecureMode(),
    google: {
      configured: !!(clientId && clientSecret),
      clientIdMasked: clientId ? mask(clientId) : null,
    },
    resend: {
      configured: !!resendKey,
      keyMasked: resendKey ? mask(resendKey) : null,
      from,
    },
    // Shown to the owner so they can register it as an Authorized redirect URI
    // in the Google Cloud console.
    googleCallbackUrl: domain ? `https://auth.${domain}/api/auth/callback/google` : null,
  });
}

export async function POST(req: NextRequest) {
  const ok = await requireAuth(req.headers.get("cookie") ?? "");
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isSecureMode()) {
    return NextResponse.json(
      { error: "Login methods can be configured only in secure mode (after a custom domain is active)." },
      { status: 403 }
    );
  }

  let body: {
    googleClientId?: string;
    googleClientSecret?: string;
    resendApiKey?: string;
    resendFrom?: string;
    clearGoogle?: boolean;
    clearResend?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const vars = readEnvFile(AUTH_ENV);

  // Google — clear both, or set whichever non-empty fields were sent.
  if (body.clearGoogle) {
    vars.GOOGLE_CLIENT_ID = "";
    vars.GOOGLE_CLIENT_SECRET = "";
  } else {
    const id = (body.googleClientId ?? "").trim();
    const secret = (body.googleClientSecret ?? "").trim();
    if (id) vars.GOOGLE_CLIENT_ID = id;
    if (secret) vars.GOOGLE_CLIENT_SECRET = secret;
  }

  // Resend — clear, or set a validated key.
  if (body.clearResend) {
    vars.RESEND_API_KEY = "";
  } else {
    const key = (body.resendApiKey ?? "").trim();
    if (key) {
      if (!key.startsWith("re_")) {
        return NextResponse.json({ error: "Invalid Resend key (expected re_… format)" }, { status: 400 });
      }
      vars.RESEND_API_KEY = key;
    }
  }
  if (body.resendFrom !== undefined) {
    vars.AUTH_RESEND_FROM = (body.resendFrom ?? "").trim();
  }

  try {
    writeEnvFile(AUTH_ENV, vars);
  } catch (e) {
    return NextResponse.json({ error: `Write failed: ${e}` }, { status: 500 });
  }

  // Auth service reads these at startup — reload so the new providers
  // activate / deactivate immediately.
  pm2RestartDetached("fractera-auth", 500);
  return NextResponse.json({ ok: true });
}
