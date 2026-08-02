// ЕДИНЫЙ ПУТЬ ЗАГРУЗКИ ФАЙЛА В ОБЪЕКТНОЕ ХРАНИЛИЩЕ — одна копия «как файл попадает в склад» на всё
// приложение. Правило владельца: объектное хранилище ОДНО на проект, поэтому любой файл (хоть через сам
// склад, хоть через строку локальной базы) должен ПОЯВЛЯТЬСЯ ЗАПИСЬЮ СКЛАДА (`table="storage"`), а не просто
// лежать объектом на диске. Кто угодно, кому нужно «положить изображение», зовёт этот хелпер, а не вторую
// реализацию — иначе файл окажется на диске, но в складе его не будет (ровно этот дефект и чинится).
//
// Возвращает id записи склада (это и есть «идентификатор из объектного хранилища», по которому на него
// ссылаются: строка базы кладёт его в `storageIds`) и ключ объекта (по нему рисуется превью через api/files).

export type IngestResult = { storageId: string; fileKey: string };

/**
 * Загрузка ЛЮБОГО объекта (шаг 323). Раньше путь был один — изображение с расширением `jpg` намертво, из-за
 * чего видео, аудио и PDF в склад попасть не могли вовсе. Расширение теперь приходит от вызывающего: оно
 * же определяет и MIME при отдаче (`_lib/store.ts`), и класс объекта в интерфейсе (превью, просмотрщик).
 */
export async function ingestObject(apiBase: string, blob: Blob, name: string, ext: string, kind: string): Promise<IngestResult> {
  // 1) объект на диск объектного хранилища
  const up = await fetch(`${apiBase}/files?ext=${encodeURIComponent(ext)}`, { method: "POST", body: blob });
  const uj = (await up.json()) as { ok?: boolean; key?: string; size?: number; error?: string };
  if (!up.ok || !uj.key) throw new Error(uj.error || "upload failed");
  // 2) ЗАПИСЬ СКЛАДА — вот из-за чего файл виден в таблице объектного хранилища
  const row = await fetch(`${apiBase}/rows`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ table: "storage", values: { name: name || kind, kind, fileKey: uj.key, size: uj.size } }),
  });
  const rj = (await row.json()) as { ok?: boolean; row?: { id?: string }; error?: string };
  if (!row.ok || !rj.row?.id) throw new Error(rj.error || "storage row failed");
  return { storageId: rj.row.id, fileKey: uj.key };
}

/** Прежнее имя — публичный контракт (его зовёт строка локальной базы): изображение после обрезки, `jpg`. */
export async function ingestImage(apiBase: string, blob: Blob, name: string): Promise<IngestResult> {
  return ingestObject(apiBase, blob, name || "Image", "jpg", "image");
}
