// ФУНКЦИЯ УЗЛА «INPUT» (канал user-telegram-chat) — сообщение из ЛИЧНОГО чата пользователя с ботом
// (чат связывается нативной дверью `api/telegram/link`, шаг 296). Слушатель толкает его в дверь
// запуска (`POST api/run { source: "user-telegram-chat", … }`), узел нормализует в общий `Message`.
//
// От `telegram-bot` канал отличается АДРЕСАТОМ: там пишут боту автоматизации (заявки извне), здесь —
// пользователь в своём личном чате (его собственные заметки). Ключи канала объявлены на узле в ядре;
// нормализация ключей не требует. Пустое сообщение — отказ у двери.
//
// ВЛОЖЕНИЯ (шаг 308.2): слушатель шлёт `photoFileId` (самый большой PhotoSize) и `location`
// ({lat,lng,title}); сырой апдейт лежит в `ctx.update.message`. Узел проносит их в `Message`
// (`photoFileId`, `lat`/`lng`, `placeTitle`) — так одно сообщение может быть чеком-фото или шарингом
// места, а не только текстом. Подпись к фото (`caption`) считается текстом. ПУСТОЕ теперь = ни текста,
// ни фото, ни локации (фото-чек без слов — законный вход).
// Имя `receiveUserTelegramChat` — публичный контракт, не переименовывать.
import type { NodeCtx } from "../executor";
import { captured, channelOf, emptyInput, numberField, refuse } from "../message";

type Raw = Record<string, unknown>;
const obj = (v: unknown): Raw => (v && typeof v === "object" ? (v as Raw) : {});

export function receiveUserTelegramChat(ctx: NodeCtx): NodeCtx {
  if (channelOf(ctx) !== "user-telegram-chat") return {};

  // Сырой telegram-апдейт: слушатель кладёт его в `ctx.update.message`; старый путь — `ctx.message`.
  const update = obj(obj(ctx.update).message ?? ctx.message);

  // Текст = envelope-текст, либо текст/подпись сырого апдейта.
  const text = String(ctx.text ?? update.text ?? update.caption ?? "").trim();

  // Фото: envelope-`photoFileId` (слушатель уже выбрал самый большой), либо самый большой PhotoSize сырого.
  const photos = Array.isArray(update.photo) ? (update.photo as Raw[]) : [];
  const photoFileId =
    String(ctx.photoFileId ?? "").trim() ||
    (photos.length ? String(photos[photos.length - 1]?.file_id ?? "").trim() : "");

  // Локация: envelope-`location` {lat,lng,title}, либо `location`/`venue` сырого апдейта.
  const envLoc = obj(ctx.location);
  const rawLoc = obj(update.location);
  const lat = numberField(envLoc.lat ?? rawLoc.latitude);
  const lng = numberField(envLoc.lng ?? rawLoc.longitude);
  const placeTitle = String(envLoc.title ?? obj(update.venue).title ?? "").trim();
  const hasLocation = lat !== undefined && lng !== undefined;

  // Пустое = ни текста, ни фото, ни локации (законный вход теперь включает чек-фото без слов).
  if (!text && !photoFileId && !hasLocation) refuse(emptyInput("user-telegram-chat"));

  const chatId = String(ctx.telegramChatId ?? ctx.chatId ?? obj(update.chat).id ?? "").trim();

  return {
    ...captured(ctx, "user-telegram-chat", text),
    ...(photoFileId ? { photoFileId } : {}),
    ...(hasLocation ? { lat, lng } : {}),
    ...(placeTitle ? { placeTitle } : {}),
    ...(chatId ? { telegramChatId: chatId } : {}),
  };
}
