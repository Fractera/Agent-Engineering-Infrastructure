// ГОТОВЫЕ ЦВЕТОВЫЕ РЕШЕНИЯ — то, с чего начинают, а не то, чем заканчивают.
//
// 🔒 ЗАЧЕМ ОНИ НУЖНЫ РЯДОМ С КОНСТРУКТОРОМ. Семь полей выбора цвета — честный
// инструмент и плохое начало: человек, открывший их впервые, не знает, какой
// оттенок серого поставить в рамки, чтобы он не спорил с фоном. Схема отвечает
// на этот вопрос целиком и за одно нажатие, а конструктор остаётся для тех, кто
// хочет поправить одно значение.
//
// 🔒 КАЖДАЯ СХЕМА ДАЁТ ОБЕ ТЕМЫ. У образца, откуда взяты оттенки (22slots), тёмные
// решения были ОТДЕЛЬНЫМИ схемами — «Dark», «Midnight» в одном ряду со светлыми.
// В нашей модели тема переключается на сайте самим посетителем, и схема,
// описывающая только светлую половину, оставила бы тёмную от прежнего решения:
// человек выбрал «Изумруд», а ночью сайт остался синим. Поэтому здесь у каждой
// записи два набора.
//
// 🔒 АКТИВНАЯ СХЕМА НЕ ХРАНИТСЯ, А ВЫЧИСЛЯЕТСЯ. Имя выбранной схемы можно было
// бы записать в настройки, но тогда появились бы ДВА источника истины: имя и
// сами цвета, которые владелец потом правит по одному. Разойдясь, они соврут —
// панель покажет «Изумруд», а сайт будет синим. Поэтому активной считается та
// схема, чьи семь значений СОВПАДАЮТ с текущими; поправил одно — не совпадает
// ни одна, и это правда: решение стало своим.

export type ColorRole =
  | "primary" | "accent" | "background" | "foreground" | "muted" | "border" | "destructive";

export type ColorSet = Record<ColorRole, string>;
export type ColorScheme = { id: string; light: ColorSet; dark: ColorSet };

/**
 * Десять решений. Светлые половины — оттенки из образца (палитра Tailwind, та же,
 * на которой построен интерфейс панели); тёмные собраны к ним в пару так, чтобы
 * фирменный цвет остался узнаваемым, но не выжигал глаза на тёмном фоне.
 */
export const COLOR_SCHEMES: ColorScheme[] = [
  {
    id: "zinc",
    light: { primary: "#18181b", accent: "#a1a1aa", background: "#ffffff", foreground: "#09090b", muted: "#f4f4f5", border: "#e4e4e7", destructive: "#ef4444" },
    dark:  { primary: "#fafafa", accent: "#52525b", background: "#09090b", foreground: "#fafafa", muted: "#27272a", border: "#3f3f46", destructive: "#f87171" },
  },
  {
    id: "slate",
    light: { primary: "#0f172a", accent: "#94a3b8", background: "#ffffff", foreground: "#0f172a", muted: "#f1f5f9", border: "#e2e8f0", destructive: "#ef4444" },
    dark:  { primary: "#f8fafc", accent: "#475569", background: "#020617", foreground: "#f1f5f9", muted: "#1e293b", border: "#334155", destructive: "#f87171" },
  },
  {
    id: "stone",
    light: { primary: "#1c1917", accent: "#a8a29e", background: "#ffffff", foreground: "#1c1917", muted: "#f5f5f4", border: "#e7e5e4", destructive: "#ef4444" },
    dark:  { primary: "#fafaf9", accent: "#57534e", background: "#0c0a09", foreground: "#fafaf9", muted: "#292524", border: "#44403c", destructive: "#f87171" },
  },
  {
    id: "blue",
    light: { primary: "#2563eb", accent: "#60a5fa", background: "#ffffff", foreground: "#0f172a", muted: "#eff6ff", border: "#dbeafe", destructive: "#ef4444" },
    dark:  { primary: "#60a5fa", accent: "#1d4ed8", background: "#0b1220", foreground: "#e2e8f0", muted: "#172554", border: "#1e3a8a", destructive: "#f87171" },
  },
  {
    id: "violet",
    light: { primary: "#7c3aed", accent: "#a78bfa", background: "#ffffff", foreground: "#0f172a", muted: "#f5f3ff", border: "#ede9fe", destructive: "#ef4444" },
    dark:  { primary: "#a78bfa", accent: "#6d28d9", background: "#130f22", foreground: "#ede9fe", muted: "#2e1065", border: "#4c1d95", destructive: "#f87171" },
  },
  {
    id: "green",
    light: { primary: "#16a34a", accent: "#4ade80", background: "#ffffff", foreground: "#0f172a", muted: "#f0fdf4", border: "#dcfce7", destructive: "#ef4444" },
    dark:  { primary: "#4ade80", accent: "#15803d", background: "#0a1410", foreground: "#dcfce7", muted: "#14532d", border: "#166534", destructive: "#f87171" },
  },
  {
    id: "orange",
    light: { primary: "#ea580c", accent: "#fb923c", background: "#ffffff", foreground: "#0c0a09", muted: "#fff7ed", border: "#ffedd5", destructive: "#dc2626" },
    dark:  { primary: "#fb923c", accent: "#c2410c", background: "#160d06", foreground: "#ffedd5", muted: "#431407", border: "#7c2d12", destructive: "#f87171" },
  },
  {
    id: "rose",
    light: { primary: "#e11d48", accent: "#fb7185", background: "#ffffff", foreground: "#0f172a", muted: "#fff1f2", border: "#ffe4e6", destructive: "#dc2626" },
    dark:  { primary: "#fb7185", accent: "#be123c", background: "#180a0f", foreground: "#ffe4e6", muted: "#4c0519", border: "#881337", destructive: "#f87171" },
  },
  {
    id: "teal",
    light: { primary: "#0d9488", accent: "#5eead4", background: "#ffffff", foreground: "#0f172a", muted: "#f0fdfa", border: "#ccfbf1", destructive: "#ef4444" },
    dark:  { primary: "#5eead4", accent: "#0f766e", background: "#071614", foreground: "#ccfbf1", muted: "#134e4a", border: "#115e59", destructive: "#f87171" },
  },
  {
    id: "amber",
    light: { primary: "#d97706", accent: "#fcd34d", background: "#fffdf7", foreground: "#1c1917", muted: "#fffbeb", border: "#fef3c7", destructive: "#dc2626" },
    dark:  { primary: "#fcd34d", accent: "#b45309", background: "#161104", foreground: "#fef3c7", muted: "#451a03", border: "#78350f", destructive: "#f87171" },
  },
];

/**
 * Какая схема выбрана сейчас — по совпадению значений, а не по записи в файле.
 * Совпасть должны ОБЕ темы: половина совпадений означает, что вторую половину
 * правили руками, и называть это готовым решением было бы неправдой.
 */
export function activeScheme(
  light: Partial<ColorSet>,
  dark: Partial<ColorSet>,
): string | null {
  const same = (a: Partial<ColorSet>, b: ColorSet) =>
    (Object.keys(b) as ColorRole[]).every(k => a[k] === b[k]);
  return COLOR_SCHEMES.find(s => same(light, s.light) && same(dark, s.dark))?.id ?? null;
}
