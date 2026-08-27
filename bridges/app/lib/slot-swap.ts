import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";

// Замена содержимого гостевого слота чужим проектом и возврат стартового шаблона
// (шаг 25-7, поток B мастера запуска).
//
// 🔒 СНАЧАЛА ДОНОР, ПОТОМ РАЗРУШЕНИЕ. Порядок здесь — главное свойство файла.
// Наивная реализация сносит слот и делает `git clone` на его место; опечатка в
// адресе, приватный репозиторий или упавшая сеть оставляют человека **без
// проекта и без замены**. Поэтому: проверяем адрес, клонируем в СОСЕДНЮЮ
// временную папку, и только когда клон лежит целиком — меняем местами.
// Не получилось на любом шаге до обмена — слот не тронут вовсе.
//
// 🔒 КОРЕНЬ ПРИХОДИТ ПАРАМЕТРОМ, А НЕ БЕРЁТСЯ ИЗ КОНСТАНТЫ. Это делает функцию
// проверяемой на временной папке — без сервера, без риска и без слова
// архитектора. Разрушающая работа, которую нельзя прогнать в тесте, не
// проверяется никогда.
//
// 🔒 СБОРКУ ЭТОТ ФАЙЛ НЕ ДЕЛАЕТ. Она — `runBuild()` из `app/api/deploy/route.ts`,
// со своим замком, журналом, откатом и проверкой здоровья. Вторая сборка рядом
// с первой означала бы две очереди на один слот.

/** Куда возвращаться, если в `app-slot.json` пусто. Названо вслух, а не спрятано. */
export const DEFAULT_STARTER_REPO = "https://github.com/Fractera/fractera-next-starter.git";

const SLOT_MANIFEST = process.env.APP_SLOT_MANIFEST ?? "/opt/fractera/app-slot.json";

export type SwapResult =
  | { ok: true; repoUrl: string; head: string }
  | { ok: false; reason: string; touched: false };

function git(args: string[], cwd?: string): string {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    timeout: 180_000,
    maxBuffer: 32 * 1024 * 1024,
  }).toString();
}

/** Адрес со встроенным токеном — только для команды, никогда в ответ и никогда в лог. */
function authUrl(repoUrl: string, token: string): string {
  if (!token) return repoUrl;
  return repoUrl.replace(/^https:\/\//, `https://x-access-token:${token}@`);
}

function scrub(text: string, token: string): string {
  return token ? text.split(token).join("***") : text;
}

/**
 * Откуда родился нынешний слот. Панель этого не знала до 25-7: ни `app-slot.json`,
 * ни `FRACTERA_APP_REPO_URL` в коде не встречались, и «вернуть как было» было
 * некуда. Пусто или нечитаемо — берём названную константу, а не гадаем.
 */
export function starterRepoUrl(): string {
  try {
    const raw = fs.readFileSync(SLOT_MANIFEST, "utf8");
    const url = (JSON.parse(raw) as { repoUrl?: unknown }).repoUrl;
    if (typeof url === "string" && url.trim()) return url.trim();
  } catch { /* манифеста нет — это нормально на свежем сервере */ }
  return DEFAULT_STARTER_REPO;
}

/** Всё содержимое папки, кроме служебного `.env.local`, который принадлежит машине, а не проекту. */
function wipeContents(root: string, keep: readonly string[]): void {
  for (const name of fs.readdirSync(root)) {
    if (keep.includes(name)) continue;
    fs.rmSync(path.join(root, name), { recursive: true, force: true });
  }
}

/**
 * Заменить содержимое `root` содержимым репозитория `repoUrl`.
 *
 * 🔒 `.env.local` ПЕРЕЖИВАЕТ ЗАМЕНУ. В нём ключи слоя данных, адрес сервера и
 * отметки мастера; чужой проект их не привозит, а без них не поднимется ни он,
 * ни откат к шаблону. Файл принадлежит МАШИНЕ, а не проекту в репозитории.
 */
export function replaceSlotContents(
  repoUrl: string,
  root: string,
  opts: { token?: string; keep?: readonly string[] } = {},
): SwapResult {
  const token = opts.token ?? "";
  const keep = opts.keep ?? [".env.local"];

  if (!repoUrl.trim()) return { ok: false, reason: "repo_not_set", touched: false };
  if (!fs.existsSync(root)) return { ok: false, reason: "slot_missing", touched: false };

  // 1. Донор отвечает? Пока нет — не трогаем ничего.
  try {
    git(["ls-remote", authUrl(repoUrl, token), "HEAD"]);
  } catch (e) {
    const raw = scrub(e instanceof Error ? e.message : String(e), token);
    if (/not found|does not exist/i.test(raw)) return { ok: false, reason: "repo_not_found", touched: false };
    if (/Authentication failed|could not read Username/i.test(raw)) {
      return { ok: false, reason: "auth_failed", touched: false };
    }
    return { ok: false, reason: "network", touched: false };
  }

  // 2. Клонируем РЯДОМ. Соседняя папка, а не подпапка: подпапку пришлось бы
  //    исключать из сноса, и однажды её бы не исключили.
  const staging = path.join(path.dirname(root), `.slot-staging-${Date.now()}`);
  fs.rmSync(staging, { recursive: true, force: true });
  try {
    git(["clone", "--depth", "1", authUrl(repoUrl, token), staging]);
  } catch (e) {
    fs.rmSync(staging, { recursive: true, force: true });
    return { ok: false, reason: scrub(e instanceof Error ? e.message : String(e), token).slice(0, 300), touched: false };
  }

  // 3. Клон на руках — только теперь меняем. Точка невозврата ровно здесь.
  const head = (() => {
    try { return git(["rev-parse", "--short", "HEAD"], staging).trim(); } catch { return "unknown"; }
  })();

  try {
    wipeContents(root, keep);
    for (const name of fs.readdirSync(staging)) {
      fs.renameSync(path.join(staging, name), path.join(root, name));
    }
  } finally {
    fs.rmSync(staging, { recursive: true, force: true });
  }

  return { ok: true, repoUrl, head };
}

/** Вернуть в слот стартовый шаблон Fractera. Тот же путь, другой адрес. */
export function restoreStarter(root: string, opts: { token?: string } = {}): SwapResult {
  return replaceSlotContents(starterRepoUrl(), root, opts);
}
