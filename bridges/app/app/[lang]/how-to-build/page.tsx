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
// по-прежнему ноль.

import { getAdminStrings } from "@/lib/i18n/admin-strings";
import { PageShell } from "../_components/page-shell";
import { readGuide } from "./_lib/guide";
import { GuideProse } from "./_components/guide-prose";
import { FirstRunNote } from "./_components/first-run-note.client";

export const revalidate = 300;

export default async function HowToBuildPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const s = getAdminStrings(lang);
  const page = s.pages["how-to-build"];
  const guide = readGuide();

  return (
    <PageShell title={page.title} hint={page.hint}>
      <FirstRunNote title={s.howToBuild.welcomeTitle} body={s.howToBuild.welcomeBody} />

      {guide.ok ? (
        <GuideProse markdown={guide.markdown} />
      ) : (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3">
          <p className="text-[12px] font-medium text-destructive">{s.howToBuild.missing}</p>
          <p className="mt-1 break-all font-mono text-[10px] text-muted-foreground">{guide.path}</p>
        </div>
      )}
    </PageShell>
  );
}
