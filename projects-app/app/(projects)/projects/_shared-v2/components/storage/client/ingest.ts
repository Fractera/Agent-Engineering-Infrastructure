// ЕДИНЫЙ ПУТЬ ЗАГРУЗКИ ФАЙЛА В ОБЪЕКТНОЕ ХРАНИЛИЩЕ — одна копия «как файл попадает в склад» на всё
// приложение. Правило владельца: объектное хранилище ОДНО на проект, поэтому любой файл (хоть через сам
// склад, хоть через строку локальной базы) должен ПОЯВЛЯТЬСЯ ЗАПИСЬЮ СКЛАДА (`table="storage"`), а не просто
// лежать объектом на диске. Кто угодно, кому нужно «положить изображение», зовёт этот хелпер, а не вторую
// реализацию — иначе файл окажется на диске, но в складе его не будет (ровно этот дефект и чинится).
//
// Возвращает id записи склада (это и есть «идентификатор из объектного хранилища», по которому на него
// ссылаются: строка базы кладёт его в `storageIds`) и ключ объекта (по нему рисуется превью через api/files).

export type IngestResult = { storageId: string; fileKey: string };

export async function ingestImage(apiBase: string, blob: Blob, name: string): Promise<IngestResult> {
  // 1) объект на диск объектного хранилища
  const up = await fetch(`${apiBase}/files?ext=jpg`, { method: "POST", body: blob });
  const uj = (await up.json()) as { ok?: boolean; key?: string; size?: number; error?: string };
  if (!up.ok || !uj.key) throw new Error(uj.error || "upload failed");
  // 2) ЗАПИСЬ СКЛАДА — вот из-за чего файл виден в таблице объектного хранилища
  const row = await fetch(`${apiBase}/rows`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ table: "storage", values: { name: name || "Image", kind: "image", fileKey: uj.key, size: uj.size } }),
  });
  const rj = (await row.json()) as { ok?: boolean; row?: { id?: string }; error?: string };
  if (!row.ok || !rj.row?.id) throw new Error(rj.error || "storage row failed");
  return { storageId: rj.row.id, fileKey: uj.key };
}
