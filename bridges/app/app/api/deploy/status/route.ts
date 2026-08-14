import { NextRequest, NextResponse } from "next/server";
import { resolve } from "path";
import { existsSync, readFileSync } from "fs";
import { buildIsRunning } from "../route";

const APP_DIR  = resolve(process.cwd(), "../../app");
const WAL_FILE = resolve(APP_DIR, "DEPLOY_STATE.json");

// 🔒 `jobId` СТАЛ НЕОБЯЗАТЕЛЬНЫМ (владелец 2026-08-14).
//
// Раньше следить за сборкой мог только тот, кто её запустил. Но запрос может
// встать В ОЧЕРЕДЬ за чужой сборкой — тогда своего номера у него нет, а знать,
// применились ли его языки, он обязан. Без номера отвечаем общим состоянием:
// идёт ли сборка сейчас и чем кончилась последняя. Этого достаточно, чтобы
// дождаться конца: `wal.jobId` больше момента запроса означает, что закончилась
// сборка, которая началась ПОСЛЕ него, — то есть уже с его состоянием.
//
// Ответ с номером не изменился ни на поле: подвал панели и журнал развёртываний
// читают его по-прежнему.
export async function GET(req: NextRequest) {
  const jobId = req.nextUrl.searchParams.get("jobId");

  let wal: Record<string, unknown> = {};
  try { wal = JSON.parse(readFileSync(WAL_FILE, "utf8")); } catch {}

  const lock = buildIsRunning();

  if (!jobId) {
    return NextResponse.json({ running: lock.running, jobId: lock.jobId, wal });
  }

  const logFile = `/tmp/fractera-deploy-${jobId}.log`;
  const log = existsSync(logFile)
    ? readFileSync(logFile, "utf8").split("\n").filter(Boolean)
    : [];

  const inProgress = lock.running && lock.jobId === jobId;
  const status = inProgress ? "in_progress" : (wal.status ?? "unknown");

  return NextResponse.json({ jobId, status, log, wal, running: lock.running });
}
