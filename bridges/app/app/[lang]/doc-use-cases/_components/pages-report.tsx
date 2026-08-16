// План страниц против факта — отчёт «что ещё не построено» (владелец 2026-08-16).
//
// 🔒 СЕРВЕРНЫЙ КОМПОНЕНТ И НИКАКОГО СОСТОЯНИЯ. Обе половины отчёта считает
// сервер: план читает из `PAGES.md`, факт — обходом папок слота. Клиенту здесь
// делать нечего, а обход файловой системы в браузере невозможен в принципе.
//
// 🔒 ПОЧЕМУ ЭТО СТОИТ РЯДОМ С КЕЙСАМИ, А НЕ В ОТДЕЛЬНОМ РАЗДЕЛЕ. План рождается
// из кейсов, и смотреть на него имеет смысл там же, где их правят: увидев
// «страницы нет», владелец либо просит агента её построить, либо понимает, что
// кейс описан не так, — и второе случается чаще, чем кажется.

import { CheckCircle2, Circle, FolderOpen } from "lucide-react";
import type { PagesReport } from "@/lib/product-pages";
import type { AdminStrings } from "@/lib/i18n/admin-strings";

export function PagesReportBlock(
  { report, planFile, p }:
  { report: PagesReport; planFile: string; p: AdminStrings["projectPicker"] },
) {
  // Ни плана, ни лишних страниц — показывать нечего. Пустой блок «плана нет»
  // на первом экране добавил бы человеку ещё одну незакрытую задачу до того,
  // как он получил хоть что-то.
  if (!report.hasPlan && !report.extra.length) return null;

  return (
    <section className="mt-3 rounded-lg border border-border p-3">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <h2 className="text-[13px] font-semibold text-foreground">{p.pagesTitle}</h2>
        {report.hasPlan && (
          <span className="text-[11px] text-muted-foreground">
            {p.pagesProgress
              .replace("{built}", String(report.builtCount))
              .replace("{planned}", String(report.plannedCount))}
          </span>
        )}
      </div>
      <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{p.pagesHint}</p>

      {report.hasPlan ? (
        <ul className="mt-2.5 space-y-1">
          {report.rows.map((row) => (
            <li key={row.route} className="flex items-start gap-2">
              {/* Зелёная галочка против пустого круга: построенное и
                  непостроенное должны различаться с одного взгляда, до чтения. */}
              {row.built
                ? <CheckCircle2 size={12} className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                : <Circle size={12} className="mt-0.5 shrink-0 text-muted-foreground/60" />}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <code className={`font-mono text-[11px] ${row.built ? "text-foreground" : "text-muted-foreground"}`}>
                    {row.route}
                  </code>
                  <span className={`text-[10px] ${row.built ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300"}`}>
                    {row.built ? p.pagesBuilt : p.pagesMissing}
                  </span>
                </div>
                {row.purpose && (
                  <p className="text-[10px] leading-snug text-muted-foreground">{row.purpose}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-[11px] text-muted-foreground">{p.pagesNoPlan}</p>
      )}

      {/* 🔒 ЛИШНЕЕ — НЕ ОШИБКА, И ТАК И НАПИСАНО. Построенная страница, которой
          нет в плане, чаще всего означает, что план отстал; объявить её нарушением
          значило бы подтолкнуть владельца удалять работающие страницы. */}
      {report.extra.length > 0 && (
        <div className="mt-3 rounded-md border border-border/70 bg-muted/30 p-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {p.pagesExtra}
          </p>
          <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">{p.pagesExtraHint}</p>
          <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
            {report.extra.map((route) => (
              <li key={route}>
                <code className="font-mono text-[10px] text-foreground">{route}</code>
              </li>
            ))}
          </ul>
        </div>
      )}

      {report.hasPlan && (
        <p className="mt-2 flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
          <FolderOpen size={11} />
          {p.pagesFile}: {planFile}
        </p>
      )}
    </section>
  );
}
