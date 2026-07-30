// ФУНКЦИЯ УЗЛА «OUTPUT» (канал storage) — сохраняет захваченное сообщение ФАЙЛОМ в объектное
// хранилище папки (`_lib/store.ts` → `_data/runtime/objects/`, `.txt`) и кладёт строку-ссылку в
// таблицу `storage`, которую читает вкладка (поля клиента: fileKey · name · kind · size · createdAt).
// Строка держит ссылку (`fileKey`), байты живут в хранилище — связь «база → склад» из закона складов.
//
// Имя `deliverStorage` — публичный контракт, не переименовывать.
import type { NodeCtx } from "../executor";
import { messageOf } from "../message";
import { addRow } from "../rows";
import { saveObject } from "../store";
import { crossLink } from "../components/links/cross-link";

export async function deliverStorage(ctx: NodeCtx): Promise<{ storageFileKey: string; storageRowId: string }> {
  const m = messageOf(ctx);
  const body = `${m.title}\n${"=".repeat(Math.min(m.title.length, 80))}\ncaptured: ${m.at}\nsource: ${m.source}\n\n${m.text}\n`;
  const { key, size } = await saveObject(Buffer.from(body, "utf8"), "txt");
  const row = await addRow("storage", { fileKey: key, name: `${m.title || "message"}.txt`, kind: "text", size, source: m.source });
  await crossLink(ctx, "storage", row.id); // связь всех-ко-всем (309)
  return { storageFileKey: key, storageRowId: row.id };
}
