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

export const INTENTS = ["save", "remind", "recall", "finance", "place"] as const;
const ALLOWED = new Set<string>(INTENTS);

export async function classifyIntent(ctx: NodeCtx): Promise<NodeCtx> {
  const text = String(ctx.text ?? "").trim();
  const hasPhoto = Boolean(ctx.photoFileId);
  // «Есть локация» = нормализованные координаты от входного узла (308.2), либо сырой `ctx.location`.
  const hasLocation = (ctx.lat != null && ctx.lng != null) || ctx.location != null;

  // Явные СЛУЖЕБНЫЕ КОМАНДЫ Telegram (не естественная речь) — быстрый детерминированный показ возможностей.
  if (/^\/(start|help)\b/i.test(text)) return { intent: [], showHelp: true };

  // ЖЁСТКИЕ ФЛАГИ ВЛОЖЕНИЙ — единственная детерминированная подсказка (вложение однозначно): фото = чек к
  // учёту (finance), шаринг локации = место (place). ТЕКСТОВЫХ хинтов больше НЕТ (урок живого теста 309):
  // слово «потратил»/валюта в тексте форсили finance даже в ВОПРОСЕ («сколько я потратил на вишни» → бот
  // «учёл покупку»). Запись-vs-вопрос — суждение, а не поиск слов: его выносит МОДЕЛЬ по промпту ниже.
  const hardFlags = new Set<string>();
  if (hasPhoto) hardFlags.add("finance");
  if (hasLocation) hardFlags.add("place");

  // Нет текста, но есть вложение → чистый детерминированный исход (модель не нужна).
  if (!text) return { intent: hardFlags.size ? [...hardFlags] : ["save"] };

  const system =
    `You label the user's message with the DATA intents it carries, from this exact set: save (states a ` +
    `FACT to remember), remind (wants a time-based reminder), recall (a QUESTION or REQUEST to FIND/SHOW ` +
    `something already saved — "how much did I spend on X", "show me the receipt", "what did I save about ` +
    `Y", "when is my reminder"), finance (RECORDS a NEW money movement — a statement that money was spent ` +
    `or received, e.g. "spent 10 euro on coffee", "got paid 500"), place (marks a LOCATION — "remember ` +
    `this place", "they sell tasty pies here"). \n\n` +
    `CRITICAL — RECORD vs QUESTION: a STATEMENT that records money is finance; a QUESTION or request ABOUT ` +
    `money already spent is recall, NEVER finance. "потратил 500 на такси" → finance (records it). "сколько ` +
    `я потратил на вишни" → recall (asks). "покажи чек на 31.34" → recall (requests to show). "изучи чек ` +
    `повторно и скажи сумму за черешню" → recall (re-examine and answer). Money words alone do NOT mean ` +
    `finance — the intent (record vs ask) does. \n\n` +
    `If the message is CONVERSATION with nothing to store or find — a greeting, thanks, small talk, or a ` +
    `question ABOUT YOU (the assistant) — reply the single word none. A message may carry several data ` +
    `intents. Reply with ONLY the matching intent words lowercase comma-separated, or none. Nothing else.`;

  let raw: string | null;
  try {
    raw = await askModel({ system, user: text, maxTokens: 24 });
  } catch {
    // модель отвергла запрос — не теряем сообщение, сохраняем как заметку (+ жёсткие флаги вложений)
    return { intent: [...new Set(["save", ...hardFlags])] };
  }
  if (raw === null) return { intent: [...new Set(["save", ...hardFlags])] };

  // ДЕТЕРМИНИРОВАННЫЙ парс: только валидные токены словаря, дубликаты убраны, порядок словаря.
  const found = new Set<string>(hardFlags);
  for (const tok of raw.toLowerCase().split(/[^a-z]+/)) if (ALLOWED.has(tok)) found.add(tok);
  const intent = INTENTS.filter((i) => found.has(i));
  // Пустой intent = РАЗГОВОР (приветствие/вопрос о боте/болтовня): НЕ форсим `save`, чтобы такое сообщение
  // не сохранялось заметкой. На него ответит МОДЕЛЬ в `converse` (по инструкции поведения), а не ветки-данные.
  return { intent };
}
