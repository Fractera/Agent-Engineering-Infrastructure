import { NextRequest, NextResponse } from "next/server";
import { resolve } from "path";
import { existsSync, readFileSync } from "fs";

const APP_DIR  = resolve(process.cwd(), "../../app");
const WAL_FILE = resolve(APP_DIR, "DEPLOY_STATE.json");
const LOCK_FILE = "/tmp/fractera-deploy.lock";

export async function GET(req: NextRequest) {
  const jobId = req.nextUrl.searchParams.get("jobId");
  if (!jobId) return NextResponse.json({ error: "jobId required" }, { status: 400 });

  const logFile = `/tmp/fractera-deploy-${jobId}.log`;
  const log = existsSync(logFile)
    ? readFileSync(logFile, "utf8").split("\n").filter(Boolean)
    : [];

  let wal: Record<string, unknown> = {};
  try { wal = JSON.parse(readFileSync(WAL_FILE, "utf8")); } catch {}

  const inProgress = existsSync(LOCK_FILE) && readFileSync(LOCK_FILE, "utf8").trim() === jobId;
  const status = inProgress ? "in_progress" : (wal.status ?? "unknown");

  return NextResponse.json({ jobId, status, log, wal });
}
