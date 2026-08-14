// Раздел «Инструменты разработки» (владелец 2026-08-13, три инструмента с 2026-08-14).
//
// 🔒 НЕ ПУТАТЬ С ГРУППОЙ «ИНСТРУМЕНТЫ». Та — про готовые куски, которые едут
// ВНУТРЬ продукта: обрезка изображения, голосовой ввод, просмотр кода. Здесь —
// про то, чем проект СТРОЯТ: эти инструменты живут на машине разработчика и до
// посетителя не доходят никогда. Смешать их значит однажды предложить клиенту
// поставить себе в сайт браузерное расширение.
//
// 🔒 СПИСОК РАСТЁТ ТОЛЬКО ПРОВЕРЕННЫМ. Владелец назвал раздел местом, куда будут
// добавляться инструменты, «которые реально практически решают задачи». Поэтому
// здесь нет и не будет списка «планируется».
//
// 🔒 ПОРЯДОК ТРЁХ КАРТОЧЕК ВЫБРАН ВЛАДЕЛЬЦЕМ (2026-08-14) и он содержательный:
// сначала то, без чего обойтись МОЖНО (браузер у агента), последним — то, без
// чего нельзя (редактор). Человек, которому первым делом велят поставить три
// программы, не ставит ни одной; начавший с необязательной — доходит до конца.
// В том же порядке идут предупреждения в шапке.
//
// 🔒 У КАЖДОЙ КАРТОЧКИ ЕСТЬ ГАЛОЧКА. Отметку о браузере умел ставить только
// агент, и владелец, поставивший расширение руками, не мог погасить
// предупреждение. Незакрываемое предупреждение обесценивает всю область: его
// перестают читать вместе с соседними, где стоят настоящие блокировки.
//
// Динамическая: показывает живое состояние отметок.

import { ExternalLink, MonitorSmartphone, TerminalSquare, Code2 } from "lucide-react";
import { getAdminStrings } from "@/lib/i18n/admin-strings";
import { PageShell } from "../_components/page-shell";
import { DocPopup } from "../_components/doc-popup.client";
import { GuideProse } from "../how-to-build/_components/guide-prose";
import { readLocalizedContent } from "@/lib/content/localized-content";
import { installedMap } from "@/lib/dev-tools-marks";
import { InstalledCheck } from "./_components/installed-check.client";
import { ConsultHelp } from "./_components/consult-help.client";

export const dynamic = "force-dynamic";

