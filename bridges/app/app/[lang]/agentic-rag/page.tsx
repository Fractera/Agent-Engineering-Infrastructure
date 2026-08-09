// Раздел «Агентный RAG» (шаг 501, Ф2, партия 6).
//
// Граф знаний — вторая половина знания рядом с векторной памятью, и раздел
// устроен так же: состояние, список документов и ОТВЕТ НА ВОПРОС читает сервер;
// клиентский островок отвечает только за действия (включить службу, принять
// текст, стереть базу).
//
// Вопрос живёт в адресе (`?q=`). Ждать граф приходится десятки секунд, и ожидание
// показывает сам браузер — это честнее спиннера, который врёт о прогрессе.
// Взамен ответ приезжает внутри HTML, читается без JS и пересылается ссылкой.
//
// Динамическая: и состояние службы, и её база живые. Объявлено НА СТРАНИЦЕ.

import Link from "next/link";
import { getAdminStrings } from "@/lib/i18n/admin-strings";
import { adminHref } from "@/lib/admin-nav";
import { PageShell } from "../_components/page-shell";
import { HelpDetails } from "../_components/help-details";
import { SearchForm } from "../_components/search-form";
import { readHealth, readKeyConfigured, readDocuments, askGraph } from "./_lib/rag";
import { RagActions } from "./_components/rag-actions.client";

export const dynamic = "force-dynamic";

const fill = (t: string, vars: Record<string, string>) =>
  t.replace(/\{(\w+)\}/g, (m, k) => vars[k] ?? m);

