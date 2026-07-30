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

  // Сигнал вложения — детерминированный, БЕЗ модели: чек-фото без слов = расход; шаринг локации = место.
  const hardFlags = new Set<string>();
  if (hasPhoto) hardFlags.add("finance");
  if (hasLocation) hardFlags.add("place");

  // Нет текста, но есть вложение → чистый детерминированный исход (модель не нужна).
  if (!text) return { intent: hardFlags.size ? [...hardFlags] : ["save"] };

  const system =
    `You label the user's message with one or MORE intents from this exact set: save (states a fact to ` +
    `remember), remind (wants a time-based reminder), recall (asks a question to find something saved, ` +
    `including "how much did I spend on X"), finance (records money spent or received — a receipt or an ` +
    `amount), place (marks a location/place). A single message may carry several intents (e.g. a note AND ` +
    `a purchase). Reply with ONLY the matching intent words, lowercase, separated by commas, nothing else. ` +
    `If none clearly applies, reply save.`;

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
  return { intent: intent.length ? intent : ["save"] };
}
