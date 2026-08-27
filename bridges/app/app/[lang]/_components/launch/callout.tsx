import type { ReactNode } from "react";
import { Info, AlertTriangle } from "lucide-react";
import { Small } from "@/components/ui/typography";

// ДВА КОНТЕЙНЕРА-ПОДСКАЗКИ (шаг 28-3, 2026-08-27).
//
// Владелец назвал их дословно: «контейнер голубой подсказка как информация» и
// «контейнер оранжевый подсказка как это важно».
//
// 🔒 ОДИН ФАЙЛ НА ОБА, ПОТОМУ ЧТО РАЗЛИЧИЕ У НИХ ОДНО — ТОН. Всё остальное —
// отступы, радиус, размер значка, ритм текста — обязано совпадать: две подсказки
// рядом с разной геометрией читаются как две ошибки вёрстки, а не как два смысла.
// Написанные по отдельности, они разъезжаются; это тот же замер, что и у карточек
// пути.
//
// 🔒 ЦВЕТ — ТОКЕНОМ, А НЕ КЛАССОМ НА МЕСТЕ. `bg-blue-50` пишется один раз и потом
// живёт в двенадцати файлах двенадцатью оттенками. Токен в `globals.css` меняется
// в одном месте и сам знает про тёмную тему.
//
// 🔒 ЗНАЧОК ДЕКОРАТИВЕН И СКРЫТ ОТ ЧТЕНИЯ С ЭКРАНА. Смысл несёт текст; читалка,
// произносящая «треугольник с восклицательным знаком», крадёт время и не добавляет
// ничего.

export type CalloutTone = "info" | "important";

export function Callout({ tone, children }: { tone: CalloutTone; children: ReactNode }) {
  const Icon = tone === "info" ? Info : AlertTriangle;

  return (
    <div
      data-callout={tone}
      className={[
        "flex gap-3 rounded-lg border p-4",
        tone === "info"
          ? "border-[var(--callout-info-border)] bg-[var(--callout-info-bg)]"
          : "border-[var(--callout-important-border)] bg-[var(--callout-important-bg)]",
      ].join(" ")}
    >
      <Icon
        size={18}
        aria-hidden
        className={
          tone === "info"
            ? "mt-0.5 shrink-0 text-[var(--callout-info-fg)]"
            : "mt-0.5 shrink-0 text-[var(--callout-important-fg)]"
        }
      />
      <Small
        className={
          tone === "info" ? "text-[var(--callout-info-fg)]" : "text-[var(--callout-important-fg)]"
        }
      >
        {children}
      </Small>
    </div>
  );
}
