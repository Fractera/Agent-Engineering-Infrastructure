// ФУНКЦИЯ УЗЛА «OUTPUT» (канал vector-memory) — запоминает захваченное сообщение как ФАКТ:
// пишет его в LightRAG (собственный вызов папки — `_lib/memory.ts`, провенанс с уникальным хвостом)
// и кладёт видимую строку в таблицу `vector-memory`, которую читает вкладка (поля клиента: name ·
// content · storageIds · createdAt). Двойная запись — не дубль истины: LightRAG хранит СМЫСЛ (вектор),
// строка — видимый ОТЧЁТ о факте с его track id.
//
// 🔒 СИНЕРГИЯ ВЕКТОР/SQL (шаг 308.1, паритет v1): в память идёт ПОЛНЫЙ исходный текст (включая полную
// расшифровку голоса) — `ctx.original`, который оставляет `aiTransform`; а обычная БД (`deliverDatabase`)
// пишет краткое `ctx.text` (summary). Так recall находит заметку по словам, которых в summary НЕТ.
// Без `aiTransform` (простой стартер) `ctx.original` отсутствует → память берёт `ctx.text` как раньше
// (backward-compat: смысл памяти не меняется, если summary не делался).
//
// Сервиса памяти нет на сервере → честный ПРОПУСК с причиной (проект без LightRAG не теряет развозку);
// сервис ответил отказом → бросок (`rememberFact` бросает сам).
// Имя `deliverVectorMemory` — публичный контракт, не переименовывать.
import type { NodeCtx } from "../executor";
import { rememberFact } from "../memory";
import { messageOf } from "../message";
import { addRow } from "../rows";

export async function deliverVectorMemory(ctx: NodeCtx): Promise<{ vectorMemoryDelivery: string; vectorRowId?: string }> {
  const m = messageOf(ctx);
  // Полный текст для памяти: оригинал важнее summary; без оригинала — само сообщение (простой стартер).
  const fullText = String(ctx.original ?? ctx.text ?? "").trim() || m.text;
  const trackId = await rememberFact(fullText, m.source, m.botId);
  if (trackId === null) {
    return { vectorMemoryDelivery: "skipped: the vector-memory service (LightRAG) is unreachable on this server" };
  }
  // Привязка вложений всплеска (308.6): факт памяти держит ссылки на объекты этого прогона.
  const atts = Array.isArray(ctx.attachments) ? (ctx.attachments as { fileKey: string }[]) : [];
  const row = await addRow("vector-memory", { name: m.title, content: fullText, storageIds: atts.map((a) => a.fileKey).filter(Boolean), source: m.source, trackId });
  return { vectorMemoryDelivery: `remembered ${trackId}`, vectorRowId: row.id };
}
