import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import { resolve } from "path";
import { existsSync, writeFileSync, openSync, readFileSync, unlinkSync, statSync } from "fs";
import { requireAuth } from "@/lib/require-auth";

// bridges/app cwd = /opt/fractera/bridges/app
const APP_DIR   = resolve(process.cwd(), "../../app");
const LOCK_FILE = "/tmp/fractera-deploy.lock";
// Coalescing marker: a build request that arrives WHILE a build is running writes this
// (with the latest description). When the running build finishes, it consumes the marker
// and runs ONE more build — so the LATEST on-disk state (e.g. a just-changed language set
// in app/.env.local) is always built, with no reliance on the caller retrying or staying
// alive. This deterministically fixes "added a language but the build baked the old set"
// (the language change raced an in-flight build, its trigger got 409'd and was dropped). → step 138.
const DIRTY_FILE = "/tmp/fractera-deploy.dirty";
const WAL_FILE  = resolve(APP_DIR, "DEPLOY_STATE.json");

// 🔒 КТО ИМЕННО СОБИРАЕТ — ПРОВЕРЯЕМАЯ ВЕЛИЧИНА, А НЕ НАЛИЧИЕ ФАЙЛА (владелец
// 2026-08-14: «сборка уже идёт — кто что-то собирает?»).
//
// Замок — это файл, а снимает его обработчик `exit` дочернего процесса, живущий
// ВНУТРИ панели. Значит любой конец панели в середине сборки (`pm2 reload
// fractera-admin` при выкатке шага, падение, перезагрузка сервера) оставляет
// файл лежать вечно: собирать давно некому, а каждая следующая попытка получает
// «идёт сборка» и отказ. Отличить это от настоящей сборки по самому файлу
// невозможно — поэтому рядом кладётся pid того, кто собирает, и живость
// проверяется у операционной системы.
const LOCK_PID_FILE = LOCK_FILE + ".pid";
// Замок без pid остался от прежней версии кода — судим по возрасту. Сборка идёт
// две-четыре минуты; получас — запас, за которым «идёт» означает «не идёт».
const STALE_LOCK_MS = 30 * 60_000;

function writeWAL(data: object) {
  try { writeFileSync(WAL_FILE, JSON.stringify(data, null, 2)); } catch {}
}

// ── The last known good build ─────────────────────────────────────────────────
//
// Measured, not assumed (2026-08-08). A failing `next build` does NOT leave the previous build alone:
// it removes `.next/BUILD_ID` on its way through. The running process keeps serving, because it holds
// the compiled app in memory — the site answered 200 all through a deliberately broken build. But a
// second process started from the same directory refused outright:
//
//   Error: Could not find a production build in the '.next' directory
//
// So until now the promise "a failed deploy leaves the previous version running" was true only until
// something restarted the app — a reboot, an out-of-memory kill, a pm2 restart — and then the site was
// gone with no way back except a successful build.
//
// The fix is a copy of the artifact taken after each build that WORKS, and put back when one fails.
// The whole artifact is 33 MB, so this is cheap; and the copy is never touched while a build runs, so
// the live process keeps reading the directory it already has.
const NEXT_DIR      = resolve(APP_DIR, ".next");
const LAST_GOOD_DIR = resolve(APP_DIR, ".next.last-good");

function saveGoodBuild(logFile: string) {
  const { execSync } = require("child_process");
  try {
    execSync(`rm -rf ${LAST_GOOD_DIR}.tmp && cp -a ${NEXT_DIR} ${LAST_GOOD_DIR}.tmp && rm -rf ${LAST_GOOD_DIR} && mv ${LAST_GOOD_DIR}.tmp ${LAST_GOOD_DIR}`, { timeout: 120000 });
  } catch (e) {
    // Loud: without this copy the next failure has nothing to fall back to.
    try { require("fs").appendFileSync(logFile, `\n[deploy] could not snapshot the good build: ${e}\n`); } catch {}
  }
}

