// Режим разработки — как ведётся работа над этим проектом (2026-08-18).
//
// 🔒 ЗАЧЕМ ЭТО НАСТРОЙКА, А НЕ ФРАЗА В РАЗГОВОРЕ. Режим обязан пережить сессию:
// агент читает его на старте, и сказанное вчера в чате до сегодняшнего окна не
// доезжает. Поэтому значение живёт в `PLATFORM-CONFIG` рядом с выключателями
// возможностей и набором документов — там же, откуда агент берёт остальное
// состояние проекта.
//
// 🔒 ЧТО РЕЖИМ МЕНЯЕТ, А ЧТО НЕТ. Он решает ровно одно: обязателен ли кейс и шаг
// перед работой. Технические законы — статика публичных страниц, лимиты,
// переводы, чтение настроек из конфигов — действуют во всех трёх режимах.
// Иначе это были бы не законы, а пожелания, и «классический» означал бы
// «разрешено сломать», чего никто не заказывал.
//
// Динамическая: значение живое, его меняет островок ниже.

import { getAdminStrings } from "@/lib/i18n/admin-strings";
import { adminHref } from "@/lib/admin-nav";
import { PageShell } from "../_components/page-shell";
import { HelpDetails } from "../_components/help-details";
import { readFeatures } from "@/lib/platform-features";
import { ModePicker } from "./_components/mode-picker.client";
import { developmentModeOf, type DevelopmentMode } from "@/lib/development-mode";

export const dynamic = "force-dynamic";

export default async function DevelopmentModePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const s = getAdminStrings(lang);
  const m = s.developmentMode;
  const page = s.pages["development-mode"];

  // Тот же читатель, что у возможностей: он уже отдаёт весь конфиг целиком, а
  // писать надо целиком — иначе соседние ключи стёрлись бы.
  const { ok, config } = readFeatures();
  // Умолчание и проверка значения — в общем модуле: страница и островок обязаны
  // понимать режим одинаково.
  const initial: DevelopmentMode = developmentModeOf(config);

  return (
    <PageShell lang={lang} slug="development-mode" s={s} title={page.title} hint={page.hint}>
      {!ok ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3">
          <p className="text-[12px] font-medium text-destructive">{m.unavailable}</p>
        </div>
      ) : (
        <>
          <p className="mb-3 text-[11px] leading-relaxed text-muted-foreground">{m.lead}</p>

          <ModePicker
            config={config}
            initial={initial}
            labels={{
              save: m.save, saving: m.saving, saved: m.savedNotice, failed: m.failed,
              nothingToSave: m.nothingToSave, current: m.current,
              // Бейджи собираются ЗДЕСЬ, а не в островке: их состав — редакторское
              // решение, и место ему рядом со словами. У классического режима их
              // нет вовсе — он ничего не требует ни от модели, ни от документов.
              items: {
                classic: { label: m.classicLabel, description: m.classicBody, when: m.classicWhen, badges: [] },
                steps: {
                  label: m.stepsLabel, description: m.stepsBody, when: m.stepsWhen,
                  badges: [m.stepsBadgeModel],
                },
                cases: {
                  label: m.casesLabel, description: m.casesBody, when: m.casesWhen,
                  badges: [m.casesBadgeModel, m.casesBadgeWorkflows],
                },
              },
              // Адреса строит сервер: язык знает он, и `adminHref` — та же
              // функция, которой пользуются меню и хлебные крошки.
              cases: {
                productsHref: adminHref(lang, "products"),
                productsLabel: m.casesToProducts,
                workflowsHref: adminHref(lang, "doc-dynamic-workflows"),
                workflowsLabel: m.casesToWorkflows,
                openHint: m.casesOpenHint,
              },
            }}
          />

          <p className="mt-4 rounded-md border border-amber-500/30 bg-amber-500/5 p-2.5 text-[11px] leading-relaxed text-amber-800 dark:text-amber-200">
            <strong>{m.lawTitle}</strong> {m.law}
          </p>
        </>
      )}

      <HelpDetails label={m.helpLabel}>
        <p><strong>{m.helpWhereTitle}</strong> {m.helpWhere}</p>
        <p><strong>{m.helpCostTitle}</strong> {m.helpCost}</p>
      </HelpDetails>
    </PageShell>
  );
}
