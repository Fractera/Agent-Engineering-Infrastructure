// Документ «Паспорт проекта» — `PASSPORT.md` (владелец 2026-08-10).
//
// САМОРАЗВИВАЮЩИЙСЯ и единственный в корпусе, который несёт ПРОГРЕСС: кейсы не
// знают состояния экранов, архитектура не знает, что уже готово. Рождается на
// первом шаге разработки вместе со скелетом и обновляется каждым следующим.
//
// Отсюда и связь, ради которой он существует: покрытие считается по цепочке
// кейс → сущность → шаг, а не угадывается по числу закрытых шагов.

import { getAdminStrings } from "@/lib/i18n/admin-strings";
import { PageShell } from "../_components/page-shell";
import { DocEditor } from "../_components/doc-editor.client";
import { DocKindBadge } from "../_components/doc-kind-badge";
import { readDoc, DOC_KIND } from "@/lib/product-docs";
import { readTemplate, readInstructionSet } from "@/lib/instruction-set";
import { DocCommands } from "../_components/doc-commands";
import { CreateDoc } from "../doc-context-state/_components/create-doc.client";

export const dynamic = "force-dynamic";

const DOC_KEY = "doc-passport" as const;

export default async function DocPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const s = getAdminStrings(lang);
  const d = s.docs;
  const t = s.passport;
  const page = s.pages["doc-passport"];
  const state = readDoc(DOC_KEY);
  const set = readInstructionSet();
  const o = s.docsOverview;

  return (
    <PageShell lang={lang} slug="doc-passport" s={s} title={page.title} hint={page.hint}>
      {/* Команды документа стоят ЗДЕСЬ, а не только на карте (владелец
          2026-08-10): человек приходит на вкладку разбираться с документом и
          вправе увидеть его команду, не возвращаясь к общему списку. */}
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

      <div className="mt-3 rounded-lg border border-border p-3">
        <DocCommands
          docKey={DOC_KEY}
          lang={lang}
          commands={set.commands}
          labels={{
            caption: o.commandCaption, helpTitle: o.commandHelp,
            edit: o.commandEdit, save: o.commandSave, saving: o.commandSaving,
            cancel: o.commandCancel, saved: o.commandSaved, failed: s.docs.failed,
            phrasePlaceholder: o.commandPlaceholder, anchorNote: o.commandAnchorNote,
            verbs: { activate: o.verbActivate, add: o.verbAdd, find: o.verbFind, edit: o.verbEdit },
          }}
        />
      </div>

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