// Restores the artifact so the app can START again. The live process is untouched — it is already
// serving the old code from memory, and copying files under it changes nothing for it.
function restoreGoodBuild(logFile: string): boolean {
  const { execSync } = require("child_process");
  const { existsSync, appendFileSync } = require("fs");
  if (!existsSync(LAST_GOOD_DIR)) {
    try { appendFileSync(logFile, "\n[deploy] no previous good build stored — the artifact stays broken until the next successful build\n"); } catch {}
    return false;
  }
  try {
    execSync(`rm -rf ${NEXT_DIR} && cp -a ${LAST_GOOD_DIR} ${NEXT_DIR}`, { timeout: 120000 });
    appendFileSync(logFile, "\n[deploy] the previous working build has been restored on disk — a restart is safe again\n");
    return true;
  } catch (e) {
    try { appendFileSync(logFile, `\n[deploy] RESTORE FAILED: ${e}\n`); } catch {}
    return false;
  }
}

// ── Deploy history ────────────────────────────────────────────────────────────
// Every run is recorded in the data layer: what was built, when, for how long, whether it worked and
// the whole log. It survives restarts of this panel, it is readable by an agent through the same door
// as the rest of the data, and it replaces the mechanism it grew out of — this route used to record
// success by committing to the platform repository ON the server, which moved the server's history
// away from the remote on every press and made the next update refuse to fast-forward.
const DATA_URL    = process.env.NEXT_PUBLIC_MEDIA_URL ?? "http://localhost:3300";
const DATA_SECRET = process.env.DATA_SECRET ?? "";

async function recordRun(path: string, method: "POST" | "PATCH", body: object) {
  try {
    const res = await fetch(`${DATA_URL}${path}`, {
      method,
      headers: { "Content-Type": "application/json", "x-data-secret": DATA_SECRET },
      body: JSON.stringify(body),
    });
    // Loud on failure, and only in the server log: a deploy must not fail because its diary did, but a
    // diary that quietly stops writing is worse than none — the history would look like nothing happened.
    if (!res.ok) console.error(`[deploy] history write failed: ${res.status} ${await res.text()}`);
  } catch (e) {
    console.error(`[deploy] history write failed: ${e}`);
  }
}

// Build a SLOT-SCOPED environment for the spawned `next build`.
//
// WHY (root cause, step 143): this Admin route runs inside its OWN Next process, which at
// `next start` already ran @next/env. @next/env (a) sets the cross-process sentinel
// `__NEXT_PROCESSED_ENV` in process.env, and (b) injects this Admin's env vars. If we spawn the
// slot build with `{ ...process.env }`, the child inherits BOTH problems:
//   1. the sentinel makes the child's @next/env SKIP loading the slot's app/.env.local entirely;
//   2. any inherited key shadows the slot's value (@next/env never overrides an already-set var).
// Either way the slot bakes stale/missing build-time vars — e.g. NEXT_PUBLIC_SUPPORTED_LANGUAGES
// falls back to ["en"], SINGLE_LANG_MODE becomes true, and the language switcher disappears on the
// default route. This is GENERAL: it would silently break ANY build-time env the slot owns
// (languages, Stripe keys + product ids, custom app vars), not just languages.
//
// FIX: hand the child a clean env where the slot's own app/.env.local wins for every key it
// declares — drop the sentinel (so @next/env loads the file fresh) and drop every key the slot
// declares (so no inherited copy shadows it). All other inherited vars (PATH, HOME, …) are kept.
function slotBuildEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env, FORCE_COLOR: "0" };
  delete env.__NEXT_PROCESSED_ENV;
  try {
    const slotEnvFile = resolve(APP_DIR, ".env.local");
    for (const line of readFileSync(slotEnvFile, "utf8").split("\n")) {
      const m = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/.exec(line);
      if (m) delete env[m[1]];
    }
  } catch { /* no slot .env.local yet — child @next/env will use defaults */ }
  return env;
}

