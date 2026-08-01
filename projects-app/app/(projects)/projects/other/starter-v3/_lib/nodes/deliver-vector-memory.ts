// ФУНКЦИЯ УЗЛА «OUTPUT» (канал vector-memory) — запоминает захваченное сообщение как ФАКТ:
// пишет его в LightRAG (собственный вызов папки — `_lib/memory.ts`, провенанс с уникальным хвостом)
// и кладёт видимую строку в таблицу `vector-memory`, которую читает вкладка (поля клиента: name ·
// content · storageIds · createdAt). Двойная запись — не дубль истины: LightRAG хранит СМЫСЛ (вектор),
// строка — видимый ОТЧЁТ о факте с его track id.
//
// 🔒 СИНЕРГИЯ ВЕКТОР/SQL: в память идёт ПОЛНЫЙ исходный текст (`ctx.original`, если середина оставила
// его, сделав краткую сводку), а обычная БД пишет то, что несёт сообщение. Так поиск находит запись по
// словам, которых в сводке НЕТ. Середина сводку не делала → память берёт текст как есть.
//
// 🔒 НЕЙТРАЛЬНОСТЬ (шаг 311.6): отсюда убран домен v2 — словарь `save|finance|place` и `financeMemory`
// («полная копия чека: магазин, позиции, количества, цены»). Склад хранит СМЫСЛ произвольной записи, а
// что это за запись — знает середина. Тест: замени «предмет» на заявку, деталь, пациента — файл не
// меняется.
//
// Сервиса памяти нет на сервере → честный ПРОПУСК с причиной (проект без LightRAG не теряет развозку);
// сервис ответил отказом → бросок (`rememberFact` бросает сам).
// Имя `deliverVectorMemory` — публичный контракт, не переименовывать.
import { randomBytes } from "node:crypto";
import type { NodeCtx } from "../executor";
import { rememberFact } from "../memory";
import { messageOf, servesAnyClass, RECORDING_CLASSES } from "../message";
import { addRow } from "../rows";
import { crossLink } from "../components/links/cross-link";

export async function deliverVectorMemory(ctx: NodeCtx): Promise<{ vectorMemoryDelivery: string; vectorRowId?: string }> {
  // ВОПРОС НЕ ЗАПОМИНАЕМ: память наполняют только те классы, после которых прогон оставляет данные.
  if (!servesAnyClass(ctx, RECORDING_CLASSES)) return { vectorMemoryDelivery: "skipped: this request class leaves no record" };
  const m = messageOf(ctx);
  // Полный текст для памяти: оригинал (если середина делала сводку) → иначе текст сообщения.
  const fullText = String(ctx.original ?? ctx.text ?? "").trim() || m.text;
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
  await crossLink(ctx, "vector-memory", row.id); // связь всех-ко-всем (309): вектор ↔ объекты этого прогона
  return { vectorMemoryDelivery: `remembered ${trackId}`, vectorRowId: row.id };
}
