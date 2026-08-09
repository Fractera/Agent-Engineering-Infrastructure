// Документ «Инструменты платформы» — СОБИРАЕМЫЙ (шаг 501, владелец 2026-08-09).
//
// Единственный документ группы без редактора, и это не упущение. Он описывает
// СОСТОЯНИЕ проекта: какие инструменты в нём действительно стоят и каков их
// контракт. Состояние меняется установкой, а не набором текста, поэтому документ
// пересобирается при каждой установке из `TOOL_DOCS` — того же источника, из
// которого страницы инструментов берут свои описания.
//
// Оставить здесь редактор значило бы позволить написать текст, который исчезнет
// при следующей установке. Человек узнал бы об этом, только заметив пропажу, —
// худший способ сообщить о правиле.
//
// Кнопка пересборки всё же есть: файл мог не появиться, если проект развернули
// раньше, чем инструмент установили хоть раз.
//
// Динамическая: файл живой.

import { getAdminStrings } from "@/lib/i18n/admin-strings";
import { PageShell } from "../_components/page-shell";
import { DocKindBadge } from "../_components/doc-kind-badge";
import { HelpDetails } from "../_components/help-details";
import { CodeView } from "@/_tools/code-view/client/code-view.client";
import { readDoc } from "@/lib/product-docs";
import { RebuildDocButton } from "./_components/rebuild.client";

export const dynamic = "force-dynamic";

export default async function PlatformToolsDocPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const s = getAdminStrings(lang);
  const d = s.docs;
  const page = s.pages["doc-platform-tools"];
  const state = readDoc("doc-platform-tools");

  return (
    <PageShell lang={lang} slug="doc-platform-tools" s={s} title={page.title} hint={page.hint}>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <DocKindBadge
          kind="evolving"
          evolvingLabel={d.kindEvolving}
          staticLabel={d.kindStatic}
          evolvingHint={d.kindEvolvingHint}
          staticHint={d.kindStaticHint}
        />
        <RebuildDocButton
          labels={{ rebuild: d.rebuild, rebuilding: d.rebuilding, rebuilt: d.rebuilt, failed: d.failed }}
        />
      </div>

      {/* Почему тут нельзя править — сказано на месте, а не в справке: человек
          ищет кнопку «Править» именно здесь и должен сразу узнать, почему её нет. */}
      <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-2.5 text-[10px] leading-relaxed text-amber-800 dark:text-amber-200">
        {d.generatedNotice}
      </p>

      <p className="mt-2 text-[10px] text-muted-foreground">
        {d.intro} <span className="font-mono text-foreground">{state.file}</span>
      </p>

      {/* Зачем документ нужен, если агент и так видит папку `tools/`. Довод
          не в существовании инструментов, а в ВЫБОРЕ между похожими: обрезчиков
          будет несколько, и различает их только контракт. */}
      <HelpDetails label={d.generatedHowLabel}>
        <p><strong>{d.generatedWhyTitle}</strong> {d.generatedWhy}</p>
        <p><strong>{d.generatedSectionsTitle}</strong> {d.generatedSections}</p>
        <p><strong>{d.generatedFlowTitle}</strong> {d.generatedFlow}</p>
        <p><strong>{d.generatedOnlyInstalledTitle}</strong> {d.generatedOnlyInstalled}</p>
      </HelpDetails>

      <div className="mt-3">
        {state.exists ? (
          <CodeView code={state.text} filename={state.file} className="max-h-[70vh]" />
        ) : (
          <p className="rounded-lg border border-border bg-muted/40 px-3 py-3 text-[11px] text-muted-foreground">
            {d.generatedMissing}
          </p>
        )}
      </div>
    </PageShell>
  );
}
