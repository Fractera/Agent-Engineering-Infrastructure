"use client";

import { toast } from "sonner";
import type { Notice, NoticeCategory } from "../../../_lib/components/notifications";
import { notificationStrings } from "../i18n";

// АДРЕС АВТОМАТИЗАЦИИ ИЗ URL — страница живёт по /projects/<кат>/<слаг>, отсюда и берём слаг для события.
// Так папка остаётся самодостаточной (закон 0): она не знает своего адреса в ядре, только читает его из URL.
function automationFromPath(): string {
  if (typeof window === "undefined") return "";
  const parts = window.location.pathname.split("?")[0].split("/").filter(Boolean);
  return parts.length >= 3 && parts[0] === "projects" ? `${parts[1]}/${parts[2]}` : "";
}

// ПОЛОСА-УВЕДОМЛЕНИЕ (административная половина) — первый элемент под шапкой кокпита (порядок v1
// «статус-бар → уведомление»). Отслеживает НЕ волну разработки (её в продукте нет), а объекты
// `automation.json`: поводы внимания приходят готовым списком пропсом из `_lib/components/notifications`.
// Компонент ничего не считает и не хранит — только показывает (закон 2).
//
// КНОПКА «ЗАПУСТИТЬ РАЗРАБОТКУ» — как в оригинале v1. Теперь она открывает ЖИВУЮ консоль разработки
// (терминал агента Claude Code / Codex, шаг 298). Папка самодостаточна (закон 0: изнутри неё нельзя дёрнуть
// консоль уровня «Проекты»), поэтому кнопка лишь ДИСПАТЧИТ DOM-событие `fractera:launch-development` со своим
// адресом из URL — его ловит запускатель уровня зоны (`_shared/components/dev-console-launcher.client.tsx`)
// и открывает консоль. Рефактор дверей чтения/записи ядра для этой консоли — фаза 2 шага 298.
//
// РАСКРЫТИЕ СПИСКА — нативный <details> (работает без JS). Заголовка-предложения нет: сколько и чего —
// говорят счётчики с цветными иконками. Иконки — inline SVG (закон 0). Нет поводов → полосы нет вовсе.

const ORDER: NoticeCategory[] = ["warning", "unbuilt", "ready", "new-case"];

/** Цвет категории — один и тот же у счётчика и у пункта списка. */
const TONE: Record<NoticeCategory, string> = {
  warning: "text-amber-600 dark:text-amber-400",
  unbuilt: "text-blue-600 dark:text-blue-400",
  ready: "text-emerald-600 dark:text-emerald-400",
  "new-case": "text-emerald-600 dark:text-emerald-400",
};

/** Иконка категории (inline SVG, 14×14, currentColor). */
function CatIcon({ category }: { category: NoticeCategory }) {
  const common = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, className: `size-3.5 shrink-0 ${TONE[category]}` };
  if (category === "warning") {
    return (<svg {...common}><path d="M10.3 3.5 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.5a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>);
  }
  if (category === "unbuilt") {
    return (<svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>);
  }
  // ready — зелёная галочка в круге (кейсы подтверждены).
  if (category === "ready") {
    return (<svg {...common}><circle cx="12" cy="12" r="9" /><path d="m8.5 12 2.5 2.5 4.5-5" /></svg>);
  }
  return (<svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 8v8" /><path d="M8 12h8" /></svg>);
}

export default function NotificationBanner({ notices, lang }: { notices: Notice[]; lang: string }) {
  // Нет поводов — полосы нет вовсе (на готовом примере она молчит).
  if (notices.length === 0) return null;
  const L = notificationStrings(lang);
  const counts = ORDER.map((category) => ({ category, n: notices.filter((x) => x.category === category).length })).filter((g) => g.n > 0);
  // ГЕЙТ ЗАПУСКА (правило шага 231): разработку можно начинать ТОЛЬКО когда кейсы подтверждены — это повод
  // `ready` (панель записала подпись в ядро, collectNotices её подтвердил). Нет `ready` — запуск заблокирован.
  const canDevelop = notices.some((n) => n.category === "ready");

  return (
    <details data-chrome="notifications" className="mt-2 rounded-lg border border-orange-500/50 bg-orange-500/10">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-sm">
          {/* колокол — оранжевый, чтобы полоса была заметной (правка владельца 2026-07-24) */}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-4 shrink-0 text-orange-600 dark:text-orange-400">
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
            <path d="M10 21a2 2 0 0 0 4 0" />
          </svg>
          {/* счётчики по категориям — заменяют заголовок-предложение */}
          <span className="flex items-center gap-3 font-medium text-foreground">
            {counts.map((g) => (
              <span key={g.category} className="flex items-center gap-1">
                <CatIcon category={g.category} />
                {g.n}
              </span>
            ))}
          </span>
          {/* Запустить разработку (шаг 298) — диспатчит DOM-событие, которое ловит запускатель уровня зоны
              (`dev-console-launcher.client.tsx`) и открывает ЖИВУЮ консоль с терминалом. Папка ничего не
              импортирует наружу (закон 0), только шлёт событие со своим адресом из URL. preventDefault —
              чтобы клик не сворачивал <details>. */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              // Кейсы не подтверждены → НЕ запускаем разработку: показываем причину и открываем подтверждение
              // (панель кейсов ловит `usecases:review` и переходит в режим review).
              if (!canDevelop) {
                toast.error(L.blocked, { duration: 10000, action: { label: L.details, onClick: () => window.dispatchEvent(new CustomEvent("usecases:review")) } });
                window.dispatchEvent(new CustomEvent("usecases:review"));
                return;
              }
              const automation = automationFromPath();
              if (automation) window.dispatchEvent(new CustomEvent("fractera:launch-development", { detail: { automation } }));
            }}
            title={canDevelop ? undefined : L.blocked}
            className={`ml-auto shrink-0 rounded-md px-3 py-1 text-xs font-medium ${canDevelop ? "bg-primary text-primary-foreground hover:opacity-90" : "cursor-not-allowed bg-muted text-muted-foreground hover:bg-muted/80"}`}
          >
            {L.launch}
          </button>
          <span className="shrink-0 text-xs text-muted-foreground underline">{L.details}</span>
        </summary>
        <ul className="space-y-1.5 border-t px-3 py-2 text-sm">
          {notices.map((notice, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="mt-0.5">
                <CatIcon category={notice.category} />
              </span>
              <span className="min-w-0">
                {/* warning/unbuilt несут переиспользованную из v1 метку; у кейса метки-слова нет —
                    его отличают зелёная иконка и номер (машинный, не переводится). */}
                {notice.category === "new-case" ? (
                  <span className="font-medium text-foreground">№{notice.name}</span>
                ) : notice.category === "ready" ? (
                  <span className="font-medium text-foreground">{L.ready}</span>
                ) : (
                  <>
                    <span className="text-muted-foreground">{notice.category === "warning" ? L.warning : L.unbuilt}: </span>
                    <span className="font-medium text-foreground">{notice.name}</span>
                  </>
                )}
                {notice.text ? <span className="text-muted-foreground"> — {notice.text}</span> : null}
              </span>
            </li>
          ))}
        </ul>
      </details>
  );
}
