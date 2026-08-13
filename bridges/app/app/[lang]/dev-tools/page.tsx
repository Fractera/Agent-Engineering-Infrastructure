// Раздел «Инструменты разработки» (владелец 2026-08-13).
//
// 🔒 НЕ ПУТАТЬ С ГРУППОЙ «ИНСТРУМЕНТЫ». Та — про готовые куски, которые едут
// ВНУТРЬ продукта: обрезка изображения, голосовой ввод, просмотр кода. Здесь —
// про то, чем проект СТРОЯТ: эти инструменты живут на машине разработчика и до
// посетителя не доходят никогда. Смешать их значит однажды предложить клиенту
// поставить себе в сайт браузерное расширение.
//
// 🔒 СПИСОК РАСТЁТ ТОЛЬКО ПРОВЕРЕННЫМ. Владелец назвал раздел местом, куда будут
// добавляться инструменты, «которые реально практически решают задачи». Поэтому
// здесь нет и не будет списка «планируется»: обещание инструмента, которого ещё
// нет, продаёт несуществующее, а первым это заметит покупатель.
//
// Статическая по природе: страница ничего не спрашивает у сервера. Динамику
// добавит первый инструмент, чьё состояние надо показывать живым.

import { ExternalLink, MonitorSmartphone } from "lucide-react";
import { getAdminStrings } from "@/lib/i18n/admin-strings";
import { PageShell } from "../_components/page-shell";
import { DocPopup } from "../_components/doc-popup.client";
import { GuideProse } from "../how-to-build/_components/guide-prose";
import { readLocalizedContent } from "@/lib/content/localized-content";

export default async function DevToolsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const s = getAdminStrings(lang);
  const t = s.devTools;
  const page = s.pages["dev-tools"];

  const browserDoc = readLocalizedContent("devtool-browser-inside", lang);

  return (
    <PageShell lang={lang} slug="dev-tools" s={s} title={page.title} hint={page.hint}>
      <p className="rounded-md border border-blue-500/30 bg-blue-500/5 p-2.5 text-[10px] leading-relaxed text-blue-700 dark:text-blue-300">
        {t.intro}
      </p>

      {/* Первый жилец раздела. Карточка держит три вещи в одном порядке для
          любого будущего инструмента: что даёт, где его границы, куда идти. */}
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
      </div>

      <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">{t.growing}</p>
    </PageShell>
  );
}
