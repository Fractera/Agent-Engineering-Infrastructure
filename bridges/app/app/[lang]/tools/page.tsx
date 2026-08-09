// Раздел «Инструменты» (шаг 501, решение владельца 2026-08-09).
//
// Витрина микро-инструментов: маленьких переиспользуемых кусков, которые панель
// применяет для себя и отдаёт продуктовому слою. Смысл раздела в одной фразе:
// взять готовое дешевле, чем построить своё.
//
// Установка — КОПИЕЙ в `tools/<id>/` проекта, а не вызовом по сети. Инструмент
// почти всегда допиливают под задачу; чтение по сети означало бы либо запрет на
// правки, либо расхождение между установленным и работающим.
//
// Заканчивается ссылкой на «Добавить инструмент» — та же страница, что в разделе
// данных: перечислили, что есть, и сразу ответили на вопрос «а если нужен ещё».
//
// Динамическая: состояние установки живое.

import Link from "next/link";
import { Crop, Scissors, Mic, Code2, PackagePlus, ChevronRight, type LucideIcon } from "lucide-react";
import { getAdminStrings } from "@/lib/i18n/admin-strings";
import { PageShell } from "../_components/page-shell";
import { HelpDetails } from "../_components/help-details";
import { TOOLS, type ToolId } from "@/lib/tools-registry";
import { adminHref } from "@/lib/admin-nav";

export const dynamic = "force-dynamic";

const ICONS: Record<ToolId, LucideIcon> = {
  "image-crop": Crop,
  "video-trim": Scissors,
  "voice-input": Mic,
  "code-view": Code2,
};

export default async function ToolsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const s = getAdminStrings(lang);
  const t = s.tools;
  const page = s.pages.tools;

  const rows = TOOLS;

  return (
    <PageShell lang={lang} slug="tools" s={s} title={page.title} hint={page.hint}>
      <p className="rounded-md border border-blue-500/30 bg-blue-500/5 p-2.5 text-[10px] leading-relaxed text-blue-700 dark:text-blue-300">
        {t.intro}
      </p>

      <ul className="mt-3 divide-y divide-border rounded-lg border border-border">
        {rows.map((tool) => {
          const Icon = ICONS[tool.id];
          const item = t.items[tool.id];
          return (
            <li key={tool.id}>
              <Link href={adminHref(lang, `tool-${tool.id}` as never)} className="flex gap-3 px-3 py-3 hover:bg-muted">
                <Icon size={14} className="mt-0.5 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <span className="text-[12px] font-medium text-foreground">{item.title}</span>
                  <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{item.body}</p>
                  <p className="mt-1 flex flex-wrap gap-1.5">
                    {tool.needs.map((n) => (
                      <span key={n} className="rounded-full border border-border px-1.5 py-0.5 text-[9px] text-muted-foreground">
                        {t.needs[n]}
                      </span>
                    ))}
                    {tool.npmDeps.length > 0 && (
                      <span className="rounded-full border border-amber-500/40 px-1.5 py-0.5 font-mono text-[9px] text-amber-700 dark:text-amber-300">
                        npm i {tool.npmDeps.join(" ")}
                      </span>
                    )}
                  </p>
                </div>
                <ChevronRight size={13} className="mt-1 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Тот же раздел, что в данных: перечислили инструменты — ответили, что
          делать, если нужного нет. */}
      <Link
        href={adminHref(lang, "add-tool")}
        className="mt-3 flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2.5 text-[12px] text-foreground hover:bg-muted"
      >
        <PackagePlus size={13} className="shrink-0 text-muted-foreground" />
        {s.pages["add-tool"].title}
        <ChevronRight size={13} className="ml-auto shrink-0 text-muted-foreground" />
      </Link>

      <HelpDetails label={t.helpLabel}>
        <p><strong>{t.helpCopyTitle}</strong> {t.helpCopy}</p>
        <p><strong>{t.helpWhereTitle}</strong> {t.helpWhere}</p>
        <p><strong>{t.helpAgentTitle}</strong> {t.helpAgent}</p>
        <p><strong>{t.helpDepsTitle}</strong> {t.helpDeps}</p>
        <p><strong>{t.helpUpdateTitle}</strong> {t.helpUpdate}</p>
      </HelpDetails>
    </PageShell>
  );
}
