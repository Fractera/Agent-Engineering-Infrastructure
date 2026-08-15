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

import { Boxes, Plus, Check } from "lucide-react";
import type { Product } from "@/lib/products-config";
import type { AdminStrings } from "@/lib/i18n/admin-strings";

export function ProductsSection(
  { products, current, casesCount, p }:
  {
    products: Product[];
    current: Product | null;
    /** Сколько кейсов у ТЕКУЩЕГО продукта: чужие папки ради счётчика не читаем. */
    casesCount: number;
    p: AdminStrings["projectPicker"];
  },
) {
  if (!products.length) return null;

  const surfaceLabel = (s: Product["surface"]) =>
    s === "public" ? p.surfacePublic : s === "private" ? p.surfacePrivate : p.surfaceHeadless;
  const statusLabel = (s: Product["status"]) =>
    s === "live" ? p.statusLive : s === "building" ? p.statusBuilding : p.statusDraft;

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
            <div
              key={product.id}
              className={`flex min-w-[11rem] flex-1 flex-col gap-1 rounded-lg border p-2.5 ${
                active ? "border-primary bg-primary/5" : "border-border"
              }`}
            >
              <div className="flex items-center gap-1.5">
                {active && <Check size={11} className="shrink-0 text-primary" />}
                <span className="text-[12px] font-medium text-foreground">{product.title}</span>
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
            </div>
          );
        })}

        {/* Карточка «добавить» стоит В ТОМ ЖЕ ряду, а не кнопкой в стороне: она
            обещает, что продуктов может быть много, самим своим видом. */}
        <div className="flex min-w-[11rem] flex-1 flex-col justify-center gap-1 rounded-lg border border-dashed border-border p-2.5 text-muted-foreground">
          <span className="flex items-center gap-1.5 text-[12px] font-medium">
            <Plus size={11} className="shrink-0" />{p.addProduct}
          </span>
          <span className="text-[10px] leading-snug">{p.addHint}</span>
          {/* 🔒 ЧЕСТНАЯ ЗАГЛУШКА ВМЕСТО КНОПКИ, КОТОРАЯ НЕ РАБОТАЕТ. Кнопка,
              которая ничего не делает, хуже отсутствующей: она обещает и
              заставляет решить, что продукт сломан. Здесь сказано прямо, чего
              ещё нет и когда оно будет. */}
          <span className="mt-0.5 text-[10px] leading-snug text-muted-foreground/70">
            {p.soonTitle}
          </span>
        </div>
      </div>

      <p className="mt-2.5 border-t border-border pt-2 text-[11px] text-foreground">
        {p.current}: <strong className="font-semibold">{current?.title ?? "—"}</strong>
      </p>
    </section>
  );
}