// 🔒 МЕТКА КОММИТА — ЧАСТЬ СБОРКИ, А НЕ УКРАШЕНИЕ (2026-08-25).
//
// ✗ Оплачено дырой в законе доказательств. Корпус требует первым пруфом доставки
// сверять метку сборки из `/api/health` с хэшем, который собирали. Метку ставил
// ТОЛЬКО `scripts/server/deploy.sh`; кнопка панели — нет. Значит на КАНОНИЧЕСКОМ
// пути (очередь панели, её журнал, откат на последнюю рабочую сборку)
// `/api/health` отвечал `commit: null`, и пруф был недостижим В ПРИНЦИПЕ. Агент,
// честно исполняющий закон, упирался в `null` и заключал, что доставка не
// состоялась.
//
// 🔒 ПИШЕМ В `.env.local` СЛОТА, А НЕ В ОКРУЖЕНИЕ ПОТОМКА — и это не вкус:
// `slotBuildEnv()` намеренно УДАЛЯЕТ у потомка каждый ключ, объявленный в файле
// слота, чтобы файл слота выигрывал. Переменная, подсунутая мимо файла, либо
// стёрлась бы этим же циклом, либо нарушила бы правило, ради которого он написан.
// Тот же приём уже доказан в `deploy.sh` (там метка тоже дописывается в файл
// ПЕРЕД сборкой) — одна механика вместо двух.
//
// 🔒 ХЭШ БЕРЁТСЯ У СЛОТА, а не у панели: собирается слот, и метка обязана
// называть то, что собрано. Нет git или нет коммитов — молча ничего не меняем:
// прежнее значение честнее выдуманного.
function stampSlotCommit(): string | null {
  try {
    const { execSync } = require("child_process");
    const hash = String(
      execSync(`git -C ${JSON.stringify(APP_DIR)} rev-parse --short HEAD`, {
        timeout: 10000,
        stdio: ["ignore", "pipe", "ignore"],
      }),
    ).trim();
    if (!/^[0-9a-f]{7,40}$/.test(hash)) return null;

    const envFile = resolve(APP_DIR, ".env.local");
    let text = "";
    try { text = readFileSync(envFile, "utf8"); } catch { /* файла ещё нет — создадим */ }
    const line = `NEXT_PUBLIC_GIT_COMMIT=${hash}`;
    text = /^NEXT_PUBLIC_GIT_COMMIT=.*$/m.test(text)
      ? text.replace(/^NEXT_PUBLIC_GIT_COMMIT=.*$/m, line)
      : `${text}${text.endsWith("\n") || text === "" ? "" : "\n"}${line}\n`;
    writeFileSync(envFile, text);
    return hash;
  } catch {
    // Слот без git, без коммитов или файл недоступен на запись. Сборку из-за
    // метки не останавливаем: она вспомогательная, а сборка — основная работа.
    return null;
  }
}

// Экспортирован 2026-08-24: тем же ключом проверяется статус сборки. Вторая
// реализация той же проверки разошлась бы с этой — и разошлась бы молча.
export async function isAuthorized(req: NextRequest): Promise<boolean> {
  const secret = process.env.DEPLOY_SECRET;
  if (secret && req.headers.get("x-deploy-secret") === secret) return true;
  return requireAuth(req.headers.get("cookie") ?? "");
}

