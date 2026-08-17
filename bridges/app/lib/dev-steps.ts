// Шаги разработки — ЧТЕНИЕ ИЗ БАЗЫ (владелец 2026-08-17).
//
// 🔒 РАНЬШЕ ЭТО БЫЛИ ФАЙЛЫ. Конвейер `development-docs/DEVELOPMENT-STEPS/
// {NEW,COMPLETED}-STEPS/` работал, пока шагов десяток и читал их один агент. Он
// ломается на трёх вещах сразу: «покажи незакрытые шаги этого продукта»
// требовало прочитать КАЖДЫЙ файл; статус жил в двух местах — в имени папки и
// внутри файла; а закрытие шага было переносом между папками, то есть двумя
// операциями с диском, из которых вторая могла не случиться.
//
// 🔒 ПИШЕТ СЮДА АГЕНТ, А НЕ ПАНЕЛЬ, И ИМЕННО ПОЭТОМУ ЗДЕСЬ ТОЛЬКО ЧТЕНИЕ. Шаг
// заводит и закрывает тот, кто выполняет работу, — он живёт в локальном клоне
// владельца и ходит в базу через MCP `fractera-project` (шаблон слота,
// `scripts/mcp/fractera-project.mjs`). Панель показывает владельцу состояние;
// редактора здесь нет намеренно, как не было и у файлового конвейера.
//
// Чтение прямое, тем же приёмом, что у браузера таблиц (`database/_lib/
// tables.ts`): страница уже на сервере, у файла базы, и крюк через HTTP ей не
// нужен. Только `readonly`, соединение открывается и закрывается на каждый
// запрос — живущее между запросами держало бы блокировку и мешало сборке слота
// (`sqlite-busy-build-concurrent-migration.md`).

import Database from "better-sqlite3";

const APP_DB = process.env.APP_DB_PATH ?? "/opt/fractera/app/data/app.db";

/** Те же пять состояний, что объявляет MCP: список один, и он машинный. */
export const STEP_STATUSES = ["new", "in-progress", "blocked", "done", "cancelled"] as const;
export type StepStatus = (typeof STEP_STATUSES)[number];

export type DevStep = {
  number: number;
  productId: string;
  title: string;
  status: string;
  importance: string;
  cases: string[];
  plan: string;
  result: string;
  updatedAt: string;
};

/**
 * Почему отказ называется словом, а не пустым списком.
 *
 * «Таблицы нет» и «шагов нет» — разные вещи, и владелец должен различать их: в
 * первом случае приложение ни разу не собиралось на этом сервере, во втором
 * агент ещё не завёл ни одного шага. Пустой список на оба случая отправил бы
 * человека искать поломку там, где всё в порядке.
 */
export type StepsState =
  | { ok: true; steps: DevStep[] }
  | { ok: false; reason: "no-db" | "no-table" };

function row(r: Record<string, unknown>): DevStep {
  let cases: string[] = [];
  // Разбор в try: колонка — свободный текст, и запись, сделанная мимо MCP,
  // не обязана быть JSON. Шаг с нечитаемым списком кейсов лучше показать без
  // него, чем не показать вовсе.
  try {
    const parsed = JSON.parse(String(r.cases ?? "[]")) as unknown;
    if (Array.isArray(parsed)) cases = parsed.map(String);
  } catch { /* не JSON — считаем, что кейсы не названы */ }
  return {
    number: Number(r.number ?? 0),
    productId: String(r.product_id ?? "platform"),
    title: String(r.title ?? ""),
    status: String(r.status ?? "new"),
    importance: String(r.importance ?? "mandatory"),
    cases,
    plan: String(r.plan ?? ""),
    result: String(r.result ?? ""),
    updatedAt: String(r.updated_at ?? ""),
  };
}

function open(): Database.Database | null {
  try {
    return new Database(APP_DB, { readonly: true, fileMustExist: true });
  } catch {
    return null;
  }
}

export function listDevSteps(): StepsState {
  const db = open();
  if (!db) return { ok: false, reason: "no-db" };
  try {
    const rows = db
      .prepare("SELECT * FROM development_steps ORDER BY number")
      .all() as Record<string, unknown>[];
    return { ok: true, steps: rows.map(row) };
  } catch {
    // Единственная ожидаемая причина — таблицы ещё нет: её создаёт `SCHEMA`
    // гостевого приложения при первой сборке или MCP при первом обращении.
    return { ok: false, reason: "no-table" };
  } finally {
    db.close();
  }
}

export function readDevStep(number: number): DevStep | null {
  const db = open();
  if (!db) return null;
  try {
    const r = db
      .prepare("SELECT * FROM development_steps WHERE number = ?")
      .get(number) as Record<string, unknown> | undefined;
    return r ? row(r) : null;
  } catch {
    return null;
  } finally {
    db.close();
  }
}

