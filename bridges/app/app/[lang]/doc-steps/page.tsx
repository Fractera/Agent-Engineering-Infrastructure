// Шаги разработки — теперь ЗАПИСИ В БАЗЕ, а не файлы (владелец 2026-08-17).
//
// 🔒 ЧТО ИЗМЕНИЛОСЬ И ПОЧЕМУ. До этого дня страница читала папку
// `development-docs/DEVELOPMENT-STEPS/{NEW,COMPLETED}-STEPS/` и показывала имена
// файлов с их размером в килобайтах. Размер файла ничего не говорит о шаге, а
// стадия читалась из имени папки — то есть статус жил в двух местах сразу.
// Теперь слева номер, название и состояние, справа — задание и отчёт.
//
// 🔒 РЕДАКТОРА ЗДЕСЬ НЕТ, И ЭТО ПРЕЖНЕЕ РЕШЕНИЕ, А НЕ УПУЩЕНИЕ. Шаг заводит и
// закрывает тот, кто выполняет работу: агент в локальном клоне владельца, через
// MCP `fractera-project`. Панель — окно, а не пульт.
//
// Выбор стоит в адресе (`?step=12`), значит раскладку решает СЕРВЕР: ссылку на
// шаг можно переслать, и всё это читается без JS.
//
// Динамическая: таблица живая.

import { getAdminStrings } from "@/lib/i18n/admin-strings";
import Link from "next/link";
import { PageShell } from "../_components/page-shell";
import { DocKindBadge } from "../_components/doc-kind-badge";
import { TwoPane } from "../_components/two-pane";
import { listDevSteps, readDevStep } from "@/lib/dev-steps";

export const dynamic = "force-dynamic";

/** Тон состояния. Закрытое — зелёное, помеха — красная, отменённое — приглушённое. */
const TONE: Record<string, string> = {
  new: "border-border text-muted-foreground",
  "in-progress": "border-primary/50 text-primary",
  blocked: "border-red-500/40 text-red-600 dark:text-red-400",
  done: "border-emerald-500/40 text-emerald-700 dark:text-emerald-300",
  cancelled: "border-border text-muted-foreground/60",
};

