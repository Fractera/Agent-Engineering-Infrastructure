import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import { exec } from "child_process";
import { promisify } from "util";
import { requireAuth } from "@/lib/require-auth";
import { keyIssued } from "@/lib/ssh-access";
import { readLaunch, setLaunchStep, REPO_URL_KEY } from "@/lib/launch";
import { isLaunchStepId } from "@/lib/launch.shared";

// Дверь проверки машинных шагов мастера запуска (шаг 25-3).
//
// 🔒 ОДНА ДВЕРЬ НА ВСЕ `verified`-ШАГИ, ветвление по `step`. Отдельная дверь на
// каждый шаг означала бы четыре копии проверки прав, четыре формы ответа и
// четыре места, где однажды забудут `requireAuth`.
//
// 🔒 ЭТА ДВЕРЬ НИЧЕГО НЕ ИЗОБРЕТАЕТ. Репозиторий проверяет `git ls-remote` — тем
// же способом, что и `api/config/git-connect`; ключ — `keyIssued()` из
// `lib/ssh-access`, читающий файл пары и строку в `authorized_keys`; отправку —
// тот же `ls-remote`, но по ветке `main`. Новое здесь только маршрутизация и
// запись отметки.
//
// 🔒 ОТМЕТКА СТАВИТСЯ ТОЛЬКО ПРИ УСПЕХЕ, и это главное свойство машинного шага.
// Человек не может закрыть его из вежливости — дверь `launch/step` отвечает 409
// на любую попытку. Отказ здесь называет ПРИЧИНУ словами: «не получилось» без
// причины заставляет человека гадать, а гадают обычно неверно.

const execAsync = promisify(exec);
const APP_ENV = process.env.APP_ENV_PATH ?? "/opt/fractera/app/.env.local";

function readEnv(): Record<string, string> {
  const out: Record<string, string> = {};
  let raw = "";
  try { raw = fs.readFileSync(APP_ENV, "utf8"); } catch { return out; }
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq > 0) out[t.slice(0, eq).trim()] = t.slice(eq + 1);
  }
  return out;
}

/** Адрес со встроенным токеном — только для запуска команды, никогда в ответ. */
function authUrl(repoUrl: string, token: string): string {
  if (!token) return repoUrl;
  return repoUrl.replace(/^https:\/\//, `https://x-access-token:${token}@`);
}

/** Причина отказа словами. Токен из вывода git вычищается до возврата. */
function explain(raw: string, token: string): string {
  const safe = token ? raw.split(token).join("***") : raw;
  if (/could not read Username|Authentication failed|invalid credentials/i.test(safe)) {
    return "auth_failed";
  }
  if (/not found|Repository not found|does not exist/i.test(safe)) return "repo_not_found";
  if (/Could not resolve host|timed out|network/i.test(safe)) return "network";
  return safe.slice(0, 300);
}

type Outcome = { ok: true } | { ok: false; reason: string; status: number };

async function verifyRepo(): Promise<Outcome> {
  const env = readEnv();
  const repoUrl = env[REPO_URL_KEY] ?? "";
  const token = env.USER_GITHUB_ACCESS_TOKEN ?? "";
  if (!repoUrl) return { ok: false, reason: "repo_not_set", status: 422 };
  try {
    await execAsync(`git ls-remote "${authUrl(repoUrl, token)}" HEAD`, { timeout: 25000 });
    return { ok: true };
  } catch (e) {
    const raw = e instanceof Error ? `${e.message}` : String(e);
    return { ok: false, reason: explain(raw, token), status: 422 };
  }
}

function verifyKey(): Outcome {
  // Ключ либо есть на диске, либо его нет. Спрашивать человека не о чем.
  return keyIssued() ? { ok: true } : { ok: false, reason: "key_not_issued", status: 422 };
}

async function verifyUpload(): Promise<Outcome> {
  // 🔒 «Проект загружен» = у УДАЛЁННОГО репозитория есть ветка `main` с коммитом.
  // Не «мы нажали отправить» и не «локально есть коммит»: отправка могла упасть,
  // а локальная история к чужой машине отношения не имеет.
  const env = readEnv();
  const repoUrl = env[REPO_URL_KEY] ?? "";
  const token = env.USER_GITHUB_ACCESS_TOKEN ?? "";
  if (!repoUrl) return { ok: false, reason: "repo_not_set", status: 422 };
  try {
    const { stdout } = await execAsync(
      `git ls-remote "${authUrl(repoUrl, token)}" refs/heads/main`,
      { timeout: 25000 },
    );
    if (!stdout.trim()) return { ok: false, reason: "no_main_branch", status: 422 };
    return { ok: true };
  } catch (e) {
    const raw = e instanceof Error ? `${e.message}` : String(e);
    return { ok: false, reason: explain(raw, token), status: 422 };
  }
}

export async function POST(req: NextRequest) {
  if (!(await requireAuth(req.headers.get("cookie") ?? ""))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as { step?: unknown } | null;
  if (!isLaunchStepId(body?.step)) {
    return NextResponse.json({ error: "unknown_step" }, { status: 400 });
  }

  const state = readLaunch();
  const step = state.steps.find((s) => s.id === body.step);
  if (!step) {
    return NextResponse.json({ error: "step_not_in_current_mode", mode: state.mode }, { status: 409 });
  }
  if (step.kind !== "verified") {
    // Человеческий шаг закрывается галочкой через `launch/step`. Разводить их —
    // не формальность: проверять «поставил ли он Claude Code» панели нечем.
    return NextResponse.json({ error: "step_is_human_checked" }, { status: 409 });
  }

  let outcome: Outcome;
  switch (step.id) {
    case "repo": outcome = await verifyRepo(); break;
    case "key": outcome = verifyKey(); break;
    case "upload": outcome = await verifyUpload(); break;
    // `adopt` — замена слота чужим проектом, строится в 25-7. До тех пор честный
    // отказ, а не молчаливое «проверено».
    default: outcome = { ok: false, reason: "not_implemented_yet", status: 501 };
  }

  if (!outcome.ok) {
    return NextResponse.json({ ok: false, step: step.id, error: outcome.reason }, { status: outcome.status });
  }

  // 🔒 У `key` отметки нет — его правда живёт в файле ключа (`stepDone` в
  // `lib/launch.ts`). Писать её означало бы завести второй источник того же
  // факта, который разойдётся с первым при отзыве ключа.
  if (step.id !== "key") setLaunchStep(step.id, true);

  const next = readLaunch();
  return NextResponse.json({ ok: true, step: step.id, current: next.current });
}
