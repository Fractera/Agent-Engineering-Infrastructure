// Документ «Как строится пост» — `CONTENT-ENGINE.md` (2026-08-11).
//
// ЗАДАННЫЙ документ: инструкция авторинга, а не наблюдение о проекте. Команда у
// него означает ДЕЙСТВИЕ над содержимым проекта — создать пост целиком по этому
// документу, — поэтому глагол `add`, как у паспорта и кейсов, а не `activate`.
//
// Документ перенесён из витрины платформы и приведён в соответствие с этим
// репозиторием: вставки исходников заменены указателями на файлы (исходник
// дрейфует, документ с копией исходника врёт с первой же правки), дописан закон
// двух типов ссылок и механический гейт `npm run check:content`.

import { getAdminStrings } from "@/lib/i18n/admin-strings";
import { PageShell } from "../_components/page-shell";
import { DocEditor } from "../_components/doc-editor.client";
import { DocKindBadge } from "../_components/doc-kind-badge";
import { readDoc, DOC_KIND } from "@/lib/product-docs";
import { readTemplate, readInstructionSet } from "@/lib/instruction-set";
import { DocCommands } from "../_components/doc-commands";
import { CreateDoc } from "../_components/create-doc.client";

export const dynamic = "force-dynamic";

const DOC_KEY = "doc-content-engine" as const;

export default async function DocPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const s = getAdminStrings(lang);
  const d = s.docs;
  const t = s.contentEngine;
  const page = s.pages["doc-content-engine"];
  const state = readDoc(DOC_KEY);
  const set = readInstructionSet();
  const o = s.docsOverview;

  return (
    <PageShell lang={lang} slug="doc-content-engine" s={s} title={page.title} hint={page.hint}>
      <div className="mb-2">
        <DocKindBadge
          kind={DOC_KIND[DOC_KEY]}
          evolvingLabel={d.kindEvolving}
          staticLabel={d.kindStatic}
          evolvingHint={d.kindEvolvingHint}
          staticHint={d.kindStaticHint}
        />
      </div>

      {/* Зачем документ существует. Голосовая диктовка — не деталь, а причина:
          именно она делает пересказ самым дешёвым инструментом проекта. */}
      <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-3 text-[11px] leading-relaxed text-blue-700 dark:text-blue-300">
        <p><strong>{t.whyTitle}</strong> {t.why}</p>
        <p className="mt-2"><strong>{t.shapeTitle}</strong> {t.shape}</p>
        <p className="mt-2"><strong>{t.sizeTitle}</strong> {t.size}</p>
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
