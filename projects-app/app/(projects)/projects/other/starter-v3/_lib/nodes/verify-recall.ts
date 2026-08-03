// ФУНКЦИЯ УЗЛА «TRANSFORM» (середина) — ПРОВЕРИТЬ НАЙДЕННОЕ (шаг 330.10, постановка владельца).
//
// 🔴 ЗАЧЕМ ОТДЕЛЬНЫЙ УЗЕЛ, А НЕ ПРОВЕРКА ВНУТРИ ЧТЕНИЯ. Векторный поиск НИКОГДА не говорит «не нашёл»:
// `hybrid` отдаёт ближайшие k чанков, о чём бы его ни спросили. На вопрос про ремонт крыши, которого здесь
// не обсуждали, память вернула протёкший кран — и ассистент согласился, что помнит крышу. Похожесть НЕ
// ЕСТЬ истина, и цена ошибки здесь максимальная: выдуманное воспоминание неотличимо от настоящего, пока
// человек не проверит сам.
//
// Пока эта проверка жила комментарием внутри чтения, её не было видно ни на холсте, ни в исходах прогона —
// то есть строитель не мог знать, что она вообще есть, а журнал не различал «нашлось» и «нашлось, но не
// то». Отдельный узел с собственными исходами делает её ВИДИМОЙ и НЕОТВРАТИМОЙ.
//
// 🔒 ЗАКОН: ВЫДАЧА ПАМЯТИ — КАНДИДАТ, А НЕ ОТВЕТ (`records.md`). Кандидат становится ответом, только
// разрешившись по трём признакам:
//   ЧЕЙ  — провенанс называет ЭТУ автоматизацию (это уже сделало чтение, `recallScoped`);
//   ЧТО  — маркер `[mem#id]` разрешается в ЖИВУЮ локальную запись; маркер в никуда = сирота, а сирота
//          не показывается никому (именно так цитата теряла дату: строку удалили, документ остался);
//   О ЧЁМ — есть общее значимое слово с вопросом, иначе это «рядом по векторам», но не по смыслу.
// Не прошёл хоть один — кандидат отброшен; не осталось ни одного — честный `empty`.
//
// 🔒 ЭТОТ УЗЕЛ НЕ ЗНАЕТ ПРЕДМЕТНОЙ ОБЛАСТИ. Он не проверяет «совпало ли изображение» или «та ли сумма» —
// он проверяет, что найденное РАЗРЕШАЕТСЯ В ЗАПИСЬ. Всё остальное (дата, файл, координаты) живёт в этой
// записи и приходит вместе с ней. Поэтому узел переносится в любую автоматизацию как есть.
// Имя `verifyRecall` — публичный контракт, не переименовывать.
import type { NodeCtx } from "../executor";
import type { Recalled } from "../memory";
import { listRows } from "../rows";

/** Сколько выдержек имеет смысл отдать речи: больше — дороже, а ответ всё равно один короткий. */
const KEEP = 4;

/**
 * Слова САМОГО ОБРАЩЕНИЯ. Они есть в каждом вопросе о памяти («помнишь», «говорили»), поэтому ничего не
 * различают: по ним совпадёт любая реплика, и проверка выродится в «всегда да».
 */
const ASKING_WORDS = new Set([
  "помнишь", "помните", "говорили", "обсуждали", "беседовали", "разговор", "вчера", "тобой",
  "remember", "talked", "discussed", "talking", "about", "conversation", "yesterday",
]);

/**
 * Значимые основы слова. Русские окончания сильно расходятся («велосипеде» / «велосипед»), поэтому
 * сравниваем по первым пяти буквам: они различают предметы и переживают склонение. От четырёх букв —
 * короче в обоих языках почти всегда служебное.
 */
const significant = (s: string): Set<string> =>
  new Set(
    s.toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 4 && !ASKING_WORDS.has(w))
      .map((w) => w.slice(0, 5)),
  );

const onTopic = (question: string, text: string): boolean => {
  const q = significant(question);
  if (!q.size) return true; // в вопросе нет ни одного значимого слова — судить нечем, не отбрасываем
  const t = significant(text);
  for (const w of q) if (t.has(w)) return true;
  return false;
};

export async function verifyRecall(ctx: NodeCtx): Promise<NodeCtx> {
  // Чтение не отработало (не наш класс, память недоступна) — проверять нечего, и это не наш отказ.
  const candidates = Array.isArray(ctx.recallCandidates) ? (ctx.recallCandidates as Recalled[]) : null;
  if (!candidates) return {};
  const question = String(ctx.question ?? ctx.text ?? "").trim();

  // 🔒 ВРЕМЯ БЕРЁТСЯ ИЗ НАШЕЙ ЗАПИСИ, А НЕ ИЗ ПАМЯТИ (закон якоря, `records.md`). У чанка даты нет вовсе —
  // только текст, провенанс и id. Поэтому маркер, положенный при записи, разрешается в строку разговора,
  // и оттуда приходят точные «когда» и «в каком канале». Ради этого второй дом и заведён.
  const rows = await listRows("conversation", Infinity);
  const byMark = new Map(rows.map((r) => [String(r.memRecordId ?? ""), r]));

  let orphaned = 0;
  let offTopic = 0;
  const verified: { at: string; channel: string; kind: string; excerpt: string }[] = [];

  for (const c of candidates) {
    const row = byMark.get(c.memRecordId);
    if (!row) { orphaned++; continue; }              // ЧТО: маркер в никуда — сирота
    if (!onTopic(question, c.text)) { offTopic++; continue; } // О ЧЁМ: рядом по векторам ≠ по смыслу
    verified.push({
      at: String(row.at ?? ""),
      channel: c.channel || String(row.channel ?? ""),
      kind: c.kind,
      excerpt: c.text.length > 200 ? `${c.text.slice(0, 199)}…` : c.text,
    });
    if (verified.length >= KEEP) break;
  }

  if (!verified.length) {
    // Три разные пустоты — и в журнале они обязаны различаться: «чужое» (уже отбросило чтение),
    // «сироты» (запись удалена, документ остался) и «не о том». Иначе непонятно, что чинить.
    return {
      recallOutcome: "empty",
      recallAnswer: "",
      recallSources: [],
      recallOrphaned: orphaned,
      recallOffTopicDropped: offTopic,
    };
  }

  // Материал для речи: выдержки с датами. Формулирует ответ ОНА (закон 312 — один автор ответа).
  const answer = verified.map((s) => `${s.at ? `[${s.at.slice(0, 10)}] ` : ""}${s.excerpt}`).join("\n");

  return {
    recallOutcome: "found",
    recallAnswer: answer,
    recallSources: verified,
    recallOrphaned: orphaned,
    recallOffTopicDropped: offTopic,
  };
}
