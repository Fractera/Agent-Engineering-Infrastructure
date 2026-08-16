// Секция продуктов — верх страницы кейсов (партия 4, владелец 2026-08-15).
//
// 🔒 ПОЯВЛЯЕТСЯ ТОЛЬКО КОГДА ЕСТЬ ЧТО ПОКАЗАТЬ. Пока продукт не описан, слова
// «продукт» на экране нет вовсе: понятие вводится в тот день, когда за него уже
// заплачено ценностью, а не выдаётся авансом человеку, который ещё ничего не
// получил. Ровно поэтому зелёная врезка-обещание и эта секция никогда не видны
// одновременно — одна сменяет другую.
//
// 🔒 СЕРВЕРНЫЙ КОМПОНЕНТ. Здесь нет ни одного состояния: карточки — ссылки, а
// текущий продукт известен серверу. Клиентский островок понадобится в партии 5,
// когда появится создание второго продукта.
//
// 🔒 ТЕКУЩИЙ ПРОДУКТ НАЗВАН ОТДЕЛЬНОЙ СТРОКОЙ, а не только выделен рамкой. Самая
// вероятная тихая ошибка при нескольких продуктах — правка кейсов не того; от неё
// спасает не подсветка, которую перестают замечать, а прямой ответ «вы работаете
// с таким-то».

import Link from "next/link";
import { Boxes, Check } from "lucide-react";
import { productPaths, type Product } from "@/lib/products-config";
import type { AdminStrings } from "@/lib/i18n/admin-strings";
import { AddProductCard } from "./add-product.client";

