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

/**
 * Записать ЗНАЧЕНИЕ решения — там, где важен сам выбор, а не дата (шаг 25).
 *
 * 🔒 ЗАЧЕМ ВТОРАЯ ФУНКЦИЯ, А НЕ ВТОРОЙ МОДУЛЬ. `setMark` записывает ФАКТ: он
 * умеет ровно «было/не было» и кладёт в значение отметку времени. Режим старта
 * («стартовый шаблон» или «чужой проект») фактом не выражается — это выбор из
 * нескольких, и его надо прочитать обратно словом. Заводить ради этого свой
 * писатель `.env.local` нельзя: файл держит и языки, и GitHub, и все отметки, а
 * две реализации записи стоили бы его целиком при первой же гонке. Поэтому здесь
 * ещё одна пара функций поверх ТОГО ЖЕ `upsert`/`remove`, а не второй дом.
 *
 * `null` стирает строку — тем же `remove`, что снимает отметки.
 */
export function setValue(key: string, value: string | null): void {
  const existing = fs.existsSync(APP_ENV) ? fs.readFileSync(APP_ENV, "utf-8") : "";
  const next = value === null ? remove(existing, key) : upsert(existing, key, value);
  fs.mkdirSync(path.dirname(APP_ENV), { recursive: true });
  fs.writeFileSync(APP_ENV, next, "utf-8");
}

/**
 * Прочитать значение. Пустая строка = «не задано»: так же ведёт себя `hasMark`,
 * и отсутствующий файл ничем не отличается от пустого ключа — это честно, потому
 * что для читателя разницы между ними нет.
 */
export function getValue(key: string): string {
  try {
    const m = fs.readFileSync(APP_ENV, "utf-8").match(new RegExp(`^${key}=(.*)$`, "m"));
    return m ? m[1].trim() : "";
  } catch {
    return "";
  }
}

/**
 * Стереть все ключи, начинающиеся с префикса, ОДНОЙ записью файла (шаг 25).
 *
 * 🔒 ПОЧЕМУ НЕ ЦИКЛ ИЗ `setValue`. Сброс мастера снимает полтора десятка отметок
 * сразу. Полтора десятка чтений и записей одного файла подряд — это полтора
 * десятка окон, в которые может влезть соседняя запись (галочка, сохранение
 * языков, подключение GitHub). Читаем один раз, пишем один раз.
 */
export function clearPrefix(prefix: string): string[] {
  const existing = fs.existsSync(APP_ENV) ? fs.readFileSync(APP_ENV, "utf-8") : "";
  const removed: string[] = [];
  const next = existing.split("\n").filter((line) => {
    const t = line.trim();
    if (!t || t.startsWith("#")) return true;
    const eq = t.indexOf("=");
    if (eq <= 0) return true;
    const key = t.slice(0, eq).trim();
    if (!key.startsWith(prefix)) return true;
    removed.push(key);
    return false;
  });
  while (next.length && next[next.length - 1] === "") next.pop();
  fs.mkdirSync(path.dirname(APP_ENV), { recursive: true });
  fs.writeFileSync(APP_ENV, next.join("\n") + "\n", "utf-8");
  return removed;
}
