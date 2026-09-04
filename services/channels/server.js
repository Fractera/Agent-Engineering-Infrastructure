// fractera-channels — COMMUNICATION CHANNELS (PM2 process, 127.0.0.1:3500).
//
// One place that owns the project's outside conversations. Telegram is the first
// channel; the shape is deliberately channel-agnostic so the next one (WhatsApp,
// email, a web widget) becomes a second entry in the same config, not a second
// service.
//
// WHY THIS IS A SERVICE AND NOT AN ADMIN ROUTE. Telegram hands each update to
// exactly ONE reader: whoever calls getUpdates first takes the message, and
// nobody else ever sees it. If the admin panel polled the bot to link an account
// while a background loop polled it to answer questions, they would eat each
// other's messages at random. So this process is the only reader, and the admin
// asks it over loopback instead of touching the bot itself. The same trap cost
// step 205 a day.
//
// Zero npm dependencies on purpose: no install step, nothing to rebuild, and a
// missing module can never put it in a crash loop.

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

// Its own .env, read by hand. The neighbouring services use dotenv, but that is
// an npm package and this process deliberately has none — so the six lines that
// parse a key=value file live here instead. Without this the service would start
// with no RAG address and answer every question with "the base is switched off".
(function loadEnv() {
  const file = path.resolve(__dirname, ".env");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    const key = t.slice(0, eq).trim();
    if (!(key in process.env)) process.env[key] = t.slice(eq + 1);
  }
})();

const PORT = Number(process.env.PORT ?? 3500);
const HOST = "127.0.0.1";
const CONFIG = process.env.CHANNELS_CONFIG ?? path.resolve(__dirname, "config.json");
const RAG_URL = process.env.LIGHTRAG_URL ?? "http://localhost:9621";
const RAG_KEY = process.env.LIGHTRAG_API_KEY ?? "";

const LINK_TTL_MS = 10 * 60000;

// 🔒 СВЕЖИЙ СЕРВЕР ДОЛЖЕН РАБОТАТЬ БЕЗ РУЧНОЙ НАСТРОЙКИ.
//
// Адреса дверей приложения и шаг расписания одинаковы на КАЖДОМ сервере: слот
// всегда на :3000, маршруты заданы продуктом. Требовать вписать их руками значит
// требовать работу, результат которой известен заранее, — и получить сервер, где
// бот отвечает, а продукт молчит, потому что владелец до настройки не дошёл.
//
// Единственное, что нельзя подставить, — СЕКРЕТ: он у каждого сервера свой и
// живёт в окружении слота. Нет секрета — двери приложения нет, и бот честно
// работает по-старому, отвечая из базы знаний.
const APP_HOOK_URL = process.env.APP_HOOK_URL ?? "http://127.0.0.1:3000/api/telegram/hook";
const APP_TICK_URL = process.env.APP_TICK_URL ?? "http://127.0.0.1:3000/api/telegram/tick";
const APP_ENV = process.env.APP_ENV_FILE ?? "/opt/fractera/app/.env.local";
const DEFAULT_TICK_SEC = 60;

/**
 * Значение ключа из `.env.local` проекта.
 *
 * 🔒 ОДИН ЧИТАТЕЛЬ ВМЕСТО ДВУХ (2026-09-03). Ниже `appSecret()` перебирал файл
 * сам, и второй потребитель завёл бы вторую копию того же перебора — а копии
 * расходятся на первой правке формата.
 */
function appEnv(key) {
  try {
    for (const line of fs.readFileSync(APP_ENV, "utf8").split(String.fromCharCode(10))) {
      const t = line.trim();
      if (t.startsWith(key + "=")) return t.slice(key.length + 1).trim();
    }
  } catch {}
  return "";
}

function appSecret() {
  return appEnv("TELEGRAM_HOOK_SECRET");
}

/**
 * Куда доставлять входящее — из окружения СЛОТА, как и секрет.
 *
 * ✗ ОПЛАЧЕНО 2026-09-04, ЖИВЬЁМ. `APP_HOOK_URL` — переменная окружения ПРОЦЕССА,
 * а эта служба запускается голым `pm2 start node -- server.js` и своего `.env` не
 * читает вовсе. То есть рычаг существовал и не был подключён ни к чему: значение
 * по умолчанию вело в старый хук слота, и после чистого развёртывания бот отвечал
 * из пустого графа знаний, а чат оставался пуст. Ни ошибки, ни следа.
 *
 * 🔒 СЕКРЕТ И АДРЕС ЧИТАЮТСЯ ОДИНАКОВО, И ЭТО НЕ КОСМЕТИКА. Раньше секрет брался
 * из окружения слота, а адрес — из окружения процесса: две разные дороги к одной
 * настройке, и одна из них никуда не вела. Установщику достаточно написать обе
 * строки в один файл, который он и так заполняет.
 *
 * 🔒 ПЕРЕМЕННАЯ ПРОЦЕССА ОСТАЁТСЯ ПЕРВОЙ — для машины, где её выставили намеренно.
 */
function appHookUrl() {
  return process.env.APP_HOOK_URL || appEnv("CHANNELS_HOOK_URL") || APP_HOOK_URL;
}

/**
 * Настройка канала с подставленными умолчаниями.
 *
 * 🔒 РЕЖИМ ВЫВОДИТСЯ, А НЕ ХРАНИТСЯ ПО УМОЛЧАНИЮ. Дверь приложения есть — значит
 * отвечает приложение; иначе на каждое сообщение отвечали бы ДВОЕ: служба из
 * базы знаний и продукт из своей головы. Владелец волен переопределить это в
 * панели, и его выбор сильнее вывода.
 */
function channel() {
  const tg = Object.assign({}, readConfig().telegram);
  const secret = tg.hookSecret || appSecret();
  const wired = Boolean(secret);
  if (wired) {
    tg.hookSecret = secret;
    tg.hookUrl = tg.hookUrl || appHookUrl();
    tg.tickUrl = tg.tickUrl || APP_TICK_URL;
    if (tg.tickSeconds === undefined) tg.tickSeconds = DEFAULT_TICK_SEC;
    if (!tg.mode) tg.mode = "app";
  }
  return tg;
}

// ── БОТОВ МОЖЕТ БЫТЬ НЕСКОЛЬКО (99-1, 2026-09-03) ────────────────────────────
//
// 🔒 ЗАКАЗ ВЛАДЕЛЬЦА ДОСЛОВНО: «нет никакой разницы, сколько подключится
// телеграммов — каждый из них создаст просто свой чат и будет всегда оставаться
// внутри своих чатов». Один бот на проект был свойством СТАРОЙ архитектуры, где
// переписке негде было лежать раздельно; теперь она лежит в базе чата, разговор
// на каждый `chat_id`, и ограничение потеряло причину.
//
// 🔒 ПЕРЕЕЗД ПРИ ЧТЕНИИ, А НЕ ПЕРЕПИСЫВАНИЕ ФАЙЛА. Старый конфиг с одиночным
// `telegram` подставляется первым элементом списка на лету. Файл на диске не
// трогается — значит откат стоит замены кода, а не восстановления данных, и ни
// один уже работающий сервер не требует ручной правки.
//
// 🔒 У БОТА ВЕЧНЫЙ ИДЕНТИФИКАТОР (`b1`, `b2`), А НЕ ТОКЕН В РОЛИ ИМЕНИ. Токен
// владелец меняет — при смене бота Telegram выдаёт новый, — а на идентификатор
// завязаны привязка, счётчик обновлений и адресация дверей. Тот же приём, что у
// продуктов проекта: `id` не значит ничего и не меняется никогда.
const BOT_PREFIX = "b";

