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
import { parseTurn, type Turn, type TurnOutcome } from "../../../_data/record.schema";

/**
 * РЕПЛИКА — КОНВЕРТ, А НЕ СТРОКА (шаг 330.3). Форма и её закон живут в схеме (`TurnSchema`), здесь только
 * псевдоним: у одной формы один дом. Что несёт конверт и почему исход проставляет движок — там же.
 */
export type ChatMessage = Turn;
// напр. {kind:"remind-when"} / {kind:"place-desc"}; `payload` (310) держит отложенные данные между
// сообщениями — hold-and-confirm дуб-контроля: строки, которые запишем, ЕСЛИ владелец подтвердит дубль.
export type PendingAsk = { kind: string; at: string; payload?: Record<string, unknown> } | null;
/**
 * `summary` — СВОДКА СЕССИИ (шаг 330.4): сжатое изложение того, что уже вытеснено из буфера. Окно и TTL
 * реплики УДАЛЯЮТ, и до этого шага сказанное просто переставало существовать: длинный разговор терял своё
 * начало безвозвратно, и ассистент честно не знал, о чём была первая половина беседы. Теперь вытесненное
 * не исчезает, а уплотняется в один абзац — дёшево и навсегда.
 */
/**
 * 🔒 `langChosen` — ВЫБРАЛ ЧЕЛОВЕК ИЛИ ДОГАДАЛИСЬ МЫ (332.F, дефект найден владельцем на живом экране).
 *
 * Язык чата записывался ОДИНАКОВО в двух совершенно разных случаях: когда человек прямо попросил другой
 * язык и когда мы просто угадали его по алфавиту первого сообщения. Дальше оба одинаково побеждали всё
 * остальное — и владелец, открывший РУССКУЮ страницу и написавший «hello», получил чат, навсегда
 * закреплённый за английским; смена языка интерфейса на него уже не влияла.
 *
 * Догадка не имеет права весить столько же, сколько просьба. Поэтому выбор помечается, и только
 * помеченный сильнее языка страницы.
 */
export type ChatState = { id: string; messages: ChatMessage[]; lang: string; langChosen: boolean; pending: PendingAsk; summary: string };

const TABLE = "chat-state";

