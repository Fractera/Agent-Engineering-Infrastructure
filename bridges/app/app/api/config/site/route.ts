import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { requireAuth } from "@/lib/require-auth";

// Read/write the Shell's live site config (branding / SEO / PWA / images). The config is a
// JSON file on disk in the Shell's working dir (/opt/fractera/app/APP-CONFIG/app-config.json),
// read server-side by app/config/app-config.ts. Editing here is the same cross-process write
// pattern as the Env panel writing /opt/fractera/app/.env.local. The Shell deep-merges what we
// write over its code defaults, so a partial object is fine. Applies without a rebuild (the
// Shell renders the config at runtime); a save shows up on the next page load.
const CONFIG_PATH =
  process.env.APP_CONFIG_PATH ?? "/opt/fractera/app/APP-CONFIG/app-config.json";

export async function GET(req: NextRequest) {
  const ok = await requireAuth(req.headers.get("cookie") ?? "");
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    if (!fs.existsSync(CONFIG_PATH)) return NextResponse.json({ config: {} });
    const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
    return NextResponse.json({ config: JSON.parse(raw) });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const ok = await requireAuth(req.headers.get("cookie") ?? "");
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { config } = (await req.json()) as { config: unknown };
    if (!config || typeof config !== "object" || Array.isArray(config)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
