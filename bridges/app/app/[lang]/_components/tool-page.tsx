import Link from "next/link";
import { ChevronRight, PackagePlus, type LucideIcon } from "lucide-react";
import { PageShell } from "./page-shell";
import { HelpDetails } from "./help-details";
import { toolById, type ToolId } from "@/lib/tools-registry";
import { TOOL_DOCS } from "@/lib/tools-doc";
import { CodeView } from "@/_tools/code-view/client/code-view.client";
import { toolState } from "@/lib/tools-install";
import { adminHref } from "@/lib/admin-nav";
import { InstallButton } from "../tools/_components/install-button.client";
import type { AdminStrings } from "@/lib/i18n/admin-strings";

// Каркас страницы ОДНОГО инструмента (шаг 501, решение владельца 2026-08-09).
//
// У каждого инструмента своя страница в меню — так владелец сможет со временем
// довести её до небольшой посадочной: подробно показать, как инструмент
// работает. Общий каркас держит одинаковым то, что обязано совпадать
// (требования, установка, адрес назначения), и оставляет место для рассказа:
// `children` — это и есть будущий разворот.
//
// Серверный: всё, кроме кнопки установки, — разметка и данные диска.

export function ToolPage({
  id, lang, s, icon: Icon, children,
}: {
  id: ToolId;
  lang: string;
  s: AdminStrings;
  icon: LucideIcon;
  /** Рассказ об инструменте: примеры, картинки, разбор. Растёт со временем. */
  children?: React.ReactNode;
}) {
  const tool = toolById(id);
  const doc = TOOL_DOCS[id];
  const state = toolState(id);
  const t = s.tools;
  const item = t.items[id];
  const page = s.pages[`tool-${id}` as keyof typeof s.pages];

  return (
    <PageShell title={page.title} hint={page.hint}>
      <div className="flex gap-3 rounded-lg border border-border p-3">
        <Icon size={16} className="mt-0.5 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] leading-relaxed text-foreground">{doc.purpose}</p>
          <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{item.body}</p>

          {/* Требования названы ДО установки: инструмент, который не заработает
              без ключа или HTTPS, обязан сказать это заранее. */}
          <p className="mt-2 flex flex-wrap gap-1.5">
            {tool.needs.map((n) => (
              <span key={n} className="rounded-full border border-border px-1.5 py-0.5 text-[9px] text-muted-foreground">
                {t.needs[n]}
              </span>
            ))}
            {tool.npmDeps.length > 0 && (
              <span className="rounded-full border border-amber-500/40 px-1.5 py-0.5 font-mono text-[9px] text-amber-700 dark:text-amber-300">
                npm i {tool.npmDeps.join(" ")}
              </span>
            )}
          </p>

          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <InstallButton
              id={id}
              installed={state.installed}
              outdated={state.outdated}
              labels={{
                install: t.install, installing: t.installing, installed: t.installedToast,
                update: t.update, updateConfirm: t.updateConfirm, cancel: t.cancel,
                failed: t.failed, alreadyInstalled: t.alreadyInstalled,
              }}
            />
            <span className="font-mono text-[10px] text-muted-foreground">→ {state.target}</span>
            {state.outdated && (
              <span className="text-[10px] text-amber-600 dark:text-amber-400">{t.outdated}</span>
            )}
          </div>

          {/* Пакет нужен ровно одному инструменту из четырёх — и когда нужен,
              команда стоит рядом с кнопкой, а не в справке этажом ниже. */}
          {tool.npmDeps.length > 0 && (
            <p className="mt-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-[10px] leading-relaxed text-amber-800 dark:text-amber-200">
              {t.npmNeeded.replace("{cmd}", `npm install ${tool.npmDeps.join(" ")}`)}
            </p>
          )}
        </div>
      </div>

      {/* ПОДРОБНОЕ ОПИСАНИЕ — то самое, что уезжает в `PLATFORM-TOOLS.md`.
          Источник один (`TOOL_DOCS`), поэтому страница и документ не могут
          разойтись: расходятся всегда два текста, а не один. */}
      <section className="mt-3 space-y-3">
        <div>
          <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t.docMechanics}</h2>
          <ul className="mt-1.5 space-y-1.5">
            {doc.mechanics.map((m, i) => (
              <li key={i} className="flex gap-2 text-[11px] leading-relaxed text-muted-foreground">
                <span className="mt-1.5 size-1 shrink-0 rounded-full bg-muted-foreground/50" />
                {m}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t.docApi}</h2>
          <p className="mt-1.5 font-mono text-[10px] text-foreground">{doc.importLine}</p>
          <p className="mt-1 font-mono text-[10px] text-muted-foreground">{doc.signature}</p>

          <div className="mt-2 overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[440px] text-left">
              <thead>
                <tr className="border-b border-border text-[9px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-2 py-1.5 font-medium">{t.docParam}</th>
                  <th className="px-2 py-1.5 font-medium">{t.docType}</th>
                  <th className="px-2 py-1.5 font-medium">{t.docRequired}</th>
                  <th className="px-2 py-1.5 font-medium">{t.docAbout}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {doc.params.map((p) => (
                  <tr key={p.name} className="align-top">
                    <td className="px-2 py-1.5 font-mono text-[10px] text-foreground">{p.name}</td>
                    <td className="px-2 py-1.5 font-mono text-[10px] text-muted-foreground">{p.type}</td>
                    <td className="px-2 py-1.5 text-[10px] text-muted-foreground">{p.required ? t.docYes : t.docNo}</td>
                    <td className="px-2 py-1.5 text-[10px] leading-relaxed text-muted-foreground">{p.about}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
            <strong className="text-foreground">{t.docReturns}</strong> {doc.returns}
          </p>
        </div>

        <div>
          <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t.docExample}</h2>
          <div className="mt-1.5">
            <CodeView code={doc.example} lang="tsx" className="max-h-[40vh]" />
          </div>
        </div>

        <div>
          <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t.docLimits}</h2>
          <ul className="mt-1.5 space-y-1.5">
            {doc.limits.map((l, i) => (
              <li key={i} className="flex gap-2 text-[11px] leading-relaxed text-muted-foreground">
                <span className="mt-1.5 size-1 shrink-0 rounded-full bg-amber-500/70" />
                {l}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {children && <div className="mt-3">{children}</div>}

      <HelpDetails label={t.helpLabel}>
        <p><strong>{t.helpCopyTitle}</strong> {t.helpCopy}</p>
        <p><strong>{t.helpWhereTitle}</strong> {t.helpWhere}</p>
        <p><strong>{t.helpAgentTitle}</strong> {t.helpAgent}</p>
        <p><strong>{t.helpDepsTitle}</strong> {t.helpDeps}</p>
        <p><strong>{t.helpUpdateTitle}</strong> {t.helpUpdate}</p>
      </HelpDetails>

      <Link
        href={adminHref(lang, "add-tool")}
        className="mt-3 flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2.5 text-[12px] text-foreground hover:bg-muted"
      >
        <PackagePlus size={13} className="shrink-0 text-muted-foreground" />
        {s.pages["add-tool"].title}
        <ChevronRight size={13} className="ml-auto shrink-0 text-muted-foreground" />
      </Link>
    </PageShell>
  );
}
