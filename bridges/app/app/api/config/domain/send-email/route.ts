import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import { requireAuth } from "@/lib/require-auth";
import { readServerIp } from "@/lib/server-ip";

// Manual "email me my subdomain list" trigger for the Personal Domain wizard.
//
// Why this exists: the automatic domain-activated email is best-effort and can
// silently fail. This is a USER-initiated fallback that surfaces success/error
// to the UI. It sends this server's IP + domain to L1; L1 looks up which user
// owns that IP (one email may have many IPs/servers), reads their account email,
// and sends the email. Identifying by IP means this does NOT depend on the
// per-server SERVER_TOKEN, so it works even if that token is out of sync.

const APP_DB      = process.env.APP_DB_PATH ?? "/opt/fractera/app/data/app.db";
const STARTER_URL = process.env.FRACTERA_STARTER_URL ?? "https://www.fractera.ai";

function readDomain(): string | null {
  try {
    const db = new Database(APP_DB, { readonly: true });
    const row = db.prepare("SELECT custom_domain FROM site_settings WHERE id = 1").get() as { custom_domain?: string } | undefined;
    db.close();
    return row?.custom_domain ?? null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const cookie = req.headers.get("cookie") ?? "";
  if (!(await requireAuth(cookie))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const domain = readDomain();
  if (!domain) {
    return NextResponse.json({ error: "No custom domain configured yet." }, { status: 400 });
  }

  const ip = readServerIp();
  if (!ip) {
    return NextResponse.json({ error: "Could not determine this server's IP address." }, { status: 500 });
  }

  try {
    const res = await fetch(`${STARTER_URL}/api/server/send-domain-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ip, domain }),
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return NextResponse.json({ error: `Mail service returned HTTP ${res.status}. ${body}`.trim() }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Network error reaching the mail service." }, { status: 502 });
  }
}
