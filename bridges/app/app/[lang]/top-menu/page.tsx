// Раздел «Верхнее меню» — настройка навигации гостевого приложения (:3000).
//
// Серверная страница: читает ветку `nav` и перечень публичных маршрутов слота,
// отдаёт их островку пропсами. Словарь остаётся серверным — 82 языка в браузер
// не уезжают (закон шага 501).
//
// 🔒 ДИНАМИЧЕСКАЯ РАДИ ШАПКИ, как и все страницы под этим макетом: шапка считает
// живое состояние (предупреждения, гейт кейсов, скрытые разделы), а у
// предрендеренной страницы макет запекается на сборке — то есть до того, как
// владелец что-либо настроил.
//
// 🔒 ЭТО НЕ ДЕЛАЕТ ДИНАМИЧЕСКИМ ГОСТЕВОЕ ПРИЛОЖЕНИЕ. Здесь панель, её канон
// статики не связывает; сайт остаётся статикой под ISR.

import { getAdminStrings } from "@/lib/i18n/admin-strings";
import { PageShell } from "../_components/page-shell";
import { TopMenuPanel } from "./_components/top-menu-panel.client";
import { readNav, readNavI18n, publicRouteTree } from "./_lib/server";
import { slotLanguages } from "@/lib/slot-languages";

export const dynamic = "force-dynamic";

export default async function TopMenuPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const s = getAdminStrings(lang);
  const page = s.pages["top-menu"];
  const t = s.topMenu;
  const slot = slotLanguages();

  return (
    <PageShell lang={lang} slug="top-menu" s={s} title={page.title} hint={page.hint}>
      <div className="mb-3 rounded-lg border border-blue-500/30 bg-blue-500/5 p-3 text-[11px] leading-relaxed text-blue-700 dark:text-blue-300">
        <p><strong>{t.whyTitle}</strong> {t.why}</p>
        <p className="mt-2"><strong>{t.liveTitle}</strong> {t.live}</p>
      </div>

      <TopMenuPanel
        initial={readNav()}
        tree={publicRouteTree()}
        langs={slot.langs}
        base={slot.base}
        initialI18n={readNavI18n()}
        labels={{
          candidates: t.candidates, add: t.add, empty: t.empty, dragHint: t.dragHint,
          labelPlaceholder: t.labelPlaceholder, makeChild: t.makeChild, makeTop: t.makeTop,
          remove: t.remove, save: t.save, saving: t.saving, savedNow: t.savedNow,
          savedLater: t.savedLater, failed: t.failed, already: t.already, folderOnly: t.folderOnly,
          authSide: t.authSide, authLeft: t.authLeft, authRight: t.authRight,
          baseLang: t.baseLang, translated: t.translated, notTranslated: t.notTranslated,
          langHint: t.langHint,
        }}
      />
    </PageShell>
  );
}
