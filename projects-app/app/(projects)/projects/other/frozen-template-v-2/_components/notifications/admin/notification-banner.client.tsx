"use client";

import type { Notice, NoticeCategory } from "../../../_lib/components/notifications";
import { notificationStrings, fill, type NotificationStrings } from "../i18n";

// ПОЛОСА-УВЕДОМЛЕНИЕ (административная половина) — первый элемент под шапкой кокпита. Перенос сущности из v1
// (шаг 297), но отслеживает НЕ волну разработки (её в продукте больше нет), а объекты `automation.json`:
// собранные в `_lib/components/notifications` поводы внимания приходят готовым списком пропсом. Компонент
// НИЧЕГО не считает и не хранит — только показывает.
//
// РАСКРЫТИЕ — нативный <details>: работает без JS (закон no-JS). Свёрнуто — строка «N объектов требуют
// внимания» со счётчиками по категориям; раскрыто — список поводов. Нет поводов → компонент не рисуется вовсе.
// Иконки — inline SVG (закон 0 запрещает lucide-react), цвет по категории.

const ORDER: NoticeCategory[] = ["warning", "unbuilt", "new-case"];

/** Цвет категории — один и тот же у счётчика и у пункта списка. */
const TONE: Record<NoticeCategory, string> = {
  warning: "text-amber-600 dark:text-amber-400",
  unbuilt: "text-blue-600 dark:text-blue-400",
  "new-case": "text-emerald-600 dark:text-emerald-400",
};

function labelOf(category: NoticeCategory, L: NotificationStrings): string {
  return category === "warning" ? L.warning : category === "unbuilt" ? L.unbuilt : L.newCase;
}

/** Иконка категории (inline SVG, 14×14, currentColor). */
function CatIcon({ category }: { category: NoticeCategory }) {
  const common = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, className: `size-3.5 shrink-0 ${TONE[category]}` };
  if (category === "warning") {
    // треугольник с восклицанием
    return (<svg {...common}><path d="M10.3 3.5 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.5a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>);
  }
  if (category === "unbuilt") {
    // часы — «в разработке, ещё не готово»
    return (<svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>);
  }
  // плюс в круге — «новый кейс»
  return (<svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 8v8" /><path d="M8 12h8" /></svg>);
}

export default function NotificationBanner({ notices, lang }: { notices: Notice[]; lang: string }) {
  // Нет поводов — полосы нет вовсе (на готовом примере она молчит).
  if (notices.length === 0) return null;
  const L = notificationStrings(lang);
  const counts = ORDER.map((category) => ({ category, n: notices.filter((x) => x.category === category).length })).filter((g) => g.n > 0);

  return (
    <details data-chrome="notifications" className="mt-2 rounded-lg border border-primary/40 bg-primary/5">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-sm">
        {/* колокол */}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-4 shrink-0 text-primary">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10 21a2 2 0 0 0 4 0" />
        </svg>
        <span className="min-w-0 truncate font-medium text-foreground">{fill(L.title, notices.length)}</span>
        <span className="ml-auto flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
          {counts.map((g) => (
            <span key={g.category} className="flex items-center gap-1">
              <CatIcon category={g.category} />
              {g.n}
            </span>
          ))}
          <span className="underline">{L.details}</span>
        </span>
      </summary>
      <ul className="space-y-1.5 border-t px-3 py-2 text-sm">
        {notices.map((notice, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="mt-0.5">
              <CatIcon category={notice.category} />
            </span>
            <span className="min-w-0">
              <span className="text-muted-foreground">{labelOf(notice.category, L)}: </span>
              <span className="font-medium text-foreground">{notice.name}</span>
              {notice.text ? <span className="text-muted-foreground"> — {notice.text}</span> : null}
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}
