// Вкладка «Как вас находят» — что проект уже делает без владельца.
//
// ОТКУДА ОНА ВЗЯЛАСЬ. Материал начинался зелёной врезкой на странице языков:
// человек приходил выбирать языки и наталкивался на «самое дорогое уже
// построено». Врезка выросла до пяти абзацев и пяти документов — и переехала
// сюда (владелец 2026-08-13). На странице языков осталась одна строка со
// ссылкой: врезка работала тем, что стояла НА ПУТИ, и терять эту встречу целиком
// было бы дороже, чем перенести текст.
//
// 🔒 ЗАКОН РАЗДЕЛА: утверждение появляется здесь ТОЛЬКО после того, как его
// держит машинная проверка. Абзац про языковые сигналы ждал шага 503
// (`check:seo`), про модели — 505 (`check:aio`), про приложение — 504
// (`check:pwa`), про карту сайта — проверки «раздел без карты», написанной в тот
// день, когда выяснилось, что блог не попадал ни в одну карту. Покупатель
// проверяет такие обещания одной командой `curl`; обещание, ложное в минуту
// чтения, дороже отсутствующего.
//
// СЕРВЕРНЫЙ КОМПОНЕНТ. Словарь на 82 языка не имеет права уехать в браузер:
// строки резолвятся здесь и едут в островки пропсами. Документы за вопросиками
// читаются с диска, разметка markdown делается тоже здесь.

import type { AdminStrings } from "@/lib/i18n/admin-strings";
import { readLocalizedContent } from "@/lib/content/localized-content";
import { GuideProse } from "../../how-to-build/_components/guide-prose";
import { DocPopup } from "../../_components/doc-popup.client";
import { OfflineSwitch } from "./offline-switch.client";
import type { FeaturesState } from "@/lib/platform-features";

// Документ за вопросиком. Нет файла — нет и вопросика: пустое окно хуже, чем
// отсутствующая кнопка, потому что обещает и не даёт.
function Doc({ name, lang, label, title }: { name: string; lang: string; label: string; title: string }) {
  const found = readLocalizedContent(name, lang);
  if (!found.ok) return null;
  return (
    <DocPopup label={label} title={title}>
      <GuideProse markdown={found.text} />
    </DocPopup>
  );
}

// Блок раздела: заголовок, текст, под ними — относящиеся к нему доказательства.
// Вопросики стоят ПОД текстом, а не внутри него: ссылка посреди абзаца уводит из
// чтения, а здесь она ждёт, пока абзац дочитают.
function Block(
  { title, children, docs }:
  { title: string; children: React.ReactNode; docs?: React.ReactNode },
) {
  return (
    <section className="border-t border-border pt-3 first:border-t-0 first:pt-0">
      <h2 className="text-[12px] font-semibold text-foreground">{title}</h2>
      <div className="mt-1.5 space-y-1.5 text-[11px] leading-relaxed text-muted-foreground">{children}</div>
      {docs && <div className="mt-2 flex flex-wrap items-center gap-2">{docs}</div>}
    </section>
  );
}

export function VisibilityContent(
  { s, lang, config, offline }:
  { s: AdminStrings; lang: string; config: FeaturesState["config"]; offline: boolean },
) {
  const v = s.visibility;

  return (
    <div className="space-y-4">
      {/* 🔒 ОБЛОЖКА — НАСТОЯЩИЙ ЗАМЕР, А НЕ РИСУНОК (владелец 2026-08-13).
          Раздел утверждает вещи, которые покупатель проверяет одной командой:
          скорость, доступность, поиск. Снимок собственной проверки этого же
          проекта — самое короткое доказательство из возможных, и он подчиняется
          тому же закону, что и текст: попал сюда ПОСЛЕ того, как стал правдой.
          Слева на снимке виден каталог, чьи картинки приехали из хранилища, —
          то есть один кадр показывает и результат, и механизм.
          Размеры проставлены явно: без них страница подпрыгнет, когда снимок
          догрузится, — ровно тот дефект, о котором рассказывает блок ниже. */}
      <figure className="overflow-hidden rounded-lg border border-border">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/lighthouse-100.jpg"
          alt={v.coverAlt}
          width={1197}
          height={577}
          className="h-auto w-full"
        />
        <figcaption className="border-t border-border bg-muted/40 px-3 py-2 text-[10px] leading-relaxed text-muted-foreground">
          {v.coverCaption}
        </figcaption>
      </figure>

      <p className="text-[11px] leading-relaxed text-muted-foreground">{v.intro}</p>

      <div className="space-y-4 rounded-lg border border-border p-3.5">
        <Block
          title={v.searchTitle}
          docs={<Doc name="seo-inside" lang={lang} label={v.docSeo} title={v.docSeoTitle} />}
        >
          <p>{v.searchBody}</p>
          <p>{v.searchSignals}</p>
        </Block>

        <Block
          title={v.modelsTitle}
          docs={<Doc name="aio-inside" lang={lang} label={v.docAio} title={v.docAioTitle} />}
        >
          <p>{v.modelsBody}</p>
        </Block>

        <Block
          title={v.mapsTitle}
          docs={
            <>
              <Doc name="robots-inside" lang={lang} label={v.docRobots} title={v.docRobotsTitle} />
              <Doc name="sitemap-inside" lang={lang} label={v.docSitemap} title={v.docSitemapTitle} />
            </>
          }
        >
          <p>{v.mapsBody}</p>
        </Block>

        {/* Приложение — единственный блок с выключателем: офлайн-копия переехала
            сюда со страницы возможностей, чтобы управление стояло рядом с
            текстом, который объясняет, зачем это. Хранилище осталось общим. */}
        <Block
          title={v.appTitle}
          docs={<Doc name="pwa-inside" lang={lang} label={v.docPwa} title={v.docPwaTitle} />}
        >
          <p>{v.appBody}</p>
          <OfflineSwitch
            config={config}
            initial={offline}
            labels={{
              label: v.offlineLabel, hint: v.offlineHint,
              save: v.save, saving: v.saving, saved: v.saved,
              failed: v.failed, nothingToSave: v.nothingToSave,
            }}
          />
        </Block>

        {/* Изображения. Абзац появился ПОСЛЕ того, как это заработало на живом
            сайте (шаг 506.2): в HTML блога стоит размытая подложка и адрес
            оптимизатора с шириной под экран, на главной, где обёртка не
            применена, подложек ноль — негативный контроль той же проверки.
            Про картинки, которые владелец загрузит САМ, здесь пока ни слова:
            это 506.3, и он не написан. */}
        <Block
          title={v.imagesTitle}
          docs={<Doc name="images-inside" lang={lang} label={v.docImages} title={v.docImagesTitle} />}
        >
          <p>{v.imagesBody}</p>
          <p>{v.imagesSpeed}</p>
        </Block>

        <Block title={v.noJsTitle}>
          <p>{v.noJsBody}</p>
        </Block>

        <Block title={v.costTitle}>
          <p>{v.cost}</p>
          <p>{v.choice}</p>
        </Block>
      </div>
    </div>
  );
}
