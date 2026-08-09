// Раздел «История развёртываний» (шаг 501, Ф2, партия 13).
//
// Список прогонов И журнал выбранного прогона читает СЕРВЕР: номер прогона стоит в
// адресе (`?run=<id>`). Поэтому журнал упавшей сборки — это ссылка, которую можно
// переслать или отдать агенту, и читается он без JS. В панели выбор прогона был
// состоянием браузера, а журнал приходил вторым запросом.
//
// Список намеренно БЕЗ журналов: сотня сборок компиляторного вывода — мегабайты,
// которых никто не просил. Журнал грузится только у открытого прогона.
//
// Островок один — выбор режима автоматического развёртывания: это запись, меняющая
// поведение сервера.
//
// Динамическая: история и режим — живые.

import Link from "next/link";
import { Download } from "lucide-react";
import { getAdminStrings } from "@/lib/i18n/admin-strings";
import { PageShell } from "../_components/page-shell";
import { HelpDetails } from "../_components/help-details";
import { TwoPane } from "../_components/two-pane";
import { readRuns, readRun, readAuto, whenLabel, howLong } from "./_lib/runs";
import { RunsList } from "./_components/runs-list";
import { AutoModeSwitch } from "./_components/auto-mode.client";

export const dynamic = "force-dynamic";

const fill = (t: string, v: Record<string, string>) => t.replace(/\{(\w+)\}/g, (m, k) => v[k] ?? m);

export default async function DeploymentsPage(
  { params, searchParams }: {
    params: Promise<{ lang: string }>;
    searchParams: Promise<{ run?: string }>;
  },
) {
  const { lang } = await params;
  const { run: runId } = await searchParams;
  const s = getAdminStrings(lang);
  const d = s.deployments;

  const [{ ok, runs }, auto] = await Promise.all([readRuns(100), readAuto()]);
  // Журнал читаем только для запрошенного прогона, и только если он есть в списке:
  // выдуманный номер не должен ничего открывать.
  const opened = runId && runs.some((r) => r.id === runId) ? await readRun(runId) : null;

  const base = `/${lang}/deployments`;

  return (
    <PageShell title={s.pages.deployments.title} hint={s.pages.deployments.hint}>
      {/* Режим автоматического развёртывания */}
      <div className="rounded-lg border border-border px-3 py-2.5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="text-[11px] font-medium text-foreground">{d.autoLabel}</span>
          <AutoModeSwitch
            mode={auto.mode}
            labels={{
              manual: d.modeManual, pull: d.modePull, pullDeploy: d.modePullDeploy,
              savedOff: d.savedOff, savedTo: d.savedTo, failed: d.failed,
            }}
          />
          {auto.lastCheckAt && (
            <span className="font-mono text-[10px] text-muted-foreground">
              {fill(d.lastCheck, { when: whenLabel(auto.lastCheckAt) })}
            </span>
          )}
        </div>
        <p className="mt-1.5 text-[10px] leading-relaxed text-muted-foreground">{d.autoHint}</p>
        {/* Отказ автоматического хода — не молчание: причина показывается. */}
        {auto.lastResult && auto.lastResult !== "ok" && (
          <p className="mt-1.5 rounded-md border border-amber-500/30 bg-amber-500/5 px-2 py-1.5 text-[10px] text-amber-700 dark:text-amber-300">
            {auto.lastResult}{auto.lastReason ? ` — ${auto.lastReason}` : ""}
          </p>
        )}
      </div>

      {!ok ? (
        <div className="mt-3 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3">
          <p className="text-[12px] font-medium text-destructive">{d.unavailable}</p>
        </div>
      ) : (
        <>
          <p className="mt-3 mb-1.5 text-[10px] text-muted-foreground">
            {fill(d.count, { count: String(runs.length) })}
          </p>

          {/* Две колонки: список слева, журнал справа — схема старой панели,
              возвращённая по просьбе владельца. Здесь она серверная, потому что
              выбранный прогон стоит в адресе. */}
          <TwoPane
            selected={Boolean(opened)}
            backHref={base}
            backLabel={d.backToList}
            emptyHint={d.pickRun}
            list={
              <RunsList
                runs={runs}
                activeId={opened?.id ?? null}
                hrefFor={(id) => (id === opened?.id ? base : `${base}?run=${encodeURIComponent(id)}`)}
                labels={{ empty: d.empty, noCommit: d.noCommit }}
              />
            }
            detail={
              opened && (
                <div className="rounded-lg border border-border">
                  <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {opened.status} · {whenLabel(opened.started_at)} · {howLong(opened.duration_ms)}
                    </span>
                    <span className="ml-auto flex items-center gap-2">
                      {/* Скачивание журнала — ОБЫЧНАЯ ссылка на тот же маршрут: браузер
                          сохраняет ответ сам. В панели это был Blob, собранный в
                          памяти; ссылка работает и без JS, и с правым щелчком. */}
                      <a
                        href={`/api/deploy/history?id=${encodeURIComponent(opened.id)}&download=1`}
                        className="inline-flex items-center gap-1 rounded border border-border px-2 py-0.5 text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <Download size={10} />{d.download}
                      </a>
                      <Link href={base} className="text-[10px] text-muted-foreground underline hover:text-foreground">
                        {d.closeLog}
                      </Link>
                    </span>
                  </div>
                  {/* Журнал компилятора — моноширинный текст, прокручивается внутри себя:
                      длинная строка не имеет права растягивать страницу. */}
                  <pre className="max-h-[60vh] overflow-auto p-3 font-mono text-[10px] leading-relaxed whitespace-pre-wrap text-foreground">
                    {opened.log?.trim() ? opened.log : d.noLog}
                  </pre>
                </div>
              )
            }
          />
        </>
      )}

      <HelpDetails label={d.helpLabel}>
        <p><strong>{d.helpWhyTitle}</strong> {d.helpWhy}</p>
        <p><strong>{d.helpModesTitle}</strong> {d.helpModes}</p>
        <p><strong>{d.helpRefusesTitle}</strong> {d.helpRefuses}</p>
        <p><strong>{d.helpOffTitle}</strong> {d.helpOff}</p>
      </HelpDetails>
    </PageShell>
  );
}
