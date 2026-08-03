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
// 🔒 ПЕРЕЧЕНЬ ВОЗМОЖНОСТЕЙ БОЛЬШЕ НЕ ЖИВЁТ ЗДЕСЬ (шаг 312.4). Он выводится из ЯДРА (`abilitiesOf`) и
// приезжает сюда готовым в `ctx.abilitiesInputs/Outputs/Steps`: узел речи собирает его на каждом прогоне,
// поэтому список не может разойтись со сборкой. Тексты ниже остались ТОЛЬКО как оболочка на язык —
// заголовок и подпись; сами умения в них больше не перечисляются.
const capabilities = (l: Lang, ctx: NodeCtx): string => {
  const list = (v: unknown) => (Array.isArray(v) ? v.map(String).filter(Boolean) : []);
  const inputs = list(ctx.abilitiesInputs);
  const outputs = list(ctx.abilitiesOutputs);
  const steps = list(ctx.abilitiesSteps);
  // Ядро не доехало (прямой вызов мимо речи) — честная строка без выдуманного списка.
  if (!inputs.length && !outputs.length && !steps.length) return SHELL[l].unknownBuild;
  const s = SHELL[l];
  return [
    s.head,
    `${s.inputs}: ${inputs.join(", ") || s.none}`,
    `${s.outputs}: ${outputs.join(", ") || s.none}`,
    steps.length ? `${s.steps}: ${steps.join(" · ")}` : s.noSteps,
    s.tail,
  ].join("\n");
};

const SHELL: Record<Lang, { head: string; inputs: string; outputs: string; steps: string; noSteps: string; none: string; tail: string; unknownBuild: string }> = {
  ru: {
    head: "👋 Вот что умеет эта сборка прямо сейчас:",
    inputs: "📨 Принимаю через",
    outputs: "📤 Доставляю в",
    steps: "⚙️ Делаю с данными",
    noSteps: "⚙️ С данными ничего не делаю — передаю как есть",
    none: "пока ничего",
    tail: "Чего нет в этом списке — того в сборке нет; добавляет владелец в кокпите.",
    unknownBuild: "👋 Я ассистент этой автоматизации. Состав сборки сейчас не читается — спросите ещё раз чуть позже.",
  },
  en: {
    head: "👋 Here is what this build can do right now:",
    inputs: "📨 I take messages through",
    outputs: "📤 I deliver to",
    steps: "⚙️ What I do with the data",
    noSteps: "⚙️ I do nothing to the data — I pass it through as it is",
    none: "nothing yet",
    tail: "Anything not on this list is not built — the owner adds it in the cockpit.",
    unknownBuild: "👋 I'm the assistant of this automation. Its build cannot be read right now — ask again in a moment.",
  },
};

/** Короткие честные фразы на род ответа — когда модели нет. Ни одного домена, ни одного обещания. */
const ACT: Record<string, Record<Lang, string>> = {
  refuse: {
    ru: "🔒 Это секрет сервера — его я не выдаю в переписке никому.",
    en: "🔒 That is a server secret — I don't hand it out in chat, to anyone.",
  },
  greet: {
    ru: "👋 Здравствуйте! Скажите, что нужно сделать.",
    en: "👋 Hello! Tell me what you need.",
  },
  "describe-self": {
    ru: "Я ассистент этой автоматизации.",
    en: "I'm the assistant of this automation.",
  },
  ask: {
    ru: "❓ Что именно записать? Пришлите это одним сообщением.",
    en: "❓ What exactly should I take down? Send it in one message.",
  },
  "not-understood": {
    ru: "🤔 Не понял, что это за запрос, и не буду гадать.",
    en: "🤔 I couldn't tell what kind of request this is, and I won't guess.",
  },
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

  // 🔒 РОД ОТВЕТА ОТ ФРОНТА (шаг 312.5) — детерминированная половина того же контракта, что у речи. Классы
  // больше не сочиняют прозу сами; когда модели нет, короткую честную фразу на язык чата даёт этот набор.
  const act = String(ctx.speechAct ?? "").trim();
  if (act && ACT[act]) return { reply: ACT[act][L] };

  // C: представление возможностей — /start, «что ты умеешь».
  if (ctx.showHelp === true) return { reply: capabilities(L, ctx) };

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
  if (!lines.length) return { reply: T.unknown(L) + capabilities(L, ctx) };

  return { reply: lines.join("\n\n") };
}
