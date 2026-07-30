// ФУНКЦИЯ УЗЛА «LOGIC» (transform) — ЗАПРОС АДРЕСА (шаг 308.4, узловой навык). Паритет v1: устройство
// не получает геолокацию автоматически, поэтому «запомни это место» БЕЗ координат → честная просьба
// прислать точку (кнопка «поделиться» в картах) или адрес. Есть координаты (пользователь пошарил точку/
// venue — их пронёс вход-узел в `lat`/`lng`) → узел молчит (`{}`), метку поставит `deliverMap`.
//
// САМО-ГЕЙТ (308.0): работает только когда `place` в `ctx.intent`; иначе пропускает поток. Ничего не
// выдумывает: без координат ставит `needsAddress` и кладёт вопрос в `text`, чтобы ответный узел
// доставил его пользователю (тот же приём, что вопрос «когда?» у календаря). Детерминированно, без модели.
// Имя `askAddress` — публичный контракт, не переименовывать.
import type { NodeCtx } from "../executor";
import { servesIntent } from "../message";

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

export function askAddress(ctx: NodeCtx): NodeCtx {
  if (!servesIntent(ctx, "place")) return {}; // не про место — узел молчит

  const hasCoords = ctx.lat != null && ctx.lng != null;
  if (hasCoords) return {}; // координаты есть — метку поставит deliverMap, спрашивать нечего

  // Координат нет — честно просим адрес (10 языков), точку не выдумываем.
  return { needsAddress: true, text: `${askText.ru}\n\n${askText.en}` };
}
