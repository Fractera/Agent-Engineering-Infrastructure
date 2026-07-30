// РЕЕСТР ФУНКЦИЙ УЗЛОВ — статическая карта `имя функции (как в ядре) → сама функция`.
//
// Почему статический реестр, а не динамический import по имени: в route-group `(projects)` шаблонные
// import'ы не резолвятся в рантайме (урок v1 `_generated/executables.ts`). Поэтому обычные импорты +
// объект. Имя ключа = `function.name` узла в automation.json (публичный контракт, уникально по графу).
//
// Шаг 300: КАЖДЫЙ узел инвентаря несёт реальную функцию — ни одно имя ядра больше не указывает на
// несуществующий файл. Новый канал = новый файл + новая строка здесь (добавление аддитивно, закон 2).
import type { NodeFn } from "../executor";
import { receiveRequest } from "./receive-request";
import { receiveWebhook } from "./receive-webhook";
import { receiveCron } from "./receive-cron";
import { receivePublicPage } from "./receive-public-page";
import { receiveTelegramBot } from "./receive-telegram-bot";
import { receiveUserTelegramChat } from "./receive-user-telegram-chat";
import { receiveEmail } from "./receive-email";
import { receiveFromExternal } from "./receive-from-external";
import { transformPayload } from "./transform-payload";
import { classifyIntent } from "./classify-intent";
import { digitizeMoney } from "./digitize-money";
import { defineGlossary } from "./define-glossary";
import { storeAttachment } from "./store-attachment";
import { linkAttachments } from "./link-attachments";
import { recallFromMemory } from "./recall-from-memory";
import { composeReply } from "./compose-reply";
import { converse } from "./converse";
import { aiTransform } from "./ai-transform";
import { parseDate } from "./parse-date";
import { askAddress } from "./ask-address";
import { hookGate } from "./hook-gate";
import { ifSuccess } from "./if-success";
import { ifFailure } from "./if-failure";
import { deliverResult } from "./deliver-result";
import { deliverPublicPage } from "./deliver-public-page";
import { deliverCalendar } from "./deliver-calendar";
import { deliverAnalytics } from "./deliver-analytics";
import { deliverMap } from "./deliver-map";
import { deliverEmail } from "./deliver-email";
import { deliverTelegramBot } from "./deliver-telegram-bot";
import { deliverUserTelegramChat } from "./deliver-user-telegram-chat";
import { deliverVectorMemory } from "./deliver-vector-memory";
import { deliverDatabase } from "./deliver-database";
import { deliverStorage } from "./deliver-storage";
import { handToExternal } from "./hand-to-external";

export const NODE_FUNCTIONS: Record<string, NodeFn> = {
  // входная группа — 7 каналов + коннектор
  receiveRequest,
  receiveWebhook,
  receiveCron,
  receivePublicPage,
  receiveTelegramBot,
  receiveUserTelegramChat,
  receiveEmail,
  receiveFromExternal,
  // середина (библиотека узловых навыков — 307: recallFromMemory · aiTransform · parseDate · hookGate; 308: classifyIntent)
  transformPayload,
  classifyIntent,
  digitizeMoney,
  defineGlossary,
  storeAttachment,
  linkAttachments,
  recallFromMemory,
  aiTransform,
  parseDate,
  askAddress,
  hookGate,
  composeReply,
  converse,
  ifSuccess,
  ifFailure,
  // выходная группа — 11 каналов + коннектор
  deliverResult,
  deliverPublicPage,
  deliverCalendar,
  deliverAnalytics,
  deliverMap,
  deliverEmail,
  deliverTelegramBot,
  deliverUserTelegramChat,
  deliverVectorMemory,
  deliverDatabase,
  deliverStorage,
  handToExternal,
};
