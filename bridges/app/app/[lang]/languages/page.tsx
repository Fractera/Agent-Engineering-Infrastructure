// Раздел «Языки» (шаг 501, Ф2, партия 17).
//
// Речь о языках САЙТА ВЛАДЕЛЬЦА (`NEXT_PUBLIC_SUPPORTED_LANGUAGES` слота), а НЕ о
// языках самой панели — те живут в адресе и в `config/translations/admin-languages.ts`.
// Два разных набора, и путать их нельзя: снять здесь язык — значит перестать
// собирать для него страницы сайта.
//
// Каталог из 84 языков разбирает СЕРВЕР и отдаёт готовыми строками; в браузер
// уезжают только отметки. Островок нужен ровно потому, что сохранение запускает
// пересборку на две-четыре минуты, и за ней надо следить.
//
// Динамическая: выбранный набор живой.

import { getAdminStrings } from "@/lib/i18n/admin-strings";
import { PageShell } from "../_components/page-shell";
import { HelpDetails } from "../_components/help-details";
import { readLanguages } from "./_lib/langs";
import { LangPicker } from "./_components/lang-picker.client";
import Link from "next/link";
import { BadgeCheck, AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function LanguagesPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const s = getAdminStrings(lang);
  const t = s.languages;
  const page = s.pages["languages"];

  const state = await readLanguages();

  if (!state.ok) {
    return (
      <PageShell lang={lang} slug="languages" s={s} title={page.title} hint={page.hint}>
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3">
          <p className="text-[12px] font-medium text-destructive">{t.unavailable}</p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell lang={lang} slug="languages" s={s} title={page.title} hint={page.hint}>
      {/* 🔒 ОРАНЖЕВАЯ ВРЕЗКА СТОИТ ПЕРВОЙ (владелец 2026-08-14).
          Свежий сервер приходит с готовым набором языков, и страницу проскакивают
          с мыслью «потом разберусь» — набор выглядит как отметки, а стоит как
          переводы всех страниц навсегда и умноженное время каждой сборки. Поэтому
          предупреждение попадается ДО списка из 84 отметок: увидевший список
          выбирает языки, а не решает, сколько их ему нужно. */}
      <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-2.5">
        <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
        <div className="space-y-1 text-[10px] leading-relaxed text-amber-800 dark:text-amber-200">
          <p className="text-[11px] font-semibold">{t.fewerTitle}</p>
          <p>{t.fewerBody}</p>
          <p>{t.fewerBuild}</p>
        </div>
      </div>

      <p className="mt-3 rounded-md border border-blue-500/30 bg-blue-500/5 p-2.5 text-[10px] leading-relaxed text-blue-700 dark:text-blue-300">
        {t.intro}
      </p>

      {/* 🔒 ОДНА СТРОКА ВМЕСТО ВРЕЗКИ (владелец 2026-08-13).
          Здесь стояла зелёная врезка «самое дорогое уже построено». Она выросла
          до пяти абзацев и пяти документов и переехала в свою вкладку — но её
          сила была НЕ в тексте, а в том, что она стояла на пути: человек приходил
          выбирать языки и наталкивался на неё, не ища. Ссылка сохраняет встречу;
          стоит ПЕРЕД списком по той же причине, что и врезка — увидевший сначала
          84 отметки выбирает языки, а не решает, нужна ли ему многоязычность. */}
      <div className="mt-3">
        <Link
          href={`/${lang}/visibility`}
          className="inline-flex items-center gap-1.5 text-[11px] font-medium text-primary hover:underline"
        >
          <BadgeCheck size={13} className="shrink-0" />
          {t.readyLink}
        </Link>
      </div>

      {/* Как работают языки в самом проекте — механизм, а не обещание. Стоит
          между врезкой и списком: это ответ на вопрос «а что изменится в моём
          сайте, если я отмечу второй язык», и задают его именно здесь. */}
      <div className="mt-3 rounded-md border border-border p-3">
        <p className="text-[11px] font-semibold text-foreground">{t.howTitle}</p>
        <div className="mt-1.5 space-y-2 text-[10px] leading-relaxed text-muted-foreground">
          <p><strong className="text-foreground">{t.howOneTitle}</strong> {t.howOne}</p>
          <p><strong className="text-foreground">{t.howManyTitle}</strong> {t.howMany}</p>
          <p><strong className="text-foreground">{t.howSwitchTitle}</strong> {t.howSwitch}</p>
          <p>{t.howLangAttr}</p>
        </div>
      </div>

      <div className="mt-3">
        <LangPicker
          byRegion={state.byRegion}
          selected={state.selected}
          defaultLanguage={state.defaultLanguage}
          confirmed={state.confirmed}
          labels={{
            save: t.save, saving: t.saving, rebuilding: t.rebuilding, saved: t.saved,
            rebuildStarted: t.rebuildStarted, rebuildDone: t.rebuildDone,
            rebuildFailed: t.rebuildFailed, busyBuild: t.busyBuild,
            failed: t.failed, nothingToSave: t.nothingToSave, atLeastOne: t.atLeastOne,
            keepThese: t.keepThese,
            defaultLabel: t.defaultLabel, makeDefault: t.makeDefault,
            selectedCount: t.selectedCount, tierHint: t.tierHint,
          }}
        />
      </div>

      <HelpDetails label={t.helpLabel}>
        <p><strong>{t.helpBuildTitle}</strong> {t.helpBuild}</p>
        <p><strong>{t.helpDefaultTitle}</strong> {t.helpDefault}</p>
        <p><strong>{t.helpEnglishTitle}</strong> {t.helpEnglish}</p>
        <p><strong>{t.helpCostTitle}</strong> {t.helpCost}</p>
      </HelpDetails>
    </PageShell>
  );
}