// Spawn `next build` for the app slot, then pm2-reload + health-check + record the result.
// On finish, if a coalescing marker is present (a request arrived mid-build), consume it and
// run ONE more build for the latest state. Bounded: the marker is cleared before the rerun,
// so each pending request yields exactly one extra build (no infinite loop on repeated failures).
// Exported so the automatic watch runs the SAME build as the button — with its lock, its coalescing,
// its journal entry and its fallback to the last working artifact. A second implementation would be a
// second set of those guarantees to keep in step.
/**
 * Маркеры установки в логе сборки.
 *
 * 🔒 ПО НИМ ЧИТАЮЩИЙ ОТЛИЧАЕТ «НЕ ВСТАЛИ ЗАВИСИМОСТИ» ОТ «НЕ СОБРАЛСЯ ПРОЕКТ», и
 * это не украшение лога: экран отказа обязан назвать ВЕРНУЮ причину. ✗ оплачено
 * 35-9 — владельцу сказали, что его проект не той архитектуры, тогда как не
 * встал `sharp`.
 */
export const DEPS_START_MARK = "[deploy] installing dependencies";
export const DEPS_OK_MARK = "[deploy] dependencies installed";

export function runBuild(description: string, opts: { installFirst?: boolean } = {}): string {
  const jobId = Date.now().toString();
  const logFile = `/tmp/fractera-deploy-${jobId}.log`;
  writeFileSync(LOCK_FILE, jobId);
  const startedAtMs = Date.now();
  writeWAL({ status: "STARTED", jobId, startedAt: new Date().toISOString(), description });
  void recordRun("/deploy-runs", "POST", { id: jobId, status: "RUNNING", description });

  // Метка коммита дописывается в `.env.local` слота ДО запуска сборки, иначе
  // запечённое значение не совпадёт с тем, что собрано. → `stampSlotCommit`.
  //
  // Строка идёт первой в лог, чтобы читающий лог видел, ЧТО собиралось, не
  // выходя из него. Порядок здесь содержательный: сначала пишем заголовок,
  // ТОЛЬКО ПОТОМ открываем дескриптор на ДОПИСЫВАНИЕ. Открыть на "w" раньше
  // значило бы отдать потомку нулевое смещение — и он затёр бы заголовок своим
  // первым же выводом.
  const stamped = stampSlotCommit();
  writeFileSync(logFile, stamped
    ? `NEXT_PUBLIC_GIT_COMMIT=${stamped}\n`
    : `NEXT_PUBLIC_GIT_COMMIT: не проставлена (у слота нет git или коммитов) — /api/health вернёт прежнее значение\n`);
  const logFd = openSync(logFile, "a");
  // Spawn the slot build with a SLOT-SCOPED env so the slot's own app/.env.local fully governs
  // every build-time variable it declares (languages, Stripe keys, any custom app var). → step 143.
  // 🔒 УСТАНОВКА ЗАВИСИМОСТЕЙ — ЧАСТЬ ТОЙ ЖЕ ЗАДАЧИ, А НЕ ОТДЕЛЬНАЯ ОПЕРАЦИЯ
  // (35-9). Она идёт под тем же замком, в тот же журнал, с тем же откатом к
  // последней рабочей сборке. Отдельный путь установки означал бы второй набор
  // этих гарантий, который надо держать в согласии с первым.
  //
  // 🔒 ПО УМОЛЧАНИЮ ВЫКЛЮЧЕНА, И ЭТО НАМЕРЕННО. Обычный деплой меняет исходник,
  // а `node_modules` на месте: минута установки на каждую правку — цена, которую
  // никто не просил. Включает её тот, кто ЗАМЕНИЛ содержимое слота и потому
  // знает, что зависимостей там больше нет.
  //
  // 🔒 НАТИВНЫЕ МОДУЛИ TAILWIND СТАВЯТСЯ ОТДЕЛЬНО И С `--no-save`. Приём взят у
  // `lib/bootstrap.sh`, где он делается при рождении сервера. Донор мог быть
  // собран на другой машине и не объявить их вовсе; `--no-save` — потому что
  // `package.json` принадлежит ПРОЕКТУ ЧЕЛОВЕКА, и дописывать в него от своего
  // имени мы не вправе: он уедет в его репозиторий.
  const arch = process.arch === "arm64" ? "arm64" : "x64";
  const nativeDeps = `lightningcss-linux-${arch}-gnu @tailwindcss/oxide-linux-${arch}-gnu`;
  const buildCmd = `npm run build --prefix ${APP_DIR}`;
  const installCmd =
    `echo "${DEPS_START_MARK}" && ` +
    `npm install --no-audit --no-fund --prefix ${APP_DIR} && ` +
    `npm install --no-save --no-audit --no-fund --prefix ${APP_DIR} ${nativeDeps} && ` +
    `echo "${DEPS_OK_MARK}"`;

  const proc = opts.installFirst
    ? spawn("sh", ["-c", `${installCmd} && ${buildCmd}`], {
        stdio: ["ignore", logFd, logFd],
        env: slotBuildEnv(),
      })
    : spawn("npm", ["run", "build", "--prefix", APP_DIR], {
        stdio: ["ignore", logFd, logFd],
        env: slotBuildEnv(),
      });
  // Кто собирает — рядом с замком, чтобы следующий запрос мог это ПРОВЕРИТЬ, а не
  // поверить файлу (см. `buildIsRunning`).
  try { writeFileSync(LOCK_PID_FILE, String(proc.pid ?? "")); } catch {}

  proc.on("exit", (code) => {
    try {
      const { closeSync, appendFileSync } = require("fs");
      closeSync(logFd);

      // The log is read from the file the build wrote, so the history carries the compiler's own words
      // rather than a summary of them.
      const finish = (status: string) => {
        let log = "";
        try { log = readFileSync(logFile, "utf8"); } catch { log = "(log file unavailable)"; }
        void recordRun(`/deploy-runs/${jobId}`, "PATCH", { status, log, durationMs: Date.now() - startedAtMs });
      };

      if (code !== 0) {
        // A failed build leaves .next without a BUILD_ID — put the last working artifact back so the
        // app can still START, not merely keep running until something restarts it.
        restoreGoodBuild(logFile);
        writeWAL({ status: "FAILED", jobId, failedAt: new Date().toISOString(), description });
        writeFileSync(LOCK_FILE + ".failed", jobId);
        finish("FAILED");
      } else {
        // pm2 reload (graceful)
        const { execSync } = require("child_process");
        try {
          execSync("pm2 reload fractera-app", { timeout: 30000 });
        } catch (e) {
          appendFileSync(logFile, `\n[deploy] pm2 reload error: ${e}\n`);
        }

        // Health check
        let healthy = false;
        for (let i = 0; i < 3; i++) {
          try {
            execSync("curl -sf http://localhost:3000/api/health", { timeout: 10000 });
            healthy = true;
            break;
          } catch {
            execSync("sleep 10");
          }
        }

        if (!healthy) {
          // It compiled and then would not answer. Put the previous build back and reload onto it —
          // a rollback, so visitors get the version that worked instead of the one that does not.
          const restored = restoreGoodBuild(logFile);
          if (restored) {
            try { execSync("pm2 reload fractera-app", { timeout: 30000 }); } catch (e) {
              appendFileSync(logFile, `\n[deploy] rollback reload error: ${e}\n`);
            }
          }
          writeWAL({ status: "HEALTH_FAILED", jobId, failedAt: new Date().toISOString(), description });
          finish(restored ? "ROLLED_BACK" : "HEALTH_FAILED");
        } else {
          // A successful deploy used to be recorded as a git commit in the platform repository here.
          // It is a row in deploy_runs now — see recordRun above for why the commit had to go.
          // Only a build that compiled AND answered becomes the fallback for the next failure.
          saveGoodBuild(logFile);
          writeWAL({ status: "COMPLETED", jobId, completedAt: new Date().toISOString(), description });
          appendFileSync(logFile, "\n[deploy] COMPLETED\n");
          finish("COMPLETED");
        }
      }

      try { unlinkSync(LOCK_FILE); } catch {}
      try { unlinkSync(LOCK_PID_FILE); } catch {}

      // Coalesced rerun: a request arrived during this build → build the latest state once.
      if (existsSync(DIRTY_FILE)) {
        let nextDesc = "deploy (coalesced)";
        try { nextDesc = readFileSync(DIRTY_FILE, "utf8").trim() || nextDesc; } catch {}
        try { unlinkSync(DIRTY_FILE); } catch {}
        runBuild(nextDesc);
      }
    } catch {}
  });

  return jobId;
}

