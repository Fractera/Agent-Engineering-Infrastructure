// ФУНКЦИЯ УЗЛА «LOGIC» (transform, role=conversation) — РАЗГОВОРНАЯ ГРАНИЦА (шаг 309, решение владельца).
// Отдельный ВИД работы: не счёт над данными (это делают transform-ы вроде parseDate/digitizeMoney по
// закону «без ИИ»), а КОМФОРТНЫЙ ДИАЛОГ с человеком — по природе задача МОДЕЛИ. Узел собирает ОДИН
// ответ пользователю (`ctx.reply`), думая моделью по СЦЕНАРИЮ ПОВЕДЕНИЯ (вкладка «Ассистент») с ПАМЯТЬЮ
// диалога (буфер) и примерами (Q&A). Модели/ключа нет → детерминированный ФОЛБЭК `composeReply` (уже
// доказан). Роль `conversation` (аддитив схемы) делает его первоклассным и НЕОТВРАТИМЫМ в шаблоне —
// строитель не может «забыть», как автоматизация разговаривает.
// Имя `converse` — публичный контракт, не переименовывать.
import type { NodeCtx } from "../executor";
import { askModel } from "../ai";
import { readCore } from "../core-io";
import { assistantConfigOf } from "../components/conversation/config";
import { loadChat, pushMessage } from "../components/conversation/state";
import { composeReply } from "./compose-reply";

/** Компактный «что сделал прогон» для модели — из структурного результата веток. */
function runSummary(ctx: NodeCtx): string {
  const bits: string[] = [];
  if (ctx.noteSummary) bits.push(`saved a note: ${ctx.noteSummary}`);
  const f = ctx.finance as { kind?: string; amount?: number | null; categories?: string[]; summary?: string } | undefined;
  if (f && typeof f === "object") bits.push(`recorded a ${f.kind ?? "expense"} of ${f.amount ?? "?"} (${(f.categories ?? []).join(", ")}): ${f.summary ?? ""}`);
  if (ctx.needsWhen === true) bits.push("a reminder was requested but no date was given — ask when");
  else if (ctx.when) bits.push(`set a reminder for ${ctx.when}: ${ctx.remindText ?? ""}`);
  const p = ctx.placeOutcome as { kind?: string; desc?: string } | undefined;
  if (p && typeof p === "object") {
    if (p.kind === "saved") bits.push(`saved a place: ${p.desc ?? ""}`);
    else if (p.kind === "need-description") bits.push("a location point was received but has no description — ask what is there");
    else if (p.kind === "need-address") bits.push("a place was mentioned but no coordinates — ask for the location or address");
  }
  if (ctx.recallAnswer) bits.push(`answered from memory: ${ctx.recallAnswer}`);
  return bits.join("; ");
}

/** Найти семантически-подобный Q&A-образец (дешёвый матч по пересечению слов; эмбеддинг — позже). */
function matchQa(text: string, qa: { q: string; a: string }[]): { q: string; a: string } | null {
  const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean);
  const words = new Set(norm(text));
  let best: { q: string; a: string } | null = null, bestScore = 0;
  for (const pair of qa) {
    const qw = norm(pair.q);
    if (!qw.length) continue;
    const hits = qw.filter((w) => words.has(w)).length;
    const score = hits / qw.length;
    if (score > bestScore) { bestScore = score; best = pair; }
  }
  return bestScore >= 0.6 ? best : null;
}

export async function converse(ctx: NodeCtx): Promise<NodeCtx> {
  const chatId = String(ctx.telegramChatId ?? "").trim();

  let cfg;
  try { cfg = assistantConfigOf((await readCore()).components); }
  catch { return composeReply(ctx); } // ядро недоступно — детерминированный фолбэк

  // Память диалога: положить входящее сообщение в буфер (окно N/TTL из настроек), прочитать состояние.
  const incoming = String(ctx.text ?? ctx.original ?? "").trim();
  let state = chatId ? await loadChat(chatId) : { id: "", messages: [], lang: "", pending: null as unknown };
  if (chatId && incoming) state = await pushMessage(chatId, { role: "user", text: incoming, at: new Date().toISOString() }, cfg.lastN, cfg.ttlMinutes);

  // Язык ответа. Приоритет: зафиксированный в чате (выбор пользователя, персист) → фикс из настроек →
  // ЯЗЫК САМОГО СООБЩЕНИЯ (кириллица → ru, иначе en) → дефолт платформы. Детект по сообщению важнее
  // дефолта: `NEXT_PUBLIC_DEFAULT_LOCALE` на сервере может быть не задан (=en), и русский текст получал бы
  // английский ответ — ровно этот баг поймал владелец. Полный флоу переговоров о языке — отдельный под-шаг.
  const detectLang = (s: string): string => (/[Ѐ-ӿ]/.test(s) ? "ru" : "");
  const lang =
    state.lang ||
    (cfg.languageMode === "fixed" && cfg.fixedLanguage) ||
    detectLang(incoming) ||
    String(ctx.lang ?? process.env.NEXT_PUBLIC_DEFAULT_LOCALE ?? "en").toLowerCase().slice(0, 2);

  // Представление возможностей (/start, «что ты умеешь») — детерминированный список надёжнее модели.
  if (ctx.showHelp === true && cfg.revealCapabilities) {
    const help = composeReply({ ...ctx, lang }).reply as string;
    if (chatId) await pushMessage(chatId, { role: "assistant", text: help, at: new Date().toISOString() }, cfg.lastN, cfg.ttlMinutes);
    return { reply: help };
  }

  const done = runSummary(ctx);
  const qaHit = matchQa(incoming, cfg.qa);

  // Нет модели/ключа → детерминированный фолбэк (форма доказана 11/11).
  const fallback = () => composeReply({ ...ctx, lang });

  // Собрать промпт: СЦЕНАРИЙ ПОВЕДЕНИЯ (в нём идентичность+возможности) + язык + недавний диалог + Q&A-
  // образец + что сделал прогон. Модель отвечает КАК ЭТОТ АССИСТЕНТ: подтвердить действие, если оно было,
  // ИЛИ вести разговор (приветствие, «кто ты», болтовня), опираясь на свою инструкцию. Никаких списков
  // фраз в коде — поведение задаёт инструкция, а не функция.
  const history = state.messages.slice(-cfg.lastN).map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.text}`).join("\n");
  const task = done
    ? `You just performed this for the user: ${done}. Reply confirming it (or ask the follow-up it needs).`
    : `The user is talking to you (a greeting, a question about who you are or why you exist, or small talk). ` +
      `Reply naturally AS THIS ASSISTANT, using your description above — introduce yourself and what you can do when relevant.`;
  const system =
    `${cfg.instruction}\n\nReply ONLY in language "${lang}". Keep it to one short, warm message. ` +
    (qaHit ? `For a message like "${qaHit.q}" answer in this style: "${qaHit.a}". ` : "") +
    `${task} No preamble, no quotes around your reply.`;

  let reply: string | null;
  try { reply = await askModel({ system, user: `${history ? history + "\n" : ""}User: ${incoming}`, maxTokens: 300 }); }
  catch { return fallback(); }
  if (!reply || !reply.trim()) return fallback();

  const out = reply.trim();
  if (chatId) await pushMessage(chatId, { role: "assistant", text: out, at: new Date().toISOString() }, cfg.lastN, cfg.ttlMinutes);
  return { reply: out };
}
