// Режим разработки — общие значения для сервера и браузера.
//
// 🔒 ПОЧЕМУ ОТДЕЛЬНЫЙ ФАЙЛ, А НЕ КОНСТАНТА В ОСТРОВКЕ (дефект найден владельцем
// 2026-08-18: белый экран на `/ru/development-mode`).
//
// Список режимов жил в `mode-picker.client.tsx`, и серверная страница
// импортировала его оттуда. Next заменяет экспорты клиентского модуля
// КЛИЕНТСКИМИ ССЫЛКАМИ, поэтому на сервере `MODES` перестаёт быть массивом:
// `MODES.includes(...)` падает с `is not a function`, а страница отдаёт пустой
// экран. В логе это видно, в браузере — нет: страница просто белая.
//
// Правило общее: значение, нужное обеим сторонам, живёт в нейтральном файле.
// Островок берёт его отсюда же — тогда двух списков режимов не существует.

export const MODES = ["classic", "steps", "cases"] as const;
export type DevelopmentMode = (typeof MODES)[number];

export function isDevelopmentMode(v: unknown): v is DevelopmentMode {
  return typeof v === "string" && (MODES as readonly string[]).includes(v);
}

/**
 * Режим проекта из конфига платформы.
 *
 * Не выбрано — работаем по кейсам: умолчанием стоит то, ради чего платформа
 * существует, а не самое простое.
 */
export function developmentModeOf(config: Record<string, unknown>): DevelopmentMode {
  return isDevelopmentMode(config.developmentMode) ? config.developmentMode : "cases";
}
