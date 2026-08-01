// СРЕДИННЫЙ УЗЕЛ — СОХРАНИТЬ ФАЙЛ ПРЕДМЕТА (шаг 311.7). Вторая грань предмета: у добытого предмета есть
// изображение по адресу, и адрес — не файл. Узел скачивает байты и кладёт их в объектное хранилище папки,
// после чего запись сможет сослаться на объект ключом (`fileKey`), а не чужой ссылкой, которая завтра
// умрёт.
//
// ПОЧЕМУ ЭТО СЕРЕДИНА, А НЕ ВЫХОД. Выход `storage` доставляет то, что ему дали; ДОБЫТЬ байты по адресу —
// работа над данными, то есть середина. Тот же принцип, по которому добыча сведений живёт в
// `fetchExternal`, а не в двери.
//
// ЧЕСТНЫЕ ИСХОДЫ (прогон не роняем — предмет без картинки остаётся предметом):
//   изображения нет  → молчим (`{}`), запись пойдёт без файла;
//   скачать не вышло → `objectError`, поток идёт дальше;
//   получилось       → `attachments[]` — их читают склады записи и памяти по общему контракту.
// Имя `keepObject` — глагол ФОРМЫ.
import type { NodeCtx } from "../executor";
import { saveObject } from "../store";

// 🔒 КОНТАКТ В USER-AGENT ОБЯЗАТЕЛЕН (доказано живьём 311.7): Wikimedia отвечает 403 на обращение без
// адреса в UA — это их политика, а не наш баг. Без контакта узел молча деградировал бы в «не нашлось».
const UA = "Fractera-Automation/1.0 (+https://fractera.ai; open encyclopedic lookup)";
const MAX_BYTES = 8 * 1024 * 1024; // разумный предел: экспонату не нужен многомегабайтный оригинал

function extOf(url: string): string {
  const m = /\.([a-z0-9]{3,4})(?:\?|#|$)/i.exec(url);
  const ext = (m?.[1] ?? "jpg").toLowerCase();
  return ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext) ? ext : "jpg";
}

export async function keepObject(ctx: NodeCtx): Promise<NodeCtx> {
  const subject = (ctx.subject && typeof ctx.subject === "object" ? ctx.subject : null) as { imageUrl?: string; name?: string } | null;
  const url = String(subject?.imageUrl ?? "").trim();
  if (!url) return {}; // предмет без изображения — законный случай, не ошибка

  try {
    const r = await fetch(url, { headers: { "user-agent": UA } });
    if (!r.ok) return { objectError: `the image source answered ${r.status}` };
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.byteLength > MAX_BYTES) return { objectError: `the image is larger than ${MAX_BYTES} bytes` };
    const { key, size } = await saveObject(buf, extOf(url));
    // Общий контракт вложений: список объектов этого прогона, который читают склады.
    const previous = Array.isArray(ctx.attachments) ? (ctx.attachments as unknown[]) : [];
    return {
      attachments: [...previous, { fileKey: key, description: String(subject?.name ?? "").trim() }],
      objectKept: { fileKey: key, size },
    };
  } catch (e) {
    return { objectError: e instanceof Error ? e.message : String(e) };
  }
}
