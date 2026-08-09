// Раздел «Подключить GitHub» (шаг 501, Ф2, партия 14).
//
// Состояние читает сервер, поэтому без JS видно то, что важнее всего: связь
// настоящая или только записана. Три состояния различаются намеренно — заполненное
// поле легко принять за работающую связь, и тогда «почему репозиторий пустой»
// становится загадкой.
//
// Островок один: токен — секрет, а отправка возвращает вывод git, который надо
// показать целиком.
//
// Динамическая: состояние связи и число неотправленных файлов — живые.

import Link from "next/link";
import { GitBranch, CheckCircle, AlertCircle, XCircle } from "lucide-react";
import { getAdminStrings } from "@/lib/i18n/admin-strings";
import { adminHref } from "@/lib/admin-nav";
import { PageShell } from "../_components/page-shell";
import { HelpDetails } from "../_components/help-details";
import { readGitStatus } from "./_lib/git";
import { ConnectForm } from "./_components/connect-form.client";

export const dynamic = "force-dynamic";

const fill = (t: string, v: Record<string, string>) => t.replace(/\{(\w+)\}/g, (m, k) => v[k] ?? m);

export default async function GitHubPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const s = getAdminStrings(lang);
  const g = s.github;

  const result = await readGitStatus();

  if (!result.ok) {
    return (
      <PageShell title={s.pages.github.title} hint={s.pages.github.hint}>
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3">
          <p className="text-[12px] font-medium text-destructive">{g.unavailable}</p>
          <p className="mt-1 font-mono text-[10px] text-muted-foreground">{result.reason}</p>
        </div>
      </PageShell>
    );
  }

  const st = result.status;

  return (
    <PageShell title={s.pages.github.title} hint={s.pages.github.hint}>
      {/* Полоса состояния — серверная: правда видна и без JS. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-lg border border-border px-3 py-2 text-[11px]">
        <span className="flex items-center gap-1.5">
          <GitBranch size={12} className="text-muted-foreground" />
          {st.repoUrl
            ? <span className="font-mono text-foreground">{st.repoUrl.replace(/^https?:\/\/(www\.)?github\.com\//, "")}</span>
            : <span className="text-muted-foreground">{g.noRepo}</span>}
        </span>

        {st.state === "working" ? (
          <span className="flex items-center gap-1 text-[10px] text-green-500">
            <CheckCircle size={10} />{g.stateWorking}
          </span>
        ) : st.state === "unverified" ? (
          <span className="flex items-center gap-1 text-[10px] text-orange-500">
            <AlertCircle size={10} />{g.stateUnverified}
          </span>
        ) : (
          <span className="text-[10px] text-muted-foreground">{g.stateUnconfigured}</span>
        )}

        {st.verifiedAt && (
          <span className="font-mono text-[10px] text-muted-foreground">
            {fill(g.verifiedAt, { when: new Date(st.verifiedAt).toLocaleString() })}
          </span>
        )}
      </div>

      {/* «Данные введены, но GitHub их не подтвердил» — то состояние, которое
          выглядит как рабочее и им не является. Названо отдельно. */}
      {st.state === "unverified" && (
        <p className="mt-2 flex items-start gap-1.5 rounded-md border border-orange-500/40 bg-orange-500/5 p-2.5 text-[10px] leading-relaxed text-orange-700 dark:text-orange-300">
          <XCircle size={11} className="mt-0.5 shrink-0" />
          <span>{g.unverifiedHint}</span>
        </p>
      )}

      {/* Сколько работы существует ТОЛЬКО здесь. Число с примерами: одно число не
          даёт понять, о чём речь, и потерять эти файлы легче всего. */}
      {st.pendingFiles > 0 && (
        <div className="mt-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-2.5">
          <p className="text-[10px] font-medium text-amber-700 dark:text-amber-300">
            {fill(g.pending, { count: String(st.pendingFiles) })}
          </p>
          {st.sample.length > 0 && (
            <ul className="mt-1 space-y-0.5 font-mono text-[10px] text-amber-700/80 dark:text-amber-300/80">
              {st.sample.slice(0, 5).map((f) => <li key={f} className="truncate">{f}</li>)}
            </ul>
          )}
        </div>
      )}

      <div className="mt-3">
        <ConnectForm
          repoUrl={st.repoUrl}
          hasToken={st.hasToken}
          canPush={st.state !== "unconfigured"}
          labels={{
            repoLabel: g.repoLabel, repoPlaceholder: "https://github.com/owner/repository",
            tokenLabel: g.tokenLabel, tokenPlaceholder: "ghp_…", tokenReplace: g.tokenReplace,
            connect: g.connect, connecting: g.connecting, connected: g.connected,
            push: g.push, pushing: g.pushing, pushed: g.pushed,
            failed: g.failed, outputLabel: g.outputLabel,
          }}
        />
      </div>

      <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">
        {g.seeAlso}{" "}
        <Link href={adminHref(lang, "github-about")} className="underline">{s.pages["github-about"].title}</Link>
        {" · "}
        <Link href={adminHref(lang, "deployments")} className="underline">{s.pages.deployments.title}</Link>
      </p>

      <HelpDetails label={g.helpLabel}>
        <p><strong>{g.helpWhyTitle}</strong> {g.helpWhy}</p>
        <p><strong>{g.helpFirstTitle}</strong> {g.helpFirst}</p>
        <p><strong>{g.helpTokenTitle}</strong> {g.helpToken}</p>
        <p><strong>{g.helpDataTitle}</strong> {g.helpData}</p>
      </HelpDetails>
    </PageShell>
  );
}
