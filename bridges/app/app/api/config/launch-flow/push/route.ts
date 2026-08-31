import { NextRequest, NextResponse } from "next/server";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs";
import { requireAuth } from "@/lib/require-auth";
import { flowValue, flowVerified, setFlowPushed, flowPushedAt, isLaunchPath, PATH_INPUTS } from "@/lib/launch-flow";
import type { LaunchPath } from "@/lib/launch-flow";

const run = promisify(execFile);

// ОТПРАВКА ПРОЕКТА В GITHUB — ШАГ 4 НОВОГО ПУТИ (28-21, 2026-08-27).
//
// 🔒 ЭТО ЕДИНСТВЕННОЕ ДЕЙСТВИЕ ПУТИ, КОТОРОЕ МЕНЯЕТ ЧТО-ТО ВНЕ ПАНЕЛИ. Три
// предыдущих шага писали в `.env.local` и спрашивали GitHub; этот кладёт файлы в
// чужой репозиторий. Поэтому здесь больше проверок, чем в остальных дверях
// вместе взятых, и ни одна не «на всякий случай».
//
// 🔒 ОТПРАВКА ИДЁТ ТОЛЬКО ПО ПОДТВЕРЖДЁННОЙ СВЯЗИ. Нет отметки третьего шага —
// отказ с указанием вернуться. Иначе человек упрётся в ошибку git, где причина
// названа языком инструмента, а не языком человека: ровно то, ради устранения
// чего шаг проверки и существует.
//
// 🔒 ТОКЕН ЖИВЁТ В АДРЕСЕ ТОЛЬКО ВНУТРИ ЭТОГО ВЫЗОВА И НИКОГДА В `git remote`.
// Записанный в remote, он остался бы в `.git/config` на диске в открытом виде и
// уехал бы в любой снимок файловой системы. Поэтому `git push <url-с-токеном>`
// разовым аргументом, а не `git remote add`.
//
// 🔒 ВЫВОД GIT НАРУЖУ НЕ ОТДАЁТСЯ. В нём бывает URL с токеном; отдать его в
// ответе двери значит положить секрет в консоль браузера. Наружу едет машинное
// слово причины, а подробность остаётся в журнале сервера.

export const dynamic = "force-dynamic";

/** Папка гостевого приложения на сервере. Настраивается тем же способом, что и остальное окружение панели. */
const APP_DIR = process.env.APP_DIR ?? "/opt/fractera/app";

export async function POST(req: NextRequest) {
  if (!(await requireAuth(req.headers.get("cookie") ?? ""))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 🔒 ПУТЬ ПРИХОДИТ ТЕЛОМ, УМОЛЧАНИЕ — ПЕРВЫЙ (35-6).
  const body = (await req.json().catch(() => null)) as { path?: unknown } | null;
  const launchPath: LaunchPath = isLaunchPath(body?.path) ? body.path : "starter";
  const inputs = PATH_INPUTS[launchPath];

  if (!flowVerified(launchPath)) {
    return NextResponse.json({ ok: false, reason: "not-verified" }, { status: 422 });
  }

  const url = flowValue(inputs.url);
  const token = flowValue(inputs.token);
  if (!url || !token) {
    return NextResponse.json({ ok: false, reason: "not-verified" }, { status: 422 });
  }

  if (!fs.existsSync(APP_DIR)) {
    return NextResponse.json({ ok: false, reason: "no-project" }, { status: 422 });
  }

  // Адрес с токеном собирается здесь и живёт только в памяти этого вызова.
  const authUrl = url.replace(/^https:\/\//, `https://x-access-token:${token}@`);

  try {
    // Репозиторий гостя может быть ещё не инициализирован — это нормальное
    // состояние, а не ошибка: слот в покое пуст.
    await run("git", ["-C", APP_DIR, "rev-parse", "--git-dir"]).catch(async () => {
      await run("git", ["-C", APP_DIR, "init"]);
    });

    await run("git", ["-C", APP_DIR, "add", "-A"]);

    // Коммит может не понадобиться: если менять нечего, git отвечает ошибкой, и
    // это НЕ отказ отправки — просто отправлять будем то, что уже закоммичено.
    await run("git", [
      "-C", APP_DIR,
      "-c", "user.email=panel@fractera.local",
      "-c", "user.name=Fractera panel",
      "commit", "-m", "Project sent from the Fractera panel",
    ]).catch(() => undefined);

    await run("git", ["-C", APP_DIR, "push", authUrl, "HEAD:main"], { timeout: 120_000 });
  } catch (e) {
    // 🔒 ПОДРОБНОСТЬ — В ЖУРНАЛ СЕРВЕРА, НАРУЖУ ТОЛЬКО ПРИЧИНА. В тексте ошибки
    // git встречается адрес с токеном; отдать его в ответе значило бы вынести
    // секрет в браузер.
    const text = e instanceof Error ? e.message : String(e);
    console.error("[launch-flow/push] отказ:", text.replace(token, "***"));

    const reason = /could not resolve host|network|timed out/i.test(text)
      ? "network"
      : "push-rejected";
    return NextResponse.json({ ok: false, reason }, { status: 502 });
  }

  setFlowPushed(true, launchPath);
  return NextResponse.json({ ok: true, pushedAt: flowPushedAt(launchPath) });
}
