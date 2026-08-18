// Дерево страниц продукта (2026-08-18). Серверный компонент.
//
// 🔒 ДВА РАЗНЫХ ЗНАНИЯ, И ИХ НЕЛЬЗЯ ПУТАТЬ. План — НАМЕРЕНИЕ, он лежит в досье
// (`pages[]`). Построенное — ФАКТ, и он не хранится нигде: список файлов есть
// производное файловой системы, и записанный руками расходится с ней в первую
// неделю (агент создал страницу, файл не тронул). Поэтому факт считается обходом
// папок при каждом показе — `scanBuiltRoutes()` из `lib/product-pages.ts`.
//
// 🔒 ТОЛЬКО СТРАНИЦЫ ЭТОГО ПРОДУКТА. Продукт на `/shop` владеет всем, что начинается
// с `/shop`. У продукта на корне так нельзя: под `/` лежат и блог, и каталог, и
// правовые страницы стартера — они принадлежат приложению, а не ему. Отчёт,
// вывалывавший полтора десятка служебных маршрутов, владелец уже видел и назвал
// шумом; поэтому корневому продукту показываются корень и то, что он сам
// запланировал.
//
// 🔒 НАЖАТИЕ РАСКРЫВАЕТ, А НЕ УВОДИТ. `<details>` без JavaScript: внутри — путь
// файла, назначение из плана и шаги, которые эту страницу называют. Ответ на
// вопрос «что здесь работает» обязан быть рядом со страницей, а не в другом месте.

import { FileCode2, FolderTree, Check, CircleDashed, AlertTriangle } from "lucide-react";
import { scanBuiltRoutes, normalizeRoute } from "@/lib/product-pages";
import type { ProductDossier } from "@/lib/product-store";
import { Muted, Small, Mono, H3 } from "../../_components/type";

type Node = {
  route: string;
  depth: number;
  state: "built" | "planned" | "extra";
  purpose: string;
  /** Номера шагов, в тексте которых эта страница названа. */
  steps: number[];
  /** Заголовки кейсов, которым служит страница: хранятся слаги, показываются имена. */
  cases: string[];
};

export function pagesTreeOf(product: ProductDossier): Node[] {
  const root = normalizeRoute(product.route || "/");
  const isRootProduct = root === "/";

  const planned = product.pages.map((p) => ({
    route: normalizeRoute(p.path), purpose: p.purpose, cases: p.cases ?? [],
  }));
  const plannedByRoute = new Map(planned.map((p) => [p.route, p]));

  // Слаг → заголовок. Связь хранится СЛАГОМ (он вечен), а человеку показывается имя
  // кейса. Слаг, кейса для которого больше нет, показывается как есть: промолчать о
  // висящей связи хуже, чем назвать её.
  const caseTitle = new Map(product.cases.map((c) => [c.slug, c.title]));

  // Своё — то, что начинается с корня продукта. Корневому продукту принадлежат
  // только его корень и то, что он сам запланировал: остальное под `/` — страницы
  // приложения, и присвоить их ему значило бы соврать о границе.
  const built = scanBuiltRoutes().filter((r) =>
    isRootProduct ? r === "/" || plannedByRoute.has(r) : r === root || r.startsWith(`${root}/`));

  const routes = [...new Set([...built, ...planned.map((p) => p.route)])].sort();

  return routes.map((route) => {
    const plan = plannedByRoute.get(route);
    const inPlan = plan !== undefined;
    const isBuilt = built.includes(route);
    const relative = route === root ? "" : route.slice(root === "/" ? 1 : root.length);
    return {
      route,
      depth: relative.split("/").filter(Boolean).length,
      state: isBuilt ? (inPlan ? "built" : "extra") : "planned",
      purpose: plan?.purpose ?? "",
      cases: (plan?.cases ?? []).map((slug) => caseTitle.get(slug) ?? slug),
      steps: product.steps
        .filter((s) => `${s.title} ${s.plan} ${s.result}`.includes(route) && route !== "/")
        .map((s) => s.number),
    };
  });
}

export function PagesTree(
  { product, nodes, ui }: {
    product: ProductDossier;
    nodes: Node[];
    ui: {
      empty: string; built: string; planned: string; extra: string;
      purpose: string; steps: string; pagesRoot: string; cases: string; noCases: string;
    };
  },
) {
  if (nodes.length === 0) return <Muted>{ui.empty}</Muted>;

  const segment = product.route.replace(/^\/+|\/+$/g, "");
  const folder = segment
    ? `app/[lang]/(publicLayer)/${segment}/`
    : "app/[lang]/(publicLayer)/";

  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5">
        <FolderTree size={13} className="shrink-0 text-muted-foreground" />
        <Mono>{folder}</Mono>
      </p>

      <ul className="space-y-1">
        {nodes.map((node) => (
          <li key={node.route} style={{ paddingLeft: `${node.depth * 18}px` }}>
            <details className="group rounded-md border border-border">
              <summary className="flex cursor-pointer list-none items-center gap-2 px-2.5 py-2 hover:bg-muted/50">
                <span className="text-muted-foreground transition-transform group-open:rotate-90">›</span>
                {node.state === "built" && <Check size={12} className="shrink-0 text-emerald-600 dark:text-emerald-400" />}
                {node.state === "planned" && <CircleDashed size={12} className="shrink-0 text-muted-foreground" />}
                {node.state === "extra" && <AlertTriangle size={12} className="shrink-0 text-amber-600 dark:text-amber-400" />}
                <Mono className="truncate">{node.route}</Mono>
                <Small className="ml-auto shrink-0">
                  {node.state === "built" ? ui.built : node.state === "planned" ? ui.planned : ui.extra}
                </Small>
              </summary>

              <div className="border-t border-border px-2.5 py-2">
                <p className="flex items-center gap-1.5">
                  <FileCode2 size={12} className="shrink-0 text-muted-foreground" />
                  <Mono>
                    {node.route === "/" ? `${folder}page.tsx`
                      : `${folder}${node.route.replace(/^\/+/, "").split("/").slice(segment ? 1 : 0).join("/")}/page.tsx`}
                  </Mono>
                </p>

                <p className="mt-1.5 text-[13px] leading-relaxed text-foreground">
                  <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{ui.purpose}: </span>
                  {node.purpose || "—"}
                </p>

                {/* 🔒 СВЯЗЬ С КЕЙСАМИ — ЭТО ОТВЕТ НА «ЗАЧЕМ СТРАНИЦА ВООБЩЕ ЕСТЬ».
                    Назначение говорит, что на ней работает; кейс — чью задачу она
                    закрывает. Одна страница закрывает несколько сценариев чаще, чем
                    один, поэтому здесь список. Страница без кейса — законное
                    состояние служебной страницы, и оно сказано словами, а не
                    пустотой: пустое место читается как недоделка. */}
                <p className="mt-1.5 text-[13px] leading-relaxed text-foreground">
                  <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{ui.cases}: </span>
                  {node.cases.length > 0 ? node.cases.join(" · ") : ui.noCases}
                </p>

                {node.steps.length > 0 && (
                  <p className="mt-1.5">
                    <Small>{ui.steps}: {node.steps.map((n) => `#${n}`).join(", ")}</Small>
                  </p>
                )}
              </div>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}

export { type Node as PageNode };
export const PagesTreeHeading = H3;
