// Шаги разработки (шаг 501, слой «Документы»).
//
// Единственный документ группы, который НЕ файл, а ПАПКА: агент заводит по файлу
// на каждую работу, и число их растёт само. Поэтому здесь список, а не редактор —
// править шаг руками незачем, его пишет тот, кто работу выполняет.
//
// Динамическая: папка живая.

import { getAdminStrings } from "@/lib/i18n/admin-strings";
import { PageShell } from "../_components/page-shell";
import { DocKindBadge } from "../_components/doc-kind-badge";
import { listSteps } from "@/lib/product-docs";

export const dynamic = "force-dynamic";

export default async function DocStepsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const s = getAdminStrings(lang);
  const d = s.docs;
  const page = s.pages["doc-steps"];
  const state = listSteps();

  return (
    <PageShell title={page.title} hint={page.hint}>
      <div className="mb-2">
        <DocKindBadge
          kind="evolving"
          evolvingLabel={d.kindEvolving}
          staticLabel={d.kindStatic}
          evolvingHint={d.kindEvolvingHint}
          staticHint={d.kindStaticHint}
        />
      </div>

      <p className="rounded-md border border-blue-500/30 bg-blue-500/5 p-2.5 text-[10px] leading-relaxed text-blue-700 dark:text-blue-300">
        {d.intro} <span className="font-mono text-foreground">{state.dir}/</span>
      </p>

      <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">{d.kindEvolvingHint}</p>

      {state.files.length === 0 ? (
        <p className="mt-3 rounded-lg border border-border bg-muted/40 px-3 py-3 text-[11px] text-muted-foreground">
          {d.stepsEmpty}
        </p>
      ) : (
        <div className="mt-3 rounded-lg border border-border">
          <div className="border-b border-border px-3 py-2 font-mono text-[10px] text-muted-foreground">
            {d.stepsCount.replace("{count}", String(state.files.length))}
          </div>
          <ul className="divide-y divide-border">
            {state.files.map((f) => (
              <li key={f.name} className="flex items-center gap-3 px-3 py-1.5 text-[11px]">
                <span className="truncate font-mono text-foreground">{f.name}</span>
                <span className="ml-auto shrink-0 font-mono text-[10px] text-muted-foreground">
                  {Math.max(1, Math.round(f.bytes / 1024))} KB
                </span>
                {f.modified && (
                  <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                    {f.modified.slice(0, 10)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </PageShell>
  );
}
