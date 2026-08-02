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
import { RUNTIME_DIR } from "./paths";
import { ENTITY_STORES, mayWriteEntity } from "./message";
import { parseEnvelope, parseRecordFields, isRecordTable, type Link } from "../_data/record.schema";

const ROWS_FILE = join(RUNTIME_DIR, "rows.jsonl");

export type Row = { id: string; table: string; createdAt: string; updatedAt?: string } & Record<string, unknown>;

// `id` (необязательный, шаг 308.7): обычно строка сама выдаёт id, но памяти нужно ЗНАТЬ id ДО записи —
// чтобы вложить обратный маркер `[mem#id]` в ингестируемый текст, а маркер указывал на эту же строку и её
// картинки. Передан id → используется он; не передан → прежнее поведение.
export async function addRow(table: string, data: Record<string, unknown>, id?: string): Promise<Row> {
  const row: Row = { id: id || `row${Date.now().toString(36)}${randomBytes(4).toString("hex")}`, table, createdAt: new Date().toISOString(), ...data };
  // Конверт проверяется ПЕРЕД записью (311.9а.2): незаконная строка не попадает в журнал, а вызывающий
  // получает названную причину. `links` получает свой дефолт здесь же — поле есть у каждой строки.
  await append(parseEnvelope(row) as Row);
  return row;
}

/**
 * 🔒 ЕДИНСТВЕННАЯ ТОЧКА ЗАПИСИ В СКЛАД СУЩНОСТЕЙ (шаг 311.9а).
 *
 * До неё правило «класс-вопрос не оставляет записи» повторялось в теле каждого узла-склада — и стояло
 * у трёх из пяти. Живой прогон `what did I save about …` это доказал: вопрос лёг файлом в хранилище.
 * Правило переехало в САМУ ЗАПИСЬ: узел не может его обойти, потому что другого пути в склад нет.
 *
 * `null` — законный исход, а не ошибка: «этот прогон записи не оставляет». Узел отвечает честным
 * пропуском с причиной. Журнал прогона (`history`/`analytics`/`toast`) пишется обычным `addRow`:
 * вопрос — тоже прогон, и он обязан быть виден.
 *
 * 🔒 СВЯЗЫВАНИЕ — СВОЙСТВО ЗАПИСИ, А НЕ ВЕЖЛИВОСТЬ УЗЛА (311.9а.2). Раньше `crossLink` звал каждый узел
 * сам, и звали его четверо из девяти — поэтому закон «каждая строка несёт связи ко всем» был ложен.
 * Теперь связывает САМА запись: строка склада сущностей не может родиться несвязанной. Журналы прогона
 * в граф связей не входят (они хранят СОБЫТИЕ, а не сущность), поэтому `addRow` их не связывает.
 */
export async function addEntityRow(
  table: (typeof ENTITY_STORES)[number],
  data: Record<string, unknown>,
  ctx: Record<string, unknown>,
  id?: string,
): Promise<Row | null> {
  if (!(ENTITY_STORES as readonly string[]).includes(table)) {
    throw new Error(`addEntityRow: "${table}" is not an entity store (${ENTITY_STORES.join(", ")}) — a run journal is written with addRow`);
  }
  if (!mayWriteEntity(ctx)) return null;
  // Склад-ЗАПИСЬ обязан нести имя и саммари (311.9а.4). Метка и событие — грани, а не описание сущности:
  // им эта проверка не адресована. Ручное добавление строки владельцем идёт через `addRow` и под неё не
  // подпадает: закон говорит о том, что оставляет ПРОГОН, а не о том, что вписывает человек.
  if (isRecordTable(table)) parseRecordFields(data);
  const row = await addRow(table, data, id);
  await crossLink(ctx, table, row.id);
  return row;
}

// ─── СВЯЗЬ ВСЕХ-КО-ВСЕМ ─────────────────────────────────────────────────────────────────────────────
// Жила отдельным файлом `components/links/cross-link.ts` и звалась узлами вручную. Переехала СЮДА
// (311.9а.2), потому что связывание — свойство ЗАПИСИ: строка склада сущностей не может родиться
// несвязанной. Заодно ушёл цикл импортов `rows → cross-link → rows`.
//
// Форма ссылки одна — `links: {table,id}[]` на каждой строке (см. `_data/record.schema.ts`). Из любой
// строки достаётся любая связь: из объекта хранилища — к записи, из записи — к вектору, метке и событию.

/** Соседи этого прогона, известные из контекста: id, проставленные ранее выполнившимися выходами. */
function knownSiblings(ctx: Record<string, unknown>): Link[] {
  const out: Link[] = [];
  const push = (table: string, id: unknown) => { const s = String(id ?? "").trim(); if (s) out.push({ table, id: s }); };
  push("vector-memory", ctx.vectorRowId);
  push("database", ctx.databaseRowId);
  push("map", ctx.mapRowId);
  push("calendar", ctx.calendarRowId);
  const atts = Array.isArray(ctx.attachments) ? (ctx.attachments as { rowId?: unknown }[]) : [];
  for (const a of atts) push("storage", a?.rowId);
  return out;
}

const mergeLinks = (existing: unknown, add: Link[]): Link[] => {
  const cur: Link[] = Array.isArray(existing) ? (existing as Link[]).filter((l) => l && l.table && l.id) : [];
  const seen = new Set(cur.map((l) => `${l.table}/${l.id}`));
  for (const l of add) { const k = `${l.table}/${l.id}`; if (!seen.has(k)) { seen.add(k); cur.push(l); } }
  return cur;
};

/**
 * Связать только что созданную строку со всеми соседями прогона ОБОЮДНО: её ссылки — в неё, её ссылку —
 * в каждого соседа. Порядок выходов значения не имеет: поздняя строка латает ранние. Отсутствующего
 * соседа переживает молча (`updateRow` вернёт `null`).
 */
async function crossLink(ctx: Record<string, unknown>, table: string, id: string): Promise<void> {
  const me = String(id ?? "").trim();
  if (!me) return;
  const siblings = knownSiblings(ctx).filter((l) => !(l.table === table && l.id === me));
  if (!siblings.length) return;

  const mine = (await listRows(table, Infinity)).find((r) => r.id === me);
  if (mine) await updateRow(table, me, { links: mergeLinks(mine.links, siblings) });

  const back: Link = { table, id: me };
  for (const s of siblings) {
    const row = (await listRows(s.table, Infinity)).find((r) => r.id === s.id);
    if (row) await updateRow(s.table, s.id, { links: mergeLinks(row.links, [back]) });
  }
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

/**
 * Удаление строки — тем же журнальным приёмом, что и правка (шаг 298, перенос таблицы v1): дописываем
 * версию с тем же `id` и меткой `deleted`, а чтение такие записи пропускает. Файл остаётся append-only:
 * видно, что запись была и когда её убрали. `false` — строки с таким id в этой таблице нет.
 */
export async function deleteRow(table: string, id: string): Promise<boolean> {
  const current = (await listRows(table, Infinity)).find((r) => r.id === id);
  if (!current) return false;
  await append({ ...current, id, table, createdAt: current.createdAt, updatedAt: new Date().toISOString(), deleted: true });
  return true;
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
    // Удалённые записи (надгробие `deleted`) в выдачу не попадают, но в журнале остаются.
    const rows = [...latest.values()].filter((r) => r.deleted !== true);
    return limit === Infinity ? rows.reverse() : rows.slice(-limit).reverse();
  } catch {
    return []; // no rows yet
  }
}
