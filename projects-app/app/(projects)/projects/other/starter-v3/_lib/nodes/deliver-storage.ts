// ФУНКЦИЯ УЗЛА «OUTPUT» (канал storage) — сохраняет захваченное сообщение ФАЙЛОМ в объектное
// хранилище папки (`_lib/store.ts` → `_data/runtime/objects/`, `.txt`) и кладёт строку-ссылку в
// таблицу `storage`, которую читает вкладка (поля клиента: fileKey · name · kind · size · createdAt).
// Строка держит ссылку (`fileKey`), байты живут в хранилище — связь «база → склад» из закона складов.
//
// Имя `deliverStorage` — публичный контракт, не переименовывать.
import type { NodeCtx } from "../executor";
import { messageOf, storesSkipped } from "../message";
import { addRow } from "../rows";
import { saveObject } from "../store";
import { crossLink } from "../components/links/cross-link";

export async function deliverStorage(ctx: NodeCtx): Promise<{ storageFileKey: string; storageRowId: string }> {
  // Середина сказала: сохранять нечего (напр. предмет не найден) — молчим (311.7).
  if (storesSkipped(ctx)) return { storageFileKey: "", storageRowId: "" };
  const m = messageOf(ctx);

  // 🔒 ОБЪЕКТЫ ПРОГОНА ВАЖНЕЕ ТЕКСТА (311.7). Если середина уже принесла файлы (`ctx.attachments` —
  // например изображение добытого предмета), склад регистрирует ИХ: байты уже лежат в хранилище, здесь
  // рождается видимая строка со ссылкой. Иначе — прежнее поведение: сохранить сообщение файлом `.txt`,
  // чтобы у прогона всё равно остался объект. Разделение труда: середина ДОБЫВАЕТ байты, выход
  // РЕГИСТРИРУЕТ их видимой строкой.
  const atts = Array.isArray(ctx.attachments) ? (ctx.attachments as { fileKey: string; description?: string }[]) : [];
  const first = atts.find((a) => a.fileKey);
  if (first) {
    const row = await addRow("storage", {
      fileKey: first.fileKey,
      name: String(first.description || m.title || "object"),
      kind: "object",
      source: m.source,
    });
    await crossLink(ctx, "storage", row.id);
    return { storageFileKey: first.fileKey, storageRowId: row.id };
  }

  const body = `${m.title}\n${"=".repeat(Math.min(m.title.length, 80))}\ncaptured: ${m.at}\nsource: ${m.source}\n\n${m.text}\n`;
  const { key, size } = await saveObject(Buffer.from(body, "utf8"), "txt");
  const row = await addRow("storage", { fileKey: key, name: `${m.title || "message"}.txt`, kind: "text", size, source: m.source });
  await crossLink(ctx, "storage", row.id); // связь всех-ко-всем (309)
  return { storageFileKey: key, storageRowId: row.id };
}
