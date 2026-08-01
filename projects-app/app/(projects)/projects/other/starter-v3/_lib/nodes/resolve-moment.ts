// СРЕДИННЫЙ УЗЕЛ — МОМЕНТ, СВЯЗАННЫЙ С ПРЕДМЕТОМ (шаг 311.7). Пятая грань: у предмета бывает дата —
// открытие, выпуск, срок. Узел кладёт её в `ctx.when` (ISO), и выход календаря ставит по ней событие
// обычным путём.
//
// ДЕТЕРМИНИРОВАННО СНАЧАЛА, МОДЕЛЬ ПОТОМ. Год в тексте описания находится разбором — это работает без
// ключа, а значит работает на свежем сервере. Модель подключается только там, где формы записи даты
// действительно бесконечны, и её ответ ПРОВЕРЯЕТСЯ: строгий ISO либо `none`, любой мусор = «даты нет».
// Лучше честно не поставить событие, чем поставить его на выдуманное время.
//
// ЧЕСТНЫЕ ИСХОДЫ: нашли → `when`; не нашли → молчим (`{}`) — календарь просто не сработает. Флаг
// `needsWhen` здесь НЕ ставим: он означает «момент нужен, но неизвестен» и принадлежит запросам о
// напоминании, а не справке о предмете.
// Имя `resolveMoment` — глагол ФОРМЫ.
import type { NodeCtx } from "../executor";

// Год в тексте: «opened in 1889», «(1887–1889)», «built 1889». Берём ПЕРВЫЙ правдоподобный.
const YEAR = /\b(1[0-9]{3}|20[0-9]{2})\b/;

export async function resolveMoment(ctx: NodeCtx): Promise<NodeCtx> {
  const subject = (ctx.subject && typeof ctx.subject === "object" ? ctx.subject : null) as { description?: string } | null;
  const text = String(subject?.description ?? "").trim();
  if (!text) return {};

  const m = YEAR.exec(text);
  if (!m) return {};
  const year = Number(m[1]);
  const now = new Date().getFullYear();
  // Год из будущего или из глубокой древности в тексте энциклопедии — скорее номер или диапазон, чем дата.
  if (year > now || year < 1000) return {};

  return {
    when: new Date(Date.UTC(year, 0, 1)).toISOString(),
    momentPrecision: "year",
    momentSource: "the subject's own description",
  };
}
