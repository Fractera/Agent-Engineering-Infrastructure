// Документ «Динамические рабочие процессы» — `DYNAMIC-WORKFLOWS.md` (2026-08-12).
//
// ЗАДАННЫЙ документ и прямая пара к `SINGLE-AGENT.md`: тот запрещает
// многоагентную работу, этот описывает единственную санкционированную дверь и два
// замка на ней — подтверждённые кейсы и цену.
//
// 🔒 СОСТОЯНИЕ ЗАМКА ПОКАЗЫВАЕТСЯ ЗДЕСЬ, А НЕ ТОЛЬКО В ОТКАЗЕ. Владелец,
// нажавший выключатель и получивший «нельзя», читает это как поломку панели.
// Поэтому условие видно ДО попытки, вместе с числами: сколько кейсов написано и
// сколько подтверждено. Гейт один и тот же — `useCasesGate(activeProduct()?.id ?? "")`, тот же, что
// отвечает маршруту сохранения, поэтому страница и сервер не могут разойтись.

import { getAdminStrings } from "@/lib/i18n/admin-strings";
import { activeProduct } from "@/lib/products-config";
import { PageShell } from "../_components/page-shell";
import { DocEditor } from "../_components/doc-editor.client";
import { DocKindBadge } from "../_components/doc-kind-badge";
import { readDoc, DOC_KIND } from "@/lib/product-docs";
import { readTemplate, readInstructionSet } from "@/lib/instruction-set";
import { useCasesGate } from "@/lib/use-cases-store";
import { DocCommands } from "../_components/doc-commands";
import { CreateDoc } from "../doc-context-state/_components/create-doc.client";

export const dynamic = "force-dynamic";

const DOC_KEY = "doc-dynamic-workflows" as const;

export default async function DocPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const s = getAdminStrings(lang);
  const d = s.docs;
  const t = s.dynamicWorkflows;
  const page = s.pages["doc-dynamic-workflows"];
  const state = readDoc(DOC_KEY);
  const set = readInstructionSet();
  const o = s.docsOverview;

  const gate = useCasesGate(activeProduct()?.id ?? "");
  const gateText =
    gate.kind === "missing" ? t.lockedMissing
    : gate.kind === "unconfirmed" ? t.lockedUnconfirmed
    : t.lockedReady;

  return (
    <PageShell lang={lang} slug="doc-dynamic-workflows" s={s} title={page.title} hint={page.hint}>
      <div className="mb-2">
        <DocKindBadge
          kind={DOC_KIND[DOC_KEY]}
          evolvingLabel={d.kindEvolving}
          staticLabel={d.kindStatic}
          evolvingHint={d.kindEvolvingHint}
          staticHint={d.kindStaticHint}
        />
      </div>

      {/* Замок стоит ПЕРВЫМ, выше объяснения возможности: пока он закрыт,
          остальное — чтение на будущее, и человек вправе узнать об этом сразу.
          Готовность красится иначе, чем запрет: одинаковый вид у «нельзя» и
          «можно» заставляет читать текст, чтобы понять состояние. */}
      <div
        className={
          gate.kind === "ready"
            ? "rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-[11px] leading-relaxed text-emerald-700 dark:text-emerald-300"
            : "rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-[11px] leading-relaxed text-amber-700 dark:text-amber-300"
        }
      >
        <p>
          <strong>{t.lockedTitle}</strong> {gateText}
        </p>
        <p className="mt-1 font-mono text-[10px] opacity-80">
          {gate.confirmed}/{gate.total}
        </p>
      </div>

      <div className="mt-2 rounded-lg border border-blue-500/30 bg-blue-500/5 p-3 text-[11px] leading-relaxed text-blue-700 dark:text-blue-300">
        <p><strong>{t.whyTitle}</strong> {t.why}</p>
        {/* «Где это выполняется» стоит вторым, сразу за определением: это первый
            вопрос, который задаёт владелец продакшн-сервера, и до ответа на него
            остальное читать незачем. */}
        <p className="mt-2"><strong>{t.whereTitle}</strong> {t.where}</p>
        <p className="mt-2"><strong>{t.costTitle}</strong> {t.cost}</p>
        <p className="mt-2"><strong>{t.gateTitle}</strong> {t.gate}</p>
        <p className="mt-2"><strong>{t.guardTitle}</strong> {t.guard}</p>
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