/**
 * Завести шаг декомпозиции — единственная запись, которую делает ПАНЕЛЬ
 * (владелец 2026-08-17).
 *
 * 🔒 ПОЧЕМУ ПАНЕЛЬ, А НЕ ТОЛЬКО АГЕНТ. Момент, когда кейсы становятся работой, —
 * это момент, когда владелец подтвердил последний из них. Он в панели, и очередь
 * обязана появиться здесь же: иначе она не существует, пока кто-то не запустит
 * агента, а владелец открывает раздел шагов и видит пустоту сразу после того,
 * как закончил самую важную часть своей работы.
 *
 * Агент делает то же самое на входе в сессию (`steps_decompose_start`), и это не
 * дублирование, а самолечение: два независимых пути к одному состоянию, оба
 * идемпотентные.
 *
 * 🔒 ИДЕМПОТЕНТНОСТЬ ДЕРЖИТ КОЛОНКА `kind`, А НЕ СОВПАДЕНИЕ ЗАГОЛОВКА. Строка,
 * по которой сверяются, живёт ровно до первой правки формулировки — и тогда
 * второй шаг декомпозиции появляется молча.
 *
 * Пишем прямо в SQLite: панель уже так делает в браузере таблиц, файл общий, и
 * ходить за одной строкой через HTTP к службе, стоящей на той же машине, незачем.
 */
export function ensureDecompositionStep(
  productId: string, confirmedCaseIds: string[],
): { created: boolean; number: number } | null {
  if (!productId || !confirmedCaseIds.length) return null;
  let db: Database.Database;
  try {
    db = new Database(APP_DB);
  } catch {
    return null;
  }
  try {
    db.exec(SCHEMA);
    // Колонку добавляем вслепую: `CREATE TABLE IF NOT EXISTS` не трогает
    // существующую таблицу, а сервер мог завести шаги до появления `kind`.
    try {
      db.exec("ALTER TABLE development_steps ADD COLUMN kind TEXT NOT NULL DEFAULT 'work'");
    } catch { /* колонка уже есть — этого мы и хотели */ }

    const existing = db
      .prepare("SELECT number FROM development_steps WHERE product_id = ? AND kind = 'decomposition' LIMIT 1")
      .get(productId) as { number: number } | undefined;
    if (existing) return { created: false, number: existing.number };

    const max = db.prepare("SELECT MAX(number) AS m FROM development_steps").get() as { m: number | null };
    const number = (max?.m ?? 0) + 1;
    db.prepare(
      `INSERT INTO development_steps (number, product_id, title, status, importance, kind, cases, plan)
       VALUES (?, ?, ?, 'new', 'critical', 'decomposition', ?, ?)`,
    ).run(number, productId, DECOMPOSITION_TITLE, JSON.stringify(confirmedCaseIds), DECOMPOSITION_PLAN);
    return { created: true, number };
  } catch {
    return null;
  } finally {
    db.close();
  }
}

/**
 * 🔒 ЗАГОЛОВОК И ЗАДАНИЕ ПОВТОРЕНЫ ИЗ MCP ДОСЛОВНО (`scripts/mcp/
 * fractera-project.mjs`). Два пути к одному состоянию обязаны приводить к
 * ОДИНАКОВОЙ записи, иначе владелец увидит разный текст в зависимости от того,
 * кто успел первым, и решит, что шагов два разных вида.
 *
 * Английский — машинный слой (правило шага 509): это задание читает агент.
 */
const DECOMPOSITION_TITLE =
  "decompose confirmed use cases into an ordered development step queue";

const DECOMPOSITION_PLAN =
  "Read every confirmed use case of this product and turn it into an ordered queue of development "
  + "steps through steps_create.\n\n"
  + "The FIRST step of that queue is always the same and is not negotiable: the minimal working "
  + "skeleton — the whole architecture present in the filesystem, the API routes in place, and "
  + "navigation walking end to end on stubs. Nothing real behind it yet. Everything after it fills "
  + "the stubs in, one case at a time.\n\n"
  + "Every step names the cases it serves and carries a title of 6-12 words. When the queue is "
  + "written, close this step with steps_close.";

/**
 * Схема — копия объявления гостевого приложения (`lib/db/index.ts`). Панель
 * создаёт таблицу, если её ещё нет: она может понадобиться раньше, чем
 * приложение соберут в первый раз.
 */
const SCHEMA = `
  CREATE TABLE IF NOT EXISTS development_steps (
    number      INTEGER PRIMARY KEY,
    product_id  TEXT NOT NULL DEFAULT 'platform',
    title       TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'new',
    importance  TEXT NOT NULL DEFAULT 'mandatory',
    kind        TEXT NOT NULL DEFAULT 'work',
    cases       TEXT,
    plan        TEXT,
    result      TEXT,
    created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
    updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
  );
`;

/** Сколько шагов и сколько из них закрыто — для сводки на странице документов. */
export function devStepsSummary(): { total: number; open: number } {
  const state = listDevSteps();
  if (!state.ok) return { total: 0, open: 0 };
  const closed = new Set(["done", "cancelled"]);
  return {
    total: state.steps.length,
    open: state.steps.filter((s) => !closed.has(s.status)).length,
  };
}
