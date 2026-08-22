// Переезд на Fractera — откуда берётся чужой проект (шаг 533-2).
//
// 🔒 ЗДЕСЬ ХРАНИТСЯ РЕШЕНИЕ, А НЕ ЧУЖОЙ КОД. Страница записывает в
// `PLATFORM-CONFIG` ровно две вещи: каким способом владелец отдаёт свой проект и
// его адрес, если способ — репозиторий. Сам разбор делает агент, читая эту
// запись на старте сессии. Панель чужой код не скачивает и не запускает: она
// поверхность решений, а не среда исполнения.
//
// 🔒 ТОКЕНА НЕТ И НЕ БУДЕТ. На время переезда репозиторий держат открытым — это
// сказано и на публичной странице. Секрет, лежащий в конфиге, который читает
// приложение, был бы секретом только на вид.
//
// Динамическая: значение живое, его меняет островок ниже.

import Link from "next/link";
import { getAdminStrings } from "@/lib/i18n/admin-strings";
import { adminHref } from "@/lib/admin-nav";
import { PageShell } from "../_components/page-shell";
import { HelpDetails } from "../_components/help-details";
import { readFeatures } from "@/lib/platform-features";
import { migrationOpen } from "@/lib/development-mode";

export const dynamic = "force-dynamic";

import { MigrationSource, type MigrationRecord } from "./_components/migration-source.client";

export default async function MigrationPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const s = getAdminStrings(lang);
  const m = s.migration;
  const page = s.pages.migration;

  const { ok, config } = readFeatures();
  const saved = (config.migration ?? {}) as MigrationRecord;

  return (
    <PageShell lang={lang} slug="migration" s={s} title={page.title} hint={page.hint}>
      {!ok ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3">
          <p className="text-[12px] font-medium text-destructive">{m.unavailable}</p>
        </div>
      ) : (
        <>
          {/* 🔒 РЕЖИМ ВЫКЛЮЧЕН — ЭТО РАЗВИЛКА, А НЕ ЗАПЕРТАЯ ДВЕРЬ. Страница
              спрятана из меню, пока режим не включён, но по прямому адресу сюда
              приходят — и увидеть пустую форму хуже, чем узнать, чего не хватает
              и где это включается. Форма ниже остаётся рабочей: назвать источник
              заранее не вредно, вредно молчать о том, что режим не выбран. */}
          {!migrationOpen(config) && (
            <div className="mb-3 rounded-lg border border-amber-500/40 bg-amber-500/5 p-3">
              <p className="text-[12px] font-medium text-amber-800 dark:text-amber-200">{m.modeOffTitle}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-amber-800/90 dark:text-amber-200/90">{m.modeOffBody}</p>
              <Link
                href={adminHref(lang, "development-mode")}
                className="mt-2 inline-flex h-7 items-center rounded-md bg-amber-600 px-2.5 text-[11px] font-medium text-white transition-colors hover:bg-amber-700"
              >
                {m.modeOffCta}
              </Link>
            </div>
          )}

          <p className="mb-3 text-[11px] leading-relaxed text-muted-foreground">{m.lead}</p>

          <MigrationSource
            config={config}
            initial={saved}
            labels={{
              save: m.save, saving: m.saving, saved: m.savedNotice, failed: m.failed,
              nothingToSave: m.nothingToSave, invalidUrl: m.invalidUrl,
              repoLabel: m.repoLabel, repoBody: m.repoBody,
              repoField: m.repoField, repoPlaceholder: m.repoPlaceholder, repoHint: m.repoHint,
              localLabel: m.localLabel, localBody: m.localBody, localHint: m.localHint,
              localField: m.localField, localPlaceholder: m.localPlaceholder,
            }}
          />

          <div className="mt-4 rounded-md border border-sky-500/30 bg-sky-500/5 p-2.5">
            <p className="text-[11px] font-medium text-sky-800 dark:text-sky-200">{m.nextTitle}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-sky-800/90 dark:text-sky-200/90">{m.next}</p>
          </div>

          <p className="mt-3 rounded-md border border-border bg-muted/40 p-2.5 text-[11px] leading-relaxed text-muted-foreground">
            <strong className="text-foreground">{m.boundaryTitle}</strong> {m.boundary}
          </p>
        </>
      )}

      <HelpDetails label={m.helpLabel}>
        <p><strong>{m.helpWhereTitle}</strong> {m.helpWhere}</p>
        <p><strong>{m.helpOrderTitle}</strong> {m.helpOrder}</p>
      </HelpDetails>
    </PageShell>
  );
}
