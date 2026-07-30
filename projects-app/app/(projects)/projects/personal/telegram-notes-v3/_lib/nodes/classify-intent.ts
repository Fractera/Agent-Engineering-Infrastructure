// ФУНКЦИЯ УЗЛА «LOGIC» (transform) — КЛАССИФИКАТОР НАМЕРЕНИЙ (шаг 308.0, узловой навык). Ставит в
// контекст `ctx.intent: string[]` — МУЛЬТИ-ФЛАГ намерений сообщения из закрытого словаря
// (`save|remind|recall|finance|place`). Так ОДНА автоматизация делает всё (паритет v1 classify→fan-out):
// каждая ветка-действие потом сама-гейтится helper'ом `servesIntent(ctx, 'save')` и работает ТОЛЬКО когда
// её флаг стоит; чужой флаг → узел пропускает поток без изменений (`{}`, НЕ `null` — иначе линейный
// движок остановит всю цепочку и убьёт другие ветки). Мульти-флаг = составное сообщение (заметка И
// покупка одним сообщением → веером в обе ветки), это тоже паритет v1.
//
// Разбор — моделью (человек пишет намерение как угодно), НО ответ проверяется ДЕТЕРМИНИРОВАННО: берём
// только валидные токены словаря, мусор отбрасываем. Модель недоступна/пусто → безопасная деградация в
// `['save']` (заметка не теряется — худшее, что можно сделать, это потерять сообщение).
//
// НАЛИЧИЕ ВЛОЖЕНИЯ (шаг 308.2, аддитивно): фото/чек в сообщении сильно повышает шанс `finance`; локация —
// `place`. Пока интейк не-текста не подключён, классификатор работает по тексту; сигнал вложения
// подмешивается, как только вход-узел начнёт проносить `ctx.photoFileId`/`ctx.location`.
// Имя `classifyIntent` — публичный контракт, не переименовывать.
import type { NodeCtx } from "../executor";
import { askModel } from "../ai";
import { readCore } from "../core-io";
import { loadChat, formatDialog } from "../components/conversation/state";
import { assistantConfigOf } from "../components/conversation/config";
import { loadGlossary } from "../components/conversation/glossary";

export const INTENTS = ["save", "remind", "recall", "finance", "place", "glossary", "dimension"] as const;
const ALLOWED = new Set<string>(INTENTS);

// Признак ВОПРОСА/ЗАПРОСА (не список фраз-ответов — грамматический маркер вопроса, лингвистика, а не
// перечисление реплик): вопросительное начало/слово или знак «?». Живой тест 309: «на какую сумму купил
// вишню» и «покажи чек» уходили в finance/save вместо recall из-за глагола «купил». Вопрос доминирует над
// глаголом. Это СИЛЬНЫЙ сигнал recall, но НЕ финальный — модель всё равно решает; сигнал лишь страхует.
// БЕЗ `\b` — он ломается на кириллице в JS (всегда false). Матч подстрокой; вопросительный знак — отдельно.
const QUESTION_RE =
  /(сколько|на какую|какая сумма|какой|какие|что я|где я|когда |покажи|найди|верни|вспомни|how much|show me|what did|where did|when is|find |recall)/i;