/** Список ботов с подставленными умолчаниями. Пустой — ни один не настроен. */
function bots() {
  const cfg = readConfig();
  const list = Array.isArray(cfg.telegramBots) ? cfg.telegramBots.slice() : [];

  // Старая одиночная запись — первый бот, если списка ещё нет.
  if (list.length === 0 && cfg.telegram && cfg.telegram.token) {
    list.push(Object.assign({ id: BOT_PREFIX + "1" }, cfg.telegram));
  }

  // 🔒 КУДА ДОСТАВЛЯТЬ — СВОЙСТВО ПРОЕКТА, А НЕ БОТА (97-8, 2026-09-03).
  //
  // ✗ ОПЛАЧЕНО ВЛАДЕЛЬЦЕМ В ТОТ ЖЕ ЧАС: он завёл второго бота, написал ему —
  // служба сообщение ПРИНЯЛА (оно в журнале), а в чат оно не попало и разговор
  // не появился. Причина: адрес двери и секрет были записаны ТОЛЬКО первому
  // боту, вручную; новый унаследовал пустоту, и `if (tg.hookUrl)` в цикле
  // молча ничего не делал. Ни ошибки, ни следа — снаружи это выглядит как
  // «второй бот не работает».
  //
  // 🔒 ЛЕЧЕНИЕ — НАСЛЕДОВАНИЕ, А НЕ ЗАПОЛНЕНИЕ РУКАМИ. Дверь приложения одна на
  // весь сервер: все боты стучат в неё одним секретом. Требовать настройки у
  // каждого нового значило бы, что человек обязан помнить то, что система знает
  // сама, — и забывать это будет каждый раз молча.
  const secret = appSecret();
  const shared = list.find((b) => b && b.hookUrl && b.hookSecret) || {};
  return list.map((raw, i) => {
    const b = Object.assign({}, raw);
    if (!b.id) b.id = BOT_PREFIX + (i + 1);
    b.hookSecret = b.hookSecret || shared.hookSecret || secret;
    if (b.hookSecret) {
      b.hookUrl = b.hookUrl || shared.hookUrl || appHookUrl();
      b.tickUrl = b.tickUrl || shared.tickUrl || APP_TICK_URL;
      if (b.tickSeconds === undefined) b.tickSeconds = DEFAULT_TICK_SEC;
      if (!b.mode) b.mode = "app";
    }
    return b;
  });
}

/**
 * Один бот по идентификатору.
 *
 * 🔒 ПУСТОЙ АДРЕСАТ — ПЕРВЫЙ БОТ, И ЭТО СОВМЕСТИМОСТЬ, А НЕ УДОБСТВО. Двери
 * зовут панель, слот из прежнего стартера и наш собственный код; все они об
 * идентификаторах не знают, и обязаны продолжать работать без правок.
 */
function botById(id) {
  const list = bots();
  if (!id) return list[0] || null;
  return list.find((b) => b.id === id) || null;
}

/**
 * Записать полям одного бота новые значения.
 *
 * 🔒 ОДИН ПИСАТЕЛЬ НА КОНФИГ, И ОН ЖЕ ДЕЛАЕТ ПЕРЕЕЗД. Раньше каждое место
 * собирало `now.telegram = Object.assign(...)` само; с появлением списка таких
 * сборок стало бы несколько, и они разошлись бы на первой правке формы.
 */
function writeBotFields(id, fields) {
  const next = readConfig();
  const list = Array.isArray(next.telegramBots) ? next.telegramBots.slice() : [];
  if (list.length === 0 && next.telegram && next.telegram.token) {
    list.push(Object.assign({ id: BOT_PREFIX + "1" }, next.telegram));
  }
  const idx = list.findIndex((b) => b.id === id);
  if (idx < 0) return false;
  list[idx] = Object.assign({}, list[idx], fields);
  next.telegramBots = list;
  delete next.telegram;
  writeConfig(next);
  return true;
}

const pendingLinks = new Map();

// ── The journal: the whole conversation, kept for as long as the server lives ──
//
// This service is the only reader of the bot (see the header), so an application
// that wants to REACT to a message cannot poll Telegram itself. It reads this
// instead. Both directions are written here: what the bot heard and what it said.
//
// 🔒 ЛИМИТА ХРАНЕНИЯ НЕТ, И ЭТО РЕШЕНИЕ ВЛАДЕЛЬЦА (2026-09-01): «мы используем
// Telegram от начала жизненного цикла приложения до того момента пока сервер
// будет безвозвратно удалён». Переписка — это данные человека, а не отладочный
// след, и молчаливое удаление старого недопустимо.
//
// 🪦 ЗДЕСЬ БЫЛО КОЛЬЦО НА 500 ЗАПИСЕЙ (`INBOX_MAX`, `rows.shift()`). Пятьсот
// первое сообщение удаляло первое НАВСЕГДА, и никто бы этого не заметил: журнал
// не падает, он просто забывает начало разговора.
//
// 🔒 ФОРМАТ — СТРОКА НА СООБЩЕНИЕ (JSONL), И ЭТО ПРИЧИНА, ПО КОТОРОЙ ЛИМИТ БОЛЬШЕ
// НЕ НУЖЕН. Прежний `inbox.json` переписывался ЦЕЛИКОМ на каждое сообщение: при
// 500 записях незаметно, при десятках тысяч каждое новое сообщение переписывало
// бы мегабайты. Снять лимит, не сменив формат, значило бы обменять потерю данных
// на медленную деградацию, которая проявится через месяцы.
// Здесь запись — это `appendFileSync` одной строки: её цена не зависит от того,
// сколько уже записано.
//
// 🔒 БИТАЯ СТРОКА НЕ РОНЯЕТ ЖУРНАЛ. В формате «весь файл — один JSON» любая
// повреждённая запись делала нечитаемым ВЕСЬ архив; здесь она пропускается, а
// остальное читается.
const INBOX = process.env.CHANNELS_INBOX ?? path.resolve(__dirname, "inbox.jsonl");
const INBOX_LEGACY = process.env.CHANNELS_INBOX_LEGACY ?? path.resolve(__dirname, "inbox.json");

// Последний выданный номер. Держится в памяти, чтобы не читать файл на запись;
// восстанавливается при старте и после любого чтения.
let inboxLastId = 0;

/**
 * 🔒 ПЕРЕНОС СТАРОГО ЖУРНАЛА ОДИН РАЗ И БЕЗ ПОТЕРЬ. Прежний `inbox.json`
 * переписывается в новый формат при старте; исходный файл НЕ удаляется, а
 * переименовывается в `.migrated` — на случай, если перенос окажется неверным.
 */
function migrateLegacyInbox() {
  try {
    if (!fs.existsSync(INBOX_LEGACY) || fs.existsSync(INBOX)) return;
    const rows = JSON.parse(fs.readFileSync(INBOX_LEGACY, "utf8"));
    if (!Array.isArray(rows)) return;
    const body = rows.map((r) => JSON.stringify(r)).join("\n") + (rows.length ? "\n" : "");
    fs.writeFileSync(INBOX, body, { mode: 0o600 });
    fs.renameSync(INBOX_LEGACY, INBOX_LEGACY + ".migrated");
    console.log("Inbox migrated to jsonl: " + rows.length + " messages kept");
  } catch (e) {
    console.log("Inbox migration skipped: " + ((e && e.message) || e));
  }
}

