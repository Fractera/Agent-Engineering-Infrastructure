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
  dupAsk: (l: Lang, m: string) =>
    l === "ru"
      ? `🤔 Похоже, это уже записано: ${m}. Записать ещё раз или пропустить? (да / нет)`
      : `🤔 This looks already recorded: ${m}. Record it again or skip? (yes / no)`,
  dupWritten: (l: Lang) => (l === "ru" ? "✅ Записал ещё раз." : "✅ Recorded again."),
  dupSkipped: (l: Lang) => (l === "ru" ? "👍 Пропустил — не стал дублировать." : "👍 Skipped — no duplicate created."),
  dimAdded: (l: Lang, label: string, values: string) =>
    l === "ru" ? `✅ Теперь развожу траты по «${label}»: ${values}. Буду уточнять у каждой траты.` : `✅ Now splitting expenses by "${label}": ${values}. I'll ask for each spend.`,
  dimAsk: (l: Lang, q: string) => q || (l === "ru" ? "К чему отнести эту трату?" : "Which one is this spend?"),
  dimWritten: (l: Lang) => (l === "ru" ? "✅ Записал с пометкой." : "✅ Recorded with the tag."),
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

  // ДУБ-КОНТРОЛЬ (310) — ТЕРМИНАЛЬНЫЕ исходы: запись придержана `dedupeGuard`, поэтому НЕ собираем строки
  // finance/save (иначе отчитались бы «записал» о том, что не записали). Отвечаем только про дубль.
  if (ctx.duplicateAsk && typeof ctx.duplicateAsk === "object") {
    const m = String((ctx.duplicateAsk as { match?: string }).match ?? "");
    return { reply: T.dupAsk(L, m) };
  }
  if (ctx.duplicateResolved === "written") return { reply: T.dupWritten(L) };
  if (ctx.duplicateResolved === "skipped") return { reply: T.dupSkipped(L) };

  // ИЗМЕРЕНИЯ (310) — тоже терминальные: вопрос об измерении / его запись отвечаются одной строкой.
  if (ctx.dimensionAsk && typeof ctx.dimensionAsk === "object") {
    return { reply: T.dimAsk(L, String((ctx.dimensionAsk as { question?: string }).question ?? "")) };
  }
  if (ctx.dimensionResolved === "written") return { reply: T.dimWritten(L) };
  if (ctx.dimensionAdded && typeof ctx.dimensionAdded === "object") {
    const d = ctx.dimensionAdded as { label?: string; values?: string[] };
    return { reply: T.dimAdded(L, String(d.label ?? ""), (Array.isArray(d.values) ? d.values : []).join(" / ")) };
  }

  // КЛАСС ЗАПРОСА — из фронта (шаг 311.6). Старая система `ctx.intent` (мульти-флаг доменного словаря
  // от удалённого `classifyIntent`) снесена целиком: две системы классификации с почти одинаковыми
  // именами в одной папке — гарантированная путаница. Пусто (прогон без фронта) → отвечаем как раньше.
  const cls = String(ctx.intentClass ?? "").trim();
  const has = (c: string) => !cls || cls === c;
  const lines: string[] = [];

  // запись — середина оставила краткую сводку в `noteSummary`.
  if (has("record-given") && ctx.noteSummary) lines.push(T.save(L, String(ctx.noteSummary)));

  // finance — digitizeMoney оставил структурную запись в `finance`.
  if (ctx.finance && typeof ctx.finance === "object") {
    const f = ctx.finance as { kind?: string; amount?: number | null; categories?: string[]; summary?: string };
    const amt = f.amount != null ? String(f.amount) : "?";
    const cat = (Array.isArray(f.categories) ? f.categories : []).join(", ") || "—";
    lines.push((f.kind === "income" ? T.income : T.expense)(L, amt, cat, String(f.summary ?? "")));
  }

  // момент — середина оставила `when` (разобрала) или `needsWhen` (нужен, но не разобран).
  if (ctx.needsWhen === true) lines.push(T.remindWhen(L));
  else if (ctx.when) lines.push(T.remind(L, fmtWhen(String(ctx.when)), String(ctx.remindText ?? "")));

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

  // чтение своего — середина оставила найденный ответ в `recallAnswer`.
  if (has("read-own") && ctx.recallAnswer) lines.push(T.recall(L, String(ctx.recallAnswer)));

  // Ничего не собрали (непонятое сообщение) → мягкий отказ + список возможностей.
  if (!lines.length) return { reply: T.unknown(L) + CAPABILITIES[L] };

  return { reply: lines.join("\n\n") };
}
