// Один продукт — обзор и вход в его вкладки (2026-08-18).
//
// 🔒 ПЕРВЫЙ ДИНАМИЧЕСКИЙ АДРЕС ПАНЕЛИ. До сих пор каждая страница была отдельной
// папкой, а продукт выбирался строкой запроса. Строка запроса не давала продукту
// собственного адреса: им нельзя было поделиться, его нельзя было положить в
// закладку, а «назад» вело не туда. Теперь адрес есть, и вкладки продукта
// (`/use-cases`, позже `/pages`, `/steps`) встают под него, ничего не ломая.
//
// 🔒 ПРОДУКТ — ПАПКА ВКЛАДОК, А НЕ ОДНА СТРАНИЦА. Обзор отвечает на вопрос «что
// это за продукт и где он живёт», работа с кейсами — на своей вкладке. Свалить
// их в один экран значило бы повторить ту страницу на 534 строки, из которой всё
// это и переехало.
//
// Динамическая: запись продукта живая, и её меняет соседняя кнопка.

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, FolderOpen } from "lucide-react";
import { getAdminStrings } from "@/lib/i18n/admin-strings";
import { PageShell } from "../../_components/page-shell";
import {
  findProduct, productPaths, devStatusOf, DESCRIPTION_MAX,
} from "@/lib/products-config";
import { listCases } from "@/lib/use-cases-store";
import { ProductCardActions } from "../_components/product-card-actions.client";

export const dynamic = "force-dynamic";

export default async function ProductPage(
  { params }: { params: Promise<{ lang: string; id: string }> },
) {
  const { lang, id } = await params;
  const s = getAdminStrings(lang);
  const p = s.projectPicker;
  const u = s.useCases;

  // Продукта с таким идентификатором нет — честная страница «не найдено», а не
  // пустой экран: адресом делятся, и удалённый продукт обязан сказать о себе.
  const product = findProduct(id);
  if (!product) notFound();

  const paths = productPaths(product);
  const { cases } = listCases(product.id);
  const confirmed = cases.filter((c) => c.status === "confirmed").length;

  const surfaceLabel = product.surface === "public" ? p.surfacePublic
    : product.surface === "private" ? p.surfacePrivate : p.surfaceHeadless;
  const statusLabel = product.status === "live" ? p.statusLive
    : product.status === "building" ? p.statusBuilding : p.statusDraft;

  return (
    <PageShell
      lang={lang}
      slug="products"
      s={s}
      params={{ product: product.title }}
      title={product.title}
      hint={product.description || s.pages["products"].hint}
    >
      {/* Запись продукта — то, из чего выводится всё остальное. Читается сверху
          вниз: чем является, где виден, под каким адресом, где в разработке. */}
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[11px]">
        <dt className="text-muted-foreground">{p.chosen}</dt>
        <dd className="text-foreground">{s.projectTypes[product.type]?.title ?? product.type}</dd>
        <dt className="text-muted-foreground">{p.surfaceLabel}</dt>
        <dd className="text-foreground">{surfaceLabel}</dd>
        <dt className="text-muted-foreground">{p.routeLabel}</dt>
        <dd className="font-mono text-foreground">{product.route || "/"}</dd>
        <dt className="text-muted-foreground">{p.statusLabel}</dt>
        <dd className="text-foreground">{statusLabel} · {devStatusOf(product)}</dd>
      </dl>

      {/* Вкладки продукта. Пока одна — кейсы; строки страниц и шагов встанут
          сюда же, когда появятся, и адреса при этом не сдвинутся. */}
      <div className="mt-5 space-y-2">
        <Link
          href={`/${lang}/products/${product.id}/use-cases`}
          className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 transition-colors hover:border-primary"
        >
          <span>
            <span className="block text-[12px] font-medium text-foreground">{u.tabCases}</span>
            <span className="block text-[10px] text-muted-foreground">
              {cases.length === 0 ? u.tabCasesEmpty : `${confirmed} / ${cases.length}`}
            </span>
          </span>
          <ArrowRight size={13} className="shrink-0 text-muted-foreground" />
        </Link>
      </div>

      {/* Четыре корня продукта — не украшение: это граница, внутри которой агент
          пишет, работая по кейсу этого продукта. Названные, они проверяемы. */}
      <p className="mt-5 mb-1.5 text-[11px] font-medium text-foreground">{u.rootsTitle}</p>
      <ul className="space-y-1 font-mono text-[10px] text-muted-foreground">
        {[paths.pages, paths.lib, `${paths.tablePrefix}*`, paths.useCases].map((path) => (
          <li key={path} className="flex items-center gap-1.5">
            <FolderOpen size={11} className="shrink-0" />
            <span className="break-all">{path}</span>
          </li>
        ))}
      </ul>

      <div className="mt-5">
        <ProductCardActions
          productId={product.id}
          title={product.title}
          description={product.description ?? ""}
          casesCount={cases.length}
          descriptionMax={DESCRIPTION_MAX}
          labels={{
            editTitle: p.editTitle, editAction: p.editAction, editName: p.editName,
            editNameHint: p.editNameHint, editDesc: p.editDesc, editDescHint: p.editDescHint,
            editSave: p.editSave, editCancel: p.editCancel, editSaved: p.editSaved,
            editFailed: p.editFailed, editNameRequired: p.editNameRequired,
            delAction: p.delAction, delTitle: p.delTitle, delDanger: p.delDanger,
            delGoes: p.delGoes, delStays: p.delStays, delConfirm: p.delConfirm,
            delWorking: p.delWorking, delDone: p.delDone, delFailed: p.delFailed,
            delArchive: p.delArchive,
          }}
        />
      </div>
    </PageShell>
  );
}
