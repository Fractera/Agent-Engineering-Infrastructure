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

  // Язык ответа: зафиксированный в чате (выбор пользователя) → фикс из настроек → дефолт платформы.
  const lang = state.lang || (cfg.languageMode === "fixed" && cfg.fixedLanguage) || String(ctx.lang ?? process.env.NEXT_PUBLIC_DEFAULT_LOCALE ?? "en").toLowerCase().slice(0, 2);

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

  // Собрать промпт: сценарий поведения + язык + недавний диалог + Q&A-образец + что сделал прогон.
  const history = state.messages.slice(-cfg.lastN).map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.text}`).join("\n");
  const system =
    `${cfg.instruction}\n\nReply ONLY in language "${lang}". Be brief and warm, one short message. ` +
    (qaHit ? `\nFor a message like "${qaHit.q}" the owner wants you to answer in this style: "${qaHit.a}".` : "") +
    `\nThe automation just did: ${done || "nothing concrete — the message did not map to an action"}. ` +
    `Write the reply to the user that confirms what happened (or asks the follow-up the run needs). No preamble.`;

  let reply: string | null;
  try { reply = await askModel({ system, user: `${history ? history + "\n" : ""}User: ${incoming}`, maxTokens: 300 }); }
  catch { return fallback(); }
  if (!reply || !reply.trim()) return fallback();

  const out = reply.trim();
  if (chatId) await pushMessage(chatId, { role: "assistant", text: out, at: new Date().toISOString() }, cfg.lastN, cfg.ttlMinutes);
  return { reply: out };
}
