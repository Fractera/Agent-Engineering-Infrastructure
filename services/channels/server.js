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
const pendingLinks = new Map();

// ── The inbox: what the bot heard, kept for the application ─────────────────
//
// This service is the only reader of the bot (see the header), so an application
// that wants to REACT to a message cannot poll Telegram itself. It reads this
// instead: a ring of the last messages, written to disk so a restart does not
// lose the ones nobody has read yet.
const INBOX = process.env.CHANNELS_INBOX ?? path.resolve(__dirname, "inbox.json");
const INBOX_MAX = 500;

function readInbox() {
  try {
    const rows = JSON.parse(fs.readFileSync(INBOX, "utf8"));
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

function pushInbox(entry) {
  const rows = readInbox();
  const id = (rows.length ? rows[rows.length - 1].id : 0) + 1;
  rows.push(Object.assign({ id: id }, entry));
  while (rows.length > INBOX_MAX) rows.shift();
  try {
    fs.writeFileSync(INBOX, JSON.stringify(rows, null, 2) + "\n", { mode: 0o600 });
  } catch {}
  return id;
}

// The OpenAI key lives in the data service env, written there by the panel. This
// service deliberately has no key of its own: one place to fill in, one place to
// revoke. An explicit OPENAI_API_KEY in this service env wins, so the day the
// panel writes it here directly nothing has to change.
const KEY_FILE = process.env.OPENAI_KEY_FILE ?? "/opt/fractera/services/data/.env";

function openAiKey() {
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;
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

function send(token, chatId, text) {
  // Telegram refuses messages longer than 4096 characters.
  return telegram(token, "sendMessage", "", { chat_id: chatId, text: String(text).slice(0, 4000) });
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

// The answer itself. The bot is a mouth for the knowledge base: it asks agentic
// RAG and repeats what comes back. When RAG is off or empty it says so plainly
// instead of inventing something — a bot that guesses is worse than a silent one.
async function answer(question) {
  try {
    const r = await fetch(RAG_URL + "/query", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": RAG_KEY },
      body: JSON.stringify({ query: question, mode: "hybrid" }),
      signal: AbortSignal.timeout(90000),
    });
    if (!r.ok) return "The knowledge base is not answering right now. Please try again in a minute.";
    const d = await r.json();
    const text = d && (d.response || d.result);
    if (typeof text === "string" && text.trim()) return text;
    return "I could not find anything about that in the knowledge base yet.";
  } catch {
    return "The knowledge base is switched off. Ask the owner to turn on Agentic RAG.";
  }
}

let offset = 0;
let looping = false;

async function loop() {
  if (looping) return;
  looping = true;
  try {
    const cfg = readConfig();
    const tg = cfg.telegram || {};
    if (!tg.token || tg.enabled === false) return;

    const query = "?timeout=25&offset=" + offset + "&allowed_updates=%5B%22message%22%5D";
    const upd = await telegram(tg.token, "getUpdates", query);
    const results = upd && Array.isArray(upd.result) ? upd.result : [];

    for (const u of results) {
      offset = Math.max(offset, (u.update_id || 0) + 1);
      const msg = u.message;
      const chat = msg && msg.chat;
      if (!chat || chat.id == null) continue;

      // A voice note carries no text of its own. It is fetched, transcribed and
      // treated exactly as if the person had typed it — nothing below this point
      // can tell the two apart.
      let text = String((msg && msg.text) || "").trim();
      let kind = "text";
      const voice = (msg && (msg.voice || msg.audio || msg.video_note)) || null;
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
      if (!text) continue;

      // Linking: the deep-link START carries our one-time code, and the very same
      // message carries the sender's chat id. One code, one id, nothing guessed.
      const linkMatch = /^\/start\s+(link[0-9a-f]+)$/.exec(text);
      if (linkMatch && pendingLinks.has(linkMatch[1])) {
        pendingLinks.delete(linkMatch[1]);
        const who = chat.username
          ? "@" + chat.username
          : [chat.first_name, chat.last_name].filter(Boolean).join(" ") || String(chat.id);
        const now = readConfig();
        now.telegram = Object.assign({}, now.telegram, {
          chatId: String(chat.id),
          who: who,
          linkedAt: new Date().toISOString(),
        });
        writeConfig(now);
        await send(tg.token, chat.id, "Connected. Ask me anything about your knowledge base.");
        continue;
      }

      if (text.indexOf("/start") === 0) {
        await send(tg.token, chat.id, "Hello. Ask me a question and I will answer from the knowledge base.");
        continue;
      }

      // Everything the bot hears goes into the inbox whatever the mode: an
      // application that wants to react must be able to see it at all.
      pushInbox({
        at: new Date().toISOString(),
        chatId: String(chat.id),
        who: chat.username
          ? "@" + chat.username
          : [chat.first_name, chat.last_name].filter(Boolean).join(" ") || String(chat.id),
        kind: kind,
        text: text,
      });

      // The mode decides WHO answers. `rag` — this service, from the knowledge
      // base, as it always did. `app` — nobody here: the application reads the
      // inbox and replies through /telegram/send. `both` — the base answers and
      // the application still sees the message.
      const mode = tg.mode === "app" || tg.mode === "both" ? tg.mode : "rag";
      if (mode !== "app") await send(tg.token, chat.id, await answer(text));
    }
  } catch {
    // A bad poll must never stop the loop; the next tick tries again.
  } finally {
    looping = false;
  }
}

setInterval(loop, 2000);

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
  const tg = readConfig().telegram || {};

  if (url.pathname === "/status") {
    let botName = null;
    if (tg.token) {
      const me = await telegram(tg.token, "getMe");
      botName = (me && me.result && me.result.username) || null;
    }
    return json(res, 200, {
      ok: true,
      telegram: {
        configured: Boolean(tg.token),
        reachable: Boolean(botName),
        bot: botName,
        chatId: tg.chatId || null,
        who: tg.who || null,
        enabled: tg.enabled !== false,
        mode: tg.mode || "rag",
        voice: Boolean(openAiKey()),
      },
    });
  }

  if (url.pathname === "/telegram/config" && req.method === "POST") {
    const body = await readBody(req);
    const next = readConfig();
    next.telegram = Object.assign({}, next.telegram);
    if (typeof body.token === "string") {
      const token = body.token.trim();
      if (token && !/^\d+:[A-Za-z0-9_-]+$/.test(token)) {
        return json(res, 400, { error: "That does not look like a bot token" });
      }
      // A new token means a new bot: the stored chat id belongs to somebody else.
      if (token !== next.telegram.token) {
        delete next.telegram.chatId;
        delete next.telegram.who;
      }
      next.telegram.token = token;
      offset = 0;
    }
    if (typeof body.enabled === "boolean") next.telegram.enabled = body.enabled;
    if (body.mode === "rag" || body.mode === "app" || body.mode === "both") {
      next.telegram.mode = body.mode;
    }
    writeConfig(next);
    return json(res, 200, { ok: true });
  }

  if (url.pathname === "/telegram/link/start" && req.method === "POST") {
    if (!tg.token) return json(res, 422, { error: "Save a bot token first" });
    const me = await telegram(tg.token, "getMe");
    const bot = me && me.result && me.result.username;
    if (!bot) return json(res, 502, { error: "Telegram does not recognise this token" });
    for (const [code, born] of pendingLinks) {
      if (Date.now() - born > LINK_TTL_MS) pendingLinks.delete(code);
    }
    const code = "link" + crypto.randomBytes(8).toString("hex");
    pendingLinks.set(code, Date.now());
    return json(res, 200, { code: code, bot: bot, deepLink: "https://t.me/" + bot + "?start=" + code });
  }

  if (url.pathname === "/telegram/link/poll") {
    const code = (url.searchParams.get("code") || "").trim();
    const fresh = readConfig().telegram || {};
    if (fresh.chatId && !pendingLinks.has(code)) {
      return json(res, 200, { status: "linked", chatId: fresh.chatId, who: fresh.who });
    }
    if (!pendingLinks.has(code)) return json(res, 200, { status: "expired" });
    return json(res, 200, { status: "waiting" });
  }

  // ── The two doors an application needs ─────────────────────────────────────

  if (url.pathname === "/telegram/send" && req.method === "POST") {
    if (!tg.token) return json(res, 422, { error: "Telegram is not configured" });
    const body = await readBody(req);
    const chatId = String(body.chatId || tg.chatId || "").trim();
    if (!chatId) return json(res, 422, { error: "No chat to send to — link one in the panel" });
    const text = String(body.text || "").trim();
    if (!text) return json(res, 400, { error: "text is required" });
    const r = await send(tg.token, chatId, text);
    const id = r && r.result && r.result.message_id;
    if (!id) {
      return json(res, 502, { error: "Telegram refused the message", telegram: (r && r.description) || null });
    }
    return json(res, 200, { ok: true, messageId: id, chatId: chatId });
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