function readInbox() {
  try {
    const raw = fs.readFileSync(INBOX, "utf8");
    const rows = [];
    for (const line of raw.split("\n")) {
      const s = line.trim();
      if (!s) continue;
      try {
        rows.push(JSON.parse(s));
      } catch {
        // Битая строка — пропускаем её одну, а не теряем весь журнал.
      }
    }
    if (rows.length) inboxLastId = Math.max(inboxLastId, rows[rows.length - 1].id || 0);
    return rows;
  } catch {
    return [];
  }
}

function pushInbox(entry) {
  const id = ++inboxLastId;
  try {
    fs.appendFileSync(INBOX, JSON.stringify(Object.assign({ id: id }, entry)) + "\n", {
      mode: 0o600,
    });
  } catch {}
  return id;
}

migrateLegacyInbox();
readInbox();

// The OpenAI key lives in the data service env, written there by the panel. This
// service deliberately has no key of its own: one place to fill in, one place to
// revoke. An explicit OPENAI_API_KEY in this service env wins, so the day the
// panel writes it here directly nothing has to change.
const KEY_FILE = process.env.OPENAI_KEY_FILE ?? "/opt/fractera/services/data/.env";

/**
 * Ключ модели.
 *
 * ✗ ОПЛАЧЕНО ВЛАДЕЛЬЦЕМ 2026-09-03, ЧЕРЕЗ ЧАС ПОСЛЕ ПРЕДЫДУЩЕЙ ПРАВКИ. Он ввёл
 * ключ, чат заговорил — а бот продолжал отвечать «ключ не настроен». Измерено:
 * ключ лежал в `.env.local` ПРОЕКТА, а эта функция смотрела только в
 * `services/data/.env`, где было пусто.
 *
 * 🔒 ОДИН КЛЮЧ, НЕСКОЛЬКО ФАЙЛОВ — И ЧИТАТЬ НАДО ВСЕ, В ПОРЯДКЕ ОТ БЛИЖНЕГО К
 * ОБЩЕМУ. Экран, на котором человек вводит ключ, пишет его в файл проекта;
 * рассчитывать, что кто-то разнесёт его по соседям, значит зависеть от
 * механизма, отказ которого МОЛЧАЛИВ. Три источника здесь — не «на всякий
 * случай», а перечисление мест, куда ключ реально попадает.
 *
 * 🛑 ОТСЮДА ЖЕ ВИДНО, ЧТО ОСТАЁТСЯ НЕЧИНЕНЫМ: у слоя данных и графа знаний
 * ключа по-прежнему нет, и это отдельная работа — разнести введённое значение
 * по всем живым потребителям. Здесь исправлено только чтение.
 */
function openAiKey() {
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;
  const fromApp = appEnv("OPENAI_API_KEY");
  if (fromApp) return fromApp;
  try {
    for (const line of fs.readFileSync(KEY_FILE, "utf8").split("\n")) {
      const t = line.trim();
      if (t.startsWith("OPENAI_API_KEY=")) return t.slice("OPENAI_API_KEY=".length).trim();
    }
  } catch {}
  return "";
}

function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG, "utf8"));
  } catch {
    return {};
  }
}

function writeConfig(next) {
  fs.writeFileSync(CONFIG, JSON.stringify(next, null, 2) + "\n", { mode: 0o600 });
}

async function telegram(token, method, query, body) {
  try {
    const url = "https://api.telegram.org/bot" + token + "/" + method + (query || "");
    const init = body
      ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
      : undefined;
    const r = await fetch(url, init);
    return await r.json();
  } catch {
    return null;
  }
}

// 🔒 ОДИН УЗКИЙ ПРОХОД ДЛЯ ВСЕГО ИСХОДЯЩЕГО ТЕКСТА, И ИМЕННО ПОЭТОМУ ЗАПИСЬ В
// ЖУРНАЛ СТОИТ ЗДЕСЬ (77-11, 2026-09-01, заказ владельца: «я получил ответ, вижу
// его в Telegram, но не вижу здесь»).
//
// Через `send` идут ВСЕ ответы, кем бы они ни были сочинены: ответ приложения
// через дверь `/telegram/send`, собственный ответ службы в режиме `rag`,
// приветствие и подтверждение привязки. Три отдельные записи в трёх местах
// разошлись бы на первой же правке; одна здесь — не может.
//
// 🔒 ПИШЕМ ТОЛЬКО ТО, ЧТО TELEGRAM ПРИНЯЛ. Запись до отправки означала бы журнал,
// в котором бот «сказал» то, чего собеседник никогда не видел.
async function send(token, chatId, text, parseMode) {
  // Telegram refuses messages longer than 4096 characters.
  const body = String(text).slice(0, 4000);
  const payload = { chat_id: chatId, text: body };
  // 🔒 `parseMode` — НЕОБЯЗАТЕЛЬНЫЙ, И ЭТО НАМЕРЕННО (шаг 104, 2026-09-03): включать HTML
  // глобально для ВСЕХ исходящих означало бы, что любой ответ модели с `<`/`>` внутри (код,
  // сравнение) отказом Telegram «can't parse entities». Просит его только вызывающий, который
  // сам экранирует текст и отвечает за разметку — сегодня это только пометка «Web Chat Input
  // Message» у сообщений, зеркалируемых из веб-чата.
  if (parseMode) payload.parse_mode = parseMode;
  const r = await telegram(token, "sendMessage", "", payload);
  if (r && r.ok) {
    pushInbox({
      direction: "out",
      at: new Date().toISOString(),
      chatId: String(chatId),
      who: null,
      kind: "text",
      text: body,
      objectType: null,
      fileId: null,
      forwardedFrom: null,
      lat: null,
      lon: null,
    });
  }
  return r;
}

// ── Voice: a note is a FILE, and a file has to be fetched before it is heard ──
//
// Telegram never sends the audio itself: the update carries a file_id, the file
// takes two more calls to reach, and only then can it be transcribed. Without
// this the loop dropped every voice note silently — no text, no error, no log
// line, and the person on the other side saw a bot that ignores them.
async function voiceToText(token, fileId) {
  const key = openAiKey();
  if (!key) return { text: "", error: "no-key" };
  const info = await telegram(token, "getFile", "?file_id=" + encodeURIComponent(fileId));
  const filePath = info && info.result && info.result.file_path;
  if (!filePath) return { text: "", error: "no-file" };
  try {
    const r = await fetch("https://api.telegram.org/file/bot" + token + "/" + filePath);
    if (!r.ok) return { text: "", error: "download" };
    const buf = Buffer.from(await r.arrayBuffer());
    const form = new FormData();
    form.append("file", new Blob([buf]), filePath.split("/").pop() || "voice.ogg");
    form.append("model", process.env.TRANSCRIBE_MODEL ?? "whisper-1");
    const t = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: "Bearer " + key },
      body: form,
      signal: AbortSignal.timeout(120000),
    });
    if (!t.ok) return { text: "", error: "transcribe-" + t.status };
    const d = await t.json();
    return { text: String((d && d.text) || "").trim(), error: "" };
  } catch {
    return { text: "", error: "transcribe" };
  }
}

