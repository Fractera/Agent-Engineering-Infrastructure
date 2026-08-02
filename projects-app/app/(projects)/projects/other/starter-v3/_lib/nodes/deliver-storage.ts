// ФУНКЦИЯ УЗЛА «OUTPUT» (канал storage) — сохраняет захваченное сообщение ФАЙЛОМ в объектное
// хранилище папки (`_lib/store.ts` → `_data/runtime/objects/`, `.txt`) и кладёт строку-ссылку в
// таблицу `storage`, которую читает вкладка (поля клиента: fileKey · name · kind · size · createdAt).
// Строка держит ссылку (`fileKey`), байты живут в хранилище — связь «база → склад» из закона складов.
//
// Имя `deliverStorage` — публичный контракт, не переименовывать.
import type { NodeCtx } from "../executor";
import { messageOf, mayWriteEntity } from "../message";
import { addEntityRow } from "../rows";
import { saveObject } from "../store";

export async function deliverStorage(ctx: NodeCtx): Promise<{ storageFileKey: string; storageRowId: string }> {
  // 🔒 ГЕЙТ СТОИТ ДО `saveObject` (шаг 311.9а): байты — тоже запись в склад, и прогон-вопрос не вправе
  // её оставить. `addEntityRow` ниже держит то же правило для строки; здесь проверка нужна раньше,
  // потому что файл пишется до строки. Одна формулировка правила на оба места — `mayWriteEntity`.
  if (!mayWriteEntity(ctx)) return { storageFileKey: "", storageRowId: "" };
  const m = messageOf(ctx);

  // 🔒 ОБЪЕКТЫ ПРОГОНА ВАЖНЕЕ ТЕКСТА (311.7). Если середина уже принесла файлы (`ctx.attachments` —
  // например изображение добытого предмета), склад регистрирует ИХ: байты уже лежат в хранилище, здесь
  // рождается видимая строка со ссылкой. Иначе — прежнее поведение: сохранить сообщение файлом `.txt`,
  // чтобы у прогона всё равно остался объект. Разделение труда: середина ДОБЫВАЕТ байты, выход
  // РЕГИСТРИРУЕТ их видимой строкой.
  const atts = Array.isArray(ctx.attachments) ? (ctx.attachments as { fileKey: string; description?: string }[]) : [];
  const first = atts.find((a) => a.fileKey);
  if (first) {
    const row = await addEntityRow("storage", {
      fileKey: first.fileKey,
      name: String(first.description || m.title || "object"),
      kind: "object",
      source: m.source,
    }, ctx);
    if (!row) return { storageFileKey: "", storageRowId: "" };
    return { storageFileKey: first.fileKey, storageRowId: row.id };
  }

  // 🔒 БЕЗ ОБЪЕКТОВ — НЕТ ЗАПИСИ СКЛАДА (шаг 323, разбор владельца). Прежде здесь сохранялось САМО
  // СООБЩЕНИЕ файлом `.txt` — «чтобы у прогона всё равно остался объект» (решение шага 300). После закона
  // записи (311.9а) это стало ТРЕТЬЕЙ копией одного текста: он уже лежит в поисковом индексе и саммари в
  // записи базы. Склад объектов хранит то, что прогон ДОБЫЛ, а не пересериализацию его сообщения.
  // Текст как ЗАГРУЖЕННЫЙ объект остаётся законным — его кладёт человек кнопкой, а не эта ветка.
  return { storageFileKey: "", storageRowId: "" };
}
