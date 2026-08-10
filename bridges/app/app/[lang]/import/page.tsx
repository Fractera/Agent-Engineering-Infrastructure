// Раздел «Загрузка данных» (шаг 501, Ф2, партия 8).
//
// Статическая: здесь нет ничего живого до того, как человек выберет файл. Вся
// работа — в островке, и он неизбежен: архив сначала осматривается на сервере, и
// только после подтверждения частей что-то пишется. Этот порядок сохранён
// дословно из старой панели, потому что это единственная поверхность, где ошибка
// не правится обратно.

import { getAdminStrings } from "@/lib/i18n/admin-strings";
import { PageShell } from "../_components/page-shell";
import { HelpDetails } from "../_components/help-details";
import { RestoreForm } from "./_components/restore-form.client";

// 🔒 ДИНАМИЧЕСКАЯ НЕ РАДИ САМОЙ СТРАНИЦЫ, А РАДИ ШАПКИ (2026-08-11).
// Шапка живёт в общем макете и считает ЖИВОЕ состояние: область предупреждений,
// гейт кейсов, набор выключенных разделов. У статически предрендеренной страницы
// макет запекается на сборке вместе с шапкой — а сборка идёт ДО того, как
// владелец что-либо настроил. Поэтому «нет своего домена» горело в меню и после
// того, как домен был подключён и HTTPS работал: страница показывала снимок,
// сделанный на сборке. Любая новая страница под этим макетом обязана быть
// динамической по той же причине.
export const dynamic = "force-dynamic";

export default async function ImportPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const s = getAdminStrings(lang);
  const b = s.backup;

  return (
    <PageShell lang={lang} slug="import" s={s} title={s.pages.import.title} hint={s.pages.import.hint}>
      <RestoreForm
        labels={{
          choose: b.choose, chooseAnother: b.chooseAnother, reading: b.reading,
          nothingYet: b.nothingYet, unrecognised: b.unrecognised,
          createdAt: b.createdAt, selected: b.selected,
          restore: b.restore, restoring: b.restoring,
          restored: b.restored, nothingNeeded: b.nothingNeeded, failed: b.failed,
          effects: b.effects,
        }}
      />

      <HelpDetails label={b.helpImportLabel}>
        <p><strong>{b.helpAddsTitle}</strong> {b.helpAdds}</p>
        <p><strong>{b.helpReplacesTitle}</strong> {b.helpReplaces}</p>
        <p><strong>{b.helpOrderTitle}</strong> {b.helpOrder}</p>
      </HelpDetails>
    </PageShell>
  );
}
