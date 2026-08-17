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
// владельца и ходит в базу через MCP `development-steps` (шаблон слота,
// `scripts/mcp/development-steps.mjs`). Панель показывает владельцу состояние;
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
