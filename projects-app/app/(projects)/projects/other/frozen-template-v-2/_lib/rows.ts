// ХРАНИЛИЩЕ СТРОК ВЫВОДА — append-only JSONL внутри папки (_data/runtime/rows.jsonl), закон 0. Это тот
// самый дашборд-стор, куда выходной узел кладёт результат прогона. Локальное (не платформенный
// lib/dashboard-rows), чтобы папка оставалась самодостаточной.
import { appendFile, mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { randomBytes } from "node:crypto";

const RUNTIME_DIR = join(process.cwd(), "app", "(projects)", "projects", "other", "frozen-template-v-2", "_data", "runtime");
const ROWS_FILE = join(RUNTIME_DIR, "rows.jsonl");

export type Row = { id: string; table: string; createdAt: string } & Record<string, unknown>;

export async function addRow(table: string, data: Record<string, unknown>): Promise<Row> {
  const row: Row = { id: `row${Date.now().toString(36)}${randomBytes(4).toString("hex")}`, table, createdAt: new Date().toISOString(), ...data };
  await mkdir(RUNTIME_DIR, { recursive: true });
  await appendFile(ROWS_FILE, `${JSON.stringify(row)}\n`, "utf8");
  return row;
}

export async function listRows(table: string, limit = 100): Promise<Row[]> {
  try {
    const raw = await readFile(ROWS_FILE, "utf8");
    const rows = raw.split("\n").filter(Boolean).map((l) => JSON.parse(l) as Row).filter((r) => r.table === table);
    return rows.slice(-limit).reverse();
  } catch {
    return []; // no rows yet
  }
}
