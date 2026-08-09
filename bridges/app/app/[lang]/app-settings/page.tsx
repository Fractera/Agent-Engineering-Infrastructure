// Раздел «Настройки приложения» (шаг 501, Ф2, партия 16).
//
// Настройки живут в `APP-CONFIG/app-config.json` НА СЕРВЕРЕ, вне репозитория:
// приложение читает файл на запрос, поэтому сохранение видно на следующей загрузке
// страницы, без развёртывания.
//
// Два решения владельца от 2026-08-09:
//   • три мёртвых поля убраны (брендинг и картинки чата Hermes, снесённого задачей 3
//     шага 500) — проверено грепом, потребителей ноль;
//   • пять полей стали ЯЗЫКОВЫМИ, потому что гость отдавал одну мету на все языки.
//
// Динамическая: значения живые.

import { getAdminStrings } from "@/lib/i18n/admin-strings";
import { PageShell } from "../_components/page-shell";
import { HelpDetails } from "../_components/help-details";
import { readSettings } from "./_lib/settings";
import { SettingsEditor } from "./_components/settings-editor.client";

export const dynamic = "force-dynamic";

export default async function AppSettingsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const s = getAdminStrings(lang);
  const a = s.appSettings;

  const state = await readSettings();

  if (!state.ok) {
    return (
      <PageShell lang={lang} slug="app-settings" s={s} title={s.pages["app-settings"].title} hint={s.pages["app-settings"].hint}>
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3">
          <p className="text-[12px] font-medium text-destructive">{a.unavailable}</p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell lang={lang} slug="app-settings" s={s} title={s.pages["app-settings"].title} hint={s.pages["app-settings"].hint}>
      <p className="rounded-md border border-blue-500/30 bg-blue-500/5 p-2.5 text-[10px] leading-relaxed text-blue-700 dark:text-blue-300">
        {a.intro}
      </p>

      <div className="mt-3">
        <SettingsEditor
          initial={state.config}
          slotLangs={state.slotLangs}
          slotDefault={state.slotDefault}
          labels={{
            save: a.save, saving: a.saving, saved: a.saved,
            failed: a.failed, nothingToSave: a.nothingToSave,
            perLangHint: a.perLangHint, translated: a.translated,
            notTranslated: a.notTranslated, baseLang: a.baseLang,
          }}
        />
      </div>

      <HelpDetails label={a.helpLabel}>
        <p><strong>{a.helpWhereTitle}</strong> {a.helpWhere}</p>
        <p><strong>{a.helpNoDeployTitle}</strong> {a.helpNoDeploy}</p>
        <p><strong>{a.helpLangTitle}</strong> {a.helpLang}</p>
        <p><strong>{a.helpAgentTitle}</strong> {a.helpAgent}</p>
      </HelpDetails>
    </PageShell>
  );
}
