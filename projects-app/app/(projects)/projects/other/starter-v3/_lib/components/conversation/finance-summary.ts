// ПРИБЛИЗИТЕЛЬНАЯ ФИНАНСОВАЯ СВОДКА (шаг 310, требование владельца) — детерминированная сумма по ПРИЗНАКУ
// и ПЕРИОДУ: «сколько потратил на вишню в этом месяце» → сумма позиций «вишня» за месяц. Считаем САМИ
// (не «на глаз» моделью): число должно быть верным, поэтому модель памяти получает УЖЕ ПОСЧИТАННЫЙ факт.
// Это НЕ бухгалтерия (владелец: строгий учёт автоматизация не ведёт) — грубая ориентировка, помечается
// «приблизительно». Закон «работает без ИИ»: сумма — арифметика над данными, не суждение.
import { normalizeText } from "./dedupe";

type FinRow = Record<string, unknown> & { amount?: unknown; currency?: unknown; store?: unknown; summary?: unknown; name?: unknown; categories?: unknown; items?: unknown; createdAt?: unknown; date?: unknown };

const DAY = 86400000;

/** Признак вопроса-сводки: «сколько … на/за …» + денежный глагол. */
export function isAggregateQuestion(q: string): boolean {
  const t = normalizeText(q);
  return /(сколько|how much|cuanto|combien|quanto)/.test(t) && /(потрат|трат|расход|spent|spend|потратил|купил|gasto|depense|speso)/.test(t);
}

// Служебные слова вопроса — НЕ признак поиска (иначе «потратил» матчил бы всё). Оставляем содержательные.
const STOP = new Set([
  "сколько", "потратил", "потратила", "потрат", "трат", "траты", "расход", "расходы", "деньги", "денег",
  "этом", "этот", "месяц", "месяце", "месяца", "неделю", "неделе", "неделя", "год", "году", "года", "сегодня",
  "вчера", "все", "всего", "было", "на", "за", "в", "и", "по", "уже", "мы", "я", "how", "much", "did", "spend",
  "spent", "this", "month", "week", "year", "today", "the", "on", "for", "all", "total",
]);

/** Период из вопроса → {from, to} мс. Месяц/неделя/год/сегодня; по умолчанию — всё время (from=0). */
function periodOf(q: string, now: number): { from: number; label: string } {
  const t = normalizeText(q);
  if (/(месяц|month|mes|mois|mese)/.test(t)) return { from: startOfMonth(now), label: "this month" };
  if (/(недел|week|semana|semaine|settimana)/.test(t)) return { from: now - 7 * DAY, label: "this week" };
  if (/(сегодня|today|hoy|aujourd|oggi)/.test(t)) return { from: startOfDay(now), label: "today" };
  if (/(год|year|ano|annee|anno)/.test(t)) return { from: startOfYear(now), label: "this year" };
  return { from: 0, label: "all time" };
}
function startOfDay(n: number) { const d = new Date(n); d.setHours(0, 0, 0, 0); return d.getTime(); }
function startOfMonth(n: number) { const d = new Date(n); return new Date(d.getFullYear(), d.getMonth(), 1).getTime(); }
function startOfYear(n: number) { const d = new Date(n); return new Date(d.getFullYear(), 0, 1).getTime(); }

/** Содержательные токены запроса (стем 4 символа для длинных — «вишню»/«вишня» → «вишн»). */
function subjectStems(q: string): string[] {
  return normalizeText(q).split(" ")
    .filter((w) => w.length > 2 && !STOP.has(w))
    .map((w) => (w.length >= 4 ? w.slice(0, 4) : w));
}
function matches(text: unknown, stems: string[]): boolean {
  const t = normalizeText(text);
  return stems.some((s) => t.includes(s));
}
function rowTime(r: FinRow): number { const t = new Date(String(r.createdAt ?? r.date ?? "")).getTime(); return Number.isFinite(t) ? t : 0; }
function num(v: unknown): number { const n = Number(v); return Number.isFinite(n) ? n : 0; }

export type Aggregate = { total: number; currency: string; count: number; period: string; subject: string };

/**
 * Посчитать приблизительную сумму по признаку+периоду. Уровень позиции (товар в чеке) приоритетен: если
 * признак совпал с названием позиции — суммируем цену позиций; иначе, если совпал с магазином/категорией/
 * сутью строки — суммируем сумму строки. Ничего не совпало → null (нет данных — модель ответит честно).
 */
export function financeAggregate(question: string, rows: FinRow[], opts: { nowMs?: number } = {}): Aggregate | null {
  const stems = subjectStems(question);
  if (!stems.length) return null;
  const now = opts.nowMs ?? Date.now();
  const { from, label } = periodOf(question, now);

  let total = 0, count = 0, currency = "";
  for (const r of rows) {
    if (rowTime(r) < from) continue;
    let hit = false;
    const items = Array.isArray(r.items) ? (r.items as { name?: unknown; price?: unknown; qty?: unknown }[]) : [];
    for (const it of items) {
      if (matches(it.name, stems)) { total += num(it.price) * Math.max(1, num(it.qty) || 1); count++; hit = true; currency = currency || String(r.currency ?? ""); }
    }
    if (!hit) {
      const bag = `${r.store ?? ""} ${r.summary ?? r.name ?? ""} ${Array.isArray(r.categories) ? (r.categories as unknown[]).join(" ") : ""}`;
      if (matches(bag, stems)) { total += num(r.amount); count++; currency = currency || String(r.currency ?? ""); }
    }
  }
  if (!count) return null;
  return { total: Math.round(total * 100) / 100, currency, count, period: label, subject: stems.join(" ") };
}
