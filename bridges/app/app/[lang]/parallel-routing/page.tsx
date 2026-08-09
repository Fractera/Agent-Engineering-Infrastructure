// Раздел «Параллельная маршрутизация» (шаг 501, Ф2, партия 18).
//
// Перенос ОДИН В ОДИН: поведение старой панели сохранено целиком — главный
// переключатель, восемь областей, живой чертёж, каскад центра, замок на шапке и
// подвале, сохранение всего конфига.
//
// Что изменилось против панели: начальное состояние читает СЕРВЕР и отдаёт
// пропсами, поэтому сохранённая раскладка видна сразу, без пустого экрана и без
// круга по сети за собственными настройками. Подписи областей тоже приезжают с
// сервера — словарь панели серверный (закон шага 501).
//
// Динамическая: значения живые.

import { getAdminStrings } from "@/lib/i18n/admin-strings";
import { PageShell } from "../_components/page-shell";
import { HelpDetails } from "../_components/help-details";
import { readPlatform } from "./_lib/platform";
import { SlotPicker } from "./_components/slot-picker.client";

export const dynamic = "force-dynamic";

export default async function ParallelRoutingPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const s = getAdminStrings(lang);
  const t = s.parallelRouting;
  const page = s.pages["parallel-routing"];

  const state = readPlatform();

  if (!state.ok) {
    return (
      <PageShell title={page.title} hint={page.hint}>
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3">
          <p className="text-[12px] font-medium text-destructive">{t.unavailable}</p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell title={page.title} hint={page.hint}>
      {/* Правда о состоянии стоит ВЫШЕ управления, а не в справке под ним:
          человек должен узнать, что экран не изменится, до того как нажмёт
          «Сохранить», а не после. */}
      <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-2.5 text-[10px] leading-relaxed text-amber-800 dark:text-amber-200">
        {t.notConsumed}
      </p>

      {/* Последствие включения — не деталь справки, а то, что человек обязан
          знать ДО выбора: содержимое обычной маршрутизации переезжает в центр, и
          элементы поверх страницы могут потребовать настройки. */}
      <p className="mt-2 rounded-md border border-blue-500/30 bg-blue-500/5 p-2.5 text-[10px] leading-relaxed text-blue-700 dark:text-blue-300">
        {t.movesChildren}
      </p>

      <p className="mt-2 rounded-md border border-border bg-muted/40 p-2.5 text-[10px] leading-relaxed text-muted-foreground">
        {t.intro}
      </p>

      <div className="mt-3">
        <SlotPicker
          config={state.config}
          initialRouting={state.mode === "parallel"}
          initialActive={state.active}
          labels={{
            useParallel: t.useParallel, comingSoon: t.comingSoon,
            activeSlots: t.activeSlots, required: t.required,
            save: t.save, saving: t.saving, saved: t.saved,
            failed: t.failed, nothingToSave: t.nothingToSave,
            appliesOnLoad: t.appliesOnLoad, routingOff: t.routingOff,
            childrenLabel: t.childrenLabel, slots: t.slots,
          }}
        />
      </div>

      <HelpDetails label={t.helpLabel}>
        <p><strong>{t.helpFormatTitle}</strong> {t.helpFormat}</p>
        <p><strong>{t.helpWhatTitle}</strong> {t.helpWhat}</p>
        <p><strong>{t.helpShopTitle}</strong> {t.helpShop}</p>
        <p><strong>{t.helpVsComponentsTitle}</strong> {t.helpVsComponents}</p>
        <p><strong>{t.helpStaticTitle}</strong> {t.helpStatic}</p>
        <p><strong>{t.helpFamiliarTitle}</strong> {t.helpFamiliar}</p>
      </HelpDetails>
    </PageShell>
  );
}
