import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import { resolve } from "path";
import { requireAuth } from "@/lib/require-auth";
import { replaceSlotContents, restoreStarter } from "@/lib/slot-swap";
import { setValue, getValue } from "@/lib/dev-tools-marks";
import { runBuild } from "@/app/api/deploy/route";

// Подключение чужого проекта Fractera и откат к стартовому шаблону (шаг 25-7).
//
// 🔒 ЭТО САМАЯ РАЗРУШИТЕЛЬНАЯ ДВЕРЬ ПАНЕЛИ, и она объявляет об этом честно.
// `POST` заменяет содержимое гостевого слота содержимым чужого репозитория —
// безвозвратно. Безопасность здесь не в предупреждении на экране, а в порядке:
// `replaceSlotContents` сначала убеждается, что донор отвечает, клонирует его в
// соседнюю папку и лишь потом меняет местами. Опечатка в адресе не оставляет
// человека без проекта.
//
// 🔒 ПАНЕЛЬ РАБОТАЕТ НА СВОЁМ ПОРТУ И ЗАМЕНУ ПЕРЕЖИВАЕТ. Слот — это `:3000`,
// панель — `:3002`, разные процессы и разные папки. Иначе дверь пилила бы сук,
// на котором сидит.
//
// 🔒 МЫ НЕ ПРОВЕРЯЕМ, ЧТО РЕПОЗИТОРИЙ — FRACTERA (решение владельца 2026-08-26):
// «это будет находиться в зоне его ответственности». Отвечает отказ сборки, и
// он же ведёт человека к миграции.
//
// 🔒 ПОДКЛЮЧЁННЫЙ ПРОЕКТ ОТВЯЗЫВАЕТСЯ ОТ ДОНОРА СРАЗУ, В ТОЙ ЖЕ ОПЕРАЦИИ
// (шаг 35-2). Клон доезжает в слот вместе с чужим `.git`, и без отвязки слот
// несёт remote чужого проекта: первая отправка ушла бы туда или упала бы по
// правам. Отвязку делает `detachSlotHistory()`, она включена по умолчанию, и её
// исход виден в ответе полем `detached` — молчаливой она быть не имеет права.

const SLOT_DIR = process.env.APP_DIR ?? resolve(process.cwd(), "../../app");

/** Адрес подключённого чужого проекта — отдельно от `USER_GITHUB_REPO_URL` потока A. */
export const ADOPT_URL_KEY = "USER_ADOPT_REPO_URL";

export async function POST(req: NextRequest) {
  if (!(await requireAuth(req.headers.get("cookie") ?? ""))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as
    | { repoUrl?: unknown; restore?: unknown }
    | null;

  // Откат к стартовому шаблону — тот же путь, другой адрес. Отдельного маршрута
  // не завожу: разрушающее действие одно, и жить ему лучше в одном месте.
  const restore = body?.restore === true;
  const repoUrl = typeof body?.repoUrl === "string" ? body.repoUrl.trim() : "";

  if (!restore && !repoUrl) {
    return NextResponse.json({ error: "repo_not_set" }, { status: 400 });
  }

  const token = getValue("USER_GITHUB_ACCESS_TOKEN");
  const result = restore
    ? restoreStarter(SLOT_DIR, { token })
    : replaceSlotContents(repoUrl, SLOT_DIR, { token });

  if (!result.ok) {
    // `touched: false` — слот не пострадал. Говорим это человеку прямо: иначе он
    // решит, что проект уже уничтожен, и не рискнёт повторить.
    return NextResponse.json(
      { ok: false, error: result.reason, slotIntact: true },
      { status: 422 },
    );
  }

  setValue(ADOPT_URL_KEY, restore ? null : repoUrl);

  // Сборка — существующая очередь с замком, журналом и откатом. Она долгая, и
  // ответ её не ждёт: за ходом человек следит через `api/deploy/status`.
  // 🔒 ЗАМЕНА СНОСИТ `node_modules` — ЗНАЧИТ СБОРКЕ ИХ НАДО ПОСТАВИТЬ (35-9).
  // ✗ Оплачено живым прогоном владельца: замена и отвязка сработали, а сборка
  // упала на `Cannot find package 'sharp'`, и человеку сказали, что его проект
  // не той архитектуры. Путь подключения не работал НИ РАЗУ — ни здесь, ни при
  // возврате стартового шаблона, который идёт этой же дверью.
  const jobId = runBuild(
    restore ? "restore starter template" : `adopt ${repoUrl}`,
    { installFirst: true },
  );

  // `detached: false` при `ok: true` — не мелочь и не шум: проект подключён и
  // соберётся, но история чужая осталась, и отправка из такого слота ушла бы не
  // туда. Человеку это говорится, а не заминается.
  return NextResponse.json({
    ok: true, head: result.head, jobId, restored: restore, detached: result.detached,
  });
}

// Состояние подключения: что стоит в слоте прямо сейчас — по его собственному
// репозиторию, а не по нашей записи. Запись говорит, что мы просили; слот — что
// получилось.
//
// 🔒 ПУСТОЙ `slotRemote` ПОСЛЕ 35-2 ЕСТЬ НОРМА, А НЕ ПОЛОМКА, и читать его как
// «связи нет» было бы ложью. Подключённый проект отвязан от донора намеренно:
// свой репозиторий, один коммит, ноль remote — ровно то состояние, в котором
// `bootstrap.sh` оставляет слот на свежем сервере. Поэтому рядом едет
// `detached`: репозиторий у слота есть, а remote у него нет. Отличить это от
// «слота нет вовсе» нельзя по одному пустому значению — потому и полей два.
export async function GET(req: NextRequest) {
  if (!(await requireAuth(req.headers.get("cookie") ?? ""))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { execFileSync } = await import("child_process");
  const git = (args: string[]): string => {
    try {
      // `safe.directory` обязателен: слот принадлежит несуществующему UID, и без
      // исключения git отказывает — а отказ здесь ловится и выглядит как пустой
      // ответ. Измерено на сервере 35-2: без него `detached` врал «false».
      return execFileSync("git", ["-c", `safe.directory=${SLOT_DIR}`, "-C", SLOT_DIR, ...args], {
        encoding: "utf8", timeout: 10_000,
      }).toString().trim();
    } catch { return ""; }
  };

  const isRepo = git(["rev-parse", "--is-inside-work-tree"]) === "true";
  const slotRemote = git(["remote", "get-url", "origin"]).replace(/x-access-token:[^@]*@/, "");

  return NextResponse.json({
    requested: getValue(ADOPT_URL_KEY),
    slotRemote,
    detached: isRepo && !slotRemote,
    built: fs.existsSync(resolve(SLOT_DIR, ".next")),
  });
}
