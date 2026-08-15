// КАТАЛОГ ШРИФТОВ — откуда они берутся, где живут и как подключаются.
//
// 🔒 ПОЧЕМУ СПИСОК, А НЕ ПОЛЕ ВВОДА. Имя шрифта, набранное руками, ломается
// тремя способами сразу, и все три тихие: опечатка («Playfair Dispaly») даёт
// молчаливый откат на системный шрифт; шрифт без кириллицы превращает русскую
// страницу в набор прямоугольников; адрес подключения, забытый рядом с именем,
// оставляет `font-family` без самого файла. Список снимает все три: у каждой
// записи есть проверенный адрес и честно указанные алфавиты.
//
// 🔒 ОТКУДА ФАЙЛЫ. Google Fonts — `fonts.google.com`, свободная лицензия (OFL
// или Apache), раздача с `fonts.googleapis.com`. Мы НЕ храним файлы у себя:
// шрифт приезжает посетителю с раздачи Google, и её кэш уже прогрет почти на
// каждом устройстве.
//
// 🔒 ЧТО ЭТО ЗНАЧИТ ДЛЯ ЕВРОПЫ. Подключение внешнего шрифта отдаёт адрес
// посетителя серверам Google, и немецкий суд однажды признал это нарушением
// GDPR (LG München I, 3 O 17493/20). Поэтому набор всегда открывается системным
// вариантом — он не ходит наружу вовсе, — а выбор внешнего шрифта сопровождается
// прямым предупреждением, а не мелким шрифтом внизу.

export type FontAlphabet = "latin" | "cyrillic" | "greek" | "arabic" | "cjk";

export type FontEntry = {
  /** Имя семейства — уезжает в `font-family` как есть. */
  family: string;
  /** Адрес таблицы стилей. Пусто = системный шрифт, наружу не ходит. */
  import?: string;
  /** Какие алфавиты покрывает. */
  alphabets: FontAlphabet[];
  /** Характер: для чего этот шрифт уместен. */
  kind: "sans" | "serif" | "mono";
};

/**
 * 🔒 СИСТЕМНЫЙ НАБОР — ПЕРВЫЙ И БЕЗ ЗАГРУЗКИ. Он берёт шрифт, уже стоящий на
 * устройстве: ничего не скачивается, ничего не уходит наружу, текст виден в
 * первый же кадр. Для большинства проектов это лучший выбор, и он обязан стоять
 * первым — иначе список читается как «выберите, чем нагрузить страницу».
 */
export const SYSTEM_STACK: Record<FontEntry["kind"], string> = {
  sans: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
  mono: "ui-monospace, SFMono-Regular, Menlo, monospace",
};

const g = (family: string, params: string) =>
  `https://fonts.googleapis.com/css2?family=${params}&display=swap`;

export const FONT_CATALOGUE: FontEntry[] = [
  // ── Без загрузки ───────────────────────────────────────────────────────────
  { family: SYSTEM_STACK.sans, alphabets: ["latin", "cyrillic", "greek"], kind: "sans" },
  { family: SYSTEM_STACK.serif, alphabets: ["latin", "cyrillic", "greek"], kind: "serif" },
  { family: SYSTEM_STACK.mono, alphabets: ["latin", "cyrillic"], kind: "mono" },

  // ── Без засечек ────────────────────────────────────────────────────────────
  { family: "Inter", import: g("Inter", "Inter:wght@400;500;600;700"), alphabets: ["latin", "cyrillic", "greek"], kind: "sans" },
  { family: "Manrope", import: g("Manrope", "Manrope:wght@400;500;600;700"), alphabets: ["latin", "cyrillic", "greek"], kind: "sans" },
  { family: "Montserrat", import: g("Montserrat", "Montserrat:wght@400;500;600;700"), alphabets: ["latin", "cyrillic"], kind: "sans" },
  { family: "Rubik", import: g("Rubik", "Rubik:wght@400;500;600;700"), alphabets: ["latin", "cyrillic", "arabic"], kind: "sans" },
  { family: "Noto Sans", import: g("Noto Sans", "Noto+Sans:wght@400;500;600;700"), alphabets: ["latin", "cyrillic", "greek"], kind: "sans" },

  // ── С засечками ────────────────────────────────────────────────────────────
  { family: "Playfair Display", import: g("Playfair Display", "Playfair+Display:wght@400;500;600;700"), alphabets: ["latin", "cyrillic"], kind: "serif" },
  { family: "Merriweather", import: g("Merriweather", "Merriweather:wght@400;700"), alphabets: ["latin", "cyrillic"], kind: "serif" },
  { family: "Lora", import: g("Lora", "Lora:wght@400;500;600;700"), alphabets: ["latin", "cyrillic"], kind: "serif" },
  { family: "Source Serif 4", import: g("Source Serif 4", "Source+Serif+4:wght@400;600;700"), alphabets: ["latin", "cyrillic", "greek"], kind: "serif" },

  // ── Моноширинные ───────────────────────────────────────────────────────────
  { family: "JetBrains Mono", import: g("JetBrains Mono", "JetBrains+Mono:wght@400;500;700"), alphabets: ["latin", "cyrillic", "greek"], kind: "mono" },
  { family: "IBM Plex Mono", import: g("IBM Plex Mono", "IBM+Plex+Mono:wght@400;500;700"), alphabets: ["latin", "cyrillic"], kind: "mono" },
];

/** Системный ли это вариант — то есть без загрузки и без обращения наружу. */
export function isSystemFont(family: string): boolean {
  return Object.values(SYSTEM_STACK).includes(family);
}
