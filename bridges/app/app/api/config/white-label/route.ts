import { NextRequest, NextResponse } from "next/server";
import { execSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";

const FOOTER_MARKERS = [
  'proxy_set_header Accept-Encoding ""',
  "sub_filter_once on",
  "sub_filter '</body>'",
];

function removeFooter(path: string) {
  const lines = readFileSync(path, "utf8").split("\n");
  const filtered = lines.filter(l => FOOTER_MARKERS.every(m => !l.includes(m)));
  writeFileSync(path, filtered.join("\n"));
}

function readServerToken(): string | null {
  try {
    const content = readFileSync("/etc/fractera/secrets.env", "utf8");
    const match = content.match(/^SERVER_TOKEN=(.+)$/m);
    return match?.[1]?.trim() ?? null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const bearer = req.headers.get("authorization")?.replace("Bearer ", "").trim();
  if (!bearer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const serverToken = readServerToken();
  if (!serverToken || bearer !== serverToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    for (const path of [
      "/etc/nginx/sites-available/fractera",
      "/etc/nginx/sites-enabled/fractera-custom",
    ]) {
      try { removeFooter(path); } catch { /* file absent — skip */ }
    }
    execSync("nginx -t && systemctl reload nginx", { timeout: 10000 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
