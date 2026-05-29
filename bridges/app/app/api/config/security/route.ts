import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { requireAuth } from "@/lib/require-auth";

const ENV_FILES = [
  process.env.AUTH_ENV_PATH   ?? "/opt/fractera/services/auth/.env.local",
  process.env.ADMIN_ENV_PATH  ?? "/opt/fractera/bridges/app/.env.local",
  process.env.APP_ENV_PATH    ?? "/opt/fractera/app/.env.local",
  process.env.DATA_ENV_PATH   ?? "/opt/fractera/services/data/.env",
];

const PM2_PROCESSES = "fractera-admin fractera-auth fractera-app fractera-data";
const KEY = "FRACTERA_IP_NODOMAIN_MODE";

function readMode(file: string): string | null {
  if (!fs.existsSync(file)) return null;
  const content = fs.readFileSync(file, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith(`${KEY}=`)) return trimmed.slice(KEY.length + 1);
  }
  return null;
}

function writeMode(file: string, value: "true" | "false"): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const content = fs.existsSync(file) ? fs.readFileSync(file, "utf-8") : "";
  const lines = content.split("\n");
  let found = false;
  const out = lines.map((line) => {
    if (line.trim().startsWith(`${KEY}=`)) {
      found = true;
      return `${KEY}=${value}`;
    }
    return line;
  });
  if (!found) {
    if (out.length && out[out.length - 1] === "") out.pop();
    out.push(`${KEY}=${value}`);
    out.push("");
  }
  fs.writeFileSync(file, out.join("\n"), "utf-8");
}

export async function GET(req: NextRequest) {
  const ok = await requireAuth(req.headers.get("cookie") ?? "");
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const values = ENV_FILES.map((f) => ({ file: f, value: readMode(f) }));
  const live = process.env[KEY] ?? null;
  const open = live === "true" || values.every((v) => v.value === "true" || v.value === null);

  return NextResponse.json({
    key: KEY,
    open,
    live,
    files: values,
    recoveryCommand:
      `sed -i 's/^${KEY}=.*/${KEY}=true/' ${ENV_FILES.join(" ")} && pm2 reload all`,
  });
}

export async function POST(req: NextRequest) {
  const ok = await requireAuth(req.headers.get("cookie") ?? "");
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { open?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (typeof body.open !== "boolean") {
    return NextResponse.json({ error: "open must be boolean" }, { status: 400 });
  }

  const value = body.open ? "true" : "false";
  try {
    for (const file of ENV_FILES) writeMode(file, value);
  } catch (e) {
    return NextResponse.json({ error: `Write failed: ${e}` }, { status: 500 });
  }

  // Detach pm2 reload — it restarts fractera-admin which is THIS process, so
  // running it in-band would kill the response. Detached + unref lets us reply
  // first and let pm2 handle the rolling restart afterwards (~5 seconds).
  setTimeout(() => {
    const child = spawn("sh", ["-c", `pm2 reload ${PM2_PROCESSES}`], {
      detached: true,
      stdio: "ignore",
    });
    child.unref();
  }, 500);

  return NextResponse.json({ ok: true, value, reloading: true });
}
