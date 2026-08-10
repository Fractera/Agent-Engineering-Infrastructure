// Документ «Тестирование» — `TESTING.md` (2026-08-10).
//
// ЗАДАННЫЙ документ: это требование к работе агента, а не наблюдение о ней.
// Правит его владелец, агент подчиняется.
//
// Выключателя на этой странице НЕТ намеренно: все выключатели корпуса собраны в
// одном месте — на карте документов, где видно состояние сразу всех. Разбросать
// их по страницам значило бы заставить обходить меню, чтобы узнать, что включено.
//
// Динамическая: файл живой, его правят и здесь, и в редакторе на машине владельца.

import { getAdminStrings } from "@/lib/i18n/admin-strings";
import { PageShell } from "../_components/page-shell";
import { DocEditor } from "../_components/doc-editor.client";
import { DocKindBadge } from "../_components/doc-kind-badge";
import { readDoc, DOC_KIND } from "@/lib/product-docs";
import { readTemplate } from "@/lib/instruction-set";
import { CreateDoc } from "../doc-context-state/_components/create-doc.client";

export const dynamic = "force-dynamic";

const DOC_KEY = "doc-testing" as const;

export default async function DocPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const s = getAdminStrings(lang);
  const d = s.docs;
  const t = s.testing;
  const page = s.pages["doc-testing"];
  const state = readDoc(DOC_KEY);

  return (
    <PageShell lang={lang} slug="doc-testing" s={s} title={page.title} hint={page.hint}>
      <div className="mb-2">
        <DocKindBadge
          kind={DOC_KIND[DOC_KEY]}
          evolvingLabel={d.kindEvolving}
          staticLabel={d.kindStatic}
          evolvingHint={d.kindEvolvingHint}
          staticHint={d.kindStaticHint}
        />
      </div>

      {/* Зачем документ существует — та же мысль, что и в нём самом, но короче:
          требование двух доказательств уже стояло в конвейере и проигрывало,
          потому что описывало цель, а не форму ответа. */}
      <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-3 text-[11px] leading-relaxed text-blue-700 dark:text-blue-300">
        <p><strong>{t.whyTitle}</strong> {t.why}</p>
        <p className="mt-2"><strong>{t.planesTitle}</strong> {t.planes}</p>
        <p className="mt-2"><strong>{t.switchTitle}</strong> {t.switchWhere}</p>
      </div>

      <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
        {d.intro} <span className="font-mono text-foreground">{state.file}</span>
      </p>

      {!state.exists && (
        <div className="mt-2">
          <CreateDoc
            docKey={DOC_KEY}
            template={readTemplate(DOC_KEY)}
            labels={{ create: t.createDoc, creating: t.creating, created: t.createdDoc, failed: t.failed, hint: t.createHint }}
          />
        </div>
      )}

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
