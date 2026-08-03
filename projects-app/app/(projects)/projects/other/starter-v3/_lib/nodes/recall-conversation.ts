// ФУНКЦИЯ УЗЛА «TRANSFORM» (середина) — ВСПОМНИТЬ РАЗГОВОР (шаг 330.7).
//
// 🔴 ЧТО ЭТО ЗАКРЫВАЕТ. Примитивы чтения складов были написаны ещё в 311.9а.3, но `readVectorMemory` не
// вызывал НИ ОДИН узел, а `ctx.recallAnswer` некому было положить: класс «чтение своего» распознавал вопрос
// верно и упирался в пустоту. Половина памяти писалась и никогда не читалась.
//
// 🔒 ПОЧЕМУ ИСКАТЬ НАДО ЧЕРЕЗ `recallScoped`, А НЕ ЧЕРЕЗ ОТВЕТ ПАМЯТИ. Индекс общий на сервер. Готовая
// проза LightRAG собрана из чанков ВСЕХ автоматизаций, и отфильтровать её постфактум нельзя — значит
// автоматизация уверенно сказала бы «да, мы это обсуждали» о разговоре, которого здесь не было. Поэтому у
// памяти берётся RETRIEVAL, чужое отбрасывается по провенансу, а формулирует ответ речь — она физически
// не может сослаться на чужое, потому что чужого нет в её материале.
//
// 🔒 ДВА ПРЕДМЕТА ПОИСКА, ОДИН УЗЕЛ. «Что я сохранял про Х» — это записи (`fact`), «помнишь, мы говорили
// про Х» — это разговор (`conversation`). Различает их не фронт (класс один — `read-own`, словарь закрыт),
// а середина: сперва ищем разговор, и если человек спрашивал не о нём — записи. Композиция чтения и есть
// работа середины, ровно поэтому примитивы живут функциями, а не узлами.
// Имя `recallConversation` — публичный контракт, не переименовывать.
import type { NodeCtx } from "../executor";
import { recallScoped, type Recalled } from "../memory";
import { servesAnyClass } from "../message";

/** Спрашивают ли о ПЕРЕПИСКЕ, а не о записях. Детерминированно, формы обращения конечны. */
const ABOUT_TALK =
  /(помн|говорил|обсужд|беседов|разговор|вчера|remember|we (talked|discussed|were talking)|our (talk|conversation)|last time)/i;

export async function recallConversation(ctx: NodeCtx): Promise<NodeCtx> {
  // Вопрос — не всякий прогон. Работаем только для классов, которые действительно спрашивают.
  if (!servesAnyClass(ctx, ["read-own", "composite"])) return {};
  const question = String(ctx.question ?? ctx.text ?? "").trim();
  if (!question) return { recallOutcome: "empty" };

  const wantsTalk = ABOUT_TALK.test(question);

  let found: Recalled[] = [];
  let foreignDropped = 0;
  let unreachable = false;

  const ask = async (kind: "conversation" | "fact" | undefined) => {
    const r = await recallScoped(question, kind ? { kind } : {});
    if (r === null) { unreachable = true; return; }
    foreignDropped += r.foreignDropped;
    found = found.concat(r.items);
  };

  try {
    // 🔒 СПРОСИЛИ ПРО ПЕРЕПИСКУ — ИЩЕМ ПЕРЕПИСКУ (330.7, исправление). Здесь стоял фолбэк «не нашлось
    // разговора — поищем в записях», и он-то и притащил на «ремонт крыши» протёкший кран: чужая тема из
    // другого рода документов выглядела находкой. Расширять поиск, когда ответа нет, значит менять
    // честное «не нашёл» на уверенное «нашёл не то».
    await ask(wantsTalk ? "conversation" : undefined);
  } catch {
    // Память ОТКАЗАЛА (не «отсутствует») — это провал доставки чтения, но прогон валить нечем: честно
    // сообщаем исход, и речь скажет правду вместо выдумки.
    return { recallOutcome: "unreachable", recallAnswer: "", recallSources: [] };
  }

  if (unreachable && !found.length) return { recallOutcome: "unreachable", recallAnswer: "", recallSources: [] };

  // 🔒 ЗДЕСЬ ЧТЕНИЕ ЗАКАНЧИВАЕТСЯ (330.10). Дальше кандидатов ПРОВЕРЯЕТ отдельный узел: разрешает их в
  // локальные записи, берёт оттуда время и отсеивает не по теме. Разделение не косметика — оно делает
  // проверку ВИДИМОЙ на холсте и даёт ей собственные исходы, а не прячет в комментарии внутри чтения.
  return {
    recallOutcome: "found",
    recallCandidates: found,
    recallForeignDropped: foreignDropped,
  };
}
