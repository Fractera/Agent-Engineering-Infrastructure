// ФУНКЦИЯ УЗЛА «LOGIC» (transform) — ГЕОМЕТКА (шаг 308, модель v1 207.20 «geo-mark», правило R7).
// Локация — первоклассная геометка, которая живёт PENDING и связывается с описанием в ЛЮБОМ порядке
// прибытия (как фото у storeAttachment/linkAttachments). Три случая, все внутри одного узла (гейт `place`):
//   1) координаты + описание в ОДНОМ сообщении → полная метка сразу;
//   2) координаты БЕЗ описания (пользователь пошарил точку отдельно) → PENDING-метка + «что здесь?»;
//   3) описание БЕЗ координат → привязать к последней PENDING-метке (та самая «точку прислал раньше»);
//      pending-метки нет → честно просим точку/адрес (устройство не берёт гео само — паритет v1).
// Метку создаёт/связывает ЭТОТ узел (не deliverMap): он ставит `skipMap`, чтобы выход не задвоил строку.
// Имя `askAddress` — публичный контракт, не переименовывать.
import type { NodeCtx } from "../executor";
import { servesIntent } from "../message";
import { listRows, addRow, updateRow } from "../rows";

const askText = {
  en: "Which place is this? Share the location (the paperclip → Location in Telegram) or send the address with latitude/longitude.",
  es: "¿Qué lugar es? Comparte la ubicación (clip → Ubicación en Telegram) o envía la dirección con latitud/longitud.",
  fr: "Quel est ce lieu ? Partage la position (trombone → Position dans Telegram) ou envoie l'adresse avec latitude/longitude.",
  it: "Che luogo è? Condividi la posizione (graffetta → Posizione in Telegram) o invia l'indirizzo con latitudine/longitudine.",
  ru: "Что это за место? Пришли точку (скрепка → Геопозиция в Telegram) или адрес с широтой/долготой.",
  de: "Welcher Ort ist das? Teile den Standort (Büroklammer → Standort in Telegram) oder sende die Adresse mit Breiten-/Längengrad.",
  pt: "Que lugar é este? Partilha a localização (clipe → Localização no Telegram) ou envia a morada com latitude/longitude.",
  pl: "Co to za miejsce? Udostępnij lokalizację (spinacz → Lokalizacja w Telegramie) lub wyślij adres z szerokością/długością.",
  tr: "Burası neresi? Konumu paylaş (ataç → Konum, Telegram'da) ya da enlem/boylam ile adresi gönder.",
  nl: "Welke plek is dit? Deel de locatie (paperclip → Locatie in Telegram) of stuur het adres met breedte-/lengtegraad.",
};
const gotPoint = {
  en: "📍 Point saved. What is here? Write it and I'll remember this place.",
  ru: "📍 Точку записал. Что здесь? Напиши — и я запомню это место.",
};
const saved = (desc: string) => ({ en: `📍 Place saved: ${desc}`, ru: `📍 Место записано: ${desc}` });

export async function askAddress(ctx: NodeCtx): Promise<NodeCtx> {
  if (!servesIntent(ctx, "place")) return {}; // не про место — узел молчит

  const text = String(ctx.text ?? "").trim();
  const placeTitle = String(ctx.placeTitle ?? "").trim();
  const hasCoords = ctx.lat != null && ctx.lng != null;

  if (hasCoords) {
    const desc = text || placeTitle;
    await addRow("map", {
      lat: ctx.lat, lng: ctx.lng, title: desc, place: placeTitle,
      status: desc ? "linked" : "pending", source: String(ctx.source ?? "unknown"), date: String(ctx.at ?? new Date().toISOString()),
    });
    // Есть описание → метка полная; нет → PENDING, просим описание. skipMap: строку уже создали здесь.
    return desc
      ? { skipMap: true, text: `${saved(desc).ru}\n${saved(desc).en}` }
      : { skipMap: true, needDescription: true, text: `${gotPoint.ru}\n\n${gotPoint.en}` };
  }

  // Координат в этом сообщении нет. Если это описание — привязать к последней PENDING-метке (точка пришла
  // раньше отдельным сообщением — «любой порядок» v1). Метка pending = координаты есть, описания нет.
  if (text) {
    const rows = await listRows("map", Infinity);
    const pending = rows.find((r) => r.status === "pending" && !String(r.title ?? "").trim());
    if (pending) {
      await updateRow("map", pending.id, { title: text, place: text, status: "linked" });
      return { skipMap: true, text: `${saved(text).ru}\n${saved(text).en}` };
    }
  }

  // Ни координат, ни pending-метки → честно просим точку/адрес (точку не выдумываем).
  return { needsAddress: true, skipMap: true, text: `${askText.ru}\n\n${askText.en}` };
}