export async function classifyIntent(ctx: NodeCtx): Promise<NodeCtx> {
  const text = String(ctx.text ?? "").trim();
  const hasPhoto = Boolean(ctx.photoFileId);
  // «Есть локация» = нормализованные координаты от входного узла (308.2), либо сырой `ctx.location`.
  const hasLocation = (ctx.lat != null && ctx.lng != null) || ctx.location != null;

  // Явные СЛУЖЕБНЫЕ КОМАНДЫ Telegram (не естественная речь) — быстрый детерминированный показ возможностей.
  if (/^\/(start|help)\b/i.test(text)) return { intent: [], showHelp: true };

  // ЖЁСТКИЕ ФЛАГИ ВЛОЖЕНИЙ: фото = чек к учёту (finance), шаринг локации = место (place). НО фото вместе с
  // ВОПРОСОМ (редко) не форсим — фото без вопроса это чек. Локация всегда place.
  const isQuestion = QUESTION_RE.test(text) || /\?\s*$/.test(text);
  const hardFlags = new Set<string>();
  if (hasPhoto && !isQuestion) hardFlags.add("finance");
  if (hasLocation) hardFlags.add("place");

  // 🔒 ЕДИНЫЙ КОНТЕКСТНЫЙ СЛОЙ (309, требование владельца). Классификатор — ПЕРВЫЙ модельный узел: он
  // читает буфер чата ОДИН РАЗ, кладёт структурный `recentDialog` + `chatLang` в контекст, и все
  // последующие модельные узлы (parseDate, digitizeMoney, converse) берут их отсюда, а не читают заново и
  // не судят в вакууме. Так «на какую сумму купил вишню» после чека понимается как ВОПРОС ПРО ЧЕК.
  const chatId = String(ctx.telegramChatId ?? "").trim();
  const state = chatId ? await loadChat(chatId) : { messages: [], lang: "" };
  // Окно = ВСЯ сессия (cfg.lastN, дефолт 50), не жёсткие 8; глоссарий алиасов — преамбулой для всех узлов.
  let lastN = 50, glossary = "";
  try { const cfg = assistantConfigOf((await readCore()).components); lastN = cfg.lastN; glossary = await loadGlossary(); }
  catch { /* ядро/словарь недоступны — работаем с дефолтами */ }
  const recentDialog = formatDialog(state.messages, lastN);
  const chatLang = state.lang || (/[Ѐ-ӿ]/.test(text) ? "ru" : "");

  // Нет текста, но есть вложение → чистый детерминированный исход (модель не нужна).
  if (!text) return { intent: hardFlags.size ? [...hardFlags] : ["save"], recentDialog, chatLang, glossary };

  const system =
    `You label the user's message with the DATA intents it carries, from this exact set: save (states a ` +
    `FACT to remember), remind (wants a time-based reminder), recall (a QUESTION or REQUEST to FIND/SHOW/` +
    `ANSWER FROM something already saved), finance (RECORDS a NEW money movement — a statement that money ` +
    `was just spent or received), place (marks a LOCATION), glossary (DEFINES an ALIAS/abbreviation — ` +
    `"remember that receipts SODO ADEJE are Mercadona", "такие чеки это Меркадона", "X значит Y"), ` +
    `dimension (asks to START SPLITTING expenses by a NEW category/attribute — "давай собирать отдельно ` +
    `расходы по дому и работе", "разделяй траты: дом и работа", "track home and work expenses separately"). \n\n` +
    `🔑 THE HARDEST DISTINCTION — RECORD vs QUESTION. If the message ASKS or REQUESTS about already-saved ` +
    `data it is recall, NEVER a new record — even if it contains money/purchase words in past tense. The ` +
    `question form (сколько / на какую сумму / покажи / что / где / когда / how much / show) DOMINATES the ` +
    `verb. Examples:\n` +
    `  "потратил 500 на такси" → finance (records a new expense)\n` +
    `  "на какую сумму купил вишню" → recall (ASKS the amount of an item on a saved receipt — NOT finance)\n` +
    `  "сколько я потратил на вишни" → recall\n` +
    `  "покажи чек" / "покажи чек на 31.34" → recall (REQUESTS to show a saved receipt)\n` +
    `  "изучи чек повторно и скажи сумму за черешню" → recall\n` +
    `  "вишня по-испански cereza" → save (states a fact)\n\n` +
    `If the message is CONVERSATION with nothing NEW to store or find — a greeting, thanks, small talk, a ` +
    `question ABOUT YOU (the assistant), or a META-QUESTION ABOUT THIS CHAT ITSELF ("do you see our ` +
    `context", "what did I ask you earlier", "do you remember what I said") — reply the single word none. ` +
    `Such messages are NOT facts to save. Only a genuine NEW fact the user wants remembered is save. ` +
    `A message may carry several data intents. Reply with ONLY the matching intent words lowercase ` +
    `comma-separated, or none. Nothing else.`;

  const user = recentDialog
    ? `Recent dialogue for context (do not classify these, only the last line):\n${recentDialog}\n\nClassify THIS message: ${text}`
    : text;

  let raw: string | null;
  try {
    raw = await askModel({ system, user, maxTokens: 24 });
  } catch {
    // модель отвергла запрос — не теряем сообщение, сохраняем как заметку (+ жёсткие флаги вложений)
    return { intent: [...new Set(["save", ...hardFlags])], recentDialog, chatLang, glossary };
  }
  if (raw === null) return { intent: [...new Set(["save", ...hardFlags])], recentDialog, chatLang, glossary };

  // ДЕТЕРМИНИРОВАННЫЙ парс: только валидные токены словаря, дубликаты убраны, порядок словаря.
  const found = new Set<string>(hardFlags);
  for (const tok of raw.toLowerCase().split(/[^a-z]+/)) if (ALLOWED.has(tok)) found.add(tok);

  // СТРАХОВКА ВОПРОСА: явный вопрос без нового вложения → recall, и убрать ошибочный save/finance, если
  // модель поставила их по глаголу («купил» в «на какую сумму купил вишню»). Вопрос не создаёт запись.
  // Определение алиаса (glossary) не считается вопросом — его не перебиваем.
  if (isQuestion && !hasPhoto && !found.has("glossary") && !found.has("dimension")) { found.add("recall"); found.delete("finance"); found.delete("save"); }

  const intent = INTENTS.filter((i) => found.has(i));
  // Пустой intent = РАЗГОВОР: НЕ форсим `save`. На него ответит МОДЕЛЬ в `converse`, а не ветки-данные.
  return { intent, recentDialog, chatLang, glossary };
}
