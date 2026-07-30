// ФУНКЦИЯ УЗЛА «LOGIC» (transform) — ПРИВЯЗКА ВЛОЖЕНИЙ (шаг 308.6, узловой навык). Реализует связь
// всех-ко-всем из v1 (узел link-images): фото/документы цепляются к записям всплеска сообщений В ЛЮБОМ
// ПОРЯДКЕ прибытия. Работает в паре с creation-time привязкой: узлы-записи (`deliverDatabase`/
// `deliverVectorMemory`) читают `ctx.attachments` и уже несут ссылки на объекты ЭТОГО прогона. Этот узел
// закрывает ДВА кросс-прогонных случая:
//   1. ПОДХВАТ «висящих» вложений прошлых прогонов (storage status:pending) → доливает их в
//      `ctx.attachments`, чтобы записи ЭТОГО прогона понесли и их, и помечает те строки linked.
//   2. ПОЗДНЕЕ ФОТО без своей записи (прогон не создаёт запись — напр. только recall) → до-привязывает
//      вложения к ПОСЛЕДНЕЙ «голой» записи (без storageIds) и метит её на пере-индексацию (`reindexNeeded`),
//      чтобы описание фото вошло в её вектор-док (308.7). Некуда привязать → оставляет pending (не теряем).
//
// Ставит `ctx.reindex`, если что-то связалось — сигнал памяти пере-ингестировать с описаниями вложений.
// Имя `linkAttachments` — публичный контракт, не переименовывать.
import type { NodeCtx } from "../executor";
import { listRows, updateRow } from "../rows";

type Att = { fileKey: string; rowId: string; description: string };
const RECORD_TABLES = ["database", "finance", "map"];

export async function linkAttachments(ctx: NodeCtx): Promise<NodeCtx> {
  const mine: Att[] = Array.isArray(ctx.attachments) ? (ctx.attachments as Att[]) : [];

  // Висящие вложения прошлых прогонов (не из этого прогона).
  const storage = await listRows("storage", Infinity);
  const pending: Att[] = storage
    .filter((r) => r.status === "pending" && r.kind === "image" && !mine.some((a) => a.rowId === r.id))
    .map((r) => ({ fileKey: String(r.fileKey ?? ""), rowId: r.id, description: String(r.description ?? "") }))
    .filter((a) => a.fileKey);

  const all = [...mine, ...pending];
  if (!all.length) return {}; // связывать нечего

  const intent = Array.isArray(ctx.intent) ? ctx.intent.map(String) : [];
  const producesRecord = intent.length === 0 || intent.some((i) => i === "save" || i === "finance" || i === "place");

  if (producesRecord) {
    // Записи этого прогона понесут `ctx.attachments` при создании — только доливаем набор и метим pending.
    for (const a of pending) await updateRow("storage", a.rowId, { status: "linked" });
    return { attachments: all, reindex: true };
  }

  // Записи в этом прогоне не рождаются (напр. только recall) → до-привязываем к ПОСЛЕДНЕЙ голой записи.
  const bare: { table: string; id: string; createdAt: string; storageIds: string[] }[] = [];
  for (const t of RECORD_TABLES) {
    for (const r of await listRows(t, Infinity)) {
      const sids = Array.isArray(r.storageIds) ? (r.storageIds as string[]) : [];
      if (!sids.length) bare.push({ table: t, id: r.id, createdAt: String(r.createdAt ?? ""), storageIds: sids });
    }
  }
  bare.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const target = bare[0];
  if (!target) return { lateLinked: [], pendingKept: all.length }; // некуда — честно оставляем pending

  const fileKeys = all.map((a) => a.fileKey);
  await updateRow(target.table, target.id, { storageIds: fileKeys, reindexNeeded: true });
  for (const a of all) await updateRow("storage", a.rowId, { status: "linked", linkedTo: `${target.table}/${target.id}` });
  return { lateLinked: [{ table: target.table, id: target.id, files: fileKeys }], reindex: true };
}
