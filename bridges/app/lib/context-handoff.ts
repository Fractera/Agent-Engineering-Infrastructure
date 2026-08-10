// Выключатель «Передачи сессии» — СЕРВЕРНОЕ чтение (2026-08-10).
//
// 🔒 ПОЧЕМУ ОН НЕ В «ВОЗМОЖНОСТЯХ ПРИЛОЖЕНИЯ» (владелец, 2026-08-10). Та страница
// отвечает на вопрос «что приложение предлагает посетителю»: меню, крошки, cookie,
// вход. Передача контекста посетителя не касается вовсе — она про то, как агент
// работает над проектом, и её место рядом с документом, которым она управляет.
//
// Стоял он там ровно один заход и породил запертую дверь: раздел «Передача
// сессии» прятался, пока возможность выключена, а включалась она в другом месте —
// то есть человек не видел ни раздела, ни связи. Поэтому теперь: раздел в меню
// ВСЕГДА, выключатель на его собственной странице.
//
// Хранилище общее с возможностями приложения — ветка `features` файла
// PLATFORM-CONFIG/platform-config.json: одно место, где живут все флаги проекта.
// Разное у них только место в интерфейсе.

import fs from "fs";

const CONFIG_PATH =
  process.env.PLATFORM_CONFIG_PATH ??
  "/opt/fractera/app/PLATFORM-CONFIG/platform-config.json";

export type HandoffState = {
  enabled: boolean;
  /** Конфиг целиком: сохранение обязано вернуть его, не потеряв чужие ветки. */
  config: Record<string, unknown>;
};

/** Экспериментальная возможность: молчание файла означает ВЫКЛЮЧЕНО. */
export function readContextHandoff(): HandoffState {
  try {
    if (!fs.existsSync(CONFIG_PATH)) return { enabled: false, config: {} };
    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8")) as Record<string, unknown>;
    const features = (config.features ?? {}) as Record<string, unknown>;
    return { enabled: features.contextHandoff === true, config };
  } catch {
    return { enabled: false, config: {} };
  }
}
