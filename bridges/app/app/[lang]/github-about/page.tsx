// Раздел «О GitHub» (шаг 501, Ф2, партия 14).
//
// СТАТИЧЕСКАЯ и без островков: здесь нет ни данных, ни действий — только
// объяснение, что делает каждая кнопка и в какую сторону едут файлы. Это ровно та
// страница, которую читают, когда «нажал и не понял, что произошло», поэтому она
// обязана открываться мгновенно и работать без JS.
//
// Отделена от страницы подключения намеренно: там действия, здесь понимание.
// Смешать их значило бы поставить абзацы между кнопками.

import Link from "next/link";
import { ArrowUpFromLine, ArrowDownToLine, Rocket } from "lucide-react";
import { getAdminStrings } from "@/lib/i18n/admin-strings";
import { adminHref } from "@/lib/admin-nav";
import { PageShell } from "../_components/page-shell";

export default async function GitHubAboutPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const s = getAdminStrings(lang);
  const a = s.githubAbout;

  const buttons = [
    { icon: ArrowUpFromLine, title: a.pushTitle, body: a.pushBody },
    { icon: ArrowDownToLine, title: a.pullTitle, body: a.pullBody },
    { icon: Rocket, title: a.deployTitle, body: a.deployBody },
  ];

  return (
    <PageShell title={s.pages["github-about"].title} hint={s.pages["github-about"].hint}>
      <p className="text-[12px] leading-relaxed text-muted-foreground">{a.intro}</p>

      <div className="mt-3 space-y-2">
        {buttons.map(({ icon: Icon, title, body }) => (
          <div key={title} className="rounded-lg border border-border p-3">
            <p className="flex items-center gap-1.5 text-[11px] font-medium text-foreground">
              <Icon size={12} className="text-muted-foreground" />{title}
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{body}</p>
          </div>
        ))}
      </div>

      {/* Главное различение всей страницы, поэтому отдельной врезкой. */}
      <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
        <p className="text-[11px] font-medium text-amber-700 dark:text-amber-300">{a.filesVsDataTitle}</p>
        <p className="mt-1 text-[11px] leading-relaxed text-amber-700/90 dark:text-amber-300/90">{a.filesVsData}</p>
      </div>

      <div className="mt-3 space-y-2 text-[11px] leading-relaxed text-muted-foreground">
        <p><strong className="text-foreground">{a.ruleTitle}</strong> {a.rule}</p>
        <p><strong className="text-foreground">{a.conflictTitle}</strong> {a.conflict}</p>
      </div>

      <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">
        {a.seeAlso}{" "}
        <Link href={adminHref(lang, "github")} className="underline">{s.pages.github.title}</Link>
        {" · "}
        <Link href={adminHref(lang, "how-to-build")} className="underline">{s.pages["how-to-build"].title}</Link>
      </p>
    </PageShell>
  );
}
