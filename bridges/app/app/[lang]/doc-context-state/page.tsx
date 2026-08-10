// Документ «Передача сессии» — `CONTEXT-STATE.md` (шаг 501, слой «Документы»).
//
// Отличается от прочих документов ролью автора: этот файл ведёт МОДЕЛЬ, а не
// владелец и не платформа. Поэтому страница начинается не с редактора, а с трёх
// абзацев, отвечающих на вопрос, с которым сюда приходят из области
// предупреждений: «у меня что-то сломалось?»
//
// Ответ: нет. Запись здесь — след прерванной сессии, и чаще всего это норма.
// Единственное действие, которое человек обязан мочь выполнить сам, — стереть
// устаревшую передачу: она вреднее отсутствующей, потому что возвращает
// следующую сессию к уже сделанной работе.
//
// Динамическая: файл живой, его переписывает модель в слоте.

import { getAdminStrings } from "@/lib/i18n/admin-strings";
import { PageShell } from "../_components/page-shell";
import { DocEditor } from "../_components/doc-editor.client";
import { DocKindBadge } from "../_components/doc-kind-badge";
import { readDoc, DOC_KIND } from "@/lib/product-docs";
import { readContextHandoff } from "@/lib/context-handoff";
import { readHandoffTemplate } from "@/lib/context-state-block";
import { CreateDoc } from "./_components/create-doc.client";
import { HandoffSwitch } from "./_components/handoff-switch.client";

export const dynamic = "force-dynamic";

const DOC_KEY = "doc-context-state" as const;

export default async function DocPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const s = getAdminStrings(lang);
  const d = s.docs;
  const c = s.contextState;
  const page = s.pages["doc-context-state"];
  const state = readDoc(DOC_KEY);
  const handoff = readContextHandoff();

  return (
    <PageShell lang={lang} slug="doc-context-state" s={s} title={page.title} hint={page.hint}>
      <div className="mb-2">
        <DocKindBadge
          kind={DOC_KIND[DOC_KEY]}
          evolvingLabel={d.kindEvolving}
          staticLabel={d.kindStatic}
          evolvingHint={d.kindEvolvingHint}
          staticHint={d.kindStaticHint}
        />
      </div>

      {/* Выключатель СТОИТ ЗДЕСЬ, а не в «Возможностях приложения»: там речь о
          том, что приложение даёт посетителю, а это — про работу агента над
          проектом. Раздел виден в меню всегда, независимо от положения
          переключателя: иначе включить возможность было бы негде. */}
      <div className="mb-3">
        <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {c.experimentalTitle}
        </p>
        <HandoffSwitch
          enabled={handoff.enabled}
          config={handoff.config}
          labels={{
            label: c.switchLabel, description: c.switchDescription,
            saving: c.switchSaving, savedOn: c.switchOn, savedOff: c.switchOff, failed: c.switchFailed,
            instructionAdded: c.instructionAdded, instructionMissing: c.instructionMissing,
            docCreated: c.docCreated,
          }}
        />
        <p className="mt-1.5 text-[10px] leading-relaxed text-muted-foreground">{c.experimentalHint}</p>
      </div>

      {/* Первым делом — снять тревогу, с которой сюда приходят по оранжевой
          записи из области предупреждений. */}
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-[11px] leading-relaxed text-amber-700 dark:text-amber-300">
        <p><strong>{c.noticeTitle}</strong> {c.notice}</p>
        <p className="mt-2"><strong>{c.howTitle}</strong> {c.how}</p>
        <p className="mt-2"><strong>{c.staleTitle}</strong> {c.stale}</p>
      </div>

      <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
        {d.intro} <span className="font-mono text-foreground">{state.file}</span>
      </p>

      {/* Проект мог родиться раньше этой возможности — тогда файла в нём нет, и
          страница без этой кнопки была бы пустой. Создание — явное действие
          человека, а не тихая запись в его репозиторий при открытии страницы. */}
      {!state.exists && (
        <div className="mt-2">
          <CreateDoc
            template={readHandoffTemplate()}
            labels={{ create: c.createDoc, creating: c.creating, created: c.createdDoc, failed: c.switchFailed, hint: c.createHint }}
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
