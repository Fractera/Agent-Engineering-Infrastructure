// ТИП ОБЪЕКТА — выводится из КЛЮЧА, а не хранится отдельным полем (шаг 323).
//
// Ключ объекта уже несёт расширение (`obj<время><случайное>.pdf`), поэтому заводить в строке склада ещё
// одно поле «тип» значило бы завести второй дом одного факта: два места могли бы разойтись, и разошлись бы.
//
// Зачем классы, а не сырое расширение: превью и просмотрщик выбираются по КЛАССУ (картинку показать,
// видео проиграть, PDF открыть), а расширений в каждом классе много.

export type MediaKind = "image" | "video" | "audio" | "pdf" | "text" | "other";

const BY_EXT: Record<string, MediaKind> = {
  jpg: "image", jpeg: "image", png: "image", webp: "image", gif: "image", svg: "image",
  mp4: "video", webm: "video", mov: "video",
  mp3: "audio", wav: "audio", ogg: "audio", m4a: "audio",
  pdf: "pdf",
  txt: "text", md: "text", html: "text", xml: "text", json: "text", csv: "text",
};

/** Расширение ключа объекта, в нижнем регистре. Пустая строка — ключа нет. */
export const extOfKey = (fileKey: unknown): string => {
  const s = String(fileKey ?? "").trim().toLowerCase();
  const i = s.lastIndexOf(".");
  return i > 0 ? s.slice(i + 1) : "";
};

/** Класс объекта по его ключу. Неизвестное расширение — `other`, и это честный ответ, а не догадка. */
export const mediaKindOf = (fileKey: unknown): MediaKind => BY_EXT[extOfKey(fileKey)] ?? "other";

/**
 * Подпись для контейнера превью, когда картинки нет: `PDF`, `MP4`, `XML`… Одна строка, без переноса —
 * рисуется в квадрате того же размера, что миниатюра изображения. Пустой ключ → прочерк.
 */
export const previewLabelOf = (fileKey: unknown): string => {
  const ext = extOfKey(fileKey);
  return ext ? ext.toUpperCase().slice(0, 5) : "—";
};
