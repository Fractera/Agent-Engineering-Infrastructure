// ПРИМИТИВЫ ЧТЕНИЯ — недостающая половина складов (шаг 311.9а.3).
//
// ПОЧЕМУ ОНИ ВООБЩЕ НУЖНЫ. Записывать умели 12 замороженных выходных узлов, читать — ни один. При этом
// два класса запроса из одиннадцати (`read-own`, `composite`) без чтения бессмысленны: класс распознавал
// вопрос верно и упирался в пустоту. Асимметрия была не законом, а недостроем.
//
// 🔒 ПОЧЕМУ ЭТО БИБЛИОТЕКА, А НЕ СЛОЙ УЗЛОВ. Прочитать ИЗ склада ровно так же конечно, как записать В
// него: складов закрытый список. Бесконечна КОМПОЗИЦИЯ чтения — что искать, как отобрать, чем ответить, —
// и она принадлежит середине. Поэтому примитив живёт функцией, а не узлом: иначе у середины появился бы
// словарь, а закон «середина — единственный бесконечный слой» перестал бы быть верным.
//
// 🔒 ЧЕСТНЫЕ ИСХОДЫ — тот же закон, что у записи: «НЕДОСТУПЕН» ≠ «НЕ НАЙДЕНО». Склад, который отказал, и
// склад, который ответил «ничего нет», выглядят в данных одинаково и означают противоположное. Поэтому
// каждый примитив возвращает НАЗВАННЫЙ исход, а не голый массив.
//
// Имена выводятся из того же словаря складов, что и у доставки: `deliverDatabase` → `readDatabase`.
import { listRows, type Row } from "../rows";
import { recallFacts } from "../memory";
import { readObject } from "../store";

/** Исход чтения. `unreachable` — склада нет на этом сервере; `empty` — склад есть, в нём ничего. */
export type ReadOutcome = "found" | "empty" | "unreachable";
export type ReadResult<T> = { outcome: ReadOutcome; rows: T[]; reason?: string };

const found = <T>(rows: T[]): ReadResult<T> => (rows.length ? { outcome: "found", rows } : { outcome: "empty", rows: [] });

/** Все значения строки одной строкой — по ним и ищем: склад не знает, какие поля завела автоматизация. */
const haystack = (row: Row): string =>
  Object.entries(row)
    .filter(([k]) => k !== "links" && k !== "id" && k !== "table")
    .map(([, v]) => (typeof v === "object" ? JSON.stringify(v) : String(v ?? "")))
    .join(" ")
    .toLowerCase();

/** ЗАПИСИ основной базы по словам. Пустой запрос — вернуть последние (это законный способ «покажи всё»). */
export async function readDatabase(query = "", limit = 20): Promise<ReadResult<Row>> {
  const rows = await listRows("database", Infinity);
  const q = query.trim().toLowerCase();
  const hit = q ? rows.filter((r) => haystack(r).includes(q)) : rows;
  return found(hit.slice(0, limit));
}

/** ОБЪЕКТЫ хранилища по имени/виду. Байты не отдаём — их берут по `fileKey` через `readStoredObject`. */
export async function readStorage(query = "", limit = 20): Promise<ReadResult<Row>> {
  const rows = await listRows("storage", Infinity);
  const q = query.trim().toLowerCase();
  const hit = q ? rows.filter((r) => haystack(r).includes(q)) : rows;
  return found(hit.slice(0, limit));
}

/** Байты объекта по ключу. `null` — объекта нет (удалён или ключ чужой). */
export async function readStoredObject(fileKey: string): Promise<{ bytes: Buffer; contentType: string } | null> {
  const key = String(fileKey ?? "").trim();
  return key ? readObject(key) : null;
}

/**
 * СМЫСЛ из векторной памяти. Единственный примитив, отвечающий ТЕКСТОМ, а не строками: LightRAG
 * синтезирует ответ. Три исхода зеркалят запись — сервиса нет (`unreachable`), ответ пуст (`empty`),
 * ответ есть (`found`). Отказ сервиса `recallFacts` бросает сам: память есть, но вопрос не принят.
 */
export async function readVectorMemory(question: string): Promise<ReadResult<string>> {
  const answer = await recallFacts(question);
  if (answer === null) return { outcome: "unreachable", rows: [], reason: "the vector-memory service is unreachable on this server" };
  const text = answer.trim();
  return text ? { outcome: "found", rows: [text] } : { outcome: "empty", rows: [] };
}

/** Расстояние по большому кругу, км — чтобы «рядом» означало место, а не совпадение строк. */
function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(bLat - aLat);
  const dLng = rad(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** МЕТКИ карты: рядом с точкой (км) или все. Строка без координат в выдачу не попадает — точки у неё нет. */
export async function readMap(near?: { lat: number; lng: number; radiusKm?: number }, limit = 50): Promise<ReadResult<Row>> {
  const rows = (await listRows("map", Infinity)).filter((r) => Number.isFinite(Number(r.lat)) && Number.isFinite(Number(r.lng)));
  if (!near) return found(rows.slice(0, limit));
  const radius = near.radiusKm ?? 50;
  const hit = rows.filter((r) => distanceKm(near.lat, near.lng, Number(r.lat), Number(r.lng)) <= radius);
  return found(hit.slice(0, limit));
}

/** СОБЫТИЯ календаря в диапазоне дат (`YYYY-MM-DD`, границы включаются). Без границ — все. */
export async function readCalendar(range?: { from?: string; to?: string }, limit = 100): Promise<ReadResult<Row>> {
  const rows = await listRows("calendar", Infinity);
  const from = range?.from?.trim();
  const to = range?.to?.trim();
  const hit = rows.filter((r) => {
    const d = String(r.date ?? "").slice(0, 10);
    if (!d) return false;
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  });
  return found(hit.slice(0, limit));
}

/**
 * ЧТО ЛЕЖИТ ВОКРУГ ЭТОЙ СТРОКИ — обход графа связей на один шаг. Это то, ради чего связи и ставятся:
 * нашёл предмет по ЛЮБОЙ грани — достаёшь остальные четыре.
 */
export async function readLinked(row: Row): Promise<ReadResult<Row>> {
  const links = Array.isArray(row.links) ? (row.links as { table: string; id: string }[]) : [];
  const out: Row[] = [];
  for (const l of links) {
    if (!l?.table || !l?.id) continue;
    const neighbour = (await listRows(l.table, Infinity)).find((r) => r.id === l.id);
    if (neighbour) out.push(neighbour);
  }
  return found(out);
}
