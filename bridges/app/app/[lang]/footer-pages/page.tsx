// Раздел «Страницы подвала» — ссылки внизу гостевого приложения (:3000).
//
// 🔒 ТОТ ЖЕ РЕДАКТОР, ЧТО У ВЕРХНЕГО МЕНЮ, и это главное решение раздела. Оба
// экрана обязаны вести себя одинаково: перетаскивание, группы, полоса языков,
// перевод подписи. Копия разошлась бы с оригиналом на первой правке — и
// разошлась бы незаметно, потому что смотрят на них в разное время.
//
// 🔒 ДЕРЕВО СУЖЕНО ДО ГРУППЫ `(footerPages)` (владелец, 2026-08-12). В подвал
// идут страницы подвала, а не весь сайт: показывать здесь каталог и посты блога
// значит заставить человека искать три нужные строки среди десятков посторонних.
//
// 🔒 СТОРОНЫ ЯЩИКА ЗДЕСЬ НЕТ. Это настройка аккаунта, она живёт у верхнего меню;
// повторить её на втором экране значит завести два места для одного значения.

import { getAdminStrings } from "@/lib/i18n/admin-strings";
import { PageShell } from "../_components/page-shell";
import { NavEditor } from "../_components/nav/nav-editor.client";
import { readNav, readNavI18n, groupRouteTree } from "@/lib/nav-editor/server";
import { slotLanguages } from "@/lib/slot-languages";

export const dynamic = "force-dynamic";

export default async function FooterPagesPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const s = getAdminStrings(lang);
  const page = s.pages["footer-pages"];
  const t = s.footerPages;
  const slot = slotLanguages();

  return (
    <PageShell lang={lang} slug="footer-pages" s={s} title={page.title} hint={page.hint}>
      <div className="mb-3 rounded-lg border border-blue-500/30 bg-blue-500/5 p-3 text-[11px] leading-relaxed text-blue-700 dark:text-blue-300">
        <p><strong>{t.whyTitle}</strong> {t.why}</p>
        <p className="mt-2"><strong>{t.contentTitle}</strong> {t.content}</p>
      </div>

      <NavEditor
        slot="footer"
        initial={readNav("footer")}
        tree={groupRouteTree("footerPages")}
        langs={slot.langs}
        base={slot.base}
        initialI18n={readNavI18n()}
        labels={{
          candidates: t.candidates, add: s.topMenu.add, empty: t.empty, dragHint: s.topMenu.dragHint,
          labelPlaceholder: s.topMenu.labelPlaceholder, makeChild: s.topMenu.makeChild,
          makeTop: s.topMenu.makeTop, remove: s.topMenu.remove,
          save: s.topMenu.save, saving: s.topMenu.saving, savedNow: s.topMenu.savedNow,
          savedLater: s.topMenu.savedLater, failed: s.topMenu.failed,
          already: s.topMenu.already, folderOnly: s.topMenu.folderOnly,
          labelLimit: s.topMenu.labelLimit, translateOne: s.topMenu.translateOne,
          trDone: s.topMenu.trDone, trFailed: s.topMenu.trFailed, trNoKey: s.topMenu.trNoKey,
          authSide: s.topMenu.authSide, authLeft: s.topMenu.authLeft, authRight: s.topMenu.authRight,
          baseLang: s.topMenu.baseLang, translated: s.topMenu.translated,
          notTranslated: s.topMenu.notTranslated, langHint: s.topMenu.langHint,
        }}
      />
    </PageShell>
  );
}
