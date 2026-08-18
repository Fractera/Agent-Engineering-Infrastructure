import Link from "next/link";
import { NAV, GROUP_INDEX, adminHref, type AdminPageSlug } from "@/lib/admin-nav";
import type { AdminStrings } from "@/lib/i18n/admin-strings";

// Хлебные крошки панели (шаг 501, решение владельца 2026-08-09).
//
// ВЫГЛЯДЯТ КАК СТРОКА ПУТИ — `Панель / Документы / Главная инструкция / шаг-01.md`,
// а не как набор кнопок с иконками. Строка читается одним взглядом и занимает
// одну высоту, сколько бы сегментов в ней ни было.
//
// ОТ ЛЕВОГО ВЕРХНЕГО КРАЯ, независимо от ширины экрана. Поэтому крошки стоят ВНЕ
// колонки содержимого: колонка центрируется и при узкой ширине отъезжает к
// середине, а путь обязан начинаться там, где начинается страница. Из того же
// требования — `truncate` на длинных именах вместо переноса: строка не имеет
// права стать двумя.
//
// ПАРАМЕТРЫ АДРЕСА — ЧАСТЬ ПУТИ. Открытый шаг (`?file=…`), открытый журнал
// (`?run=…`), выбранная таблица (`?table=…`) — это места, в которых человек
// находится, и путь обязан их показывать. Иначе «Документы / Шаги разработки»
// одинаково выглядит и когда список закрыт, и когда открыт конкретный файл.
//
// Серверный компонент: ни строчки JS.

/**
 * Параметры адреса, которые становятся сегментом пути.
 *
 * Список явный, а не «показать всё, что пришло»: `page`, `q` и прочая
 * механика листания — это состояние списка, а не место. Показать их значило бы
 * назвать «страница 2» отдельным разделом.
 */
// 🔒 НЕЗНАКОМЫЙ КЛЮЧ МОЛЧА ВЫБРАСЫВАЕТСЯ — и это стоило имени продукта в пути
// (найдено владельцем 2026-08-18). Страница продукта передавала `product` и `tab`,
// их в списке не было, и путь читался «Панель / Продукты» без ответа на вопрос
// «какого продукта». Список закрытый по-прежнему: показывать всё пришедшее значило
// бы объявить «страница 2» отдельным разделом. Но продукт — это место, а не
// состояние списка, поэтому он здесь.
const PATH_PARAMS = ["product", "tab", "file", "run", "table", "edit", "col", "delete"] as const;

export function Breadcrumbs(
  { lang, slug, s, params }: {
    lang: string;
    /** Текущий раздел. Не задан — мы на холсте, и крошек нет. */
    slug?: AdminPageSlug;
    s: AdminStrings;
    /** Разобранные параметры адреса страницы. */
    params?: Record<string, string | undefined>;
  },
) {
  if (!slug) return null;

  const group = NAV.find((n) => n.slug === slug)?.group;
  const mapSlug = group ? GROUP_INDEX[group] : undefined;

  // Хвост из параметров: значение показывается как есть — это имя файла или
  // идентификатора, и переводить его нельзя (правило 4г, машинные строки).
  const tail = PATH_PARAMS
    .map((key) => params?.[key])
    .filter((v): v is string => typeof v === "string" && v.trim() !== "");

  return (
    <nav
      aria-label="breadcrumbs"
      // Строго от левого края страницы: не в колонке содержимого и без
      // авто-полей, которые её центрируют.
      className="flex w-full items-center gap-1.5 overflow-hidden px-4 pt-3 font-mono text-[10px] text-muted-foreground"
    >
      <Link href={adminHref(lang)} className="shrink-0 hover:text-foreground">
        {s.breadcrumbHome}
      </Link>

      {/* Серединный сегмент ведёт на КАРТУ ГРУППЫ и называется её именем.
          Раньше здесь стояло название категории простым текстом — то есть
          вернуться на уровень выше было некуда, а ради этого крошки и заводились.
          Теперь у каждой группы есть страница-маршрутизатор, и сегмент на неё
          указывает. На самой карте он не показывается: ссылка на страницу, где
          стоишь, ничего не открывает. */}
      {group && mapSlug && mapSlug !== slug && (
        <>
          <span className="shrink-0 text-muted-foreground/50">/</span>
          <Link href={adminHref(lang, mapSlug)} className="shrink-0 truncate hover:text-foreground">
            {s.pages[mapSlug].title}
          </Link>
        </>
      )}

      <span className="shrink-0 text-muted-foreground/50">/</span>
      {tail.length === 0 ? (
        <span className="truncate text-foreground">{s.pages[slug].title}</span>
      ) : (
        <Link href={adminHref(lang, slug)} className="shrink-0 hover:text-foreground">
          {s.pages[slug].title}
        </Link>
      )}

      {tail.map((value, i) => (
        <span key={`${value}-${i}`} className="flex min-w-0 items-center gap-1.5">
          <span className="shrink-0 text-muted-foreground/50">/</span>
          <span className={i === tail.length - 1 ? "truncate text-foreground" : "truncate"}>{value}</span>
        </span>
      ))}
    </nav>
  );
}