// ── Что бот говорит, когда ответить не может ─────────────────────────────────
//
// ✗ ОПЛАЧЕНО ВЛАДЕЛЬЦЕМ 2026-09-03, В ПЕРВУЮ ЖЕ МИНУТУ ПОСЛЕ ПРИВЯЗКИ БОТА. Он
// написал «Привет» и получил «No relevant context found for the query». Его
// слова: «это может означать что у меня в том числе неактивен ключ подписки
// OpenAI либо ключ активен но в нём нет денег… данные сообщения вообще не
// помогают понять суть проблемы».
//
// 🛑 И ПРИЧИНА БЫЛА ИМЕННО ТАКОЙ — ИЗМЕРЕНО В ТОТ ЖЕ ЧАС: ключа OpenAI на сервере
// не было НИ У ОДНОГО из трёх потребителей (проект, слой данных, граф знаний).
// Движок отвечал своей фразой про отсутствие контекста, и она пролетала мимо
// фильтра ниже, потому что фильтр знал два других её варианта.
//
// 🔒 ОТСЮДА ЗАКОН: СНАЧАЛА ПРОВЕРЯЕТСЯ УСЛОВИЕ, БЕЗ КОТОРОГО ОТВЕТ НЕВОЗМОЖЕН, И
// ТОЛЬКО ПОТОМ ТОЛКУЕТСЯ ОТВЕТ. Нет ключа — нет и разговора о пустой базе: база
// может быть полна, а отвечать всё равно нечем. Ловить формулировки движка
// бесконечно — их пишет чужой код и меняет с каждой версией.
//
// 🔒 ЯЗЫК БЕРЁТСЯ У СОБЕСЕДНИКА, А НЕ У СЛУЖБЫ. Telegram присылает
// `language_code` того, кто пишет. Служба одноязычна по коду, но её ГОЛОС
// обращён к человеку — и говорить с ним по-английски, когда он пишет по-русски,
// значит прятать причину дважды.
const MESSAGES = require("./messages.json");

/**
 * Строка на языке собеседника; неизвестный язык падает на английский.
 *
 * 🛑 ПУСТОЙ ПЛЕЙСХОЛДЕР — ЭТО ОБОРВАННАЯ ФРАЗА, А НЕ ПРОСТО «БЕЗ ССЫЛКИ».
 * ✗ оплачено владельцем 2026-09-03: он получил в Telegram «Проверьте его
 * здесь:» и пустоту после двоеточия, и спросил, кто её съел — Telegram или мы.
 * Съедали мы: адрес проекта в окружении сервера отсутствует, и `{url}`
 * подставлялся пустой строкой.
 *
 * 🔒 ЛЕЧЕНИЕ — ДВЕ РАЗНЫЕ ФРАЗЫ, А НЕ ОДНА С ДЫРОЙ. Есть адрес — говорим «вот
 * здесь» и даём его; нет адреса — говорим «настройте в административной
 * панели», и это законченное предложение. Его слова: «если её отрезает Telegram
 * … то вместо ссылки просто напиши настройте в административной панели».
 */
function say(key, lang, vars) {
  const url = (vars && vars.url) || "";
  const effective = !url && MESSAGES[key + "NoLink"] ? key + "NoLink" : key;
  const dict = MESSAGES[effective] || {};
  const base = String(dict[String(lang || "").slice(0, 2)] || dict.en || "");
  return base.replace(/\{url\}/g, url);
}

/**
 * Куда послать человека проверять ключ.
 *
 * 🛑 АДРЕС НЕ СОБИРАЕТСЯ ПО ШАБЛОНУ ИЗ СОСЕДНЕГО. Закон проекта, оплаченный
 * дважды: выведенный по догадке путь однажды перестаёт совпадать с настоящим и
 * ведёт человека в никуда — а он в этот момент и так уже в тупике. Нет
 * настроенного адреса — называем путь словами, и это честнее ложной ссылки.
 *
 * 🛑 ДОЛГ, НАЗВАННЫЙ ВСЛУХ: адреса самого проекта в окружении сервера нет вовсе
 * (`.env.local` слота знает адрес панели, входа и медиа — своего не знает).
 * Пока его туда не кладёт рождение сервера, ссылка будет отсутствовать у всех.
 */
function projectUrl() {
  const direct = process.env.PROJECT_URL || appEnv("PROJECT_URL");
  return direct ? direct.replace(/\/+$/, "") + "/architect/telegram?section=settings" : "";
}

// The answer itself. The bot is a mouth for the knowledge base: it asks agentic
// RAG and repeats what comes back. When RAG is off or empty it says so plainly
// instead of inventing something — a bot that guesses is worse than a silent one.
async function answer(question, lang) {
  // 🔒 УСЛОВИЕ ПРОВЕРЯЕТСЯ ДО ВЫЗОВА, А НЕ ПОСЛЕ ЕГО ПРОВАЛА.
  if (!openAiKey()) return say("noKey", lang, { url: projectUrl() });
  try {
    const r = await fetch(RAG_URL + "/query", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": RAG_KEY },
      body: JSON.stringify({ query: question, mode: "hybrid" }),
      signal: AbortSignal.timeout(90000),
    });
    if (!r.ok) return say("ragDown", lang);
    const d = await r.json();
    const text = String((d && (d.response || d.result)) || "").trim();

    // 🔒 THE ENGINE SPEAKS TO US, NOT TO THE PERSON. When it finds nothing it
    // answers with its own apology and a machine marker — "[no-context]" — and
    // forwarding that verbatim puts an implementation detail in front of somebody
    // who asked a question. An empty base is a legal state and deserves a sentence
    // that says WHICH state it is: nothing loaded, so nothing to answer from.
    // 🔒 ТРЕТЬЯ ФОРМУЛИРОВКА ДВИЖКА ДОБАВЛЕНА ЗДЕСЬ 2026-09-03 — «no relevant
    // context found». Их будет ещё: текст пишет чужой код. Поэтому главная
    // защита стоит ВЫШЕ (проверка ключа), а этот список — вторая линия, а не
    // первая.
    if (
      !text ||
      text.toLowerCase().includes("[no-context]") ||
      /no relevant context/i.test(text) ||
      /^sorry, i.?m not able to provide an answer/i.test(text)
    ) {
      return say("emptyBase", lang);
    }
    return text;
  } catch {
    return say("ragOff", lang);
  }
}

// ── СЧЁТЧИК ОБНОВЛЕНИЙ И ЗАМОК — У КАЖДОГО БОТА СВОИ (99-2, 2026-09-03) ───────
//
// 🛑 ЗДЕСЬ СТОЯЛИ ДВЕ ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ — `let offset = 0` И
// `let looping = false`, — И ИМЕННО ОНИ ДЕЛАЛИ СЛУЖБУ ОДНОБОТОВОЙ. Telegram
// ведёт очередь обновлений НА БОТА: попроси второго бота начать с чужого номера
// — и его сообщения будут пропущены молча, потому что `getUpdates` считает всё
// до `offset` подтверждённым и удаляет со своей стороны. Общий замок был бы не
// лучше: пока один бот висит в 25-секундном ожидании, второй не опрашивается
// вовсе.
//
// 🔒 ЗАКОН ОДНОГО ЧИТАТЕЛЯ ПРИ ЭТОМ НЕ НАРУШЕН, И РАЗНИЦА МЕХАНИЧЕСКАЯ. Опасно
// опрашивать ОДИН токен двумя читателями — они молча съедают половину сообщений
// друг друга. Здесь у каждого цикла СВОЙ токен, а очереди у Telegram разные,
// значит циклы независимы по устройству, а не по договорённости.
const offsets = new Map();
const looping = new Set();

