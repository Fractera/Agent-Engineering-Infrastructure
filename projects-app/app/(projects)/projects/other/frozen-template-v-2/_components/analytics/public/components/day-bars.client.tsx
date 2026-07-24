"use client";

// ГРАФИК «ГОРИЗОНТАЛЬНЫЕ СТОЛБИКИ ПО ДНЯМ» — переиспользуемый одно-серийный график (задача «магнитуда»).
// Самодостаточен (закон 0): без картографической/чартовой библиотеки — трек + заливка на div'ах, как и
// карта. По навыку dataviz: одна краска-магнитуда на график, тонкая марка, скруглённый КОНЕЦ-ДАННЫЕ
// (`rounded-r`), спокойный серый трек, значение — в ink-токене (не цветом марки), hover по строке.
//
// Одна серия → легенды нет (её роль несёт заголовок графика), категориальной палитры нет — сравнивать
// внутри графика нечего, поэтому и валидировать пары CVD не требуется.
export type DayBar = { label: string; value: number; display: string };

export function DayBars({ data, color, unit }: { data: DayBar[]; color: string; unit?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <ul className="space-y-1.5" role="img">
      {data.map((d) => {
        const pct = (d.value / max) * 100;
        return (
          <li
            key={d.label}
            className="flex items-center gap-2 rounded-sm px-1 py-0.5 text-sm hover:bg-muted/50"
            title={`${d.label}: ${d.display}${unit ? " " + unit : ""}`}
          >
            {/* Ярлык дня — ink-токен, фиксированная колонка, чтобы столбики выстроились в ряд. */}
            <span className="w-10 shrink-0 text-xs text-muted-foreground">{d.label}</span>
            {/* ТРЕК (спокойный серый) + ЗАЛИВКА (краска-магнитуда, скруглённый правый конец = конец-данные). */}
            <span className="relative h-4 min-w-0 flex-1 overflow-hidden rounded-sm bg-muted">
              <span
                className="absolute inset-y-0 left-0 rounded-r-sm"
                style={{ width: `${Math.max(d.value > 0 ? 2 : 0, pct)}%`, backgroundColor: color }}
              />
            </span>
            {/* Значение — в ink-токене, не цветом марки (навык: текст носит текстовые токены). */}
            <span className="w-14 shrink-0 text-right text-xs font-medium tabular-nums text-foreground">{d.display}</span>
          </li>
        );
      })}
    </ul>
  );
}
