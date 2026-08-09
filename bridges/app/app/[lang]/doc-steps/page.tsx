// Шаги разработки (шаг 501, слой «Документы»; две колонки — 2026-08-09).
//
// Единственный документ группы, который НЕ файл, а ПАПКА: агент заводит по файлу
// на каждую работу, и число их растёт само. Поэтому здесь список слева и
// содержимое выбранного шага справа — та же схема, что у истории развёртываний.
//
// Выбор стоит в адресе (`?file=…`), значит раскладку решает СЕРВЕР: ссылку на
// конкретный шаг можно переслать, и всё это читается без JS.
//
// Редактора нет намеренно: шаг пишет тот, кто выполняет работу.
//
// Динамическая: папка живая.

import { getAdminStrings } from "@/lib/i18n/admin-strings";
import Link from "next/link";
import { PageShell } from "../_components/page-shell";
import { DocKindBadge } from "../_components/doc-kind-badge";
import { TwoPane } from "../_components/two-pane";
import { listSteps, readStep } from "@/lib/product-docs";

export const dynamic = "force-dynamic";

export default async function DocStepsPage(
  { params, searchParams }: {
    params: Promise<{ lang: string }>;
    searchParams: Promise<{ file?: string }>;
  },
) {
  const { lang } = await params;
  const { file } = await searchParams;
  const s = getAdminStrings(lang);
  const d = s.docs;
  const page = s.pages["doc-steps"];
  const state = listSteps();
  const opened = file ? readStep(file) : null;
  const base = `/${lang}/doc-steps`;

  return (
    <PageShell lang={lang} slug="doc-steps" s={s} params={{ file }} title={page.title} hint={page.hint}>
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

      <p className="mt-2 mb-3 text-[10px] leading-relaxed text-muted-foreground">{d.kindEvolvingHint}</p>

      {state.files.length === 0 ? (
        <p className="rounded-lg border border-border bg-muted/40 px-3 py-3 text-[11px] text-muted-foreground">
          {d.stepsEmpty}
        </p>
      ) : (
        <TwoPane
          selected={Boolean(opened?.exists)}
          backHref={base}
          backLabel={d.backToList}
          emptyHint={d.pickStep}
          list={
            <div className="rounded-lg border border-border">
              <div className="border-b border-border px-3 py-2 font-mono text-[10px] text-muted-foreground">
                {d.stepsCount.replace("{count}", String(state.files.length))}
              </div>
              <ul className="divide-y divide-border">
                {state.files.map((f) => {
                  const active = opened?.exists && opened.name === f.name;
                  return (
                    <li key={f.name}>
                      <Link
                        href={active ? base : `${base}?file=${encodeURIComponent(f.name)}`}
                        className={`flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-muted ${active ? "bg-muted" : ""}`}
                      >
                        <span className="truncate font-mono text-foreground">{f.name}</span>
                        <span className="ml-auto shrink-0 font-mono text-[10px] text-muted-foreground">
                          {Math.max(1, Math.round(f.bytes / 1024))} KB
                        </span>
                        {f.modified && (
                          <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                            {f.modified.slice(0, 10)}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          }
          detail={
            opened?.exists && (
              <div className="rounded-lg border border-border">
                <div className="flex items-center gap-2 border-b border-border px-3 py-2">
                  <span className="truncate font-mono text-[10px] text-foreground">{opened.name}</span>
                  <Link href={base} className="ml-auto shrink-0 text-[10px] text-muted-foreground underline hover:text-foreground">
                    {d.closeStep}
                  </Link>
                </div>
                <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap break-words p-3 font-mono text-[11px] leading-relaxed text-foreground">
                  {opened.text}
                </pre>
              </div>
            )
          }
        />
      )}
    </PageShell>
  );
}
