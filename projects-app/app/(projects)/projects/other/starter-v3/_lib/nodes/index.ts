// РЕЕСТР ФУНКЦИЙ УЗЛОВ — статическая карта `имя функции (как в ядре) → сама функция`.
//
// Почему статический реестр, а не динамический import по имени: в route-group `(projects)` шаблонные
// import'ы не резолвятся в рантайме (урок v1 `_generated/executables.ts`). Поэтому обычные импорты +
// объект. Имя ключа = `function.name` узла в automation.json (публичный контракт, уникально по графу).
//
// Шаг 300: КАЖДЫЙ узел инвентаря несёт реальную функцию — ни одно имя ядра больше не указывает на
// несуществующий файл. Новый канал = новый файл + новая строка здесь (добавление аддитивно, закон 2).
import type { NodeFn } from "../executor";
import { receiveControlPanel } from "./receive-control-panel";
import { receiveWebhook } from "./receive-webhook";
import { receiveCron } from "./receive-cron";
import { receivePublicPage } from "./receive-public-page";
import { receiveTelegramBot } from "./receive-telegram-bot";
import { receiveUserTelegramChat } from "./receive-user-telegram-chat";
import { receiveEmail } from "./receive-email";
import { receiveFromExternal } from "./receive-from-external";
import { intentRefuse } from "./intent-refuse";
import { intentContinuation } from "./intent-continuation";
import { intentSelfDescribe } from "./intent-self-describe";
import { intentControl } from "./intent-control";
import { intentComposite } from "./intent-composite";
import { intentFetchExternal } from "./intent-fetch-external";
import { intentReadOwn } from "./intent-read-own";
import { intentIncomplete } from "./intent-incomplete";
import { intentSmallTalk } from "./intent-small-talk";
import { intentRecordGiven } from "./intent-record-given";
import { intentUnclaimed } from "./intent-unclaimed";
import { transformPayload } from "./transform-payload";
import { fetchExternal } from "./fetch-external";
import { keepObject } from "./keep-object";
import { resolveMoment } from "./resolve-moment";
import { recallConversation } from "./recall-conversation";
import { verifyRecall } from "./verify-recall";
import { composeReply } from "./compose-reply";
import { converse } from "./converse";
import { ifSuccess } from "./if-success";
import { ifFailure } from "./if-failure";
import { deliverToast } from "./deliver-toast";
import { deliverDashboard } from "./deliver-dashboard";
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
  receiveControlPanel,
  receiveWebhook,
  receiveCron,
  receivePublicPage,
  receiveTelegramBot,
  receiveUserTelegramChat,
  receiveEmail,
  receiveFromExternal,
  // СЛОЙ НАМЕРЕНИЯ — узел на класс запроса (шаг 311). Инвентарь закрытый; порядок здесь НЕ важен, а вот
  // порядок узлов В ЯДРЕ и есть старшинство: первый заявивший побеждает (см. `intent-gate.ts`), поэтому
  // узкие классы стоят раньше широких. Последним — `intentUnclaimed`: он не даёт непонятому запросу молча
  // свалиться в удобную ветку.
  intentRefuse,
  intentContinuation,
  intentSelfDescribe,
  intentControl,
  intentComposite,
  intentFetchExternal,
  intentReadOwn,
  intentIncomplete,
  intentSmallTalk,
  intentRecordGiven,
  intentUnclaimed,
  // середина — форма узла, а не каталог кирпичей: 13 доменных трансформов v2 (деньги, чеки, глоссарий,
  // измерения, геометки, вложения) удалены при рождении v3 — они были осадком ОДНОЙ автоматизации, а не
  // инвариантом любой. Их знание сохранено паттернами в корпусе узловых навыков (шаг 310).
  transformPayload,
  // СЕРЕДИНА ЭКСПОНАТА (311.7) — «карточка предмета»: добыть снаружи → сохранить файл → определить
  // момент. Имена — глаголы ФОРМЫ; домена в них нет, предмет называет пользователь в рантайме.
  fetchExternal,
  keepObject,
  resolveMoment,
  // ЧТЕНИЕ ПАМЯТИ (330.7) — вторая половина складов: до него писать умели двенадцать узлов, читать — ни
  // один, и вопрос о прошлом разговоре упирался в пустоту.
  recallConversation,
  // ПРОВЕРКА НАЙДЕННОГО (330.10): кандидат становится ответом, только разрешившись в локальную запись.
  verifyRecall,
  composeReply,
  converse,
  ifSuccess,
  ifFailure,
  // выходная группа — 12 каналов + коннектор. Тост первым: он неотключаем и принимает ОБЕ ветки (311.8).
  deliverToast,
  deliverDashboard,
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
