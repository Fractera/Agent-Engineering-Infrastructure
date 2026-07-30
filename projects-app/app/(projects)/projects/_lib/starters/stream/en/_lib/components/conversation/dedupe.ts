// КОНТРОЛЬ ДУБЛЕЙ (шаг 310, требование владельца) — детерминированное обнаружение вероятной повторной
// записи ДО того, как она попадёт в таблицу. Сценарий владельца: «Дима отдал 10€» утром → вечером теми же
// или другими словами «кстати Дима сегодня 10€ отдал» → без контроля пишется вторая строка. Так же с фото
// чека: повторно сфотографировал забытый чек → второй раз в таблицу. Здесь — только ОБНАРУЖЕНИЕ (порог
// строгий: сомнение → лучше спросить, чем молча слить или задвоить); РЕШЕНИЕ («записать второй раз?»)
// принимает владелец через hold-and-confirm в узле `dedupe-guard`.
//
// Почему детерминированно, а не моделью: дубль — это факт о данных (та же сумма + тот же контрагент в окне
// времени), а не суждение; закон «работает без ИИ» держит середину-данные на своём коде.

type Row = Record<string, unknown> & { id: string; createdAt?: unknown; date?: unknown };

/** Нормализация текста для сравнения: нижний регистр, схлопнуть пробелы, убрать пунктуацию/эмодзи. */
export function normalizeText(s: unknown): string {
  return String(s ?? "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Значимые токены (длиннее 2 символов) для оценки пересечения смысла. */
function tokens(s: string): Set<string> {
  return new Set(normalizeText(s).split(" ").filter((w) => w.length > 2));
}

/** Доля пересечения токенов (Jaccard) — грубая мера «про то же самое». */
function overlap(a: string, b: string): number {
  const A = tokens(a), B = tokens(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  return inter / new Set([...A, ...B]).size;
}

/** Время строки (createdAt приоритетно, иначе date) в мс; NaN → 0. */
function rowTime(r: Row): number {
  const t = new Date(String(r.createdAt ?? r.date ?? "")).getTime();
  return Number.isFinite(t) ? t : 0;
}

const DAY = 24 * 60 * 60 * 1000;

/**
 * Похожая ФИНАНС-строка в окне (по умолчанию 3 дня). Дубль = та же сумма (+валюта, если обе заданы) И тот
 * же контрагент/магазин/суть (нормализованное совпадение store, либо сильное пересечение summary/name).
 * Фото-чек попадает сюда же: тот же store+amount в один день — тот же чек.
 */
export function financeDuplicate(
  candidate: Record<string, unknown>,
  existing: Row[],
  opts: { windowDays?: number; nowMs?: number } = {},
): Row | null {
  const amt = candidate.amount;
  if (amt == null || !Number.isFinite(Number(amt))) return null; // без суммы дубль не судим
  const now = opts.nowMs ?? Date.now();
  const win = (opts.windowDays ?? 3) * DAY;
  const cStore = normalizeText(candidate.store);
  const cText = `${candidate.store ?? ""} ${candidate.summary ?? candidate.name ?? ""}`;

  for (const r of existing) {
    if (Number(r.amount) !== Number(amt)) continue;
    // валюты сравниваем только если обе заданы (частая пустая валюта не должна мешать совпадению)
    const cc = normalizeText(candidate.currency), rc = normalizeText(r.currency);
    if (cc && rc && cc !== rc) continue;
    if (now - rowTime(r) > win) continue;
    const rStore = normalizeText(r.store);
    const sameStore = cStore && rStore && cStore === rStore;
    const rText = `${r.store ?? ""} ${r.summary ?? r.name ?? ""}`;
    const closeText = overlap(cText, rText) >= 0.5;
    if (sameStore || closeText) return r;
  }
  return null;
}

/** Похожая ЗАМЕТКА в окне: почти совпадающий нормализованный текст (сильное пересечение токенов). */
export function noteDuplicate(
  text: string,
  existing: Row[],
  opts: { windowDays?: number; nowMs?: number } = {},
): Row | null {
  const t = normalizeText(text);
  if (t.split(" ").filter((w) => w.length > 2).length < 2) return null; // слишком коротко, чтобы судить
  const now = opts.nowMs ?? Date.now();
  const win = (opts.windowDays ?? 3) * DAY;
  for (const r of existing) {
    if (now - rowTime(r) > win) continue;
    const rt = `${r.name ?? ""} ${r.text ?? ""}`;
    if (normalizeText(rt) === t || overlap(text, rt) >= 0.7) return r;
  }
  return null;
}

// ЯВНОЕ ДА/НЕТ на вопрос «записать второй раз?» — многоязычно, детерминированно. БЕЗ `\b`: словарные
// границы regex определены по ASCII `\w`, поэтому `\bда` НЕ матчится на кириллице (грабли шага 309 — тот же
// класс). Работаем по нормализованным ТОКЕНАМ (слова) + ФРАЗАМ (подстроки). Неоднозначный ответ → "unclear"
// (узел тогда не пишет придержанное молча: безопасный дефолт — не задвоить без явного согласия владельца).
const YES_WORDS = new Set(["да", "ага", "угу", "давай", "запиши", "запишите", "конечно", "yes", "yep", "yeah", "sure", "again", "si", "sí", "oui", "ja", "record", "write"]);
const NO_WORDS = new Set(["нет", "пропусти", "пропустить", "отмена", "no", "nope", "skip", "cancel", "non", "nein", "dont"]);
const YES_PHRASES = ["второй раз", "ещё раз", "еще раз", "record it", "write it", "do it", "second time"];
const NO_PHRASES = ["не надо", "не нужно", "не пиши", "do not"];
export function readYesNo(text: string): "yes" | "no" | "unclear" {
  const norm = normalizeText(text);
  const toks = new Set(norm.split(" "));
  const has = (words: Set<string>) => [...words].some((w) => toks.has(w));
  const phrase = (arr: string[]) => arr.some((p) => norm.includes(normalizeText(p)));
  const yes = has(YES_WORDS) || phrase(YES_PHRASES);
  const no = has(NO_WORDS) || phrase(NO_PHRASES);
  if (yes && !no) return "yes";
  if (no && !yes) return "no";
  return "unclear";
}
