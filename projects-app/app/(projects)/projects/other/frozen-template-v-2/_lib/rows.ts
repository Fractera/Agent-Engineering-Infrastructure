// ХРАНИЛИЩЕ СТРОК ВЫВОДА — append-only JSONL внутри папки (_data/runtime/rows.jsonl), закон 0. Это тот
// самый дашборд-стор, куда выходной узел кладёт результат прогона. Локальное (не платформенный
// lib/dashboard-rows), чтобы папка оставалась самодостаточной.
//
// ПРАВКА СТРОКИ НЕ ЛОМАЕТ APPEND-ONLY (шаг 292). Владельцу нужно править записи календаря — их время,
// упреждение, содержимое интеграций. Файл при этом остаётся журналом: правка = ДОПИСАТЬ строку с ТЕМ ЖЕ
// `id`, а при чтении побеждает последняя версия каждого id. Отсюда два следствия, и оба полезны:
// история правок сохраняется сама собой (кто и когда что менял — видно в файле), а запись никогда не
// теряется из-за оборванной записи в середине файла.
import { appendFile, mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { randomBytes } from "node:crypto";

const RUNTIME_DIR = join(process.cwd(), "app", "(projects)", "projects", "other", "frozen-template-v-2", "_data", "runtime");
const ROWS_FILE = join(RUNTIME_DIR, "rows.jsonl");

export type Row = { id: string; table: string; createdAt: string; updatedAt?: string } & Record<string, unknown>;

export async function addRow(table: string, data: Record<string, unknown>): Promise<Row> {
  const row: Row = { id: `row${Date.now().toString(36)}${randomBytes(4).toString("hex")}`, table, createdAt: new Date().toISOString(), ...data };
  await append(row);
  return row;
}

/**
 * Правка строки. Возвращает новую версию или `null`, если строки с таким id в этой таблице нет —
 * молча создавать её нельзя: правка несуществующей записи это ошибка вызывающего, а не новая запись.
 */
export async function updateRow(table: string, id: string, patch: Record<string, unknown>): Promise<Row | null> {
  const current = (await listRows(table, Infinity)).find((r) => r.id === id);
  if (!current) return null;
  // id, table и createdAt — идентичность и рождение записи; правка их не касается никогда, поэтому они
  // проставляются ПОСЛЕ патча, а не берутся из него.
  const next: Row = { ...current, ...patch, id, table, createdAt: current.createdAt, updatedAt: new Date().toISOString() };
  await append(next);
  return next;
}

async function append(row: Row): Promise<void> {
  await mkdir(RUNTIME_DIR, { recursive: true });
  await appendFile(ROWS_FILE, `${JSON.stringify(row)}\n`, "utf8");
}

export async function listRows(table: string, limit = 100): Promise<Row[]> {
  try {
    const raw = await readFile(ROWS_FILE, "utf8");
    // Последняя версия каждого id побеждает; порядок — по РОЖДЕНИЮ записи (Map держит порядок первой
    // вставки), поэтому правка не выталкивает старую запись в конец списка.
    const latest = new Map<string, Row>();
    for (const line of raw.split("\n")) {
      if (!line) continue;
      let row: Row;
      try {
        row = JSON.parse(line) as Row;
      } catch {
        continue; // оборванная строка журнала не должна ронять чтение всех остальных
      }
      if (row.table !== table) continue;
      latest.set(row.id, row);
    }
    const rows = [...latest.values()];
    return limit === Infinity ? rows.reverse() : rows.slice(-limit).reverse();
  } catch {
    return []; // no rows yet
  }
}
