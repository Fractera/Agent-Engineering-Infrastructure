// Карта документов разработки (шаг 501, 2026-08-09).
//
// Страница-маршрутизатор группы и единственная в ней ОПИСАТЕЛЬНАЯ: она отвечает
// не «что лежит в файле», а «зачем документов столько и почему именно эти».
// Человек, открывший группу впервые, видит сначала карту, а не двенадцать
// одинаковых на вид пунктов.
//
// Состояние каждого документа считается по диску: заведён он или ещё нет. Это
// та же правда, что на самих страницах, и она здесь важнее списка — по ней
// видно, чего проекту не хватает.
//
// Динамическая: состояние живое.

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getAdminStrings } from "@/lib/i18n/admin-strings";
import { PageShell } from "../_components/page-shell";
import { DocKindBadge } from "../_components/doc-kind-badge";
import { DOC_FILES, DOC_KIND, readDoc, listSteps, isDocKey } from "@/lib/product-docs";
import { readInstructionSet, TOGGLEABLE, ALWAYS_ON } from "@/lib/instruction-set";
import { InstructionSwitch } from "../_components/instruction-switch.client";
import { MasterSwitch } from "../_components/master-switch.client";
import { listSamples } from "@/lib/code-samples";
import { NAV_BY_GROUP, adminHref, type AdminPageSlug } from "@/lib/admin-nav";

export const dynamic = "force-dynamic";