// Идёт ли сборка ПРЯМО СЕЙЧАС. Отвечает операционная система, а не файл: замок,
// за которым нет живого процесса, снимается здесь же — иначе один прерванный
// `pm2 reload` запирает сборку навсегда, и панель до конца жизни сервера
// отвечает «сборка уже идёт» на пустом месте.
export function buildIsRunning(): { running: boolean; jobId: string | null } {
  if (!existsSync(LOCK_FILE)) return { running: false, jobId: null };
  const jobId = (() => { try { return readFileSync(LOCK_FILE, "utf8").trim(); } catch { return ""; } })();

  let alive = false;
  try {
    const pid = Number(readFileSync(LOCK_PID_FILE, "utf8").trim());
    // `kill(pid, 0)` ничего не убивает — это вопрос «этот процесс существует?».
    if (Number.isFinite(pid) && pid > 0) { process.kill(pid, 0); alive = true; }
  } catch {
    // Нет pid-файла — замок от прежней версии кода: судим по возрасту.
    try {
      alive = Date.now() - statSync(LOCK_FILE).mtimeMs < STALE_LOCK_MS;
    } catch { alive = false; }
  }

  if (alive) return { running: true, jobId: jobId || null };

  try { unlinkSync(LOCK_FILE); } catch {}
  try { unlinkSync(LOCK_PID_FILE); } catch {}
  return { running: false, jobId: null };
}

