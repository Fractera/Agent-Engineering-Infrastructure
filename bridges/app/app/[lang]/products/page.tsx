// Продукты сервера — корень группы: создание сверху, существующие ниже.
//
// 🔒 ОДНА СТРАНИЦА, А НЕ КАРТА ПЛЮС СПИСОК (владелец 2026-08-18). Сначала группа
// была устроена как соседние: карта-оглавление, под ней страница. Оглавление из
// одного пункта — тупик, а в меню это выглядело как три слова «Продукты» подряд.
// Теперь корень группы и есть её карта.
//
// 🔒 КАРТОЧКА КРАСИТСЯ ФАЗОЙ, А ПУБЛИКАЦИЯ ПИШЕТСЯ СЛОВАМИ. Цвет читается быстрее
// текста, поэтому им сказано главное — где продукт в жизни: голубой — описывается,
// оранжевый — строится, зелёный — разобран и закрыт. Публикация цветом сказана быть
// не может: продукт бывает завершён и никому не показан, и зелёная карточка скрытого
// продукта врала бы дважды.
//
// 🪦 МАШИННЫХ СЛОВ НА ЭКРАНЕ БОЛЬШЕ НЕТ. Здесь печаталось `acceptance`,
// `not-started`, `decomposition` — прямо из записи. Владелец назвал это мусором, и
// правильно: имя состояния в коде и имя состояния на экране — разные вещи.
//
// Динамическая: реестр живой.

import Link from "next/link";
import { ChevronRight, Boxes } from "lucide-react";
import { getAdminStrings } from "@/lib/i18n/admin-strings";
import { PageShell } from "../_components/page-shell";
import { HelpDetails } from "../_components/help-details";
import { PROJECT_TYPES } from "@/lib/project-types";
import { listProducts } from "@/lib/product-store";
import { AddProductCard } from "./_components/add-product.client";
import { Small, Mono } from "./_components/type";
import { phaseTone } from "./[id]/_components/phase-bar";

export const dynamic = "force-dynamic";

const TONE = {
  sky: "border-sky-500/40 bg-sky-500/5 hover:border-sky-500",
  amber: "border-amber-500/40 bg-amber-500/5 hover:border-amber-500",
  emerald: "border-emerald-500/40 bg-emerald-500/5 hover:border-emerald-500",
} as const;

export default async function ProductsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const s = getAdminStrings(lang);
  const page = s.pages["products"];
  const p = s.projectPicker;
  const u = s.useCases;
  const t = s.productPage;

  const products = listProducts();

  const typeCards = PROJECT_TYPES.map((id) => ({ id, ...s.projectTypes[id] }));
  const pickerLabels = {
    lead: p.lead, hint: p.hint,
    dialogExamples: p.dialogExamples, dialogSignals: p.dialogSignals, dialogQuestions: p.dialogQuestions,
    choose: p.choose, cancel: p.cancel, saving: p.saving,
    chosen: p.chosen, change: p.change, chosenHint: p.chosenHint,
    started: p.started, failed: u.failed,
    addProduct: p.addProduct, addHint: p.addHint,
  };

  return (
    <PageShell lang={lang} slug="products" s={s} title={page.title} hint={page.hint}>
      {/* 🔒 СОЗДАНИЕ — СВЕРХУ. Кнопка под списком не видна ни тому, у кого список
          длинный, ни тому, у кого его нет вовсе: на пустой странице она оказывается
          под пустотой. */}
      <AddProductCard types={typeCards} labels={pickerLabels} lang={lang} />

      {products.length === 0 ? (
        <div className="mt-3 rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-4">
          <p className="text-[13px] font-semibold text-emerald-800 dark:text-emerald-200">{p.manyTitle}</p>
          {p.manyBody.map((paragraph) => (
            <p key={paragraph} className="mt-2 text-[13px] leading-relaxed text-emerald-900/85 dark:text-emerald-100/85">
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
            const confirmed = product.cases.filter((c) => c.confirmed).length;
            const doneSteps = product.steps.filter((x) => x.status === "done").length;
            return (
              <Link
                key={product.id}
                href={`/${lang}/products/${product.id}`}
                className={`flex flex-col gap-1.5 rounded-lg border p-3.5 transition-colors ${
                  TONE[phaseTone(product.phase, product.stage)]
                }`}
              >
                <span className="flex items-start gap-2">
                  <Boxes size={14} className="mt-0.5 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 text-[15px] font-semibold leading-snug text-foreground">
                    {product.title}
                  </span>
                  <ChevronRight size={14} className="mt-0.5 shrink-0 text-muted-foreground" />
                </span>

                {/* Фаза и стадия — словами владельца, не машинными значениями. */}
                <span className="text-[13px] text-foreground">
                  {t.phases[product.phase].label} · {t.stages[product.stage]}
                </span>

                {product.description && (
                  <span className="line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">
                    {product.description}
                  </span>
                )}

                <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <Small>{s.projectTypes[product.type]?.title ?? product.type}</Small>
                  <Mono className="text-[11px]">{product.route || "—"}</Mono>
                  <Small>
                    {t.sectionCases}: {product.cases.length === 0 ? "—" : `${confirmed}/${product.cases.length}`}
                  </Small>
                  {product.steps.length > 0 && (
                    <Small>{t.sectionSteps}: {doneSteps}/{product.steps.length}</Small>
                  )}
                  <Small>{product.published ? t.publishedYes : t.publishedNo}</Small>
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
