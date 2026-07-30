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
import { randomBytes } from "node:crypto";
import type { NodeCtx } from "../executor";
import { rememberFact } from "../memory";
import { messageOf, servesAnyIntent } from "../message";
import { addRow } from "../rows";

const CONTENT_INTENTS = ["save", "finance", "place"] as const;

export async function deliverVectorMemory(ctx: NodeCtx): Promise<{ vectorMemoryDelivery: string; vectorRowId?: string }> {
  // Память (308.8): запоминаем содержательные намерения (save|finance|place — заметки, траты, места), НЕ
  // чистый recall (вопрос не запоминаем). Backward-compat: нет классификатора → запоминаем как раньше.
  if (!servesAnyIntent(ctx, CONTENT_INTENTS)) return { vectorMemoryDelivery: "skipped: not a content intent" };
  const m = messageOf(ctx);
  // Полный текст для памяти. Приоритет: ПОЛНАЯ КОПИЯ ЧЕКА (309, `financeMemory` от digitizeMoney — магазин,
  // все позиции, кол-во, цены, итог) → оригинал сообщения → summary. Так recall отвечает по позициям чека
  // («сколько на черешню»), а не только по краткой сводке.
  const fullText = String(ctx.financeMemory ?? ctx.original ?? ctx.text ?? "").trim() || m.text;
  // Привязка вложений всплеска (308.6): факт памяти держит ссылки на объекты + их описания (308.7).
  const atts = Array.isArray(ctx.attachments) ? (ctx.attachments as { fileKey: string; description?: string }[]) : [];
  const fileKeys = atts.map((a) => a.fileKey).filter(Boolean);
  const descLines = atts.map((a) => String(a.description ?? "").trim()).filter(Boolean);

  // 🔒 ОБРАТНЫЙ МАРКЕР (шаг 308.7, паритет v1): id строки известен ДО ингеста, чтобы вложить `[mem#id]` в
  // ТЕКСТ памяти. Ответ памяти, процитировавший маркер, разрешается в эту строку И её картинки за O(1)
  // (recall снимает маркер из видимого текста). Описания вложений идут в тот же док → фото НАХОДИМО в памяти.
  const recordId = `mem${Date.now().toString(36)}${randomBytes(4).toString("hex")}`;
  const ingestText =
    `[mem#${recordId}] ${fullText}` + (descLines.length ? ` — attachments: ${descLines.join("; ")}` : "");

  const trackId = await rememberFact(ingestText, m.source, m.botId);
  if (trackId === null) {
    return { vectorMemoryDelivery: "skipped: the vector-memory service (LightRAG) is unreachable on this server" };
  }
  const row = await addRow("vector-memory", { name: m.title, content: fullText, storageIds: fileKeys, source: m.source, trackId }, recordId);
  return { vectorMemoryDelivery: `remembered ${trackId}`, vectorRowId: row.id };
}
