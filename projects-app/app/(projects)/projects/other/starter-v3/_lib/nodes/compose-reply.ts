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
// 🔒 ВТОРОЙ ДОМ ТОГО ЖЕ ФАКТА — держать в согласии с `DEFAULT_INSTRUCTION` (conversation/config.ts).
// Перечень зашит вручную и потому гниёт; вывод из ядра — обязанность слоя `evolution` (шаг 314 §4а).
// До 314: чего нет в списке — того нет в сборке. Обещать сверх ядра запрещено.
const CAPABILITIES: Record<Lang, string> = {
  ru:
    "👋 Я — ассистент замороженного тестового шаблона: своего назначения у меня пока нет, его задаёт владелец.\n\n" +
    "📨 Принять — пришлите сообщение через любой открытый вход: эту панель, HTTP-вебхук, запуск по расписанию, публичную страницу, Telegram, почту\n" +
    "📤 Развезти — доставлю его как есть во все открытые выходные каналы\n\n" +
    "Это вся сборка. Заметок, напоминаний, трат, карты и поиска здесь пока нет — их добавляет владелец в кокпите.",
  en:
    "👋 I'm the assistant of a frozen test template — my purpose isn't set yet, the owner gives it to me.\n\n" +
    "📨 Capture — send a message through any open input: this panel, an HTTP webhook, a scheduled tick, the public page, Telegram, email\n" +
    "📤 Fan-out — I deliver it, as it is, to every open output channel\n\n" +
    "That's the whole of this build. Notes, reminders, money, maps and search are not built yet — the owner adds them in the cockpit.",
};

// 🔒 ТОЛЬКО ФОРМА, НИ ОДНОГО ДОМЕНА (шаг 311.11). Прежде здесь жили строки про траты, чеки, категории,
// глоссарий, места и дубли — ответы узлов, которых в этой автоматизации давно нет. Реплика допустима
// только про то, что реально делает сборка: записали · назначили момент · ответили из своего.
const T = {
  save: (l: Lang, s: string) => (l === "ru" ? `✅ Записал: ${s}` : `✅ Saved: ${s}`),
  remind: (l: Lang, when: string, what: string) =>
    l === "ru" ? `⏰ Напомню ${when}: ${what}` : `⏰ I'll remind you on ${when}: ${what}`,
  remindWhen: (l: Lang) =>
    l === "ru" ? "⏰ Когда напомнить? Ответь датой или временем." : "⏰ When should I remind you? Reply with a date or time.",
  recall: (l: Lang, a: string) => (l === "ru" ? `🔎 ${a}` : `🔎 ${a}`),
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

  // 🔒 ФРОНТ УЖЕ ОТВЕТИЛ (шаг 311.6). Классы, которым середина не нужна (самоописание, отказ,
  // вежливость, уточняющий вопрос, неопознанное), собирают ответ САМИ и кладут его в `ctx.reply`.
  // Тогда здесь нечего сочинять: перезаписать чужой ответ — значит вернуть тот самый дефект v2, где
  // речь жила вне графа и доставка подменяла то, что решил маршрут.
  const fromFront = String(ctx.reply ?? "").trim();
  if (fromFront) return { reply: fromFront };

  // C: представление возможностей — /start, «что ты умеешь».
  if (ctx.showHelp === true) return { reply: CAPABILITIES[L] };

  // КЛАСС ЗАПРОСА — из фронта (шаг 311.6). Старая система `ctx.intent` (мульти-флаг доменного словаря
  // от удалённого `classifyIntent`) снесена целиком: две системы классификации с почти одинаковыми
  // именами в одной папке — гарантированная путаница. Пусто (прогон без фронта) → отвечаем как раньше.
  const cls = String(ctx.intentClass ?? "").trim();
  const has = (c: string) => !cls || cls === c;
  const lines: string[] = [];

  // запись — середина оставила краткую сводку в `noteSummary`.
  if (has("record-given") && ctx.noteSummary) lines.push(T.save(L, String(ctx.noteSummary)));

  // момент — середина оставила `when` (разобрала) или `needsWhen` (нужен, но не разобран).
  if (ctx.needsWhen === true) lines.push(T.remindWhen(L));
  else if (ctx.when) lines.push(T.remind(L, fmtWhen(String(ctx.when)), String(ctx.remindText ?? "")));

  // чтение своего — середина оставила найденный ответ в `recallAnswer`.
  if (has("read-own") && ctx.recallAnswer) lines.push(T.recall(L, String(ctx.recallAnswer)));

  // Ничего не собрали (непонятое сообщение) → мягкий отказ + список возможностей.
  if (!lines.length) return { reply: T.unknown(L) + CAPABILITIES[L] };

  return { reply: lines.join("\n\n") };
}
