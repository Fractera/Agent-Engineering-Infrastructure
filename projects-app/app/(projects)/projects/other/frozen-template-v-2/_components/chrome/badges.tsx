import type { Passport } from "../../_data/automation.schema";
import type { Surface } from "../surface";
import { badgeLabel } from "./i18n";

// БЕЙДЖИ — читаются ИЗ ПАСПОРТА ядра, ничего не захардкожено: изменится состояние automation.json —
// изменятся бейджи. Значения enum не переводятся (закон 4г), только дефис → пробел.
//
// Набор зависит от поверхности (решение владельца): админ видит всё (тип · жизненный цикл · шаринг),
// публичная — только тип (остальное — внутренняя кухня, посетителю не нужна).
const pill = "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize whitespace-nowrap";

export default function Badges({ passport, surface }: { passport: Passport; surface: Surface }) {
  const items =
    surface === "admin"
      ? [
          { key: "type", label: badgeLabel(passport.type), cls: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300" },
          {
            key: "lifecycle",
            label: badgeLabel(passport.lifecycle),
            cls:
              passport.lifecycle === "real-project"
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                : "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
          },
          { key: "sharing", label: badgeLabel(passport.sharing), cls: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" },
        ]
      : [{ key: "type", label: badgeLabel(passport.type), cls: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300" }];

  return (
    <>
      {items.map((b) => (
        <span key={b.key} data-badge={b.key} className={`${pill} ${b.cls}`}>
          {b.label}
        </span>
      ))}
    </>
  );
}
