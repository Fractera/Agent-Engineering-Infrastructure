// Отметки «инструмент разработки поставлен» (владелец 2026-08-14).
//
// 🔒 ЭТО ПРИЁМ ФАКТА, А НЕ ПРОВЕРКА. Панель работает на сервере, а браузерное
// расширение, Claude Code и редактор живут на машине разработчика — канала,
// по которому такой вопрос можно задать, между ними нет. Проверить может только
// тот, у кого они под рукой: сам человек или его агент.
//
// 🔒 ПОЭТОМУ ГЛАВНОЕ ЗДЕСЬ — ГАЛОЧКА У ЧЕЛОВЕКА. Отметку о браузере умел ставить
// только агент, одним вызовом API; владелец, поставивший расширение руками,
// физически не мог погасить предупреждение и спросил прямо: «где чекбокс?».
// Предупреждение, которое нельзя снять, перестают читать — вместе со всеми
// соседними.
//
// 🔒 ОТМЕТКА СНИМАЕМАЯ. Снял галочку — предупреждение вернулось. Одноразовая
// отметка говорила бы «когда-то стояло» и врала бы ровно тем способом, который
// этот проект выкорчёвывает.
//
// Ключи живут в окружении рядом с остальными отметками решений
// (`USER_LANGUAGES_CONFIRMED_AT`, `USER_GITHUB_VERIFIED_AT`) — один дом для
// фактов о том, что владелец и его агент уже сделали.

import fs from "fs";
import path from "path";

const APP_ENV = process.env.APP_ENV_PATH ?? "/opt/fractera/app/.env.local";

/**
 * Порядок здесь СОДЕРЖАТЕЛЬНЫЙ и выбран владельцем (2026-08-14): сначала то, без
 * чего обойтись можно, последним — то, без чего нельзя. Человек, которому первым
 * делом велят поставить три программы, не ставит ни одной; человек, начавший с
 * необязательного расширения, доходит до конца.
 */
export const DEV_TOOLS = ["browser", "claude-code", "editor"] as const;
export type DevTool = (typeof DEV_TOOLS)[number];

const MARK: Record<DevTool, string> = {
  browser: "AGENT_BROWSER_SEEN_AT",
  "claude-code": "DEV_CLAUDE_CODE_INSTALLED_AT",
  editor: "DEV_EDITOR_INSTALLED_AT",
};

export const markKey = (tool: DevTool): string => MARK[tool];

export const isDevTool = (v: unknown): v is DevTool =>
  typeof v === "string" && (DEV_TOOLS as readonly string[]).includes(v);

function upsert(content: string, key: string, value: string): string {
  const lines = content.length ? content.split("\n") : [];
  let found = false;
  const next = lines.map((line) => {
    const t = line.trim();
    if (!t || t.startsWith("#")) return line;
    const eq = t.indexOf("=");
    if (eq > 0 && t.slice(0, eq).trim() === key) { found = true; return `${key}=${value}`; }
    return line;
  });
  if (!found) next.push(`${key}=${value}`);
  while (next.length && next[next.length - 1] === "") next.pop();
  return next.join("\n") + "\n";
}

function remove(content: string, key: string): string {
  const next = content.split("\n").filter((line) => {
    const t = line.trim();
    if (!t || t.startsWith("#")) return true;
    const eq = t.indexOf("=");
    return !(eq > 0 && t.slice(0, eq).trim() === key);
  });
  while (next.length && next[next.length - 1] === "") next.pop();
  return next.join("\n") + "\n";
}

/**
 * Поставить или снять ЛЮБУЮ отметку решения. Пишем ТОЛЬКО свою строку — остальной
 * файл цел.
 *
 * 🔒 ОДИН ПИСАТЕЛЬ НА ЭТОТ ФАЙЛ. `.env.local` слота держит и языки, и GitHub, и
 * отметки инструментов; вторая реализация записи стоила бы этого файла целиком
 * при первой же гонке. Поэтому новые отметки заводятся ключом здесь, а не своим
 * модулем рядом.
 */
export function setMark(key: string, on: boolean): void {
  const existing = fs.existsSync(APP_ENV) ? fs.readFileSync(APP_ENV, "utf-8") : "";
  const next = on ? upsert(existing, key, new Date().toISOString()) : remove(existing, key);
  fs.mkdirSync(path.dirname(APP_ENV), { recursive: true });
  fs.writeFileSync(APP_ENV, next, "utf-8");
}

export function hasMark(key: string): boolean {
  try {
    const re = new RegExp(`^${key}=(.+)$`, "m");
    const m = fs.readFileSync(APP_ENV, "utf-8").match(re);
    return Boolean(m && m[1].trim());
  } catch {
    return false;
  }
}

/**
 * Отметка «файл окружения перенесён на локальную машину» (владелец 2026-08-19).
 *
 * 🔒 СКАЧИВАНИЕ ЕЁ НЕ СТАВИТ. Панель отдаёт файл браузеру и на этом её знание
 * кончается: доехал ли он до папки проекта, положили ли его рядом с `package.json`
 * — отсюда не видно. Отметка о поступке ставится тем, кто поступок совершил, тем
 * же приёмом, что у языков и у инструментов разработки.
 */
export const ENV_TRANSFERRED_KEY = "USER_ENV_TRANSFERRED_AT";

export const setInstalled = (tool: DevTool, installed: boolean): void =>
  setMark(markKey(tool), installed);

export const isInstalled = (tool: DevTool): boolean => hasMark(markKey(tool));

export function installedMap(): Record<DevTool, boolean> {
  return {
    browser: isInstalled("browser"),
    "claude-code": isInstalled("claude-code"),
    editor: isInstalled("editor"),
  };
}
