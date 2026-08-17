// Документ «Кейс → шаг разработки» — `CASE-TO-STEP.md` (владелец 2026-08-17).
//
// 🔒 ЭТОТ ДОКУМЕНТ — ДУБЛИКАТ, И ЭТО ЕГО ЗАМЫСЕЛ, А НЕ НЕДОСТАТОК. Сама процедура
// живёт НАВЫКОМ (`.claude/skills/manage-cases-and-steps/`), потому что навык
// грузится по поводу, а инструкция — в каждой сессии независимо от задачи.
// Документ существует ради двух вещей: чтобы ЧЕЛОВЕК прочитал то же самое, не
// запуская агента, и чтобы у способности был выключатель.
//
// Об этом сказано на самой странице, а не только здесь: владелец, увидев
// документ и навык об одном и том же, вправе решить, что это беспорядок, — и
// будет прав, если ему не объяснить, кто из них исполняется.

import { getAdminStrings } from "@/lib/i18n/admin-strings";
import { PageShell } from "../_components/page-shell";
import { DocEditor } from "../_components/doc-editor.client";
import { DocKindBadge } from "../_components/doc-kind-badge";
import { readDoc, DOC_KIND } from "@/lib/product-docs";

export const dynamic = "force-dynamic";

const DOC_KEY = "doc-case-to-step" as const;

export default async function DocPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const s = getAdminStrings(lang);
  const d = s.docs;
  const t = s.caseToStep;
  const page = s.pages["doc-case-to-step"];
  const state = readDoc(DOC_KEY);

  return (
    <PageShell lang={lang} slug="doc-case-to-step" s={s} title={page.title} hint={page.hint}>
      <div className="mb-2">
        <DocKindBadge
          kind={DOC_KIND[DOC_KEY]}
          evolvingLabel={d.kindEvolving}
          staticLabel={d.kindStatic}
          evolvingHint={d.kindEvolvingHint}
          staticHint={d.kindStaticHint}
        />
      </div>

      {/* Три вопроса, на которые страница отвечает раньше, чем владелец успеет
          их задать: что это, почему навык, и что произойдёт с выключателем. */}
      <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-3 text-[11px] leading-relaxed text-blue-700 dark:text-blue-300">
        <p><strong>{t.whatTitle}</strong> {t.what}</p>
        <p className="mt-2"><strong>{t.whySkillTitle}</strong> {t.whySkill}</p>
        <p className="mt-2"><strong>{t.switchTitle}</strong> {t.switchWhere}</p>
      </div>

      {/* Три поверхности названы поимённо и машинными именами: владелец должен
          уметь найти каждую на диске, а не догадываться о ней по описанию. */}
      <div className="mt-2 rounded-lg border border-border p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {t.surfacesTitle}
        </p>
        <ul className="mt-1.5 space-y-1">
          {([
            [t.surfaceMcp, "scripts/mcp/fractera-project.mjs"],
            [t.surfaceSkill, ".claude/skills/manage-cases-and-steps/SKILL.md"],
            [t.surfaceDoc, "development-docs/CASE-TO-STEP.md"],
          ] as const).map(([label, file]) => (
            <li key={file} className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-[10px] text-muted-foreground">{label}</span>
              <code className="font-mono text-[10px] text-foreground">{file}</code>
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
        {d.intro} <span className="font-mono text-foreground">{state.file}</span>
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
