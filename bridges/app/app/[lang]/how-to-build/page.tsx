// Раздел «Как построить этот проект» — первая настоящая поверхность, переехавшая
// со старой оболочки на страницу (шаг 501, Ф2).
//
// Что делает страница: читает руководство с диска на СЕРВЕРЕ, отдаёт готовый
// HTML. Ни запроса к API, ни состояния «загружается», ни библиотеки разбора
// markdown в браузере. Текст читается при выключенном JS.
//
// ISR вместо чистой статики — намеренно. Старая панель читала файл на каждом
// открытии, поэтому правку формулировки было видно после перезагрузки, без
// пересборки. Запекание на сборке отняло бы это свойство. `revalidate` сохраняет
// его, оставаясь статикой: страница отдаётся из кеша, а не рендерится на каждый
// запрос. Пять минут — компромисс: правку видно почти сразу, работы на запрос
// по-прежнему ноль. То же касается ПЕРЕВОДА руководства: положить
// `_content/how-to-build.<lang>.md` — и он появится сам, без пересборки.

import { getAdminStrings } from "@/lib/i18n/admin-strings";
import { PageShell } from "../_components/page-shell";
import { readGuide } from "./_lib/guide";
import { GuideProse } from "./_components/guide-prose";
import { FirstRunNote } from "./_components/first-run-note.client";
import { PlatformChangeRequest } from "./_components/platform-change-request.client";
import { publicAppUrl } from "@/lib/public-app-url";
import { fill } from "@/lib/i18n/admin-strings";

export const revalidate = 300;

// 🔒 ДИНАМИЧЕСКАЯ НЕ РАДИ САМОЙ СТРАНИЦЫ, А РАДИ ШАПКИ (2026-08-11).
// Шапка живёт в общем макете и считает ЖИВОЕ состояние: область предупреждений,
// гейт кейсов, набор выключенных разделов. У статически предрендеренной страницы
// макет запекается на сборке вместе с шапкой — а сборка идёт ДО того, как
// владелец что-либо настроил. Поэтому «нет своего домена» горело в меню и после
// того, как домен был подключён и HTTPS работал: страница показывала снимок,
// сделанный на сборке. Любая новая страница под этим макетом обязана быть
// динамической по той же причине.
export const dynamic = "force-dynamic";

export default async function HowToBuildPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const s = getAdminStrings(lang);
  const page = s.pages["how-to-build"];
  const guide = readGuide(lang);

  // Адрес сервера подставляется в письмо на СЕРВЕРЕ: партнёру не нужно вспоминать
  // свой IP, а нам этот адрес — единственное, что требуется во вводном письме.
  // Тот же источник, что у канонических адресов сайта, поэтому в письме окажется
  // домен, когда он подключён, и IP, пока нет.
  const address = publicAppUrl().url;
  const change = {
    title: s.howToBuild.changeTitle,
    body: s.howToBuild.changeBody,
    button: s.howToBuild.changeButton,
    copied: s.howToBuild.changeCopied,
    hint: s.howToBuild.changeMailHint,
    mailSubject: s.howToBuild.changeMailSubject,
    mailBody: fill(s.howToBuild.changeMailBody, { address }),
  };

  return (
    <PageShell lang={lang} slug="how-to-build" s={s} title={page.title} hint={page.hint}>
      <FirstRunNote title={s.howToBuild.welcomeTitle} body={s.howToBuild.welcomeBody} />

      {guide.ok ? (
        <>
          {/* Честность вместо вида, будто всё переведено: текст на другом языке
              называет себя сам. Полоса исчезает в тот момент, когда в `_content/`
              появляется файл на языке страницы. */}
          {guide.isFallback && (
            <p className="mb-4 rounded-md border border-dashed border-border px-3 py-2 text-[11px] text-muted-foreground/80">
              {s.content.englishFallback}
            </p>
          )}
          <GuideProse markdown={guide.markdown} />
        </>
      ) : (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3">
          <p className="text-[12px] font-medium text-destructive">{s.howToBuild.missing}</p>
          <ul className="mt-1 space-y-0.5 font-mono text-[10px] text-muted-foreground">
            {guide.tried.map((p) => <li key={p} className="break-all">{p}</li>)}
          </ul>
        </div>
      )}
      <PlatformChangeRequest ui={change} to="admin@fractera.ai" />
    </PageShell>
  );
}