export function ProductsSection(
  { products, current, casesCount, lang, typeCards, pickerLabels, p, actions }:
  {
    products: Product[];
    current: Product | null;
    /** Сколько кейсов у ТЕКУЩЕГО продукта: чужие папки ради счётчика не читаем. */
    casesCount: number;
    lang: string;
    typeCards: React.ComponentProps<typeof AddProductCard>["types"];
    pickerLabels: React.ComponentProps<typeof AddProductCard>["labels"];
    p: AdminStrings["projectPicker"];
    /**
     * Кнопки правки и удаления текущего продукта.
     *
     * 🔒 ПРИХОДЯТ СОДЕРЖИМЫМ, А НЕ СОБИРАЮТСЯ ЗДЕСЬ. Эта секция серверная, а
     * кнопки — клиентский островок с окнами; собери их внутри, и словарь на 82
     * языка уехал бы в браузер вместе с ними. Тот же приём, что у ссылки
     * «Руководство» в подвале.
     */
    actions?: React.ReactNode;
  },
) {
  if (!products.length) return null;

  const surfaceLabel = (s: Product["surface"]) =>
    s === "public" ? p.surfacePublic : s === "private" ? p.surfacePrivate : p.surfaceHeadless;
  const statusLabel = (s: Product["status"]) =>
    s === "live" ? p.statusLive : s === "building" ? p.statusBuilding : p.statusDraft;

  // Те же четыре пути, что получает агент: одна функция на обоих потребителей,
  // иначе панель однажды покажет одно, а агент пойдёт в другое.
  const roots = current ? productPaths(current) : null;

  return (
    <section className="mt-3 rounded-lg border border-border p-3">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <Boxes size={13} className="shrink-0 self-center text-muted-foreground" />
        <h2 className="text-[13px] font-semibold text-foreground">{p.productsTitle}</h2>
        <p className="text-[10px] text-muted-foreground">{p.productsHint}</p>
      </div>

      {/* Ряд карточек с переносом — тот же приём, что у структур проекта: имена
          продуктов разной длины, и жёсткая сетка растянула бы короткое имя на
          ширину самого длинного. */}
      <div className="mt-2.5 flex flex-wrap gap-2">
        {products.map((product) => {
          const active = product.id === current?.id;
          return (
            // 🔒 ВЫБОР ЖИВЁТ В АДРЕСЕ (`?product=p2`) — переключение работает без
            // единой строки JavaScript, делится ссылкой и переживает «назад».
            //
            // 🔒 КАРТОЧКА БОЛЬШЕ НЕ САМА ССЫЛКА, А КОНТЕЙНЕР С РАСТЯНУТОЙ ССЫЛКОЙ
            // ВНУТРИ (2026-08-16). У текущего продукта появились кнопки правки и
            // удаления, а ссылка внутри ссылки недопустима и ведёт себя в
            // браузерах по-разному. `absolute inset-0` сохраняет прежнее
            // поведение — щёлкнуть можно по всей карточке, — а кнопки стоят ей
            // соседями и лежат слоем выше.
            <div
              key={product.id}
              className={`relative flex min-w-[11rem] flex-1 flex-col gap-1 rounded-lg border p-2.5 transition-colors ${
                active ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-muted"
              }`}
            >
              <Link
                href={`/${lang}/doc-use-cases?product=${product.id}`}
                aria-label={product.title}
                className="absolute inset-0 rounded-lg"
              />

              <div className="relative flex items-start gap-1.5">
                {active && <Check size={11} className="mt-0.5 shrink-0 text-primary" />}
                <span className="min-w-0 flex-1 text-[12px] font-medium text-foreground">{product.title}</span>
                {/* Правка и удаление — только у ТЕКУЩЕГО продукта: удалить
                    чужой, не открыв его, значит ошибиться без права на откат. */}
                {active && actions}
              </div>

              {/* Адрес — машинная строка, поэтому моноширинным и без перевода.
                  У продукта без публичной поверхности его нет, и выдумывать
                  прочерк не нужно: подпись поверхности уже всё сказала. */}
              {product.route && (
                <span className="font-mono text-[10px] text-muted-foreground">{product.route}</span>
              )}

              <span className="text-[10px] text-muted-foreground">
                {surfaceLabel(product.surface)} · {statusLabel(product.status)}
              </span>

              <span className="text-[10px] text-muted-foreground">
                {active
                  ? (casesCount ? p.casesCount.replace("{n}", String(casesCount)) : p.noCases)
                  : " "}
              </span>
            {/* 🔒 ОПИСАНИЕ ПОКАЗЫВАЕТСЯ ТОЛЬКО У ТЕКУЩЕГО, и это не экономия
                  места. Двести знаков в каждой из пяти карточек превращают ряд
                  выбора в стену текста, а выбирают по имени. Открыл продукт —
                  читаешь, что это; остальные остаются короткими.

                  Пусто — говорим об этом прямо: молчащая карточка не объясняет,
                  откуда описание берётся и можно ли написать своё. */}
              {active && (
                <span className="mt-0.5 border-t border-border/60 pt-1 text-[10px] leading-relaxed text-muted-foreground">
                  {product.description || p.noDescription}
                </span>
              )}
            </div>
          );
        })}

        {/* Карточка «добавить» стоит В ТОМ ЖЕ ряду, а не кнопкой в стороне: она
            обещает, что продуктов может быть много, самим своим видом. */}
        <AddProductCard types={typeCards} labels={pickerLabels} lang={lang} />
      </div>

      <p className="mt-2.5 border-t border-border pt-2 text-[11px] text-foreground">
        {p.current}: <strong className="font-semibold">{current?.title ?? "—"}</strong>
      </p>

      {/* 🔒 ЧЕТЫРЕ КОРНЯ — ТА ЖЕ ГРАНИЦА, ЧТО ЧИТАЕТ АГЕНТ (партия 6). Правило
          «пиши внутри своих корней» живёт в инструкции слота, и владелец о нём
          не знает. Увидев те же четыре пути здесь, он способен проверить работу
          глазами: правка вне этих мест читается как выход за границу без единого
          инструмента.

          Пути выводятся из записи продукта той же функцией, что отдаёт их
          агенту, — списка «на глаз» здесь быть не может по построению. */}
      {current && roots && (
        <div className="mt-2 rounded-md border border-border/70 bg-muted/30 p-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {p.rootsTitle}
          </p>
          <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">{p.rootsHint}</p>
          <ul className="mt-1.5 space-y-0.5">
            {([
              [p.rootPages, roots.pages],
              [p.rootLogic, roots.lib],
              [p.rootTables, `${roots.tablePrefix}*`],
              [p.rootCases, roots.useCases],
            ] as const).map(([label, value]) => (
              <li key={label} className="flex flex-wrap items-baseline gap-x-2">
                <span className="w-16 shrink-0 text-[10px] text-muted-foreground">{label}</span>
                <code className="font-mono text-[10px] text-foreground">{value}</code>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