export default async function DocStepsPage(
  { params, searchParams }: {
    params: Promise<{ lang: string }>;
    searchParams: Promise<{ step?: string }>;
  },
) {
  const { lang } = await params;
  const { step } = await searchParams;
  const s = getAdminStrings(lang);
  const d = s.docs;
  const page = s.pages["doc-steps"];
  const state = listDevSteps();
  const opened = step ? readDevStep(Number(step)) : null;
  const base = `/${lang}/doc-steps`;

  const label = (status: string) =>
    ({
      new: d.stepNew, "in-progress": d.stepInProgress, blocked: d.stepBlocked,
      done: d.stepDone, cancelled: d.stepCancelled,
    } as Record<string, string>)[status] ?? status;

  return (
    <PageShell lang={lang} slug="doc-steps" s={s} params={{ step }} title={page.title} hint={page.hint}>
      <div className="mb-2">
        <DocKindBadge
          kind="evolving"
          evolvingLabel={d.kindEvolving}
          staticLabel={d.kindStatic}
          evolvingHint={d.kindEvolvingHint}
          staticHint={d.kindStaticHint}
        />
      </div>

      {/* Врезка называет ИСТОЧНИК: раньше это была папка, теперь таблица, и
          владелец, помнящий папку, обязан узнать об этом здесь, а не по пустому
          списку. Имя таблицы машинное — моноширинным и без перевода. */}
      <p className="rounded-md border border-blue-500/30 bg-blue-500/5 p-2.5 text-[10px] leading-relaxed text-blue-700 dark:text-blue-300">
        {d.stepsIntro} <span className="font-mono text-foreground">development_steps</span>
      </p>

      <p className="mt-2 mb-3 text-[10px] leading-relaxed text-muted-foreground">{d.stepsWriter}</p>

      {!state.ok ? (
        // 🔒 ДВА РАЗНЫХ ОТКАЗА НАЗЫВАЮТСЯ РАЗНЫМИ ФРАЗАМИ. «Базы нет» —
        // приложение ни разу не собиралось на этом сервере; «таблицы нет» —
        // собиралось, но до появления шагов. Общее «пусто» отправило бы человека
        // искать поломку там, где её нет.
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/5 px-3 py-3 text-[11px] leading-relaxed text-amber-700 dark:text-amber-300">
          {state.reason === "no-db" ? d.stepsNoDb : d.stepsNoTable}
        </p>
      ) : state.steps.length === 0 ? (
        <p className="rounded-lg border border-border bg-muted/40 px-3 py-3 text-[11px] text-muted-foreground">
          {d.stepsEmpty}
        </p>
      ) : (
        <TwoPane
          selected={Boolean(opened)}
          backHref={base}
          backLabel={d.backToList}
          emptyHint={d.pickStep}
          list={
            <div className="rounded-lg border border-border">
              <div className="border-b border-border px-3 py-2 font-mono text-[10px] text-muted-foreground">
                {d.stepsCount.replace("{count}", String(state.steps.length))}
              </div>
              <ul className="divide-y divide-border">
                {state.steps.map((x) => {
                  const active = opened?.number === x.number;
                  return (
                    <li key={x.number}>
                      <Link
                        href={active ? base : `${base}?step=${x.number}`}
                        className={`flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-muted ${active ? "bg-muted" : ""}`}
                      >
                        <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                          {x.number}
                        </span>
                        <span className="truncate text-foreground">{x.title}</span>
                        <span
                          className={`ml-auto shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] ${TONE[x.status] ?? TONE.new}`}
                        >
                          {label(x.status)}
                        </span>
                        {/* Продукт назван в списке, а не только в карточке:
                            самая вероятная тихая ошибка при нескольких
                            продуктах — прочитать шаг не того. */}
                        <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                          {x.productId}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          }
          detail={
            opened && (
              <div className="rounded-lg border border-border">
                <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
                  <span className="font-mono text-[10px] text-muted-foreground">{opened.number}</span>
                  <span className="truncate text-[11px] font-medium text-foreground">{opened.title}</span>
                  <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] ${TONE[opened.status] ?? TONE.new}`}>
                    {label(opened.status)}
                  </span>
                  <Link href={base} className="ml-auto shrink-0 text-[10px] text-muted-foreground underline hover:text-foreground">
                    {d.closeStep}
                  </Link>
                </div>

                <dl className="space-y-2 p-3 text-[11px] leading-relaxed">
                  <div className="flex flex-wrap gap-x-3 font-mono text-[10px] text-muted-foreground">
                    <span>{opened.productId}</span>
                    <span>{opened.importance}</span>
                    {opened.updatedAt && <span>{opened.updatedAt.slice(0, 10)}</span>}
                  </div>

                  {/* Кейсы — то, ради чего шаг существует. Слаги машинные,
                      поэтому моноширинным и без перевода. */}
                  <div>
                    <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{d.stepCases}</dt>
                    <dd className="mt-0.5 font-mono text-[10px] text-foreground">
                      {opened.cases.length ? opened.cases.join(" · ") : d.stepNoCases}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{d.stepPlan}</dt>
                    <dd className="mt-0.5 whitespace-pre-wrap break-words text-foreground">
                      {opened.plan || d.stepNoPlan}
                    </dd>
                  </div>

                  {/* Отчёт показывается, только когда он есть: пустой заголовок
                      «Результат» у незакрытого шага читается как потеря текста. */}
                  {opened.result && (
                    <div>
                      <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{d.stepResult}</dt>
                      <dd className="mt-0.5 whitespace-pre-wrap break-words text-foreground">{opened.result}</dd>
                    </div>
                  )}
                </dl>
              </div>
            )
          }
        />
      )}
    </PageShell>
  );
}
