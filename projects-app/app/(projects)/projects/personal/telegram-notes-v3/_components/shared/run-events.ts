"use client";

// СИГНАЛ «ПРОГОН ЗАВЕРШЁН» — один факт, о котором знает вся страница: автоматизация только что отработала.
// Перенос идиомы v1 (`_shared/use-run-refresh.ts`, шаг 243.2) внутрь папки (закон 0).
//
// ЗАЧЕМ. Успешный прогон пишет строки, которые читают СОСЕДНИЕ секции той же страницы (сегодня — таблица
// дашборда). Без сигнала владелец видел свежие записи только после перезагрузки. Тот, кто запустил,
// объявляет факт один раз; страница обновляет свои серверные данные сама.
//
// Событие окна, а не React-контекст через всё дерево: секции рождаются независимо и не должны знать друг
// о друге. Опроса (polling) нет — обновление ровно тогда, когда есть что обновлять.
const EVENT = "fractera:automation-run-completed";

/** Зовётся сразу после успешного прогона. */
export function notifyRunCompleted(): void {
  window.dispatchEvent(new CustomEvent(EVENT));
}

/** Подписка: `onRefresh` срабатывает на каждый завершённый прогон этой страницы. */
export function onRunCompleted(onRefresh: () => void): () => void {
  window.addEventListener(EVENT, onRefresh);
  return () => window.removeEventListener(EVENT, onRefresh);
}

// ВНЕШНИЙ ПРОГОН (308, требование владельца): `onRunCompleted` ловит прогоны, запущенные В БРАУЗЕРЕ (пульт).
// Но автоматизация чаще срабатывает ИЗВНЕ — из Telegram через слушателя, на сервере: браузер о таком
// прогоне не знает, и его новые строки (заметка, чек, метка, событие) появлялись бы только после ручной
// перезагрузки. Поэтому секции дополнительно обновляют серверные данные, когда прогон МОГ случиться вне
// браузера: при возврате фокуса/видимости вкладки и мягким тиком (только пока вкладка видима — скрытая
// вкладка сервер не дёргает). Это не «поллинг ради поллинга»: обновление привязано к моменту, когда
// владелец смотрит на страницу.
/** Подписка на «данные могли устареть от внешнего прогона»: фокус + видимость вкладки + мягкий тик. */
export function onExternalRefresh(onRefresh: () => void, everyMs = 20000): () => void {
  const whenVisible = () => { if (document.visibilityState === "visible") onRefresh(); };
  window.addEventListener("focus", onRefresh);
  document.addEventListener("visibilitychange", whenVisible);
  const id = window.setInterval(whenVisible, Math.max(5000, everyMs));
  return () => {
    window.removeEventListener("focus", onRefresh);
    document.removeEventListener("visibilitychange", whenVisible);
    window.clearInterval(id);
  };
}