export default async function AgenticRagPage(
  { params, searchParams }: {
    params: Promise<{ lang: string }>;
    searchParams: Promise<{ q?: string }>;
  },
) {
  const { lang } = await params;
  const { q = "" } = await searchParams;
  const s = getAdminStrings(lang);
  const g = s.rag;

  const health = await readHealth();
  const configured = await readKeyConfigured();
  const docs = health.available ? await readDocuments() : { ok: false as const };
  const answer = health.available && q.trim() ? await askGraph(q.trim()) : null;

  const documents = docs.ok ? docs.documents : [];

  return (
    <PageShell lang={lang} slug="agentic-rag" s={s} title={s.pages["agentic-rag"].title} hint={s.pages["agentic-rag"].hint}>
      {/* Полоса показаний: одна строка вместо вертикального списка — та же форма,
          что у векторной памяти, чтобы два склада знания читались одинаково. */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 rounded-lg border border-border px-3 py-2 font-mono text-[11px]">
        <span className="flex items-center gap-1.5 whitespace-nowrap">
          <span className="text-muted-foreground">{g.serviceLabel}</span>
          <span className={health.available ? "text-green-600 dark:text-green-400" : "text-orange-500"}>
            {health.available ? g.running : g.stopped}
          </span>
        </span>
        <span className="flex items-center gap-1.5 whitespace-nowrap">
          <span className="text-muted-foreground">{g.keyLabel}</span>
          <span className={configured ? "text-green-600 dark:text-green-400" : "text-orange-500"}>
            {configured ? g.keySet : g.keyNotSet}
          </span>
        </span>
        {health.llmModel && (
          <span className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="text-muted-foreground">{g.llmLabel}</span>
            <span className="text-foreground">{health.llmModel}</span>
          </span>
        )}
        {health.embeddingModel && (
          <span className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="text-muted-foreground">{g.embeddingLabel}</span>
            <span className="text-foreground">{health.embeddingModel}</span>
          </span>
        )}
        <span className="flex items-center gap-1.5 whitespace-nowrap">
          <span className="text-muted-foreground">{g.documentsLabel}</span>
          <span className="text-foreground">{documents.length}</span>
        </span>
        <span className="ml-auto text-muted-foreground/60">{g.serviceNote}</span>
      </div>

      {!configured && (
        <p className="mt-2 rounded-md border border-orange-500/30 bg-orange-500/5 px-2.5 py-2 text-[10px] leading-relaxed text-orange-700 dark:text-orange-300">
          {g.noKey}{" "}
          <Link href={adminHref(lang, "openai")} className="underline">{s.pages.openai.title}</Link>
        </p>
      )}

      <div className="mt-3">
        <RagActions
          running={health.available}
          labels={{
            turnOn: g.turnOn, turnOff: g.turnOff, ingestText: g.ingestText, wipe: g.wipe,
            ingestTitle: g.ingestTitle, ingestHint: g.ingestHint, ingestPlaceholder: g.ingestPlaceholder,
            cancel: g.cancel, send: g.send,
            wipeTitle: g.wipeTitle, wipeBody: g.wipeBody, wipeConfirm: g.wipeConfirm,
            started: g.started, stopped: g.stoppedToast, ingested: g.ingested, wiped: g.wiped, failed: g.failed,
          }}
        />
      </div>

      {!health.available ? (
        <p className="mt-4 rounded-md border border-dashed border-border px-3 py-2 text-[11px] text-muted-foreground">
          {g.serviceOff}
        </p>
      ) : (
        <>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <span className="whitespace-nowrap text-[11px] text-muted-foreground">{g.askLabel}</span>
            <div className="w-full max-w-md">
              <SearchForm value={q} placeholder={g.askPlaceholder} submit={g.ask} />
            </div>
            <span className="whitespace-nowrap text-[10px] text-muted-foreground/70">{g.askWarning}</span>
          </div>

          {answer && (
            <div className="mt-2">
              {answer.ok ? (
                <div className="rounded-lg border border-border bg-muted/20 px-4 py-3 text-[12px] leading-relaxed whitespace-pre-wrap text-foreground">
                  {answer.text}
                </div>
              ) : (
                <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3">
                  <p className="text-[12px] font-medium text-destructive">
                    {answer.reason === "empty-answer" ? g.emptyAnswer : g.askFailed}
                  </p>
                  {answer.reason !== "empty-answer" && (
                    <p className="mt-1 font-mono text-[10px] text-muted-foreground">{answer.reason}</p>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="mt-4">
            <p className="mb-1.5 text-[10px] text-muted-foreground">
              {fill(g.documentsCount, { count: String(documents.length) })}
            </p>
            {documents.length === 0 ? (
              <p className="py-6 text-center text-[11px] text-muted-foreground">{g.noDocuments}</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full border-collapse text-[11px]">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      {[g.colStatus, g.colSource, g.colChunks, g.colSummary].map((h) => (
                        <th key={h} className="border-r border-border px-3 py-2 text-left font-mono font-medium whitespace-nowrap text-muted-foreground">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {documents.map((d) => (
                      <tr key={d.id} className="border-b border-border transition-colors hover:bg-muted/30">
                        <td className="border-r border-border px-3 py-1.5 font-mono whitespace-nowrap text-foreground">{d.status}</td>
                        <td className="max-w-[260px] border-r border-border px-3 py-1.5">
                          <span className="block truncate font-mono text-muted-foreground" title={d.source ?? ""}>
                            {d.source ?? <span className="text-muted-foreground/40">—</span>}
                          </span>
                        </td>
                        <td className="border-r border-border px-3 py-1.5 font-mono text-muted-foreground">{d.chunks}</td>
                        <td className="border-r border-border px-3 py-1.5">
                          <span className="block text-muted-foreground">{d.summary}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      <HelpDetails label={g.helpLabel}>
        <p><strong>{g.helpGetTitle}</strong> {g.helpGet}</p>
        <p><strong>{g.helpWhyTitle}</strong> {g.helpWhy}</p>
        <p><strong>{g.helpWinsTitle}</strong> {g.helpWins}</p>
        <p><strong>{g.helpCostTitle}</strong> {g.helpCost}</p>
        <p><strong>{g.helpWeakTitle}</strong> {g.helpWeak}</p>
        <p><strong>{g.helpSeparateTitle}</strong> {g.helpSeparate}</p>
      </HelpDetails>
    </PageShell>
  );
}