export default async function DocOverviewPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const s = getAdminStrings(lang);
  const o = s.docsOverview;
  const page = s.pages["doc-overview"];

  // Порядок берётся из навигации, а не переписывается здесь: два списка одних и
  // тех же документов разошлись бы при первой же правке.
  const slugs = NAV_BY_GROUP.documents.filter((x) => x !== "doc-overview") as AdminPageSlug[];

  // Состояние корпуса. Оно обязано читаться С ОДНОГО ЭКРАНА: выключенная
  // инструкция не должна выглядеть как несуществующая, иначе через неделю
  // «агент перестал соблюдать стандарты» превращается в загадку.
  const set = readInstructionSet();
  const allOff = TOGGLEABLE.every((k) => !set.enabled[k]);

  const switchLabels = {
    on: o.switchOn, off: o.switchOff,
    effect: o.effectNextSession, delivery: o.deliveryPushPull,
    failed: s.docs.failed,
    instructionAdded: o.instructionAdded, instructionMissing: o.instructionMissing,
    docCreated: o.docCreated,
  };

  const rows = slugs.map((slug) => {
    // Два документа группы — ПАПКИ, а не файлы: шаги заводит агент по одному на
    // работу, образцы складывает владелец. «Заведён» для них значит «есть хотя
    // бы одна запись».
    if (slug === "doc-steps") {
      const steps = listSteps();
      return {
        slug,
        file: `${steps.dir}/`,
        exists: steps.exists && steps.files.length > 0,
        kind: DOC_KIND[slug] ?? "static",
      };
    }
    if (slug === "doc-code-samples") {
      const samples = listSamples();
      return {
        slug,
        file: `${samples.dir}/`,
        exists: samples.files.length > 0,
        kind: DOC_KIND[slug] ?? "static",
      };
    }
    const key = isDocKey(slug) ? slug : null;
    const state = key ? readDoc(key) : null;
    return {
      slug,
      file: key ? DOC_FILES[key] : "",
      exists: Boolean(state?.exists),
      kind: (DOC_KIND[slug] ?? "static") as "evolving" | "static",
    };
  });

  return (
    <PageShell lang={lang} slug="doc-overview" s={s} title={page.title} hint={page.hint}>
      {/* Вводная часть: почему документации столько. Стоит выше списка —
          возражение «это дорого по токенам» возникает раньше, чем интерес к
          конкретному файлу. */}
      <section className="rounded-lg border border-border bg-muted/30 p-3">
        <h2 className="text-[12px] font-semibold text-foreground">{o.whyTitle}</h2>
        <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">{o.whyLead}</p>
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{o.whyOneEdit}</p>
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{o.whyWhole}</p>
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{o.whyModels}</p>
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{o.whyExperience}</p>
      </section>

      {/* Два рода документов — ключ к чтению всего списка ниже. */}
      <section className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
          <DocKindBadge
            kind="evolving"
            evolvingLabel={s.docs.kindEvolving}
            staticLabel={s.docs.kindStatic}
            evolvingHint={s.docs.kindEvolvingHint}
            staticHint={s.docs.kindStaticHint}
          />
          <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">{o.evolvingExplained}</p>
        </div>
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <DocKindBadge
            kind="static"
            evolvingLabel={s.docs.kindEvolving}
            staticLabel={s.docs.kindStatic}
            evolvingHint={s.docs.kindEvolvingHint}
            staticHint={s.docs.kindStaticHint}
          />
          <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">{o.staticExplained}</p>
        </div>
      </section>

      {/* Сами документы: зачем каждый, в каком он состоянии, и ссылка открыть. */}
      <ul className="mt-3 divide-y divide-border rounded-lg border border-border">
        {rows.map((r) => {
          // Документ, у которого есть выключатель, обязан показывать его положение
          // ЗДЕСЬ. Иначе выключенная возможность выглядит как работающая: файл в
          // списке есть, а хуки молчат и правило в инструкции отключено — и понять
          // это можно только зайдя внутрь.
          // Главная инструкция несёт сам механизм — выключить её нельзя ни
          // строкой, ни мастер-выключателем. Она всегда зелёная и без тумблера.
          const managed = (TOGGLEABLE as string[]).includes(r.slug);
          const switched = managed ? Boolean(set.enabled[r.slug]) : r.slug === ALWAYS_ON ? true : null;
          return (
          <li
            key={r.slug}
            className={
              switched === true ? "border-l-4 border-l-emerald-500"
              : switched === false ? "border-l-4 border-l-destructive"
              : ""
            }
          >
            <div className="flex items-start gap-3 px-3 py-2.5">
            <Link href={adminHref(lang, r.slug)} className="flex min-w-0 flex-1 gap-3 hover:bg-muted">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[12px] font-medium text-foreground">{s.pages[r.slug].title}</span>
                  <span className="font-mono text-[10px] text-muted-foreground">{r.file}</span>
                  <span
                    className={`rounded-full border px-1.5 py-0.5 text-[9px] ${
                      r.kind === "evolving"
                        ? "border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    {r.kind === "evolving" ? s.docs.kindEvolving : s.docs.kindStatic}
                  </span>
                  {!r.exists && (
                    <span className="rounded-full border border-amber-500/40 px-1.5 py-0.5 text-[9px] text-amber-700 dark:text-amber-300">
                      {o.notCreatedYet}
                    </span>
                  )}
                  {switched !== null && (
                    <span
                      className={`rounded-full border px-1.5 py-0.5 text-[9px] ${
                        switched
                          ? "border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
                          : "border-destructive/40 text-destructive"
                      }`}
                    >
                      {switched ? o.inUse : o.switchedOff}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
                  {o.purposes[r.slug]}
                </p>
              </div>
              <ChevronRight size={13} className="mt-1 shrink-0 text-muted-foreground" />
            </Link>

            {/* Тумблер стоит ВНЕ ссылки: иначе щелчок по нему открывал бы
                страницу вместо переключения. */}
            <span className="mt-0.5 flex shrink-0 flex-col items-end gap-1">
              {managed && (
                <InstructionSwitch
                  docKey={r.slug}
                  enabled={Boolean(set.enabled[r.slug])}
                  labels={switchLabels}
                  srLabel={s.pages[r.slug].title}
                />
              )}
              {r.slug === ALWAYS_ON && (
                <MasterSwitch
                  allOff={allOff}
                  labels={{
                    label: o.masterLabel,
                    allOff: o.masterAllOff, restored: o.masterRestored,
                    effect: o.effectNextSession, delivery: o.deliveryPushPull,
                    failed: s.docs.failed, instructionMissing: o.instructionMissing,
                  }}
                />
              )}
            </span>
            </div>

            {/* Пояснение к мастер-выключателю — родной <details>, раскрывается
                без JS и печатается вместе со страницей. */}
            {r.slug === ALWAYS_ON && (
              <details className="border-t border-border px-3 py-1.5">
                <summary className="cursor-pointer list-none text-[10px] text-muted-foreground hover:text-foreground">
                  {o.masterHelpLabel}
                </summary>
                <div className="mt-1 space-y-1.5 text-[10px] leading-relaxed text-muted-foreground">
                  <p>{o.masterHelpWhy}</p>
                  <p>{o.masterHelpRestore}</p>
                  <p>{o.masterHelpMain}</p>
                </div>
              </details>
            )}
          </li>
          );
        })}
      </ul>

      <p className="mt-3 rounded-md border border-border bg-muted/30 p-2.5 text-[10px] leading-relaxed text-muted-foreground">
        {o.effectNextSession} {o.deliveryPushPull}
      </p>

      <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">{o.closing}</p>
    </PageShell>
  );
}
