// ФУНКЦИЯ УЗЛА «OUTPUT» (канал vector-memory) — запоминает захваченное сообщение как ФАКТ:
// пишет его в LightRAG (собственный вызов папки — `_lib/memory.ts`, провенанс с уникальным хвостом)
// и кладёт видимую строку в таблицу `vector-memory`, которую читает вкладка (поля клиента: name ·
// content · storageIds · createdAt). Двойная запись — не дубль истины: LightRAG хранит СМЫСЛ (вектор),
// строка — видимый ОТЧЁТ о факте с его track id.
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
  const trackId = await rememberFact(m.text, m.source, m.botId);
  if (trackId === null) {
    return { vectorMemoryDelivery: "skipped: the vector-memory service (LightRAG) is unreachable on this server" };
  }
  const row = await addRow("vector-memory", { name: m.title, content: m.text, storageIds: [], source: m.source, trackId });
  return { vectorMemoryDelivery: `remembered ${trackId}`, vectorRowId: row.id };
}
