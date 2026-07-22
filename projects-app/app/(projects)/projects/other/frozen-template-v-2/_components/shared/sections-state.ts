"use client";

// ПАМЯТЬ СОСТОЯНИЯ РАЗДЕЛОВ — что владелец раскрыл, а что свернул. Хранится в браузере, ОТДЕЛЬНО ДЛЯ
// КАЖДОЙ АВТОМАТИЗАЦИИ: ключ содержит её адрес, поэтому две автоматизации не перетирают выбор друг друга.
//
// СТРУКТУРА ПОВТОРЯЕТ СЛОЙ `components` ИЗ ЯДРА — вкладка, внутри неё сущности:
//   { "tabs": { "dashboard": { "open": true, "entities": { "<cuid>": false } } } }
// Так запись в браузере читается тем же взглядом, что и automation.json: один и тот же смысл описан
// одинаково в обоих местах, и по ключу сразу видно, о чём он.
//
// Хранится ТОЛЬКО отличие от того, что решило ядро (presence вкладки, первая сущность открыта): не нашли
// записи — берём умолчание ядра. Поэтому смена умолчаний в ядре доходит до всех, кто ничего не трогал.
export type SectionsState = {
  tabs: Record<string, { open?: boolean; entities?: Record<string, boolean> }>;
  /** Раскрывашки ОГЛАВЛЕНИЯ витрины — по имени вкладки. Отдельная ветка: это состояние ящика навигации,
   *  а не самой страницы, и путать их нельзя (раздел может быть раскрыт, а его пункт в оглавлении — нет). */
  nav?: Record<string, boolean>;
};

/** Адрес автоматизации из URL — без хардкода слага (закон 0: папку можно перенести). */
function automationKey(): string {
  const path = typeof location === "undefined" ? "" : location.pathname.replace(/\/+$/, "");
  return `fractera:sections:${path}`;
}

function read(): SectionsState {
  try {
    const raw = localStorage.getItem(automationKey());
    const s = raw ? (JSON.parse(raw) as SectionsState) : null;
    return s && typeof s === "object" && s.tabs ? s : { tabs: {} };
  } catch {
    return { tabs: {} };
  }
}

function write(state: SectionsState): void {
  try {
    localStorage.setItem(automationKey(), JSON.stringify(state));
  } catch {
    /* приватный режим браузера — раздел просто не запомнится, ломать из-за этого нечего */
  }
}

/** Состояние вкладки (или её сущности, если передан cuid); `undefined` — владелец его не трогал. */
export function readOpen(tab: string, cuid?: string): boolean | undefined {
  const t = read().tabs[tab];
  if (!t) return undefined;
  return cuid ? t.entities?.[cuid] : t.open;
}

export function writeOpen(tab: string, open: boolean, cuid?: string): void {
  const state = read();
  const t = (state.tabs[tab] ??= {});
  if (cuid) {
    t.entities ??= {};
    t.entities[cuid] = open;
  } else {
    t.open = open;
  }
  write(state);
}

/** Раскрывашка оглавления: раскрыта ли категория ящика навигации. Умолчание — ЗАКРЫТА. */
export function readNavOpen(tab: string): boolean {
  return read().nav?.[tab] === true;
}

export function writeNavOpen(tab: string, open: boolean): void {
  const state = read();
  state.nav ??= {};
  state.nav[tab] = open;
  write(state);
}
