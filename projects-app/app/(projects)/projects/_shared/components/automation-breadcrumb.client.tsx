"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useUiLang } from "../use-ui-lang";
import { PROJECT_CATEGORIES, categoryTitle } from "../categories";

// ХЛЕБНЫЕ КРОШКИ АВТОМАТИЗАЦИИ (владелец, 2026-07-27) — «Проекты / <Категория> / <эта автоматизация>».
// Живёт в ОБЩЕМ слое зоны (монтируется `AutomationPageChrome` один раз на зону), поэтому работает на ЛЮБОЙ
// автоматизации, включая уже созданные — в отличие от per-clone chrome стартера. Даёт вернуться в раздел
// (категорию) или в корень зоны одним кликом. Десять языков (закон 4г); имя категории — из `categories.ts`.
const ROOT_LABEL: Record<string, string> = {
  en: "Projects", ru: "Проекты", es: "Proyectos", fr: "Projets", it: "Progetti",
  de: "Projekte", pt: "Projetos", pl: "Projekty", tr: "Projeler", nl: "Projecten",
};

export function AutomationBreadcrumb({ category, slug }: { category: string; slug: string }) {
  const lang = useUiLang();
  const cat = PROJECT_CATEGORIES.find((c) => c.slug === category);
  const catName = cat ? categoryTitle(cat, lang) : category;
  const root = ROOT_LABEL[lang.toLowerCase().slice(0, 2)] ?? ROOT_LABEL.en;

  return (
    <nav aria-label="Breadcrumb" className="w-full px-6 pt-4 md:px-8">
      <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
        <li>
          <Link href="/projects" className="transition-colors hover:text-foreground">{root}</Link>
        </li>
        <li aria-hidden className="flex items-center"><ChevronRight className="size-3.5" /></li>
        <li>
          <Link href={`/projects/${category}`} className="transition-colors hover:text-foreground">{catName}</Link>
        </li>
        <li aria-hidden className="flex items-center"><ChevronRight className="size-3.5" /></li>
        <li className="min-w-0">
          <span className="truncate font-medium text-foreground" aria-current="page">{slug}</span>
        </li>
      </ol>
    </nav>
  );
}
