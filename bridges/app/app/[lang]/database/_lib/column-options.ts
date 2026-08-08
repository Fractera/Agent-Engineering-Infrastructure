// Столбцы с известным набором значений (шаг 501, Ф2, партия 3).
//
// Перенесено из старой панели дословно: там же жили `SELECT_COLUMNS` и
// `MULTI_COLUMNS`. Смысл — не дать набрать руками то, что может быть только из
// списка: `is_active` бывает 1 или 0, `roles` собирается из словаря ролей.
// Свободный текст в таких полях ломает данные тише, чем хотелось бы.

import { ALL_ROLES } from "@/lib/roles";

// Один из списка.
const SINGLE: Record<string, Record<string, string[]>> = {
  users: {
    is_active: ["1", "0"],
    provider: ["credentials", "google", "email", "guest"],
    locale: ["en", "ru", "es", "fr", "de", "zh"],
  },
};

// Несколько из списка; значение хранится строкой JSON.
const MULTI: Record<string, Record<string, string[]>> = {
  users: {
    roles: [...ALL_ROLES],
  },
};

export function singleOptions(table: string, column: string): string[] | null {
  return SINGLE[table]?.[column] ?? null;
}

export function multiOptions(table: string, column: string): string[] | null {
  return MULTI[table]?.[column] ?? null;
}