function normalize(row: Record<string, unknown> | undefined, chatId: string): ChatState {
  const messages = Array.isArray(row?.messages) ? (row!.messages as ChatMessage[]) : [];
  return {
    id: chatId,
    messages,
    lang: typeof row?.lang === "string" ? (row!.lang as string) : "",
    // Старые записи флага не имеют — и это верно: их язык был УГАДАН, а не выбран.
    langChosen: row?.langChosen === true,
    pending: (row?.pending as PendingAsk) ?? null,
    summary: typeof row?.summary === "string" ? (row!.summary as string) : "",
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
  // 🔒 ИСХОД ВИДЕН, КОГДА ОН НЕ «ВСЁ ПОЛУЧИЛОСЬ» (330.3). Успех — норма разговора, и писать «ok» у каждой
  // реплики значит платить токенами за тишину. А вот провал, отказ и «не нашлось» модель обязана видеть:
  // без них она продолжает поверх неудачи так, будто её не было. Ссылки на созданные записи в текст НЕ
  // идут — они машинный адрес для узлов, а не материал для разговора (и стоили бы дороже пользы).
  const mark = (m: ChatMessage) => {
    const bits: string[] = [];
    if (m.outcome && m.outcome !== "ok") bits.push(m.outcome);
    else if (m.links && m.links.length) bits.push(`saved ${m.links.length}`);
    return bits.length ? ` (${bits.join(", ")})` : "";
  };
  return recent.map((m) => `[${t(m.at)}] ${who(m.role)}${mark(m)}: ${m.text}`).join("\n");
}

/** Прочитать состояние чата (пустое, если чат новый). */
export async function loadChat(chatId: string): Promise<ChatState> {
  const id = String(chatId).trim();
  if (!id) return { id: "", messages: [], lang: "", langChosen: false, pending: null, summary: "" };
  const row = (await listRows(TABLE, Infinity)).find((r) => r.id === id);
  return normalize(row as Record<string, unknown> | undefined, id);
}

/** Записать всю строку состояния (создаёт при первом обращении, id = chatId). */
async function save(state: ChatState): Promise<void> {
  const existing = (await listRows(TABLE, Infinity)).find((r) => r.id === state.id);
  const patch = { messages: state.messages, lang: state.lang, pending: state.pending, summary: state.summary };
  if (existing) await updateRow(TABLE, state.id, patch);
  else await addRow(TABLE, patch, state.id);
}

/**
 * Отсечь сообщения старше TTL и оставить только последние N (окно из настроек вкладки «Ассистент»).
 * Возвращает и ВЫТЕСНЕННЫЕ (330.4): раньше они молча пропадали, а теперь их содержание обязано уехать в
 * сводку сессии — иначе длинный разговор безвозвратно теряет своё начало.
 */
function trim(
  messages: ChatMessage[],
  limitN: number,
  ttlMinutes: number,
): { kept: ChatMessage[]; dropped: ChatMessage[] } {
  const cutoff = Date.now() - Math.max(1, ttlMinutes) * 60_000;
  const stale: ChatMessage[] = [];
  const fresh = messages.filter((m) => {
    const t = new Date(m.at).getTime();
    const ok = Number.isFinite(t) ? t >= cutoff : true;
    if (!ok) stale.push(m);
    return ok;
  });
  const n = Math.max(1, limitN);
  if (fresh.length <= n) return { kept: fresh, dropped: stale };
  return { kept: fresh.slice(fresh.length - n), dropped: [...stale, ...fresh.slice(0, fresh.length - n)] };
}

/**
 * Добавить сообщение в буфер, подрезав по окну. Возвращает состояние И вытесненные реплики: сжать их в
 * сводку обязан ВЫЗЫВАЮЩИЙ (узел речи), потому что сжатие — работа модели, а этот модуль — хранилище.
 * Так и закон соблюдён: состояние диалога по-прежнему пишет только речь.
 */
export async function pushMessage(
  chatId: string,
  msg: ChatMessage,
  limitN: number,
  ttlMinutes: number,
): Promise<{ state: ChatState; dropped: ChatMessage[] }> {
  const state = await loadChat(chatId);
  if (!state.id) return { state, dropped: [] };
  // Схема проверяет реплику ДО записи (330.3): незаконный конверт в память диалога не попадает, а
  // вызывающий узнаёт словами, что именно не так. Тот же приём, что у строки склада.
  const { kept, dropped } = trim([...state.messages, parseTurn(msg)], limitN, ttlMinutes);
  state.messages = kept;
  await save(state);
  return { state, dropped };
}

/** Записать сводку сессии (330.4). Пишет её, как и всё состояние диалога, только слой речи. */
export async function setSummary(chatId: string, summary: string): Promise<void> {
  const state = await loadChat(chatId);
  if (!state.id) return;
  state.summary = String(summary ?? "").trim();
  await save(state);
}

/**
 * 🔒 ЗАПЕЧАТАТЬ РЕПЛИКИ ПРОГОНА (шаг 330.3) — проставить исход и созданные записи тем репликам, что
 * родились в этом прогоне. Зовёт ДВИЖОК в конце прогона, и только он: в момент речи выходы ещё не
 * отработали, поэтому автору речи эти факты неизвестны физически (обоснование — `record.schema.ts`).
 *
 * Идемпотентно и безопасно: чата нет, реплик этого прогона нет — тихо ничего не делаем. Запечатывание
 * НИКОГДА не трогает текст: конверт дополняет реплику, а не переписывает сказанное.
 */
export async function sealTurns(
  chatId: string,
  runId: string,
  seal: { outcome: TurnOutcome; links: { table: string; id: string }[] },
): Promise<number> {
  const id = String(chatId).trim();
  const run = String(runId).trim();
  if (!id || !run) return 0;
  const state = await loadChat(id);
  if (!state.id) return 0;
  let sealed = 0;
  state.messages = state.messages.map((m) => {
    if (m.runId !== run) return m;
    sealed++;
    return { ...m, outcome: seal.outcome, ...(seal.links.length ? { links: seal.links } : {}) };
  });
  if (!sealed) return 0;
  await save(state);
  return sealed;
}

/** Зафиксировать язык чата на всю историю (выбор пользователя, не дефолт). */
export async function setLang(chatId: string, lang: string, chosen = false): Promise<void> {
  const state = await loadChat(chatId);
  if (!state.id) return;
  state.lang = String(lang).trim().toLowerCase().slice(0, 5);
  // Пометка ставится ТОЛЬКО просьбой человека и никогда не снимается догадкой: один раз попросил — держим.
  if (chosen) state.langChosen = true;
  await save(state);
}

/** Поставить/снять висящий вопрос (pending): следующий ответ трактуется как ответ на него. */
export async function setPending(chatId: string, pending: PendingAsk): Promise<void> {
  const state = await loadChat(chatId);
  if (!state.id) return;
  state.pending = pending;
  await save(state);
}