export default async function DevToolsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const s = getAdminStrings(lang);
  const t = s.devTools;
  const page = s.pages["dev-tools"];

  const browserDoc = readLocalizedContent("devtool-browser-inside", lang);
  const installed = installedMap();

  const checkLabels = {
    label: t.checkLabel, done: t.checkDone, undone: t.checkUndone, failed: t.checkFailed,
  };

  return (
    <PageShell lang={lang} slug="dev-tools" s={s} title={page.title} hint={page.hint}>
      <p className="rounded-md border border-blue-500/30 bg-blue-500/5 p-2.5 text-[10px] leading-relaxed text-blue-700 dark:text-blue-300">
        {t.intro}
      </p>

      {/* Порядок: необязательное → нужное → без чего нельзя. */}
      <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">{t.orderNote}</p>

      {/* 1. Браузер у агента — первый жилец раздела. Карточка держит три вещи в
          одном порядке для любого будущего инструмента: что даёт, где границы,
          куда идти. */}
      <div className="mt-3 rounded-lg border border-border p-3.5">
        <p className="flex items-center gap-1.5 text-[12px] font-semibold text-foreground">
          <MonitorSmartphone size={13} className="shrink-0 text-primary" />
          {t.browserTitle}
        </p>

        <div className="mt-2 space-y-2 text-[11px] leading-relaxed text-muted-foreground">
          <p>{t.browserBody}</p>
          {/* Границы — отдельным абзацем и с рамкой: их читают реже всего, а
              стоят они дороже всего. Человек, ожидавший, что агент заведёт ему
              ключи Stripe, обязан узнать правду ЗДЕСЬ, а не после попытки. */}
          <p className="rounded-md border border-amber-500/30 bg-amber-500/[0.05] p-2.5 text-amber-900 dark:text-amber-100/80">
            {t.browserLimits}
          </p>
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <a
            href="https://claude.ai/chrome"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-[11px] font-medium text-foreground hover:border-foreground/30"
          >
            <ExternalLink size={11} />
            {t.browserInstall}
          </a>
          {browserDoc.ok && (
            <DocPopup label={t.browserDoc} title={t.browserDocTitle}>
              <GuideProse markdown={browserDoc.text} />
            </DocPopup>
          )}
        </div>

        <InstalledCheck tool="browser" initial={installed.browser} labels={checkLabels} />
      </div>

      {/* 2. Claude Code — тот, кто пишет код. Без него панель остаётся панелью:
          настройки есть, строить некому. */}
      <div className="mt-3 rounded-lg border border-border p-3.5">
        <p className="flex items-center gap-1.5 text-[12px] font-semibold text-foreground">
          <TerminalSquare size={13} className="shrink-0 text-primary" />
          {t.codeTitle}
        </p>

        <div className="mt-2 space-y-2 text-[11px] leading-relaxed text-muted-foreground">
          <p>{t.codeBody}</p>
          <p className="rounded-md border border-amber-500/30 bg-amber-500/[0.05] p-2.5 text-amber-900 dark:text-amber-100/80">
            {t.codeLimits}
          </p>
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <a
            href="https://claude.com/product/claude-code"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-[11px] font-medium text-foreground hover:border-foreground/30"
          >
            <ExternalLink size={11} />
            {t.codeInstall}
          </a>
        </div>

        <InstalledCheck tool="claude-code" initial={installed["claude-code"]} labels={checkLabels} />
      </div>

      {/* 3. Редактор — то, без чего нельзя: место, где виден проект целиком и
          куда встаёт агент. Стоит последним по решению владельца. */}
      <div className="mt-3 rounded-lg border border-border p-3.5">
        <p className="flex items-center gap-1.5 text-[12px] font-semibold text-foreground">
          <Code2 size={13} className="shrink-0 text-primary" />
          {t.editorTitle}
        </p>

        <div className="mt-2 space-y-2 text-[11px] leading-relaxed text-muted-foreground">
          <p>{t.editorBody}</p>
          <p className="rounded-md border border-amber-500/30 bg-amber-500/[0.05] p-2.5 text-amber-900 dark:text-amber-100/80">
            {t.editorLimits}
          </p>
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <a
            href="https://code.visualstudio.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-[11px] font-medium text-foreground hover:border-foreground/30"
          >
            <ExternalLink size={11} />
            {t.editorInstall}
          </a>
        </div>

        <InstalledCheck tool="editor" initial={installed.editor} labels={checkLabels} />
      </div>

      {/* 🔒 «МНЕ НУЖНА ПОМОЩЬ» — ЗАМЕР СПРОСА, А НЕ УКРАШЕНИЕ (владелец
          2026-08-14). Названия инструментов человеку ничего не говорят; не
          поняв их, он уходит молча, и мы не узнаём, что потеряли его именно
          здесь. Кнопка стоит ПОСЛЕ всех трёх карточек: до них она перебивала бы
          сами инструменты, а после — попадается ровно тому, кто дочитал и не
          понял. */}
      <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-border p-3">
        <ConsultHelp
          topic="dev-tools"
          labels={{
            action: t.helpAction, title: t.helpTitle, body: t.helpBody, free: t.helpFree,
            whatWeSend: t.helpWhatWeSend, cancel: t.helpCancel, send: t.helpSend,
            sending: t.helpSending, sent: t.helpSent, sentTo: t.helpSentTo,
            notSent: t.helpNotSent, emailAsk: t.helpEmailAsk, emailPlaceholder: t.helpEmailPlaceholder,
            close: t.helpClose, copy: t.helpCopy, copied: t.helpCopied,
            mailSubject: t.helpMailSubject, mailBody: t.helpMailBody,
          }}
        />
        <span className="text-[10px] leading-relaxed text-muted-foreground">{t.helpHint}</span>
      </div>

      <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">{t.growing}</p>
    </PageShell>
  );
}
