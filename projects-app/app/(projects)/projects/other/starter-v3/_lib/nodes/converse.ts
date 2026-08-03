// ФУНКЦИЯ УЗЛА «LOGIC» (transform, role=conversation) — РАЗГОВОРНАЯ ГРАНИЦА (шаг 309, решение владельца).
// Отдельный ВИД работы: не счёт над данными (это делают transform-ы вроде resolveMoment/fetchExternal по
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
import { loadChat, pushMessage, setLang, setPending, type PendingAsk } from "../components/conversation/state";
import { composeReply } from "./compose-reply";

// ЧТО СДЕЛАЛ ПРОГОН — РАЗДЕЛЬНО (309, живой тест): ЗАПИСИ (их подтверждаем) отдельно от RECALL-ОТВЕТА (на
// него ОТВЕЧАЕМ, а не «сохранено»). Смешение делало бот'а «Готово ✅ …сохранено» даже на вопросы.
// 🔒 ТОЛЬКО ТО, ЧТО РЕАЛЬНО ЕСТЬ В СБОРКЕ (шаг 311.11): траты, чеки, категории, места и алиасы глоссария
// перечислялись здесь как исходы узлов, снесённых вместе с доменом v2. Перечислять несуществующее — то же
// обещание сверх ядра, что и no-op-заглушка.
function recordedSummary(ctx: NodeCtx): string {
  const bits: string[] = [];
  if (ctx.noteSummary) bits.push(`saved a note: ${ctx.noteSummary}`);
  if (ctx.needsWhen === true) bits.push("a reminder was requested but no date was given — ask when");
  else if (ctx.when) bits.push(`set a reminder for ${ctx.when}: ${ctx.remindText ?? ""}`);
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
  // 🔒 СОБЕСЕДНИК — НЕ ТОЛЬКО TELEGRAM (шаг 312.3). Ключ чата прикрепляет движок один раз за прогон
  // (`chatKeyOf`), поэтому память диалога есть и у пульта, и у почты, а не только у бота. Прежняя строка
  // читала `telegramChatId` — и для пульта каждое сообщение было первым: ни буфера, ни языка, ни висящего
  // вопроса. Фолбэк на `telegramChatId` оставлен для прямых вызовов двери мимо движка.
  const chatId = String(ctx.chatKey ?? (ctx.telegramChatId ? `telegram:${ctx.telegramChatId}` : "")).trim();

  let cfg;
  let publicUrl = "";
  try {
    const core = await readCore();
    cfg = assistantConfigOf(core.components);
    // Публичный адрес автоматизации (310) — из паспорта; ассистент даёт его на «где посмотреть».
    publicUrl = String((core.passport as { publicUrl?: unknown } | undefined)?.publicUrl ?? "").trim();
  }
  catch { return composeReply(ctx); } // ядро недоступно — детерминированный фолбэк

  // Память диалога: положить входящее сообщение в буфер (окно N/TTL из настроек), прочитать состояние.
  const incoming = String(ctx.text ?? ctx.original ?? "").trim();
  let state = chatId ? await loadChat(chatId) : { id: "", messages: [], lang: "", pending: null as unknown };
  if (chatId && incoming) state = await pushMessage(chatId, { role: "user", text: incoming, at: new Date().toISOString() }, cfg.lastN, cfg.ttlMinutes);

  // Язык ответа. Приоритет: зафиксированный в чате (выбор пользователя, персист) → фикс из настроек →
  // `ctx.chatLang` от классификатора (единый контекстный слой 309) → ЯЗЫК СООБЩЕНИЯ (кириллица → ru) →
  // дефолт платформы. Детект по сообщению важнее дефолта: `NEXT_PUBLIC_DEFAULT_LOCALE` может быть не задан.
  const detectLang = (s: string): string => (/[Ѐ-ӿ]/.test(s) ? "ru" : "");
  const fixed = cfg.languageMode === "fixed" && cfg.fixedLanguage ? cfg.fixedLanguage : "";
  let lang =
    state.lang ||
    fixed ||
    String(ctx.chatLang ?? "").toLowerCase().slice(0, 2) ||
    detectLang(incoming) ||
    String(ctx.lang ?? process.env.NEXT_PUBLIC_DEFAULT_LOCALE ?? "en").toLowerCase().slice(0, 2);

  // ПЕРСИСТ ЯЗЫКА ПЕРВОГО КОНТАКТА (309.3): язык в чате ещё не зафиксирован и режим не «фикс» → запоминаем
  // определённый сейчас как выбор чата (дефолт — стартовая догадка, дальше живёт персистентно). Смену языка
  // ниже разрешает сам пользователь через тег [[lang:xx]], который ставит МОДЕЛЬ (не список фраз в коде).
  if (chatId && !state.lang && !fixed) { await setLang(chatId, lang); state.lang = lang; }

  // Представление возможностей (/start, «что ты умеешь») — детерминированный список надёжнее модели.
  if (ctx.showHelp === true && cfg.revealCapabilities) {
    const help = composeReply({ ...ctx, lang }).reply as string;
    if (chatId) await pushMessage(chatId, { role: "assistant", text: help, at: new Date().toISOString() }, cfg.lastN, cfg.ttlMinutes);
    return { reply: help };
  }

  const recorded = recordedSummary(ctx);
  const recallAnswer = String(ctx.recallAnswer ?? "").trim();
  const qaHit = matchQa(incoming, cfg.qa);

  // Нет модели/ключа → детерминированный фолбэк (форма доказана 11/11).
  const fallback = () => composeReply({ ...ctx, lang });

  // Контекст диалога — из единого слоя (`ctx.recentDialog`, положил классификатор); фолбэк — свой буфер.
  const history = String(ctx.recentDialog ?? "").trim()
    || state.messages.slice(-cfg.lastN).map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.text}`).join("\n");

  // 🔒 ТРИ РЕЖИМА ОТВЕТА (309, живой тест — бот на всё говорил «Готово ✅ …сохранено»):
  //   ЗАПИСЬ  — прогон что-то создал (заметка/трата/место/напоминание) → кратко ПОДТВЕРДИ.
  //   RECALL  — прогон ОТВЕТИЛ из памяти, ничего не создав → ДАЙ ОТВЕТ на вопрос, НЕ говори «сохранено».
  //   БЕСЕДА  — ничего не создано и не найдено (приветствие, «кто ты», мета-вопрос О ПЕРЕПИСКЕ) → веди
  //             диалог, ИСПОЛЬЗУЯ недавний диалог выше, чтобы отвечать на вопросы о том, что было сказано.
  const task = recorded
    ? `You just performed this for the user: ${recorded}. Reply confirming it briefly (or ask the follow-up it needs).`
    : recallAnswer
      ? `The user asked a QUESTION. Answer it directly using this information: "${recallAnswer}". Do NOT say anything was "saved" — you are ANSWERING, not recording.`
      : `The user is CONVERSING (a greeting, a question about who you are, small talk, or a question ABOUT THIS ` +
        `CONVERSATION — what they asked earlier, whether you remember). You CAN SEE the recent dialogue above: ` +
        `use it to answer such questions truthfully and specifically. Do NOT say anything was "saved". Reply naturally as this assistant.`;
  // Публичный адрес (310): когда владелец спрашивает «где это посмотреть / покажи страницу» — отвечай
  // адресом; не назначен → честно скажи, что адреса пока нет (не выдумывай ссылку).
  const publicUrlLine = publicUrl
    ? `The automation's public page is: ${publicUrl}. When the owner asks where to see it, give this address.`
    : `The automation's public page address is not assigned yet — if asked where to see it, say so honestly, do not invent a link.`;
  const system =
    `${publicUrlLine}\n\n` +
    `${cfg.instruction}\n\nReply ONLY in language "${lang}". Keep it to one short, warm message. ` +
    // ГАРДРЕЙЛ ОТ ГАЛЛЮЦИНАЦИЙ (309, живой тест): модель НЕ знает внутреннего устройства и НЕ должна его
    // выдумывать. Инцидент: на «почему не сохранил в таблицу» бот сочинил «храню как заметку» — а трата
    // БЫЛА в таблице. Отвечай ТОЛЬКО о том, что реально сделал прогон (описано ниже). Не придумывай
    // объяснений про таблицы/хранилище/причины «не сохранил».
    `Never invent claims about your internal storage or tables. Only a RECORDING task confirms a save; a ` +
    `QUESTION is answered, not "saved"; a CONVERSATION is just a reply. Do not tack "saved / can be seen in ` +
    `the app" onto answers or chit-chat. ` +
    (qaHit ? `For a message like "${qaHit.q}" answer in this style: "${qaHit.a}". ` : "") +
    // Смена языка — понимает МОДЕЛЬ (не список фраз): просит человек говорить на другом языке → модель
    // ставит В НАЧАЛЕ ответа тег [[lang:<iso>]] и дальше отвечает уже на новом; мы парсим тег детерминированно
    // и запоминаем язык навсегда (309.3). Дефолт/детект — лишь стартовая догадка, выбор человека главнее.
    `If the user asks to switch to another language, begin your reply with the tag [[lang:<iso 2-letter code>]] ` +
    `and then reply in that new language. Otherwise do not output the tag. ${task} No preamble, no quotes around your reply.`;

  let reply: string | null;
  try { reply = await askModel({ system, user: `${history ? history + "\n" : ""}User: ${incoming}`, maxTokens: 300 }); }
  catch { return fallback(); }
  if (!reply || !reply.trim()) return fallback();

  // Детерминированный разбор тега смены языка: [[lang:xx]] → запомнить язык навсегда, снять тег из ответа.
  let out = reply.trim();
  const tag = out.match(/^\s*\[\[lang:([a-z]{2})\]\]\s*/i);
  if (tag && chatId) { await setLang(chatId, tag[1].toLowerCase()); out = out.slice(tag[0].length).trim(); }
  else out = out.replace(/\[\[lang:[a-z]{2}\]\]/gi, "").trim(); // страховка: тег без chatId не оставляем в тексте

  if (chatId) await pushMessage(chatId, { role: "assistant", text: out, at: new Date().toISOString() }, cfg.lastN, cfg.ttlMinutes);
  // 🔒 РЕЧЬ — ЕДИНСТВЕННЫЙ АВТОР СОСТОЯНИЯ ДИАЛОГА (шаг 312.3). Висящий вопрос кладут в контекст те, кто
  // его задал (класс «неполный», узлы середины), а СНИМАЕТ его класс «продолжение» (`pendingQuestion: null`).
  // Записывает же его сюда — только этот узел, ровно как строку тоста пишет только `deliverToast`.
  //
  // Что это чинит: до сих пор вопрос жил ТОЛЬКО внутри прогона и умирал вместе с ним — `setPending` не
  // звал никто, поэтому класс «продолжение» не мог сработать никогда, и автоматизация умела спросить
  // «что именно записать?», но структурно не могла узнать ответ.
  if (chatId) {
    const pending = ctx.pendingQuestion;
    await setPending(chatId, pending && typeof pending === "object" ? (pending as PendingAsk) : null);
  }
  return { reply: out };
}
