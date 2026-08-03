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
import { listRows } from "../rows";
import { servesAnyClass } from "../message";

/** Спрашивают ли о ПЕРЕПИСКЕ, а не о записях. Детерминированно, формы обращения конечны. */
const ABOUT_TALK =
  /(помн|говорил|обсужд|беседов|разговор|вчера|remember|we (talked|discussed|were talking)|our (talk|conversation)|last time)/i;

/** Сколько выдержек имеет смысл отдать речи: больше — дороже, а ответ всё равно один короткий. */
const KEEP = 4;

/**
 * 🔒 ПАМЯТЬ ВСЕГДА ЧТО-ТО ОТДАЁТ — ЗНАЧИТ РЕЛЕВАНТНОСТЬ ПРОВЕРЯЕМ САМИ (330.7, ложь поймана живьём).
 *
 * LightRAG в режиме `hybrid` возвращает top-k ближайших чанков ВСЕГДА и никогда не говорит «не нашёл».
 * На вопрос «помнишь, мы обсуждали ремонт крыши в гараже?» он отдал протёкший кран и старый запрос
 * пароля — и узел счёл это находкой, а речь вежливо согласилась: «Помню, был разговор про ремонт крыши».
 * Согласие без материала по теме — то же враньё, что и согласие вообще без материала.
 *
 * Проверка детерминированная и дешёвая: у вопроса и выдержки должно быть хотя бы одно общее ЗНАЧИМОЕ
 * слово. Значимое — длиной от четырёх букв (короткие в обоих языках служебные) и не из списка слов самого
 * обращения («помнишь», «говорили»), которые есть в КАЖДОМ таком вопросе и потому ничего не различают.
 */
const ASKING_WORDS = new Set([
  "помнишь", "помните", "говорили", "обсуждали", "беседовали", "разговор", "вчера", "тобой",
  "remember", "talked", "discussed", "talking", "about", "conversation", "yesterday",
]);

const significant = (s: string): Set<string> =>
  new Set(
    s.toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 4 && !ASKING_WORDS.has(w))
      // Русские окончания сильно расходятся («велосипеде» / «велосипед»), поэтому сравниваем по основе:
      // первые пять букв различают предметы и переживают склонение.
      .map((w) => w.slice(0, 5)),
  );

const relevant = (question: string, text: string): boolean => {
  const q = significant(question);
  if (!q.size) return true; // в вопросе нет ни одного значимого слова — судить нечем, не отбрасываем
  const t = significant(text);
  for (const w of q) if (t.has(w)) return true;
  return false;
};

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

  // 🔒 ВРЕМЯ БЕРЁТСЯ ИЗ НАШЕЙ СТРОКИ, А НЕ ИЗ ПАМЯТИ. У чанка даты нет вовсе — только текст и провенанс.
  // Поэтому маркер `[mem#id]`, положенный при записи, разрешается в строку разговора, и оттуда приходят
  // точные «когда» и «в каком канале». Ради этого второй дом и заведён.
  const rows = await listRows("conversation", Infinity);
  const byMark = new Map(rows.map((r) => [String(r.memRecordId ?? ""), r]));

  // Память отдала ближайшее, а не подходящее — оставляем только то, что действительно о предмете вопроса.
  const offTopic = found.length;
  found = found.filter((f) => relevant(question, f.text));
  const offTopicDropped = offTopic - found.length;

  const top = found.slice(0, KEEP);
  const sources = top.map((f) => {
    const row = byMark.get(f.memRecordId);
    return {
      at: String(row?.at ?? ""),
      channel: f.channel || String(row?.channel ?? ""),
      kind: f.kind,
      excerpt: f.text.length > 200 ? `${f.text.slice(0, 199)}…` : f.text,
    };
  });

  if (!top.length) {
    // Ничего СВОЕГО и ПО ТЕМЕ не нашлось — честный пустой исход. Отдельно называем, сколько отброшено
    // чужого и сколько не по теме: «пусто вообще», «пусто здесь» и «есть, но не об этом» — три разные
    // вещи, и в журнале они обязаны различаться.
    return {
      recallOutcome: "empty",
      recallAnswer: "",
      recallSources: [],
      recallForeignDropped: foreignDropped,
      recallOffTopicDropped: offTopicDropped,
    };
  }

  // Материал для речи: выдержки с датами. Формулирует ответ ОНА (закон 312 — один автор ответа), этот узел
  // лишь приносит найденное.
  const answer = sources
    .map((s) => `${s.at ? `[${s.at.slice(0, 10)}] ` : ""}${s.excerpt}`)
    .join("\n");

  return {
    recallOutcome: "found",
    recallAnswer: answer,
    recallSources: sources,
    recallForeignDropped: foreignDropped,
    recallOffTopicDropped: offTopicDropped,
  };
}
