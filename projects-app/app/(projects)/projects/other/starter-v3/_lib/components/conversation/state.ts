// СОСТОЯНИЕ ДИАЛОГА (шаг 309, разговорный слой) — пер-чат память автоматизации: последние сообщения,
// зафиксированный язык, висящий вопрос (pending). Живёт СТРОКОЙ в общем хранилище папки (`rows.ts`,
// таблица `chat-state`, `id = chatId`) — переиспользуем append-only+last-wins, никакого нового механизма
// (закон 0). Это «пер-чат запись, которую читает ЛЮБОЙ прогон этого чата» (требование владельца): дефолт
// языка — лишь стартовая догадка, выбор пользователя запоминается здесь навсегда.
//
// ЗАЧЕМ. Без короткой памяти диалога модель обречена выглядеть дурой на уточнениях: бот спросил «когда?»,
// пользователь пишет «завтра» — это НОВЫЙ прогон, и без буфера он не знает, что «завтра» — ответ на его
// же вопрос. Буфер + pending дают разговорному узлу контекст.
import { addRow, listRows, updateRow } from "../../rows";

export type ChatMessage = { role: "user" | "assistant"; text: string; at: string };
// напр. {kind:"remind-when"} / {kind:"place-desc"}; `payload` (310) держит отложенные данные между
// сообщениями — hold-and-confirm дуб-контроля: строки, которые запишем, ЕСЛИ владелец подтвердит дубль.
export type PendingAsk = { kind: string; at: string; payload?: Record<string, unknown> } | null;
export type ChatState = { id: string; messages: ChatMessage[]; lang: string; pending: PendingAsk };

const TABLE = "chat-state";

function normalize(row: Record<string, unknown> | undefined, chatId: string): ChatState {
  const messages = Array.isArray(row?.messages) ? (row!.messages as ChatMessage[]) : [];
  return {
    id: chatId,
    messages,
    lang: typeof row?.lang === "string" ? (row!.lang as string) : "",
    pending: (row?.pending as PendingAsk) ?? null,
  };
}

/**
 * СТРУКТУРНЫЙ КОНТЕКСТ ДИАЛОГА (309, формат владельца) — последние сообщения одним блоком для модельных
 * узлов: «[время] кто→кому: текст», повторяется. Так узлы фронта, середины и `converse` судят НЕ в вакууме
 * (живой тест: короткий ответ на висящий вопрос без контекста уходил в новую запись). Даётся
 * ВСЕМ модельным узлам, а не только разговорному. Пустой буфер → пустая строка.
 */
/**
 * 🔒 КТО СОБЕСЕДНИК (шаг 312.3) — ключ ПЛОСКОСТИ ДИАЛОГА, выведенный из уже названного каналом адресата.
 *
 * Разговор — не свойство одного прогона: вопрос задан сегодня, ответ придёт следующим сообщением. Значит у
 * диалога нужна своя ось, и её адрес — этот ключ. Раньше память была привязана к `telegramChatId`, поэтому
 * у ПУЛЬТА её не было вовсе: каждое сообщение владельца было первым.
 *
 * Пусто = собеседника нет (вебхук, крон, публичная страница без личности) — плоскость не прикрепляется, и
 * прогон работает как раньше. Это законное состояние, а не ошибка: машине нечего помнить о разговоре.
 */
export function chatKeyOf(ctx: Record<string, unknown>): string {
  const tg = String(ctx.telegramChatId ?? "").trim();
  if (tg) return `telegram:${tg}`;
  const from = String(ctx.emailFrom ?? "").trim();
  if (from) return `email:${from.toLowerCase()}`;
  return String(ctx.source ?? "").trim() === "control-panel" ? "panel" : "";
}

/**
 * 🔒 ОКНО — ОБЯЗАТЕЛЬНЫЙ ПАРАМЕТР, БЕЗ ЗНАЧЕНИЯ ПО УМОЛЧАНИЮ (шаг 330.1).
 *
 * Здесь стоял `limit = 8`, и он молча побеждал настройку владельца: движок звал эту функцию без аргумента,
 * поэтому вкладка «Ассистент» могла хранить любое окно — модель всё равно видела восемь реплик. Настройка,
 * не влияющая на поведение, хуже отсутствующей: она обещает управление, которого нет.
 *
 * Дефолт удалён намеренно — окно обязан назвать вызывающий, и единственный его источник — вкладка
 * «Ассистент» (`assistantConfigOf`). Компилятор теперь не даст «забыть» его снова.
 */
export function formatDialog(messages: ChatMessage[], limit: number): string {
  const recent = messages.slice(-Math.max(1, limit));
  if (!recent.length) return "";
  const who = (r: string) => (r === "user" ? "user→bot" : "bot→user");
  const t = (iso: string) => { const d = new Date(iso); return Number.isFinite(d.getTime()) ? d.toISOString().slice(0, 16).replace("T", " ") : ""; };
  return recent.map((m) => `[${t(m.at)}] ${who(m.role)}: ${m.text}`).join("\n");
}

/** Прочитать состояние чата (пустое, если чат новый). */
export async function loadChat(chatId: string): Promise<ChatState> {
  const id = String(chatId).trim();
  if (!id) return { id: "", messages: [], lang: "", pending: null };
  const row = (await listRows(TABLE, Infinity)).find((r) => r.id === id);
  return normalize(row as Record<string, unknown> | undefined, id);
}

/** Записать всю строку состояния (создаёт при первом обращении, id = chatId). */
async function save(state: ChatState): Promise<void> {
  const existing = (await listRows(TABLE, Infinity)).find((r) => r.id === state.id);
  const patch = { messages: state.messages, lang: state.lang, pending: state.pending };
  if (existing) await updateRow(TABLE, state.id, patch);
  else await addRow(TABLE, patch, state.id);
}

/** Отсечь сообщения старше TTL и оставить только последние N (окно из настроек вкладки «Ассистент»). */
function trim(messages: ChatMessage[], limitN: number, ttlMinutes: number): ChatMessage[] {
  const cutoff = Date.now() - Math.max(1, ttlMinutes) * 60_000;
  const fresh = messages.filter((m) => {
    const t = new Date(m.at).getTime();
    return Number.isFinite(t) ? t >= cutoff : true;
  });
  const n = Math.max(1, limitN);
  return fresh.length > n ? fresh.slice(fresh.length - n) : fresh;
}

/** Добавить сообщение в буфер, подрезав по окну; возвращает обновлённое состояние. */
export async function pushMessage(chatId: string, msg: ChatMessage, limitN: number, ttlMinutes: number): Promise<ChatState> {
  const state = await loadChat(chatId);
  if (!state.id) return state;
  state.messages = trim([...state.messages, msg], limitN, ttlMinutes);
  await save(state);
  return state;
}

/** Зафиксировать язык чата на всю историю (выбор пользователя, не дефолт). */
export async function setLang(chatId: string, lang: string): Promise<void> {
  const state = await loadChat(chatId);
  if (!state.id) return;
  state.lang = String(lang).trim().toLowerCase().slice(0, 5);
  await save(state);
}

/** Поставить/снять висящий вопрос (pending): следующий ответ трактуется как ответ на него. */
export async function setPending(chatId: string, pending: PendingAsk): Promise<void> {
  const state = await loadChat(chatId);
  if (!state.id) return;
  state.pending = pending;
  await save(state);
}
