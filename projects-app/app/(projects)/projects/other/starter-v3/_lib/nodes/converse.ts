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
import { loadChat, pushMessage, setLang, setPending, setSummary, type ChatMessage, type PendingAsk } from "../components/conversation/state";
import { buildDialogue, outlineOf } from "../components/conversation/context";
import { SUMMARY_LIMIT } from "../../_data/record.schema";
import { abilitiesBrief, abilitiesOf, placesBrief, type Abilities } from "../components/conversation/abilities";
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
  let facts = "";
  let places = "";
  // Структурный перечень — тот же источник, что и `facts`: его получает детерминированный фолбэк, чтобы и
  // он никогда не перечислял умения от себя.
  let ab: Abilities = {
    title: "", howItWorks: [], useCases: [],
    inputs: [], outputs: [], steps: [], speaks: false,
    counts: { visible: 0, total: 0, hidden: 0 },
  };
  try {
    const core = await readCore();
    cfg = assistantConfigOf(core.components);
    // ВОЗМОЖНОСТИ — ИЗ ЯДРА, НА КАЖДОМ ПРОГОНЕ (312.4). Инструкцию поведения пишет человек и она стареет;
    // эти строки выведены из видимых узлов только что и потому не могут разойтись со сборкой.
    ab = abilitiesOf(core);
    facts = abilitiesBrief(ab);
    // Адреса и роли — тем же выводом из ядра (312.7): «где посмотреть» и «почему коллега не видит».
    places = placesBrief(core, String(ctx.automationUrl ?? "").trim());
  }
  catch { return composeReply(ctx); } // ядро недоступно — детерминированный фолбэк

  // Память диалога: положить входящее сообщение в буфер (окно N/TTL из настроек), прочитать состояние.
  const incoming = String(ctx.text ?? ctx.original ?? "").trim();
  let state = chatId ? await loadChat(chatId) : { id: "", messages: [], lang: "", pending: null as unknown, summary: "" };
  // 🔒 РЕПЛИКА РОЖДАЕТСЯ С КОНВЕРТОМ (330.3): прогон и класс — то, что речи известно СЕЙЧАС. Исход и
  // созданные записи допишет движок в конце прогона (`sealTurns`): выходы ещё не отработали, и знать их
  // отсюда невозможно. Разделение объявлено в `record.schema.ts` и в законе группы.
  const turn = { runId: String(ctx.runId ?? "") || undefined, class: String(ctx.intentClass ?? "") || undefined };

  /**
   * 🔒 ВЫТЕСНЕННОЕ УПЛОТНЯЕТСЯ, А НЕ ПРОПАДАЕТ (330.4). Окно и TTL реплики УДАЛЯЮТ; до этого шага
   * сказанное просто переставало существовать, и длинный разговор безвозвратно терял своё начало.
   * Сжимает МОДЕЛЬ — это её работа, а не регулярок: важно, ЧТО обсуждали, а не какие слова звучали.
   * Модели нет → честное оглавление (`outlineOf`): не пересказ, а перечень начал, и оно так и подписано.
   * Предел — общий `SUMMARY_LIMIT` папки: у «короткой формы» один закон на всё, включая склады.
   */
  const condense = async (dropped: ChatMessage[]): Promise<void> => {
    if (!chatId || !dropped.length) return;
    const previous = String(state.summary ?? "").trim();
    const outline = outlineOf(dropped, SUMMARY_LIMIT);
    let next = "";
    try {
      next = (await askModel({
        system:
          `You keep a running summary of a conversation, at most ${SUMMARY_LIMIT} characters. You are given ` +
          `the summary so far and the lines that just fell out of the short-term buffer. Merge them into ONE ` +
          `compact paragraph in the same language as the conversation. Keep names, subjects, decisions, ` +
          `questions still open and anything the person asked to be remembered. Drop greetings and small talk. ` +
          `Never invent what was not said. Output the paragraph only.`,
        user: `Summary so far: ${previous || "(none)"}\n\nLines that just fell out:\n${outline}`,
        maxTokens: 220,
      })) ?? "";
    } catch { next = ""; }
    const merged = next.trim() || [previous, outline].filter(Boolean).join(" · ");
    await setSummary(chatId, merged.length > SUMMARY_LIMIT ? `${merged.slice(0, SUMMARY_LIMIT - 1)}…` : merged);
  };

  if (chatId && incoming) {
    const pushed = await pushMessage(chatId, { role: "user", text: incoming, at: new Date().toISOString(), ...turn }, cfg.lastN, cfg.ttlMinutes);
    state = pushed.state;
    await condense(pushed.dropped);
  }

  // Язык ответа. Приоритет: зафиксированный в чате (выбор пользователя, персист) → фикс из настроек →
  // `ctx.chatLang` от классификатора (единый контекстный слой 309) → ЯЗЫК СООБЩЕНИЯ (кириллица → ru) →
  // дефолт платформы. Детект по сообщению важнее дефолта: `NEXT_PUBLIC_DEFAULT_LOCALE` может быть не задан.
  const detectLang = (s: string): string => (/[Ѐ-ӿ]/.test(s) ? "ru" : "");
  const platformDefault = String(ctx.lang ?? process.env.NEXT_PUBLIC_DEFAULT_LOCALE ?? "en").toLowerCase().slice(0, 2);
  let lang =
    // 1. ВЫБОР ЧЕЛОВЕКА В ЭТОМ ЧАТЕ — «давай общаться по-украински». Сильнее всех: он сказал прямо.
    state.lang ||
    // 2. ЯЗЫК ДЛЯ ЧАТА — настройка автоматизации. Задан и непуст → говорим на нём всегда.
    cfg.chatLanguage ||
    String(ctx.chatLang ?? "").toLowerCase().slice(0, 2) ||
    // 3. ЧЕЛОВЕК УЖЕ НАПИСАЛ — отвечаем на языке его сообщения. Дефолт здесь неуместен: он назначен
    //    «на всякий случай», а язык переписки человек только что показал делом.
    detectLang(incoming) ||
    // 4. ЧЕЛОВЕК ЕЩЁ НЕ ПИСАЛ (автоматизация заговорила первой) — вот ровно тот случай, ради которого
    //    язык по умолчанию и существует: догадываться не о чем, берём назначенный платформой.
    platformDefault;

  // ПЕРСИСТ ЯЗЫКА ПЕРВОГО КОНТАКТА (309.3, уточнён в 312.7): язык в чате ещё не зафиксирован и настройка
  // «язык для чата» не задана → запоминаем определённый сейчас как выбор ЭТОГО чата. Дальше он живёт с
  // чатом и переживает прогоны. Смену языка разрешает сам человек — модель ставит тег [[lang:xx]], а мы
  // разбираем его детерминированно (ниже) и перезаписываем выбор.
  //
  // Настройка задана → в состояние чата НЕ пишем: иначе одна фраза человека «сделай по-английски» тихо
  // переспорила бы настройку владельца навсегда. Настройка сильнее случайного языка сообщения.
  if (chatId && !state.lang && !cfg.chatLanguage) { await setLang(chatId, lang); state.lang = lang; }

  // Представление возможностей (/start, «что ты умеешь») — детерминированный список надёжнее модели.
  if (ctx.showHelp === true && cfg.revealCapabilities) {
    const help = composeReply({ ...ctx, lang, abilitiesInputs: ab.inputs, abilitiesOutputs: ab.outputs, abilitiesSteps: ab.steps }).reply as string;
    if (chatId) await condense((await pushMessage(chatId, { role: "assistant", text: help, at: new Date().toISOString(), ...turn }, cfg.lastN, cfg.ttlMinutes)).dropped);
    return { reply: help };
  }

  const recorded = recordedSummary(ctx);
  const recallAnswer = String(ctx.recallAnswer ?? "").trim();
  const qaHit = matchQa(incoming, cfg.qa);

  // Нет модели/ключа → детерминированный фолбэк (форма доказана 11/11).
  const fallback = () => composeReply({ ...ctx, lang, abilitiesInputs: ab.inputs, abilitiesOutputs: ab.outputs, abilitiesSteps: ab.steps });

  // 🔒 ОДНА ФОРМА ИСТОРИИ (шаг 330.1). Здесь стояла ВТОРАЯ сборка — `User: … / Assistant: …` без времени, —
  // и что увидит модель, зависело от пути: через движок приезжала одна форма, при прямом вызове двери
  // другая. Две формы одного контекста означают два разных прочтения одного разговора.
  // Теперь форма ровно одна (`formatDialog`), а окно — то же, что у движка: настройка вкладки.
  // Бюджет действует и на этом пути (330.2): прямой вызов двери мимо движка не должен быть лазейкой,
  // через которую в модель уезжает неограниченный разговор.
  const history = String(ctx.recentDialog ?? "").trim()
    || buildDialogue(state.messages as ChatMessage[], {
      lastN: cfg.lastN,
      tokenBudget: cfg.tokenBudget,
      summary: String(state.summary ?? ""),
      ttlMinutes: cfg.ttlMinutes,
    }).text;

  // 🔒 ТРИ РЕЖИМА ОТВЕТА (309, живой тест — бот на всё говорил «Готово ✅ …сохранено»):
  //   ЗАПИСЬ  — прогон что-то создал (заметка/трата/место/напоминание) → кратко ПОДТВЕРДИ.
  //   RECALL  — прогон ОТВЕТИЛ из памяти, ничего не создав → ДАЙ ОТВЕТ на вопрос, НЕ говори «сохранено».
  //   БЕСЕДА  — ничего не создано и не найдено (приветствие, «кто ты», мета-вопрос О ПЕРЕПИСКЕ) → веди
  //             диалог, ИСПОЛЬЗУЯ недавний диалог выше, чтобы отвечать на вопросы о том, что было сказано.
  // 🔒 ТЕМУ ОТВЕТА НАЗЫВАЕТ ФРОНТ, А НЕ СЛЕДЫ ПРОГОНА (шаг 312.5). Раньше режим выбирался по побочным
  // полям контекста (`needsWhen`, оставленный календарём), и на прямой вопрос речь могла ответить про
  // напоминание. Теперь класс запроса объявляет РОД ответа (`speechAct`), а следы прогона учитываются
  // только там, где класс действительно что-то создал.
  const act = String(ctx.speechAct ?? "").trim();
  const about = String(ctx.speechAbout ?? "").trim();
  const ACTS: Record<string, string> = {
    refuse:
      "The user asked for a SECRET of this server (a password, a key, a token). Refuse warmly and firmly in one " +
      "sentence. Do not explain how secrets are stored, do not repeat what they asked for, do not offer a workaround.",
    greet:
      "The user is being social (a greeting, thanks, goodbye). Answer warmly in one short line and, if it fits, " +
      "invite them to say what they need. Nothing was saved and nothing is pending.",
    "describe-self":
      `The user asks about the automation itself. Answer from the facts above${about ? ` and from this: ${about}` : ""}. ` +
      "Never invent an address or an ability.",
    ask:
      `The run cannot continue until the user says one missing thing: ${about || "the missing detail"}. ` +
      "Ask exactly ONE short question for it. Do not apologise, do not explain the internals, do not offer alternatives.",
    "not-understood":
      "You could not tell what kind of request this is. Say so plainly in one line — no guessing — and name, from " +
      "the facts above, what you CAN do, so the user can rephrase.",
    // ПРИЁМ ЗАПИСИ (330.2R). Речь говорит РАНЬШЕ складов и потому не знает, что именно они создадут — но
    // класс уже объявил намерение записать, и этого достаточно, чтобы подтвердить приём, не обещая лишнего.
    acknowledge:
      `The user has just told you something to keep${about ? `: ${about}` : ""}. Confirm you have taken it, ` +
      "in one short warm line, repeating the essence in a few words so they see you understood. Do NOT list " +
      "where it is stored, do NOT promise anything beyond keeping it, and do NOT explain what you cannot do.",
  };

  const task = ACTS[act]
    ? ACTS[act]
    : recorded
      ? `You just performed this for the user: ${recorded}. Reply confirming it briefly (or ask the follow-up it needs).`
      : recallAnswer
        ? `The user asked a QUESTION. Answer it directly using this information: "${recallAnswer}". Do NOT say anything was "saved" — you are ANSWERING, not recording.`
        : `The user is CONVERSING (a greeting, a question about who you are, small talk, or a question ABOUT THIS ` +
          `CONVERSATION — what they asked earlier, whether you remember). You CAN SEE the recent dialogue above: ` +
          `use it to answer such questions truthfully and specifically. Do NOT say anything was "saved". Reply naturally as this assistant.`;
  const system =
    `${places}\n\n` +
    `${cfg.instruction}\n\n${facts}\n\nReply ONLY in language "${lang}". Keep it to one short, warm message. ` +
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

  if (chatId) await condense((await pushMessage(chatId, { role: "assistant", text: out, at: new Date().toISOString(), ...turn }, cfg.lastN, cfg.ttlMinutes)).dropped);
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
