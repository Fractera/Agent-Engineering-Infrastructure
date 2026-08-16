// Холст покоя нового слоя панели (шаг 501). То, что видно по адресу `/en`.

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getAdminStrings } from "@/lib/i18n/admin-strings";
import { NAV_GROUPS, NAV_BY_GROUP, GROUP_INDEX, adminHref, type AdminPageSlug } from "@/lib/admin-nav";
import { collectWarnings, warningsBySlug } from "@/lib/admin-warnings";
import { PageShell } from "./_components/page-shell";

// 🔒 ДИНАМИЧЕСКАЯ НЕ РАДИ САМОЙ СТРАНИЦЫ, А РАДИ ШАПКИ (2026-08-11).
// Шапка живёт в общем макете и считает ЖИВОЕ состояние: область предупреждений,
// гейт кейсов, набор выключенных разделов. У статически предрендеренной страницы
// макет запекается на сборке вместе с шапкой — а сборка идёт ДО того, как
// владелец что-либо настроил. Поэтому «нет своего домена» горело в меню и после
// того, как домен был подключён и HTTPS работал: страница показывала снимок,
// сделанный на сборке. Любая новая страница под этим макетом обязана быть
// динамической по той же причине.
export const dynamic = "force-dynamic";

export default async function AdminHomePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const s = getAdminStrings(lang);

  // 🔴 ТА ЖЕ ТРЕВОГА, ЧТО В МЕНЮ (владелец 2026-08-15). Дерево на этой странице —
  // тот же список разделов, и человек, прочитавший область «Прежде чем начинать»,
  // ищет нужный раздел именно здесь. Пока цвет обрывался на области, дерево
  // показывало сорок одинаковых строк и заставляло вспоминать названия.
  //
  // Считается своим вызовом, а не пропсом из макета, и это не второй источник
  // правды: функция читает те же файлы на диске, что и шапка, и страница уже
  // динамическая — снимка сборки здесь не бывает.
  const warnings = collectWarnings();
  const alarms = warningsBySlug(warnings);

  // 🔒 ОЧЕРЕДНОЙ ШАГ — ТОТ ЖЕ, ЧТО В ПОДВАЛЕ, И ЭТО ОДНА СТРОКА КОДА, А НЕ
  // СОВПАДЕНИЕ (владелец 2026-08-16). Подвал показывает `warnings[0]` большой
  // кнопкой; карточка первого экрана показывает ЕГО ЖЕ. Список уже отсортирован
  // в `collectWarnings()` — сначала красные, потом оранжевые, — и заводить
  // здесь второй порядок нельзя: карточка и подвал разошлись бы в том, что
  // считать следующим шагом, а человек читает их одновременно.
  const next = warnings[0] ?? null;

  // Цвет тревоги. Один и тот же набор классов на карту группы и на её дочерние —
  // иначе одно требование выглядело бы в дереве двумя разными оттенками.
  const alarmClass = (slug: AdminPageSlug) => {
    const a = alarms.get(slug);
    if (!a) return null;
    return {
      title: a.ids.map((id) => s.warnings.items[id]).join("\n"),
      className: a.level === "blocking"
        ? "font-medium text-red-600 hover:text-red-700 dark:text-red-400"
        : "font-medium text-amber-600 hover:text-amber-700 dark:text-amber-400",
    };
  };

  return (
    <PageShell title={s.home.title} hint={s.home.hint}>
      {/* 🔒 ПЕРВЫЙ ЭКРАН НЕ ДОЛЖЕН ПУГАТЬ (владелец 2026-08-10). Человек попадает
          сюда сразу после развёртывания и видит под этим абзацем несколько
          десятков разделов. Без объяснения он читает это как список того, что
          обязан настроить до начала работы, — и закрывает вкладку.

          Мягкий голубой, шрифт чуть крупнее остального текста страницы: это
          единственный абзац, который обязаны прочитать, и он же снимает
          напряжение, а не добавляет его.

          🔒 КАРТОЧКА ГОЛУБАЯ ВСЕГДА, ЧЕМ БЫ НИ БЫЛ ОЧЕРЕДНОЙ ШАГ (владелец
          2026-08-16). Красный и оранжевый у неё не появляются, даже когда шаг
          блокирующий: уровень тревоги живёт в области «Прежде чем начинать», в
          меню и в подвале — там он и нужен. Здесь другая задача: первый экран
          обязан успокаивать, а не кричать. Тревога, повторённая четвёртый раз и
          самым крупным блоком на странице, перестаёт означать срочность и
          начинает означать «тут всегда так».

          🔒 КАРТОЧКА ИСЧЕЗАЕТ ЦЕЛИКОМ, КОГДА ОБЯЗАТЕЛЬНЫХ ШАГОВ НЕ ОСТАЛОСЬ
          (владелец 2026-08-16, ОТМЕНЯЕТ моё решение того же дня).

          Я оставлял на её месте строку «обязательных шагов не осталось»,
          рассуждая так: исчезнувшая карточка не отвечает на вопрос «а теперь
          что?». Владелец возразил делом — он прошёл все шаги, и текст, который
          объясняет, чего НЕ надо бояться, стал занимать первый экран у человека,
          который уже ничего не боится. Успокаивающий абзац нужен ровно до тех
          пор, пока есть чего пугаться; дальше это просто крупный блок, который
          каждый раз приходится проматывать.

          Мой довод был не то чтобы ложным — он отвечал на вопрос, которого у
          прошедшего онбординг человека уже нет. Карта разделов ниже сама
          отвечает «а теперь что?»: она и есть рабочее место. */}
      {next && (
        <div className="mb-5 rounded-lg border border-sky-500/25 bg-sky-500/5 p-4">
          <p className="text-[14px] font-medium leading-relaxed text-sky-800 dark:text-sky-200">
            {s.home.calmLead}
          </p>
          <p className="mt-2 text-[13px] leading-relaxed text-sky-800/90 dark:text-sky-200/90">
            {s.home.calmOnly}
          </p>

          {/* Слова берутся из УЖЕ СУЩЕСТВУЮЩИХ словарей: причина — та же, что в
              меню (`warnings.items`), надпись на кнопке — та же, что в подвале
              (`footer.warnCta`). Своего перевода на каждый шаг здесь не
              заводится: два места, говорящие об одном разными словами, однажды
              разойдутся, и разойдутся молча. */}
          <div className="mt-3 rounded-md border border-sky-500/30 bg-sky-500/10 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-300">
              {s.home.calmNext}
            </p>
            <p className="mt-1 text-[13px] font-medium leading-relaxed text-sky-900 dark:text-sky-100">
              {s.warnings.items[next.id]}
            </p>
            <Link
              href={adminHref(lang, next.slug)}
              className="mt-2.5 inline-flex h-8 items-center gap-1.5 rounded-md bg-sky-600 px-3 text-[12px] font-medium text-white transition-colors hover:bg-sky-700"
            >
              {s.footer.warnCta[next.id]}<ArrowRight size={12} />
            </Link>
          </div>

          <p className="mt-2 text-[13px] leading-relaxed text-sky-800/80 dark:text-sky-200/80">
            {s.home.calmRest}
          </p>
          <p className="mt-2 text-[13px] leading-relaxed text-sky-800/80 dark:text-sky-200/80">
            {s.home.calmOptional}
          </p>
        </div>
      )}

      {/* Тот же список, что в гамбургере, — чтобы карту слоя было видно целиком
          с первого экрана.

          ЧЕТЫРЕ СТУПЕНИ ШИРИНЫ (владелец 2026-08-10): телефон — одна колонка,
          планшет — две, 1024 — три, широкий экран — четыре.

          🔒 МНОГОКОЛОНОЧНАЯ РАСКЛАДКА, А НЕ СЕТКА (владелец 2026-08-10). Сетка
          держит РЯДЫ: высота ряда равна самой высокой группе в нём, и рядом с
          «Документами разработки» из шестнадцати пунктов образуются три колонки
          пустоты. Многоколоночный поток раскладывает группы сам и подбирает
          разбивку так, чтобы контейнер вышел минимальной высоты, — длинная
          группа просто занимает колонку целиком.

          Запрет разрыва внутри группы обязателен: без него группа рвётся между
          колонками, заголовок остаётся в одной, а половина ссылок уезжает в
          другую. */}
      {/* 🔒 ТРИ УРОВНЯ ВИДНЫ ГЛАЗАМИ, А НЕ ВЫВОДЯТСЯ ИЗ ЧТЕНИЯ (владелец 2026-08-15).
          Раньше все страницы группы шли ПЛОСКИМ списком, и карта группы стояла в
          нём первой строкой наравне с дочерними — то есть «Дизайн» выглядел
          соседом «Шрифтов», хотя открывает их. Иерархия существовала в
          навигации и не существовала на экране.

          Теперь: КАТЕГОРИЯ крупнее всех и не является ссылкой (это имя раздела,
          а не страница), под ней ЖИРНАЯ карта группы — родительская страница, и
          с отступом вправо — её дочерние. Отступ подкреплён вертикальной чертой:
          на списке из трёх пунктов сдвиг ещё читается сам, на списке из
          шестнадцати — уже нет. */}
      <div className="columns-1 gap-6 sm:columns-2 lg:columns-3 xl:columns-4">
        {NAV_GROUPS.map((group) => {
          const index = GROUP_INDEX[group];
          const children = NAV_BY_GROUP[group].filter((slug) => slug !== index);
          // Заголовок категории НЕ красится: это имя раздела, а не страница, и
          // настроить в нём нечего. Тот же довод, по которому в меню метка стоит
          // у страницы, а не у категории.
          const indexAlarm = alarmClass(index);
          return (
            <section key={group} className="mb-5 break-inside-avoid">
              <h2 className="mb-1.5 text-[13px] font-semibold tracking-tight text-foreground">
                {s.navGroups[group]}
              </h2>

              <Link
                href={adminHref(lang, index)}
                title={indexAlarm?.title}
                className={`block rounded-md px-2 py-1 text-[12px] font-semibold hover:bg-muted ${
                  indexAlarm ? indexAlarm.className : "text-foreground"
                }`}
              >
                {s.pages[index].title}
              </Link>

              {children.length > 0 && (
                <ul className="mt-0.5 space-y-0.5 border-l border-border pl-2.5 ml-2">
                  {children.map((slug) => {
                    const alarm = alarmClass(slug);
                    return (
                      <li key={slug}>
                        <Link
                          href={adminHref(lang, slug)}
                          title={alarm?.title}
                          className={`block rounded-md px-2 py-1 text-[12px] hover:bg-muted ${
                            alarm ? alarm.className : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {s.pages[slug].title}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </PageShell>
  );
}
