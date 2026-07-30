// ФУНКЦИЯ УЗЛА «LOGIC» (transform) — ЕДИНЫЙ КОМПОЗИТОР ОТВЕТА (шаг 308, разговорный контракт).
// Авторитетный источник формата — `_instructions/replies.md`; этот узел его РЕАЛИЗУЕТ (закон 2: доктрина
// в доке, исполнение здесь). Раньше пользователю уходил СЫРОЙ `ctx.text` того узла, что сработал последним
// — обрывок без представления и оформления. Теперь ОДИН узел читает СТРУКТУРНЫЙ результат прогона (что
// каждая ветка сделала) и собирает ОДИН связный, оформленный, локализованный ответ; составное сообщение →
// один ответ обо всём. `deliverUserTelegramChat` шлёт `ctx.reply`, а не текст узлов.
// Ничего не гейтится по намерению — узел работает всегда и кладёт `ctx.reply`.
// Имя `composeReply` — публичный контракт, не переименовывать.
import type { NodeCtx } from "../executor";

type Lang = "ru" | "en";
const pickLang = (ctx: NodeCtx): Lang => {
  const l = String(ctx.lang ?? process.env.NEXT_PUBLIC_DEFAULT_LOCALE ?? "en").toLowerCase().slice(0, 2);
  return l === "ru" ? "ru" : "en";
};

// ПРЕДСТАВЛЕНИЕ И ВОЗМОЖНОСТИ (C) — на /start, «что ты умеешь» и на непонятое сообщение.
const CAPABILITIES: Record<Lang, string> = {
  ru:
    "👋 Я — ассистент заметок в Telegram. Вот что я умею:\n\n" +
    "📝 Запомнить — просто напиши факт («купил лампочки для кухни»)\n" +
    "⏰ Напомнить — «напомни завтра в 15:00 позвонить маме»\n" +
    "🔎 Найти — «что я сохранял про лампочки»\n" +
    "💰 Учесть трату — пришли фото чека или «потратил 500 руб на такси»\n" +
    "📍 Отметить место — пришли точку (скрепка → Геопозиция) и напиши, что там\n\n" +
    "Можно всё в одном сообщении — я разберу.",
  en:
    "👋 I'm your Telegram notes assistant. Here's what I can do:\n\n" +
    "📝 Remember — just write a fact (\"bought kitchen light bulbs\")\n" +
    "⏰ Remind — \"remind me tomorrow at 3pm to call mom\"\n" +
    "🔎 Recall — \"what did I save about light bulbs\"\n" +
    "💰 Track spending — send a receipt photo or \"spent 5€ on a taxi\"\n" +
    "📍 Mark a place — share a location (paperclip → Location) and say what's there\n\n" +
    "You can do it all in one message — I'll sort it out.",
};

const T = {
  save: (l: Lang, s: string) => (l === "ru" ? `✅ Записал: ${s}` : `✅ Saved: ${s}`),
  expense: (l: Lang, amt: string, cat: string, s: string) =>
    l === "ru" ? `💰 Расход ${amt} (${cat}): ${s}` : `💰 Expense ${amt} (${cat}): ${s}`,
  income: (l: Lang, amt: string, cat: string, s: string) =>
    l === "ru" ? `💰 Доход ${amt} (${cat}): ${s}` : `💰 Income ${amt} (${cat}): ${s}`,
  remind: (l: Lang, when: string, what: string) =>
    l === "ru" ? `⏰ Напомню ${when}: ${what}` : `⏰ I'll remind you on ${when}: ${what}`,
  remindWhen: (l: Lang) =>
    l === "ru" ? "⏰ Когда напомнить? Ответь датой или временем." : "⏰ When should I remind you? Reply with a date or time.",
  recall: (l: Lang, a: string) => (l === "ru" ? `🔎 ${a}` : `🔎 ${a}`),
  glossary: (l: Lang, term: string, meaning: string) =>
    l === "ru" ? `✅ Запомнил: ${term} = ${meaning}` : `✅ Got it: ${term} = ${meaning}`,
  placeSaved: (l: Lang, d: string) => (l === "ru" ? `📍 Место записано: ${d}` : `📍 Place saved: ${d}`),
  unknown: (l: Lang) => (l === "ru" ? "🤔 Не понял сообщение.\n\n" : "🤔 I didn't understand.\n\n"),
};

/** Человекочитаемое время из ISO `when` (без секунд); мусор → как есть. */
function fmtWhen(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return iso;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function composeReply(ctx: NodeCtx): NodeCtx {
  const L = pickLang(ctx);

  // C: представление возможностей — /start, «что ты умеешь».
  if (ctx.showHelp === true) return { reply: CAPABILITIES[L] };

  const intents = Array.isArray(ctx.intent) ? (ctx.intent as unknown[]).map(String) : [];
  const has = (i: string) => intents.length === 0 || intents.includes(i);
  const lines: string[] = [];

  // save — узел aiTransform оставил краткую сводку в `noteSummary`.
  if (has("save") && ctx.noteSummary) lines.push(T.save(L, String(ctx.noteSummary)));

  // finance — digitizeMoney оставил структурную запись в `finance`.
  if (ctx.finance && typeof ctx.finance === "object") {
    const f = ctx.finance as { kind?: string; amount?: number | null; categories?: string[]; summary?: string };
    const amt = f.amount != null ? String(f.amount) : "?";
    const cat = (Array.isArray(f.categories) ? f.categories : []).join(", ") || "—";
    lines.push((f.kind === "income" ? T.income : T.expense)(L, amt, cat, String(f.summary ?? "")));
  }

  // remind — parseDate оставил `when`/`needsWhen`, текст напоминания — в `remindText`.
  if (has("remind")) {
    if (ctx.needsWhen === true) lines.push(T.remindWhen(L));
    else if (ctx.when) lines.push(T.remind(L, fmtWhen(String(ctx.when)), String(ctx.remindText ?? "")));
  }

  // place — askAddress оставил структурный исход в `placeOutcome`.
  if (ctx.placeOutcome && typeof ctx.placeOutcome === "object") {
    const p = ctx.placeOutcome as { kind?: string; desc?: string; ask?: string };
    if (p.kind === "saved") lines.push(T.placeSaved(L, String(p.desc ?? "")));
    else if (p.ask) lines.push(String(p.ask)); // «точку записал, что здесь?» / «пришли точку» — уже локализовано askAddress
  }

  // glossary — defineGlossary записал алиас и оставил `glossaryAdded` (term/meaning).
  if (ctx.glossaryAdded && typeof ctx.glossaryAdded === "object") {
    const g = ctx.glossaryAdded as { term?: string; meaning?: string };
    if (g.term && g.meaning) lines.push(T.glossary(L, String(g.term), String(g.meaning)));
  }

  // recall — recallFromMemory оставил ответ в `recallAnswer`.
  if (has("recall") && ctx.recallAnswer) lines.push(T.recall(L, String(ctx.recallAnswer)));

  // Ничего не собрали (непонятое сообщение) → мягкий отказ + список возможностей.
  if (!lines.length) return { reply: T.unknown(L) + CAPABILITIES[L] };

  return { reply: lines.join("\n\n") };
}
