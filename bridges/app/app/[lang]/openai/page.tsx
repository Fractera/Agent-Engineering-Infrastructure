// Раздел «Настройки OpenAI» (шаг 501, Ф2, партия 12).
//
// Ключ ОДИН, а потребителей ДВА: слой данных (векторы) и служба графа знаний. Их
// состояния читаются по отдельности, потому что ключ мог доехать до одного и не
// доехать до другого — а у графа отказ молчаливый: приём документа отвечает 200 и
// не встраивает ничего.
//
// Динамическая: настроенность и живость служб — живые.

import Link from "next/link";
import { KeyRound, BrainCircuit, Brain, CheckCircle, AlertCircle, XCircle } from "lucide-react";
import { getAdminStrings } from "@/lib/i18n/admin-strings";
import { adminHref } from "@/lib/admin-nav";
import { PageShell } from "../_components/page-shell";
import { HelpDetails } from "../_components/help-details";
import { readOpenAiState } from "./_lib/openai";
import { KeyForm } from "./_components/key-form.client";

export const dynamic = "force-dynamic";

export default async function OpenAiPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const s = getAdminStrings(lang);
  const o = s.openai;

  const state = await readOpenAiState();
  const bothSet = state.vectors.configured && state.graph.configured;

  return (
    <PageShell lang={lang} slug="openai" s={s} title={s.pages.openai.title} hint={s.pages.openai.hint}>
      <div className="rounded-md border border-blue-500/30 bg-blue-500/5 p-3 text-[11px] leading-relaxed text-blue-700 dark:text-blue-300">
        {o.intro}{" "}
        <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline">
          platform.openai.com
        </a>
      </div>

      <div className="mt-3">
        <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium text-foreground">
          <KeyRound size={12} className="text-muted-foreground" />{o.keyLabel}
        </p>
        <KeyForm
          configured={bothSet}
          labels={{
            placeholder: "sk-…", placeholderReplace: o.replace,
            save: o.save, saving: o.saving, restarting: o.restarting,
            saved: o.saved, invalid: o.invalid, failed: o.failed,
          }}
        />
      </div>

      {/* ДВА потребителя, два состояния. Один индикатор скрывал бы половину
          правды: ключ мог доехать до слоя данных и не доехать до графа. */}
      <p className="mt-4 mb-1.5 text-[10px] uppercase tracking-wide text-muted-foreground/70">{o.consumersLabel}</p>
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-border px-3 py-2">
          <BrainCircuit size={12} className="text-muted-foreground" />
          <Link href={adminHref(lang, "vector-memory")} className="text-[11px] text-foreground underline decoration-transparent hover:decoration-inherit">
            {s.pages["vector-memory"].title}
          </Link>
          {state.vectors.model && (
            <span className="font-mono text-[10px] text-muted-foreground">{state.vectors.model}</span>
          )}
          <span className="ml-auto">
            {state.vectors.configured ? (
              <span className="flex items-center gap-1 text-[10px] text-green-500"><CheckCircle size={10} />{o.set}</span>
            ) : (
              <span className="text-[10px] text-orange-500">{o.notSet}</span>
            )}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-md border border-border px-3 py-2">
          <Brain size={12} className="text-muted-foreground" />
          <Link href={adminHref(lang, "agentic-rag")} className="text-[11px] text-foreground underline decoration-transparent hover:decoration-inherit">
            {s.pages["agentic-rag"].title}
          </Link>
          <span className="ml-auto">
            {state.graph.configured ? (
              <span className="flex items-center gap-1 text-[10px] text-green-500"><CheckCircle size={10} />{o.set}</span>
            ) : (
              <span className="text-[10px] text-orange-500">{o.notSet}</span>
            )}
          </span>
        </div>
      </div>

      {/* Ключ доехал до одного потребителя, но не до другого — состояние, о котором
          старая панель молчала, а именно оно и есть тот молчаливый отказ. */}
      {state.vectors.configured !== state.graph.configured && (
        <p className="mt-2 flex items-start gap-1.5 rounded-md border border-destructive/40 bg-destructive/5 p-2.5 text-[10px] leading-relaxed text-destructive">
          <XCircle size={11} className="mt-0.5 shrink-0" />
          <span>{o.mismatch}</span>
        </p>
      )}

      <p className="mt-3 flex items-start gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-[11px] leading-relaxed text-amber-700 dark:text-amber-300">
        <AlertCircle size={12} className="mt-0.5 shrink-0" />
        <span>{o.storedLocally}</span>
      </p>

      <HelpDetails label={o.helpLabel}>
        <p><strong>{o.helpWhatTitle}</strong> {o.helpWhat}</p>
        <p><strong>{o.helpSpendsTitle}</strong> {o.helpSpends}</p>
        <p><strong>{o.helpNoSubTitle}</strong> {o.helpNoSub}</p>
        <p><strong>{o.helpSavingTitle}</strong> {o.helpSaving}</p>
        <p><strong>{o.helpWatchTitle}</strong> {o.helpWatch}</p>
        <p>
          <strong>{o.helpProviderTitle}</strong> {o.helpProvider}{" "}
          <a href="mailto:admin@fractera.ai" className="text-primary underline underline-offset-2">admin@fractera.ai</a>
        </p>
      </HelpDetails>
    </PageShell>
  );
}
