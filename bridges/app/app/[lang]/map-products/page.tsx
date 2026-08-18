// Карта группы «Продукты» — и единственная карта, которая знает не только
// страницы, но и записи (2026-08-18).
//
// 🔒 ПОЧЕМУ НЕ ОБЩИЙ `GroupMap`. Он строит список из навигации, то есть из
// СТАТИЧЕСКИХ страниц группы. Для остальных групп этого хватает: там нечего
// перечислять, кроме разделов. Здесь же дочерние страницы рождаются вместе с
// продуктом и живут по динамическому адресу `/products/{id}` — навигация о них
// не знает по построению. Карта, показавшая один пункт «Продукты» там, где у
// владельца два продукта, отвечает не на тот вопрос, ради которого её открыли.
//
// Порядок на странице: сначала сами продукты (то, за чем сюда идут), потом
// страницы группы. Список продуктов стоит ниже карточек намеренно — он нужен
// тому, кто заводит новый, а не тому, кто открывает существующий.
//
// Динамическая: реестр продуктов живой.

import Link from "next/link";
import { ChevronRight, Boxes } from "lucide-react";
import { getAdminStrings } from "@/lib/i18n/admin-strings";
import { PageShell } from "../_components/page-shell";
import { NAV_BY_GROUP, GROUP_INDEX, adminHref, type AdminPageSlug } from "@/lib/admin-nav";
import { listProducts, devStatusOf, adoptLegacyProjectType } from "@/lib/products-config";
import { listCases } from "@/lib/use-cases-store";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const s = getAdminStrings(lang);
  const self = GROUP_INDEX.products;
  const page = s.pages[self];
  const p = s.projectPicker;
  const u = s.useCases;

  adoptLegacyProjectType();
  const products = listProducts();
  const slugs = NAV_BY_GROUP.products.filter((x) => x !== self) as AdminPageSlug[];

  return (
    <PageShell lang={lang} slug={self} s={s} title={page.title} hint={page.hint}>
      <p className="rounded-md border border-blue-500/30 bg-blue-500/5 p-2.5 text-[10px] leading-relaxed text-blue-700 dark:text-blue-300">
        {s.groupMaps["products"]}
      </p>

      {products.length > 0 && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {products.map((product) => {
            // Счётчик кейсов читается у каждого продукта: это ответ на вопрос
            // «где я остановился», ради которого карту и открывают.
            const { cases } = listCases(product.id);
            const confirmed = cases.filter((c) => c.status === "confirmed").length;
            return (
              <Link
                key={product.id}
                href={`/${lang}/products/${product.id}`}
                className="flex flex-col gap-1 rounded-lg border border-border p-3 transition-colors hover:border-primary"
              >
                <span className="flex items-start gap-1.5">
                  <Boxes size={12} className="mt-0.5 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 text-[12px] font-medium text-foreground">{product.title}</span>
                  <ChevronRight size={13} className="mt-0.5 shrink-0 text-muted-foreground" />
                </span>

                <span className="text-[10px] text-muted-foreground">
                  {s.projectTypes[product.type]?.title ?? product.type}
                  {" · "}
                  {/* Адрес — машинная строка, поэтому без перевода. У продукта без
                      публичной поверхности его нет, и выдумывать нечего. */}
                  <span className="font-mono">{product.route || "—"}</span>
                </span>

                <span className="text-[10px] text-muted-foreground">
                  {u.tabCases}: {cases.length === 0 ? u.tabCasesEmpty : `${confirmed} / ${cases.length}`}
                  {" · "}
                  {devStatusOf(product)}
                  {" · "}
                  {product.status === "live" ? p.statusLive
                    : product.status === "building" ? p.statusBuilding : p.statusDraft}
                </span>
              </Link>
            );
          })}
        </div>
      )}

      <ul className="mt-3 divide-y divide-border rounded-lg border border-border">
        {slugs.map((slug) => (
          <li key={slug}>
            <Link href={adminHref(lang, slug)} className="flex gap-3 px-3 py-2.5 hover:bg-muted">
              <div className="min-w-0 flex-1">
                <span className="text-[12px] font-medium text-foreground">{s.pages[slug].title}</span>
                <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">{s.pages[slug].hint}</p>
              </div>
              <ChevronRight size={13} className="mt-1 shrink-0 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>
    </PageShell>
  );
}