// Имя бота у Telegram («@RadaTest2_bot»), по одному запросу на бота за жизнь
// процесса.
//
// 🔒 КЕШ ЗДЕСЬ НЕ ОПТИМИЗАЦИЯ, А ГРАНИЦА РАЗУМНОГО. Имя нужно приложению в
// КАЖДОМ сообщении — оно попадает в заголовок разговора; спрашивать `getMe` на
// каждое значило бы добавить внешний вызов в горячий путь ради значения,
// которое меняется раз в год.
//
// 🛑 УСТАРЕТЬ ОНО МОЖЕТ: человек переименует бота в @BotFather, и до перезапуска
// службы мы будем звать его старым именем. Цена названа и принята — заголовок
// разговора не адресация, а подпись; адресует идентификатор бота, который не
// меняется никогда.
const botNames = new Map();

async function botUsername(tg) {
  if (botNames.has(tg.id)) return botNames.get(tg.id);
  const me = await telegram(tg.token, "getMe");
  const name = (me && me.result && me.result.username) || null;
  if (name) botNames.set(tg.id, name);
  return name;
}

async function loopBot(tg) {
  if (looping.has(tg.id)) return;
  looping.add(tg.id);
  try {
    if (!tg.token || tg.enabled === false) return;

    const offset = offsets.get(tg.id) || 0;
    const query = "?timeout=25&offset=" + offset + "&allowed_updates=%5B%22message%22%5D";
    const upd = await telegram(tg.token, "getUpdates", query);
    const results = upd && Array.isArray(upd.result) ? upd.result : [];

    for (const u of results) {
      offsets.set(tg.id, Math.max(offsets.get(tg.id) || 0, (u.update_id || 0) + 1));
      const msg = u.message;
      const chat = msg && msg.chat;
      if (!chat || chat.id == null) continue;

      // A voice note carries no text of its own. It is fetched, transcribed and
      // treated exactly as if the person had typed it — nothing below this point
      // can tell the two apart.
      // 🔒 ПОДПИСЬ К ВЛОЖЕНИЮ ЖИВЁТ В ДРУГОМ ПОЛЕ. Фотография с текстом кладёт его
      // в caption, а не в text, и цикл, читавший только text, выбрасывал такое
      // сообщение целиком — молча, как раньше выбрасывал голос. Владелец прислал
      // фотографию с описанием услуги фотографа, и она не дошла никуда.
      let text = String((msg && (msg.text || msg.caption)) || "").trim();
      let kind = "text";

      // Род вложения и его файл. Сам файл продукт пока не забирает (это записанный
      // долг), но знать, что он был, он обязан: подпись без предмета — половина смысла.
      let objectType = null;
      let fileId = null;
      if (msg) {
        if (Array.isArray(msg.photo) && msg.photo.length) {
          objectType = "image";
          fileId = msg.photo[msg.photo.length - 1].file_id;
        } else if (msg.video) { objectType = "video"; fileId = msg.video.file_id; }
        else if (msg.document) { objectType = "document"; fileId = msg.document.file_id; }
        else if (msg.audio) { objectType = "audio"; fileId = msg.audio.file_id; }
      }
      const voice = (msg && (msg.voice || msg.audio || msg.video_note)) || null;
      // 🔒 У ГОЛОСА ТОЖЕ ЕСТЬ ФАЙЛ, И ОН ОБЯЗАН ДОЕХАТЬ (97-7, 2026-09-03,
      // заказ владельца: «нужно для всех типов»). ✗ прежде запись превращалась
      // в текст, и сама она пропадала: расшифровка — не замена голосу.
      // Интонация, оговорка и второй голос на фоне есть в записи и отсутствуют
      // в её пересказе, а переписка — это данные человека.
      if (voice && voice.file_id && !fileId) {
        objectType = msg.video_note ? "video" : "audio";
        fileId = voice.file_id;
      }
      if (!text && voice && voice.file_id) {
        kind = "voice";
        const heard = await voiceToText(tg.token, voice.file_id);
        text = heard.text;
        if (!text) {
          await send(
            tg.token,
            chat.id,
            heard.error === "no-key"
              ? "I cannot listen yet: the owner has not added an OpenAI key in the panel."
              : "I could not make out that recording. Please try again, or write it as text."
          );
          continue;
        }
      }
      // 🔒 ПРОИСХОЖДЕНИЕ ПЕРЕСЛАННОГО — ЭТО ЧАСТЬ СМЫСЛА, А НЕ УКРАШЕНИЕ.
      //
      // ✗ 2026-08-23: владелец переслал голосовое от знакомого, и продукт записал
      // только слова. «Что мне говорил Ковальчук» после этого не находится никогда:
      // имени в записи нет вовсе, хотя Telegram его прислал.
      //
      // Полей три поколения, и живы все: forward_origin (Bot API 7+), старые
      // forward_from / forward_from_chat и forward_sender_name у тех, кто закрыл
      // ссылку на свой профиль. Читаем все — иначе половина пересылок безымянна.
      let forwardedFrom = null;
      if (msg) {
        const o = msg.forward_origin;
        const nameOf = (u) =>
          u && (u.username ? "@" + u.username : [u.first_name, u.last_name].filter(Boolean).join(" "));
        if (o) {
          if (o.type === "user") forwardedFrom = nameOf(o.sender_user);
          else if (o.type === "hidden_user") forwardedFrom = o.sender_user_name || null;
          else if (o.type === "chat") forwardedFrom = (o.sender_chat && o.sender_chat.title) || null;
          else if (o.type === "channel") forwardedFrom = (o.chat && o.chat.title) || null;
        }
        if (!forwardedFrom && msg.forward_from) forwardedFrom = nameOf(msg.forward_from);
        if (!forwardedFrom && msg.forward_from_chat) forwardedFrom = msg.forward_from_chat.title || null;
        if (!forwardedFrom && msg.forward_sender_name) forwardedFrom = msg.forward_sender_name;
      }

      // Гео приходит отдельным родом сообщения и текста не имеет вовсе.
      const place = (msg && (msg.location || (msg.venue && msg.venue.location))) || null;
      if (!text && place) text = "Место: " + place.latitude + ", " + place.longitude;

      // 🔒 ФОТОГРАФИЯ БЕЗ ПОДПИСИ — ЭТО ТОЖЕ СООБЩЕНИЕ.
      // ✗ 2026-08-23: снимок чека, присланный молча, выбрасывался здесь целиком —
      // текста нет, значит нечего передавать. Но смысл был НА снимке, а не рядом
      // с ним: пустая подпись означает «посмотри сам», а не «ничего не произошло».
      if (!text && !fileId) continue;

      // Linking: the deep-link START carries our one-time code, and the very same
      // message carries the sender's chat id. One code, one id, nothing guessed.
      // 🔒 КОД ПРИВЯЗКИ ПОМНИТ, ЧЬИМ БОТОМ ОН ВЫДАН (99-3). ✗ до этой правки
      // карта хранила только время, и с двумя ботами код, выданный первым,
      // закрывал бы привязку у того, кому человек написал вторым: сообщение
      // приходит в СВОЙ цикл, а запись уходила в общее поле конфига.
      const linkMatch = /^\/start\s+(link[0-9a-f]+)$/.exec(text);
      const pending = linkMatch ? pendingLinks.get(linkMatch[1]) : null;
      if (pending && pending.bot === tg.id) {
        pendingLinks.delete(linkMatch[1]);
        const who = chat.username
          ? "@" + chat.username
          : [chat.first_name, chat.last_name].filter(Boolean).join(" ") || String(chat.id);
        writeBotFields(tg.id, {
          chatId: String(chat.id),
          who: who,
          linkedAt: new Date().toISOString(),
        });
        await send(tg.token, chat.id, "Connected. Ask me anything about your knowledge base.");
        continue;
      }

      if (text.indexOf("/start") === 0) {
        await send(tg.token, chat.id, "Hello. Ask me a question and I will answer from the knowledge base.");
        continue;
      }

      // Everything the bot hears goes into the inbox whatever the mode: an
      // application that wants to react must be able to see it at all.
      const inboxId = pushInbox({
        // 🔒 НАПРАВЛЕНИЕ ПИШЕТСЯ ЯВНО (77-11). Записи, сделанные до этой правки,
        // поля не имеют — и читаются как входящие: журнал уже наполнен, и
        // изменение формата не имеет права сделать старое невидимым или чужим.
        direction: "in",
        at: new Date().toISOString(),
        chatId: String(chat.id),
        who: chat.username
          ? "@" + chat.username
          : [chat.first_name, chat.last_name].filter(Boolean).join(" ") || String(chat.id),
        kind: kind,
        text: text,
        objectType: objectType,
        fileId: fileId,
        forwardedFrom: forwardedFrom,
        lat: place ? place.latitude : null,
        lon: place ? place.longitude : null,
      });

      // ── The push. The inbox is a safety net; this is the main road ─────────
      //
      // The application cannot poll Telegram (one reader, see the header) and the
      // platform has no scheduler, so a message that is only STORED is a message
      // nobody acts on. If a hook is configured, it is called the moment the
      // message lands. A failure here is deliberately silent: the row stays in the
      // inbox and the application picks it up by cursor when it comes back.
      if (tg.hookUrl) {
        try {
          await fetch(tg.hookUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Channel-Secret": tg.hookSecret || "",
            },
            body: JSON.stringify({
              id: inboxId,
              at: new Date().toISOString(),
              channel: "telegram",
              // 🔒 КТО ПРИНЁС СООБЩЕНИЕ (99-3). Приложение забирает файл по
              // `fileId` через дверь службы, и та должна знать, ЧЬИМ токеном
              // его скачивать: у разных ботов один и тот же номер файла означает
              // разные файлы.
              bot: tg.id,
              // 🔒 И ЕГО ИМЯ — ДЛЯ ЗАГОЛОВКА РАЗГОВОРА. Один человек, писавший
              // двум ботам, даёт два разговора с одинаковой подписью; различает
              // их имя бота, а не порядковый номер.
              botName: await botUsername(tg),
              chatId: String(chat.id),
              who: chat.username ? "@" + chat.username : String(chat.id),
              kind: kind,
              text: text,
              objectType: objectType,
              fileId: fileId,
              forwardedFrom: forwardedFrom,
              lat: place ? place.latitude : null,
              lon: place ? place.longitude : null,
            }),
            signal: AbortSignal.timeout(15000),
          });
        } catch {}
      }

      // The mode decides WHO answers. `rag` — this service, from the knowledge
      // base, as it always did. `app` — nobody here: the application reads the
      // inbox and replies through /telegram/send. `both` — the base answers and
      // the application still sees the message.
      const mode = tg.mode === "app" || tg.mode === "both" ? tg.mode : "rag";
      // Язык собеседника Telegram присылает у автора сообщения; у пересланного
      // и у канала его может не быть вовсе — тогда английский.
      const lang = (msg && msg.from && msg.from.language_code) || "";
      if (mode !== "app") await send(tg.token, chat.id, await answer(text, lang));
    }
  } catch {
    // A bad poll must never stop the loop; the next tick tries again.
  } finally {
    looping.delete(tg.id);
  }
}

