// Серверное чтение базы для браузера таблиц (шаг 501, Ф2, партия 3).
//
// Читаем SQLite НАПРЯМУЮ. Старая панель делала два HTTP-запроса из браузера
// (`/api/db/tables`, затем `/api/db/tables/<таблица>`) к маршрутам, которые
// внутри открывают тот же файл. Со страницы этот крюк не нужен: она уже на
// сервере, у файла — и читает его сама. Маршруты остаются: ими живут
// замороженная старая панель и островок изменений.
//
// Только чтение (`readonly: true`): страница ничего не пишет, запись идёт через
// проверенные маршруты API. Файл открывается и закрывается на каждый запрос —
// соединение, живущее между запросами, держало бы блокировку и мешало сборке
// слота (уже наступали на это: `sqlite-busy-build-concurrent-migration.md`).

import Database from "better-sqlite3";

const APP_DB = process.env.APP_DB_PATH ?? "/opt/fractera/app/data/app.db";

// Тот же предел, что у маршрута API: браузер таблиц — инструмент осмотра, а не
// выгрузки. Число названо вслух в интерфейсе, чтобы никто не решил, что таблица
// кончилась.
export const ROW_LIMIT = 500;

export type TableRow = Record<string, unknown>;

export type TablesResult =
  | { ok: true; tables: string[] }
  | { ok: false; reason: string };

export type TableData =
  | { ok: true; columns: string[]; rows: TableRow[]; total: number; hasId: boolean }
  | { ok: false; reason: string };

export function listTables(): TablesResult {
  try {
    const db = new Database(APP_DB, { readonly: true });
    const rows = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
      .all() as { name: string }[];
    db.close();
    return { ok: true, tables: rows.map((r) => r.name) };
  } catch (e) {
    return { ok: false, reason: String(e) };
  }
}

export function readTable(table: string): TableData {
  try {
    const db = new Database(APP_DB, { readonly: true });

    // Имя таблицы приходит из адреса, то есть от кого угодно. Подставлять его в
    // запрос можно ТОЛЬКО после сверки со списком настоящих таблиц — иначе
    // адресная строка становится способом исполнить свой SQL.
    const exists = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?")
      .get(table);
    if (!exists) { db.close(); return { ok: false, reason: "table-not-found" }; }

    const info = db.prepare(`PRAGMA table_info("${table}")`).all() as { name: string }[];
    const columns = info.map((c) => c.name);
    const total = (db.prepare(`SELECT COUNT(*) AS n FROM "${table}"`).get() as { n: number }).n;
    const rows = db.prepare(`SELECT * FROM "${table}" LIMIT ${ROW_LIMIT}`).all() as TableRow[];
    db.close();

    // Правка и удаление идут по `id`. Таблица без него не редактируется — и
    // страница обязана сказать это вслух: старая панель молча подставляла
    // `undefined` в адрес запроса.
    return { ok: true, columns, rows, total, hasId: columns.includes("id") };
  } catch (e) {
    return { ok: false, reason: String(e) };
  }
}
