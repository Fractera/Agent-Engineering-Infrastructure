// Продукты сервера — список и создание (2026-08-18).
//
// 🔒 ПЕРЕЕЗД, А НЕ НОВАЯ СТРАНИЦА. Продукты и кейсы жили одной страницей в группе
// «Документы разработки», между двадцатью одним текстом, а продукт выбирался
// строкой запроса `?product=p2`. Это не документ, а рабочая поверхность, с
// которой начинается разработка, — поэтому у неё своя группа и свои адреса:
// список здесь, продукт на `/products/{id}`, его кейсы на `/products/{id}/use-cases`.
//
// 🔒 ПУСТОЙ РЕЕСТР — ЭТО ЭКРАН СОЗДАНИЯ ПЕРВОГО ПРОДУКТА, а не пустая таблица со
// словом «нет данных». До первого продукта в панели нельзя ничего описать: кейсы
// принадлежат продукту, и без него им негде лежать.
//
// Динамическая: реестр живой, и заголовки приходят из словаря по языку адреса.

import { getAdminStrings } from "@/lib/i18n/admin-strings";
import { PageShell } from "../_components/page-shell";
import { HelpDetails } from "../_components/help-details";
import { PROJECT_TYPES } from "@/lib/project-types";
import { adoptLegacyProjectType, listProducts } from "@/lib/products-config";
import { ProductsSection } from "./_components/products-section";
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
  // Ничего не делает, если реестр уже не пуст.
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
      {products.length === 0 ? (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-4">
          <p className="text-[13px] font-semibold text-emerald-800 dark:text-emerald-200">{p.manyTitle}</p>
          {p.manyBody.map((paragraph) => (
            <p key={paragraph} className="mt-2 text-[12px] leading-relaxed text-emerald-900/85 dark:text-emerald-100/85">
              {paragraph}
            </p>
          ))}
          <p className="mt-2.5 border-t border-emerald-500/25 pt-2.5 text-[11px] leading-relaxed text-emerald-800/80 dark:text-emerald-200/80">
            {p.manyHint}
          </p>

          {/* Создание первого продукта — та же дверь, что и второго. Другого
              пути нет намеренно: два разных опыта для одного действия дали бы
              второй продукт, описанный хуже первого. */}
          <div className="mt-3 flex">
            <AddProductCard types={typeCards} labels={pickerLabels} lang={lang} />
          </div>
        </div>
      ) : (
        <ProductsSection
          products={products}
          // Список не выделяет «текущий»: текущим стал адрес открытой страницы
          // продукта, а на списке текущего нет вовсе.
          current={null}
          casesCount={0}
          lang={lang}
          typeCards={typeCards}
          pickerLabels={pickerLabels}
          p={p}
        />
      )}

      <HelpDetails label={u.helpLabel}>
        <p><strong>{u.helpWhyTitle}</strong> {u.helpWhy}</p>
        <p><strong>{u.helpConfirmTitle}</strong> {u.helpConfirm}</p>
      </HelpDetails>
    </PageShell>
  );
}