/**
 * Проход по всем ботам.
 *
 * 🔒 ЦИКЛЫ ЗАПУСКАЮТСЯ ПАРАЛЛЕЛЬНО И НЕ ЖДУТ ДРУГ ДРУГА. `await` в этом месте
 * означал бы, что второй бот молчит все 25 секунд, пока первый висит в
 * долгом ожидании, — то есть один бот делал бы остальных неотзывчивыми.
 *
 * 🔒 ОТКАЗ ОДНОГО НЕ ТРОГАЕТ ОСТАЛЬНЫХ: своё исключение ловит каждый цикл,
 * и `catch` здесь — только на случай сломанного конфига.
 */
function pollAll() {
  try {
    for (const b of bots()) loopBot(b);
  } catch {}
}

setInterval(pollAll, 2000);

// ── Тик по расписанию: планировщик, которого у платформы не было ────────────
//
// 🔒 ЗАЧЕМ ОН ЗДЕСЬ, А НЕ ОТДЕЛЬНОЙ СЛУЖБОЙ. Напоминание — это событие, которое
// должно случиться, когда человек в приложение не заходил: страница ничего не
// разбудит, а cron операционной системы живёт вне продукта и переживает его
// переустановку молча. Эта служба уже тикает каждые две секунды ради опроса
// бота; добавить к ней вторую стрелку дешевле, чем завести третий процесс.
//
// Сам продукт решает, что наступило: служба только СТУЧИТ в его дверь. Знать про
// календарь ей незачем, и это граница, а не лень.
let lastTick = 0;

async function tick() {
  // 🔒 РАСПИСАНИЕ ПРИНАДЛЕЖИТ ПРОЕКТУ, А НЕ БОТУ, И ПОТОМУ ОНО ОДНО. Стучим в
  // дверь приложения по времени; какой бот при этом настроен — безразлично.
  // Берём первого: у него живут адрес двери и шаг расписания. ✗ читать здесь
  // только старое поле `telegram` значило бы, что на сервере со списком ботов
  // расписание выключится молча.
  const tg = bots()[0] || channel();
  const every = Number(tg.tickSeconds || 0);
  // Ноль или пусто — расписание выключено. Это законное состояние: проект без
  // напоминаний не должен платить за пустые запросы каждую минуту.
  if (!every || !tg.tickUrl) return;
  const now = Date.now();
  if (now - lastTick < every * 1000) return;
  lastTick = now;
  try {
    await fetch(tg.tickUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Channel-Secret": tg.hookSecret || "" },
      body: JSON.stringify({ at: new Date().toISOString(), every: every }),
      signal: AbortSignal.timeout(30000),
    });
  } catch {
    // Приложение не ответило — следующий тик попробует снова. Пропущенное
    // напоминание догонит себя само: продукт ищет ПРОСРОЧЕННЫЕ, а не «ровно эту минуту».
  }
}

setInterval(tick, 5000);

// ── Control surface for the admin panel (loopback only) ─────────────────────

