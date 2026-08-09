// Документ разработки «doc-parallel-routing» (шаг 501, слой «Документы»).
//
// Страница знает только свой ключ: файл читает `lib/product-docs.ts`, правит общий
// островок `_components/doc-editor.client.tsx`. Десять копий одной логики
// разошлись бы через месяц — здесь их нет.
//
// Динамическая: файл живой, его правит и владелец, и агент в слоте.

import { getAdminStrings } from "@/lib/i18n/admin-strings";
import { PageShell } from "../_components/page-shell";
import { DocEditor } from "../_components/doc-editor.client";
import { DocKindBadge } from "../_components/doc-kind-badge";
import { readDoc, DOC_KIND } from "@/lib/product-docs";

export const dynamic = "force-dynamic";

const DOC_KEY = "doc-parallel-routing" as const;

export default async function DocPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const s = getAdminStrings(lang);
  const d = s.docs;
  const page = s.pages["doc-parallel-routing"];
  const state = readDoc(DOC_KEY);
  const kind = DOC_KIND[DOC_KEY];

  return (
    <PageShell title={page.title} hint={page.hint}>
      <div className="mb-2">
        <DocKindBadge
          kind={kind}
          evolvingLabel={d.kindEvolving}
          staticLabel={d.kindStatic}
          evolvingHint={d.kindEvolvingHint}
          staticHint={d.kindStaticHint}
        />
      </div>

      <p className="rounded-md border border-blue-500/30 bg-blue-500/5 p-2.5 text-[10px] leading-relaxed text-blue-700 dark:text-blue-300">
        {d.intro} <span className="font-mono text-foreground">{state.file}</span>
      </p>

      <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
        {kind === "evolving" ? d.kindEvolvingHint : d.kindStaticHint}
      </p>

      <div className="mt-3">
        <DocEditor
          docKey={DOC_KEY}
          initialText={state.text}
          exists={state.exists}
          labels={{
            edit: d.edit, cancel: d.cancel,
            save: d.save, saving: d.saving, saved: d.saved,
            failed: d.failed, nothingToSave: d.nothingToSave,
            notCreated: d.notCreated, createHint: d.createHint,
            chars: d.chars, lines: d.lines,
            pull: d.pull, pulling: d.pulling, pulled: d.pulled,
            pullDiffers: d.pullDiffers, pullSame: d.pullSame,
            voiceHint: d.voiceHint,
          }}
        />
      </div>
    </PageShell>
  );
}
