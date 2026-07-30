// ФУНКЦИЯ УЗЛА «LOGIC» (transform) — РЕГИСТРАЦИЯ ВЛОЖЕНИЯ (шаг 308.5, узловой навык). Паритет v1:
// КАЖДОЕ входящее фото/документ — первоклассная сущность, а не только чек. Скачивает байты (Telegram
// getFile), кладёт объект в хранилище папки (`store.ts`), берёт короткое vision-ОПИСАНИЕ и пишет строку
// в таблицу `storage` со статусом `pending` (до привязки к записи — это делает `linkAttachments`, 308.6).
// Описание фото попадёт в вектор-док записи (308.7), поэтому фото становится НАХОДИМЫМ в памяти.
//
// НЕ гейтится намерением: фото регистрируется всегда (даже фото без денег и без места — оно не теряется,
// лежит pending навсегда). Кладёт `ctx.attachment = {fileKey, rowId, description}` для последующей
// привязки/ингеста. Нет фото → молчит (`{}`). Скачать не удалось / нет ключа → честный `attachmentError`,
// прогон НЕ падает (вложение важно, но его недоступность не должна ронять заметку).
// Описание best-effort: нет ключа/сети → пустое описание, объект всё равно сохранён.
// Имя `storeAttachment` — публичный контракт, не переименовывать.
import type { NodeCtx } from "../executor";
import { downloadTelegramFile, telegramFileUrl } from "../transport";
import { askModelVision } from "../ai";
import { saveObject } from "../store";
import { addRow } from "../rows";

const DESCRIBE = "Describe this image in one short factual sentence (what it shows). For a receipt or document, name the merchant/title. Reply with the sentence only.";

export async function storeAttachment(ctx: NodeCtx): Promise<NodeCtx> {
  const photoFileId = String(ctx.photoFileId ?? "").trim();
  if (!photoFileId) return {}; // нет вложения — узел молчит

  const file = await downloadTelegramFile(photoFileId);
  if (!file) return { attachmentError: "attachment unreachable (no bot token or download failed) — nothing stored" };

  const { key, size } = await saveObject(file.bytes, file.ext);

  // Описание — best-effort через vision по временному URL (объект уже сохранён; описание может дозреть позже).
  let description = "";
  try {
    const url = await telegramFileUrl(photoFileId);
    if (url) description = (await askModelVision({ system: DESCRIBE, user: "Describe the image.", imageUrl: url, maxTokens: 80 })) ?? "";
  } catch {
    description = ""; // провайдер отверг описание — не роняем регистрацию файла
  }

  const row = await addRow("storage", {
    fileKey: key,
    name: `attachment.${file.ext}`,
    kind: "image",
    size,
    description: description.trim(),
    status: "pending",
    source: String(ctx.source ?? "unknown"),
  });

  // Массив (308.6): к записям всплеска может цепляться несколько вложений (интерьер + чек); `linkAttachments`
  // дольёт сюда «висящие» вложения прошлых прогонов. Пустой массив = «нет вложений» для узлов-записей.
  return { attachments: [{ fileKey: key, rowId: row.id, description: description.trim() }] };
}