function json(res, code, body) {
  res.writeHead(code, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (c) => { raw += c; });
    req.on("end", () => {
      try { resolve(JSON.parse(raw || "{}")); } catch { resolve({}); }
    });
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://" + HOST + ":" + PORT);

  // 🛑 ДВЕРИ ЧИТАЮТ БОТА ЧЕРЕЗ СПИСОК, А НЕ ТОЛЬКО СТАРУЮ ФОРМУ КОНФИГА —
  // ИНАЧЕ ОНИ СЛОМАЛИСЬ БЫ В ТОТ ДЕНЬ, КОГДА ПОЯВИТСЯ ВТОРОЙ БОТ. `channel()`
  // смотрит в поле `telegram`; как только конфиг станет списком `telegramBots`,
  // это поле опустеет — и все двери разом начали бы отвечать «бот не настроен»,
  // хотя боты есть. Отказ был бы МОЛЧАЛИВЫМ и обнаружился бы у владельца.
  //
  // Адресат берётся из запроса (`?bot=b2`), пустой — первый бот; полная
  // адресация отправки и привязки — подшаг 99-3.
  const tg = botById(url.searchParams.get("bot")) || channel();

  if (url.pathname === "/status") {
    // 🔒 СНИМОК ОДНОГО БОТА СЧИТАЕТСЯ ОДНОЙ ФУНКЦИЕЙ ДЛЯ СПИСКА И ДЛЯ ПРЕЖНЕГО
    // ОДИНОЧНОГО ПОЛЯ. Две сборки одного и того же снимка разошлись бы, и экран
    // показал бы одно, а список — другое.
    const snapshot = async (b) => {
      let botName = null;
      if (b.token) {
        const me = await telegram(b.token, "getMe");
        botName = (me && me.result && me.result.username) || null;
      }
      return {
        id: b.id,
        configured: Boolean(b.token),
        reachable: Boolean(botName),
        bot: botName,
        chatId: b.chatId || null,
        who: b.who || null,
        enabled: b.enabled !== false,
        mode: b.mode || "rag",
        hook: Boolean(b.hookUrl),
        tickSeconds: Number(b.tickSeconds || 0),
        voice: Boolean(openAiKey()),
      };
    };

    const list = bots();
    const all = [];
    for (const b of list) all.push(await snapshot(b));

    // 🔒 ПРЕЖНЕЕ ПОЛЕ `telegram` ОСТАЁТСЯ И ОПИСЫВАЕТ ПЕРВОГО БОТА. Его читают
    // экран проекта и панель; убрав его вместе с добавлением списка, мы ослепили
    // бы обе поверхности одной правкой службы — и узнали бы об этом от владельца.
    return json(res, 200, {
      ok: true,
      telegram: all[0] || (await snapshot(tg)),
      bots: all,
    });
  }

  if (url.pathname === "/telegram/config" && req.method === "POST") {
    const body = await readBody(req);
    const wantId = url.searchParams.get("bot") || body.bot || "";

    // 🔒 СПИСОК МАТЕРИАЛИЗУЕТСЯ ПРИ ПЕРВОЙ ЗАПИСИ, И СТАРОЕ ПОЛЕ УДАЛЯЕТСЯ ТОГДА
    // ЖЕ. Оставить оба значило бы завести две правды о первом боте: список и
    // `telegram` разошлись бы на следующей правке, и никто бы не заметил, какая
    // из них действует. До первой записи файл не трогается — переезд идёт при
    // чтении (99-1), и откат стоит замены кода.
    const next = readConfig();
    const list = Array.isArray(next.telegramBots) ? next.telegramBots.slice() : [];
    if (list.length === 0 && next.telegram && next.telegram.token) {
      list.push(Object.assign({ id: BOT_PREFIX + "1" }, next.telegram));
    }

    // 🔒 НОВЫЙ БОТ ЗАВОДИТСЯ ЯВНЫМ СЛОВОМ `new`, А НЕ ОПЕЧАТКОЙ В АДРЕСЕ.
    // Иначе `?bot=b7` вместо `b1` молча создавал бы седьмого бота вместо правки
    // первого, и человек искал бы, почему настройка «не сохранилась».
    let idx;
    if (wantId === "new") {
      // Номер продолжает максимальный существующий: переиспользованный номер
      // удалённого бота унаследовал бы его привязку в чужих разговорах.
      const maxN = list.reduce((m, b) => Math.max(m, Number(String(b.id || "").slice(1)) || 0), 0);
      list.push({ id: BOT_PREFIX + (maxN + 1) });
      idx = list.length - 1;
    } else if (wantId) {
      idx = list.findIndex((b) => b.id === wantId);
      if (idx < 0) return json(res, 404, { error: "Нет бота с таким идентификатором" });
    } else {
      // Пустой адресат — первый бот: совместимость со старыми вызовами.
      if (list.length === 0) list.push({ id: BOT_PREFIX + "1" });
      idx = 0;
    }

    const bot = Object.assign({}, list[idx]);

    if (typeof body.token === "string") {
      const token = body.token.trim();
      if (token && !/^\d+:[A-Za-z0-9_-]+$/.test(token)) {
        return json(res, 400, { error: "That does not look like a bot token" });
      }
      // A new token means a new bot: the stored chat id belongs to somebody else.
      if (token !== bot.token) {
        delete bot.chatId;
        delete bot.who;
      }
      bot.token = token;
      // 🛑 СЧЁТЧИК ОБНОВЛЕНИЙ СБРАСЫВАЕТСЯ У ЭТОГО БОТА, А НЕ ГЛОБАЛЬНО.
      // ✗ здесь стояло `offset = 0` — ссылка на переменную, удалённую в 99-2:
      // синтаксис её пропускал, присваивание молча заводило глобальную и не
      // делало НИЧЕГО. Смена токена без сброса счётчика означала бы, что новый
      // бот начинает с чужого номера и теряет свои первые сообщения.
      offsets.set(bot.id, 0);
    }
    if (typeof body.enabled === "boolean") bot.enabled = body.enabled;
    if (body.mode === "rag" || body.mode === "app" || body.mode === "both") {
      bot.mode = body.mode;
    }
    if (typeof body.title === "string") bot.title = body.title.trim();
    // The application door. Empty string switches the push off without losing the
    // secret; null removes both.
    if (typeof body.hookUrl === "string") bot.hookUrl = body.hookUrl.trim();
    if (typeof body.hookSecret === "string") bot.hookSecret = body.hookSecret.trim();
    if (typeof body.tickUrl === "string") bot.tickUrl = body.tickUrl.trim();
    // Шаг расписания в секундах. Ниже 30 не опускаем: чаще минуты напоминания не
    // нужны никому, а нагрузка растёт линейно и молча.
    if (body.tickSeconds !== undefined) {
      const n = Number(body.tickSeconds);
      bot.tickSeconds = Number.isFinite(n) && n > 0 ? Math.max(30, Math.min(3600, n)) : 0;
    }
    if (body.hookUrl === null) {
      delete bot.hookUrl;
      delete bot.hookSecret;
    }

    list[idx] = bot;
    next.telegramBots = list;
    delete next.telegram;
    writeConfig(next);
    return json(res, 200, { ok: true, bot: bot.id });
  }

  // 🔒 УДАЛЕНИЕ БОТА — ОТДЕЛЬНАЯ ДВЕРЬ, А НЕ ПУСТОЙ ТОКЕН В `config`. Пустой
  // токен означает «бот пока без токена», и это законное состояние только что
  // добавленной строки; удаление — другое намерение, и путать их нельзя.
  //
  // 🛑 ПЕРЕПИСКА НЕ ТРОГАЕТСЯ. Разговоры и сообщения живут в базе чата —
  // единственном хранилище, — и удаление подключения не имеет к ним отношения.
  if (url.pathname === "/telegram/remove" && req.method === "POST") {
    const body = await readBody(req);
    const id = url.searchParams.get("bot") || body.bot || "";
    if (!id) return json(res, 400, { error: "Нужен идентификатор бота" });
    const next = readConfig();
    const list = Array.isArray(next.telegramBots) ? next.telegramBots.slice() : [];
    if (list.length === 0 && next.telegram && next.telegram.token) {
      list.push(Object.assign({ id: BOT_PREFIX + "1" }, next.telegram));
    }
    const idx = list.findIndex((b) => b.id === id);
    if (idx < 0) return json(res, 404, { error: "Нет бота с таким идентификатором" });
    list.splice(idx, 1);
    next.telegramBots = list;
    delete next.telegram;
    writeConfig(next);
    offsets.delete(id);
    return json(res, 200, { ok: true, removed: id });
  }

  if (url.pathname === "/telegram/link/start" && req.method === "POST") {
    if (!tg.token) return json(res, 422, { error: "Save a bot token first" });
    const me = await telegram(tg.token, "getMe");
    const bot = me && me.result && me.result.username;
    if (!bot) return json(res, 502, { error: "Telegram does not recognise this token" });
    for (const [code, born] of pendingLinks) {
      if (Date.now() - born.at > LINK_TTL_MS) pendingLinks.delete(code);
    }
    const code = "link" + crypto.randomBytes(8).toString("hex");
    // Код помнит СВОЕГО бота — иначе привязка уйдёт не тому (см. цикл опроса).
    pendingLinks.set(code, { at: Date.now(), bot: tg.id });
    return json(res, 200, { code: code, bot: bot, deepLink: "https://t.me/" + bot + "?start=" + code });
  }

  if (url.pathname === "/telegram/link/poll") {
    const code = (url.searchParams.get("code") || "").trim();
    // 🔒 СПРАШИВАЕМ О ТОМ БОТЕ, ЧЕЙ ЭТО КОД. ✗ прежде читалось общее поле
    // конфига: со вторым ботом экран показал бы «привязано» по чужой привязке,
    // и человек ушёл бы с экрана, не привязав своего.
    const pending = pendingLinks.get(code);
    const fresh = botById(pending ? pending.bot : url.searchParams.get("bot")) || {};
    if (fresh.chatId && !pending) {
      return json(res, 200, { status: "linked", chatId: fresh.chatId, who: fresh.who });
    }
    if (!pending) return json(res, 200, { status: "expired" });
    return json(res, 200, { status: "waiting" });
  }

  // ── The two doors an application needs ─────────────────────────────────────

  // 🔒 ФАЙЛ ОТДАЁТСЯ ЧЕРЕЗ СЛУЖБУ, А НЕ ССЫЛКОЙ НА TELEGRAM.
  //
  // Адрес файла у Telegram содержит ТОКЕН БОТА целиком. Отдать приложению такую
  // ссылку значит отдать ему ключ от бота — и оставить его в логах, в истории
  // запросов и в чужой памяти. Здесь ссылка строится и тут же тратится, а наружу
  // уходят только байты по петле.
  if (url.pathname === "/telegram/file") {
    if (!tg.token) return json(res, 422, { error: "Telegram is not configured" });
    const id = (url.searchParams.get("id") || "").trim();
    if (!id) return json(res, 400, { error: "id is required" });
    const info = await telegram(tg.token, "getFile", "?file_id=" + encodeURIComponent(id));
    const filePath = info && info.result && info.result.file_path;
    if (!filePath) return json(res, 404, { error: "Telegram does not know this file" });
    try {
      const r = await fetch("https://api.telegram.org/file/bot" + tg.token + "/" + filePath);
      if (!r.ok) return json(res, 502, { error: "Telegram refused the download" });
      const buf = Buffer.from(await r.arrayBuffer());
      res.writeHead(200, {
        "Content-Type": "application/octet-stream",
        "Content-Length": buf.length,
        // Имя нужно принимающей стороне: медиатека адресует файл ИМЕНЕМ, а
        // расширение решает, чем его потом читать.
        "X-File-Name": filePath.split("/").pop() || "file",
        "Cache-Control": "no-store",
      });
      return res.end(buf);
    } catch {
      return json(res, 502, { error: "Download failed" });
    }
  }


  if (url.pathname === "/telegram/send" && req.method === "POST") {
    if (!tg.token) return json(res, 422, { error: "Telegram is not configured" });
    const body = await readBody(req);
    const chatId = String(body.chatId || tg.chatId || "").trim();
    if (!chatId) return json(res, 422, { error: "No chat to send to — link one in the panel" });
    const text = String(body.text || "").trim();
    if (!text) return json(res, 400, { error: "text is required" });
    const parseMode = body.parseMode === "HTML" ? "HTML" : undefined;
    const r = await send(tg.token, chatId, text, parseMode);
    const id = r && r.result && r.result.message_id;
    if (!id) {
      return json(res, 502, { error: "Telegram refused the message", telegram: (r && r.description) || null });
    }
    return json(res, 200, { ok: true, messageId: id, chatId: chatId });
  }

  // 🔒 ОТПРАВКА ФАЙЛА: БАЙТЫ ПРИХОДЯТ ОТ ПРИЛОЖЕНИЯ, ТОКЕН ОСТАЁТСЯ ЗДЕСЬ.
  //
  // Без этой двери обещание «прислать запись» было бы пустым: приложение умеет
  // достать файл из медиатеки, но говорить в Telegram может только эта служба —
  // токен бота живёт тут и наружу не уходит.
  if (url.pathname === "/telegram/sendFile" && req.method === "POST") {
    if (!tg.token) return json(res, 422, { error: "Telegram is not configured" });
    const body = await readBody(req);
    const chatId = String(body.chatId || tg.chatId || "").trim();
    if (!chatId) return json(res, 422, { error: "No chat to send to" });
    const b64 = String(body.base64 || "");
    if (!b64) return json(res, 400, { error: "base64 is required" });

    // Род решает МЕТОД: голосовое, присланное картинкой, теряет проигрыватель, а
    // документ, присланный голосовым, Telegram просто отвергает.
    const kind = String(body.kind || "document");
    const method = kind === "audio" ? "sendVoice" : kind === "image" ? "sendPhoto" : "sendDocument";
    const field = kind === "audio" ? "voice" : kind === "image" ? "photo" : "document";
    const name = String(body.name || "file");

    try {
      const form = new FormData();
      form.append("chat_id", chatId);
      if (body.caption) form.append("caption", String(body.caption).slice(0, 1000));
      form.append(field, new Blob([Buffer.from(b64, "base64")]), name);
      const r = await fetch("https://api.telegram.org/bot" + tg.token + "/" + method, {
        method: "POST",
        body: form,
        signal: AbortSignal.timeout(120000),
      });
      const d = await r.json();
      if (!d || d.ok !== true) {
        return json(res, 502, { error: "Telegram refused the file", telegram: (d && d.description) || null });
      }
      // 🔒 ФАЙЛ ТОЖЕ ПОПАДАЕТ В ЖУРНАЛ (77-11): для человека «бот прислал запись» —
      // такая же реплика разговора, как текст. Без этой строки лента показывала бы
      // разговор с дырами ровно там, где продукт сделал самое заметное.
      pushInbox({
        direction: "out",
        at: new Date().toISOString(),
        chatId: String(chatId),
        who: null,
        kind: kind,
        text: String(body.caption || ""),
        objectType: kind,
        fileId: null,
        forwardedFrom: null,
        lat: null,
        lon: null,
      });
      return json(res, 200, { ok: true, messageId: d.result && d.result.message_id });
    } catch (e) {
      return json(res, 502, { error: String((e && e.message) || e) });
    }
  }

  if (url.pathname === "/telegram/inbox") {
    const rows = readInbox();
    const after = Number(url.searchParams.get("after") || 0);
    const limit = Math.min(Number(url.searchParams.get("limit") || 50) || 50, 200);
    return json(res, 200, {
      ok: true,
      messages: rows.filter((r) => r.id > after).slice(0, limit),
      lastId: rows.length ? rows[rows.length - 1].id : 0,
    });
  }

  return json(res, 404, { error: "not found" });
});

server.listen(PORT, HOST, () => {
  console.log("Channels service listening on http://" + HOST + ":" + PORT);
  console.log("Config: " + CONFIG);
});
