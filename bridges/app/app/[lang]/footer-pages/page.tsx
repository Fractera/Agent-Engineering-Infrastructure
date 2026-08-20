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

import Link from "next/link";
import { ArrowRight, Hammer } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { getAdminStrings } from "@/lib/i18n/admin-strings";
import { PageShell } from "../_components/page-shell";
import { NavEditor } from "../_components/nav/nav-editor.client";
import { readNav, readNavI18n, groupRouteTree, slotFooterDefaults } from "@/lib/nav-editor/server";
import { slotLanguages } from "@/lib/slot-languages";

export const dynamic = "force-dynamic";

export default async function FooterPagesPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const s = getAdminStrings(lang);
  const page = s.pages["footer-pages"];
  const t = s.footerPages;
  const slot = slotLanguages();

  // 🔒 ПАНЕЛЬ ПОКАЗЫВАЕТ ТО, ЧТО ВИДИТ ПОСЕТИТЕЛЬ, А НЕ СВОЙ КОНФИГ (шаг 526).
  // Владелец конструктора не открывал — ветки `nav.footer` нет, и сайт рисует
  // умолчания шаблона. Панель до этого показывала «Ссылок пока нет» при живых
  // ссылках внизу сайта: раздел предлагал управлять пустотой и терял смысл.
  // Теперь правая колонка начинается с того же списка и в том же порядке;
  // первое же сохранение делает его собственным списком владельца.
  const nav = readNav("footer");
  const initial = nav.configured ? nav : { ...nav, items: slotFooterDefaults() };

  return (
    <PageShell lang={lang} slug="footer-pages" s={s} title={page.title} hint={page.hint}>
      <div className="mb-3 rounded-lg border border-blue-500/30 bg-blue-500/5 p-3 text-[11px] leading-relaxed text-blue-700 dark:text-blue-300">
        <p><strong>{t.whyTitle}</strong> {t.why}</p>
        <p className="mt-2"><strong>{t.contentTitle}</strong> {t.content}</p>
      </div>

      {/* 🔒 ОРАНЖЕВАЯ КАРТОЧКА — ГРАНИЦА ПРОДУКТА, А НЕ НЕДОДЕЛКА (шаг 524).
          Раздел расставляет ссылки, но СОЗДАТЬ страницу не может: её текст живёт
          в проекте, рядом с ней самой. Пока это не сказано словами, пустой левый
          список читается как поломка панели — владелец ищет кнопку «добавить
          страницу», не находит и уходит.

          Стоит ВСЕГДА, а не только при пустом списке: построить страницу отсюда
          нельзя никогда, а совет, исчезающий после первой ссылки, пропадает
          ровно тогда, когда владелец вошёл во вкус.

          Серверная и без состояния — читается при выключенном JavaScript.
          Ссылки оформлены КНОПКОЙ, но остаются ссылками: примитив кнопки этой
          панели подмены элемента не умеет (разбор — в диалоге следующих шагов
          продуктов, products/_components/next-steps-dialog.client.tsx). */}
      <div className="mb-3 rounded-md border border-amber-500/30 bg-amber-500/5 p-2.5 text-[11px] leading-relaxed text-amber-700 dark:text-amber-300">
        <p className="flex items-center gap-1.5 font-medium">
          <Hammer size={12} className="shrink-0" />
          {t.buildTitle}
        </p>
        <p className="mt-1">{t.buildBody}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Link
            href={`/${lang}/github`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "text-[11px]")}
          >
            {t.buildToGithub}<ArrowRight size={11} />
          </Link>
          <Link
            href={`/${lang}/env`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "text-[11px]")}
          >
            {t.buildToEnv}<ArrowRight size={11} />
          </Link>
        </div>
      </div>

      <NavEditor
        slot="footer"
        initial={initial}
        tree={groupRouteTree("footerPages")}
        canDeletePages
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
          hideTitle: s.topMenu.hideTitle, hideDialogTitle: s.topMenu.hideDialogTitle,
          hideDialogBody: s.topMenu.hideDialogBody, hideConfirm: s.topMenu.hideConfirm,
          deleteTitle: s.topMenu.deleteTitle, deleteDialogTitle: s.topMenu.deleteDialogTitle,
          deleteDialogBody: s.topMenu.deleteDialogBody, deleteConfirm: s.topMenu.deleteConfirm,
          deleteRebuild: s.topMenu.deleteRebuild, deleteDone: s.topMenu.deleteDone,
          deleteFailed: s.topMenu.deleteFailed, cancel: s.topMenu.cancel,
          translations: s.translationsTool,
        }}
      />
    </PageShell>
  );
}