// 🔒 ЕДИНСТВЕННАЯ ДВЕРЬ К ЗАПУСКУ СБОРКИ (владелец 2026-08-14).
//
// Здесь стояла эта логика внутри `POST`, и попасть к сборке можно было только
// HTTP-запросом. Из-за этого страница языков имела ДВА пути: обработчик
// сохранения дёргал `/api/deploy` сам, а островок в браузере — ещё раз. Первый
// занимал очередь, второму честно отвечали «идёт сборка», и владелец читал это
// как поломку: собирала панель, у которой он только что нажал «Сохранить».
//
// Дверь одна и вызывается напрямую. Кто пришёл вторым, тот не отказ получает, а
// место в очереди: `DIRTY_FILE` заставит текущую сборку повториться на последнем
// состоянии — гарантия шага 138 остаётся ровно та же.
export function requestBuild(description: string): { jobId: string; queued: boolean; requestedAt: number } {
  const requestedAt = Date.now();
  const lock = buildIsRunning();
  if (lock.running) {
    try { writeFileSync(DIRTY_FILE, description); } catch {}
    return { jobId: lock.jobId ?? "", queued: true, requestedAt };
  }
  // Fresh build start — clear any stale dirty marker; this build covers the current state.
  try { if (existsSync(DIRTY_FILE)) unlinkSync(DIRTY_FILE); } catch {}
  return { jobId: runBuild(description), queued: false, requestedAt };
}

export async function POST(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { description = "deploy" } = await req.json().catch(() => ({}));

  // Concurrent deploy guard + coalescing: if a build is running, record this request as the
  // pending latest state (so the running build reruns for it on finish) and report in_progress.
  const { jobId, queued, requestedAt } = requestBuild(description);
  if (queued) {
    return NextResponse.json({ error: "in_progress", jobId, queued: true, requestedAt }, { status: 409 });
  }
  return NextResponse.json({ ok: true, jobId, requestedAt, status: "started", logFile: `/tmp/fractera-deploy-${jobId}.log` });
}
