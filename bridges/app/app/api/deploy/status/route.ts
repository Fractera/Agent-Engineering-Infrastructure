import { NextRequest, NextResponse } from "next/server";
import { resolve } from "path";
import { existsSync, readFileSync } from "fs";
import { buildIsRunning, isAuthorized } from "../route";

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
// 🔒 ДВЕРЬ БЫЛА ОТКРЫТА ВСЕМУ ИНТЕРНЕТУ (закрыто 2026-08-24).
//
// ✗ Проверено с публичного адреса: `https://admin.<домен>/api/deploy/status`
// отвечал **200 без всякой авторизации**, тогда как соседние `history` и
// `env-export` честно давали 401. Причина в том, что гейт панели `/api/*` не
// покрывает вовсе — `api/` исключён в `matcher` файла `proxy.ts`, и каждая
// дверь отвечает за себя сама. Эта за себя не отвечала.
//
// Цена: с `?jobId=` дверь отдаёт ЛОГ СБОРКИ — пути, имена переменных окружения,
// а иногда и значения, которые инструменты печатают сами. Плюс `wal` —
// состояние развёртывания сервера.
//
// Проверка та же, что у запуска сборки (`isAuthorized`): ключ `x-deploy-secret`
// ИЛИ сессия владельца. Своя реализация здесь разошлась бы с той — молча.
export async function GET(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
