// ФУНКЦИИ ВКЛАДКИ «КАЛЕНДАРЬ» — вся работа, которая нужна этой вкладке и не является разметкой:
// приведение строк вывода к записям, раскладка месяца, получасовые слоты дня. Компоненты вкладки
// только показывают результат (закон ARCHITECTURE.md §`_lib/`).
//
// ЗАПИСЬ КАЛЕНДАРЯ — обычная строка вывода (`_lib/rows.ts`), а не своё хранилище: календарь ЧИТАЕТ то,
// что положил выходной узел. Поля повторяют v1 дословно:
//   date  "YYYY-MM-DD" — без неё запись не встаёт в сетку и отбрасывается;
//   time  "HH:MM"      — место в дневном планере, по умолчанию полночь;
//   title              — что показать в записи;
//   type               — ключ вида записи (в v1 их ровно два: event и reminder);
//   notifyBefore       — за сколько минут предупредить; 0 или нет поля = ровно в момент (шаг 292);
//   integrations       — что уйдёт во внешние каналы, по объекту на подключённый тип (шаг 292).
export type RowIntegration = { active: boolean } & Record<string, unknown>;
export type CalRow = {
  id: string;
  date: string;
  time: string;
  title: string;
  type: string;
  notifyBefore: number;
  integrations: Record<string, RowIntegration>;
};

/** Дата в том виде, в каком она лежит в строке: "YYYY-MM-DD". Ключ, по которому сходятся обе колонки. */
export function ymd(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function toMinutes(time: string): number {
  const [h, m] = (time || "0:0").split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function slotLabel(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

/** Строки двери `api/rows` → записи календаря. Строка без даты встать в сетку не может — отбрасываем. */
export function toCalRows(raw: Record<string, unknown>[]): CalRow[] {
  return raw
    .map((r) => {
      const before = Number(r.notifyBefore);
      return {
        id: String(r.id ?? ""),
        date: String(r.date ?? ""),
        time: String(r.time ?? "00:00"),
        title: String(r.title ?? ""),
        type: String(r.type ?? "event"),
        notifyBefore: Number.isFinite(before) && before > 0 ? Math.floor(before) : 0,
        integrations: (r.integrations && typeof r.integrations === "object" ? r.integrations : {}) as Record<string, RowIntegration>,
      };
    })
    .filter((r) => r.date);
}

// ─── КОГДА НАПОМИНАТЬ ───────────────────────────────────────────────────────────────────────────────
// Момент записи — её дата и время по МЕСТНЫМ часам того, кто смотрит (строка "2026-07-23T09:30" без
// зоны читается как местная). Момент напоминания — он же минус упреждение.

/** Момент самой записи в миллисекундах, или `null`, если дата и время не разбираются. */
export function dueAtMs(row: CalRow): number | null {
  const t = new Date(`${row.date}T${(row.time || "00:00").padStart(5, "0")}`).getTime();
  return Number.isFinite(t) ? t : null;
}

/** Момент, в который о записи нужно предупредить. */
export function notifyAtMs(row: CalRow): number | null {
  const due = dueAtMs(row);
  return due === null ? null : due - row.notifyBefore * 60_000;
}

/**
 * НАСТУПИЛА ЛИ ЗАПИСЬ В ЭТОМ ТАКТЕ. Не «когда-либо в прошлом», а именно в последнем периоде крона —
 * и это осознанное ограничение, а не упрощение: сторож живёт в браузере, и без окна открытая наутро
 * страница вывалила бы разом стопку тостов обо всём, что случилось за ночь. Пропущенное, пока никто не
 * смотрел, остаётся пропущенным — честнее, чем лавина уведомлений о прошлом.
 */
export function isDueInWindow(row: CalRow, nowMs: number, windowMs: number): boolean {
  const at = notifyAtMs(row);
  return at !== null && at <= nowMs && at > nowMs - windowMs;
}

/** Записи по датам — считается ОДИН раз на обе колонки: сетка ставит по ним точки, планер берёт день. */
export function groupByDate(rows: CalRow[]): Map<string, CalRow[]> {
  const map = new Map<string, CalRow[]>();
  for (const e of rows) {
    const list = map.get(e.date) ?? [];
    list.push(e);
    map.set(e.date, list);
  }
  return map;
}

/** Клетки месяца: пустые места до первого числа + сами дни. Пустая клетка — не день, кликать нечего. */
export function monthCells(view: { y: number; m: number }): Array<{ day: number; date: string } | null> {
  const startOffset = (new Date(view.y, view.m, 1).getDay() + 6) % 7; // неделя с понедельника, как в v1
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const out: Array<{ day: number; date: string } | null> = [];
  for (let i = 0; i < startOffset; i++) out.push(null);
  for (let d = 1; d <= daysInMonth; d++) out.push({ day: d, date: ymd(view.y, view.m, d) });
  return out;
}

/** Соседний месяц с переносом через год — то, что делают стрелки в шапке сетки. */
export function shiftMonth(view: { y: number; m: number }, delta: number): { y: number; m: number } {
  const m = view.m + delta;
  return { y: view.y + Math.floor(m / 12), m: ((m % 12) + 12) % 12 };
}

// РАБОЧИЙ ДЕНЬ — с 07:00 до 23:00 получасовыми слотами (перенос v1). Но запись в 05:40 не имеет права
// исчезнуть только потому, что не попала в рабочий день: границы раздвигаются до самой ранней и самой
// поздней записи.
const SLOT = 30;
const DAY_START = 7 * 60;
const DAY_END = 23 * 60;

export function daySlots(entries: CalRow[]): Array<{ min: number; label: string; items: CalRow[] }> {
  let start = DAY_START;
  let end = DAY_END;
  for (const e of entries) {
    const mn = toMinutes(e.time);
    start = Math.min(start, mn - (mn % SLOT));
    end = Math.max(end, mn - (mn % SLOT) + SLOT);
  }
  const out: Array<{ min: number; label: string; items: CalRow[] }> = [];
  for (let mn = start; mn < end; mn += SLOT) {
    out.push({
      min: mn,
      label: slotLabel(mn),
      items: entries.filter((e) => {
        const t = toMinutes(e.time);
        return t >= mn && t < mn + SLOT;
      }),
    });
  }
  return out;
}
