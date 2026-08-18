// Продукты сервера — корень группы: создание сверху, существующие ниже.
//
// 🔒 ОДНА СТРАНИЦА, А НЕ КАРТА ПЛЮС СПИСОК (владелец 2026-08-18). Сначала группа
// была устроена как соседние: карта-оглавление, под ней страница. Оглавление из
// одного пункта — тупик, а в меню это выглядело как три слова «Продукты» подряд:
// категория, карта, страница. Теперь корень группы и есть её карта.
//
// 🔒 ПРОДУКТЫ — НЕ ПУНКТЫ НАВИГАЦИИ. Их страницы рождаются вместе с записью и
// живут по динамическому адресу `/products/{id}`; статической страницы у них нет
// и быть не может. Поэтому перечисляет их эта страница и меню под этой строкой,
// а не список разделов.
//
// Динамическая: реестр живой.

import Link from "next/link";
import { ChevronRight, Boxes } from "lucide-react";
import { getAdminStrings } from "@/lib/i18n/admin-strings";
import { PageShell } from "../_components/page-shell";
import { HelpDetails } from "../_components/help-details";
import { PROJECT_TYPES } from "@/lib/project-types";
import { adoptLegacyProjectType, listProducts, devStatusOf } from "@/lib/products-config";
import { listCases } from "@/lib/use-cases-store";
import { AddProductCard } from "./_components/add-product.client";

export const dynamic = "force-dynamic";

export default async function ProductsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const s = getAdminStrings(lang);
  const page = s.pages["products"];
  const p = s.projectPicker;
  const u = s.useCases;

  // Проект, начатый до реестра продуктов, принимается в него здесь: страница
  // динамическая, и это первое место, куда владелец приходит после обновления.
  adoptLegacyProjectType();
  const products = listProducts();

  const typeCards = PROJECT_TYPES.map((id) => ({ id, ...s.projectTypes[id] }));
  const pickerLabels = {
    lead: p.lead, hint: p.hint,
    dialogExamples: p.dialogExamples, dialogSignals: p.dialogSignals, dialogQuestions: p.dialogQuestions,
    choose: p.choose, cancel: p.cancel, saving: p.saving,
    chosen: p.chosen, change: p.change, chosenHint: p.chosenHint,
    started: p.started,
    failed: u.failed,
    addProduct: p.addProduct, addHint: p.addHint,
  };

  return (
    <PageShell lang={lang} slug="products" s={s} title={page.title} hint={page.hint}>
      {/* 🔒 СОЗДАНИЕ — СВЕРХУ, И ЭТО НЕ ВКУСОВЩИНА. Кнопка «добавить», стоящая
          под списком, не видна тому, у кого список длинный, и не видна тому, у
          кого его нет вовсе: на пустой странице она оказывается под пустотой.
          Нажатие ведёт в тот же разговор о структуре, что и первый продукт —
          другого пути заводить продукт нет намеренно. */}
      <AddProductCard types={typeCards} labels={pickerLabels} lang={lang} />

      {products.length === 0 ? (
        <div className="mt-3 rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-4">
          <p className="text-[13px] font-semibold text-emerald-800 dark:text-emerald-200">{p.manyTitle}</p>
          {p.manyBody.map((paragraph) => (
            <p key={paragraph} className="mt-2 text-[12px] leading-relaxed text-emerald-900/85 dark:text-emerald-100/85">
              {paragraph}
            </p>
          ))}
          <p className="mt-2.5 border-t border-emerald-500/25 pt-2.5 text-[11px] leading-relaxed text-emerald-800/80 dark:text-emerald-200/80">
            {p.manyHint}
          </p>
        </div>
      ) : (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {products.map((product) => {
            // Счётчик кейсов читается у каждого продукта: это ответ на вопрос
            // «где я остановился», ради которого страницу и открывают.
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

      <HelpDetails label={u.helpLabel}>
        <p><strong>{u.helpWhyTitle}</strong> {u.helpWhy}</p>
        <p><strong>{u.helpConfirmTitle}</strong> {u.helpConfirm}</p>
      </HelpDetails>
    </PageShell>
  );
}
