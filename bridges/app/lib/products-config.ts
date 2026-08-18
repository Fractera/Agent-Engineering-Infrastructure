// Реестр продуктов — ТОНКАЯ ОБЁРТКА над досье (2026-08-18).
//
// 🔒 ЧТО ИЗМЕНИЛОСЬ. Раньше здесь жило само хранилище: один
// `PRODUCTS-CONFIG/products-config.json` со списком записей. Теперь правда лежит
// в `PRODUCTS-CONFIG/<id>.json` — по файлу на продукт, вместе с его вопросами,
// ответами, кейсами и шагами (`lib/product-store.ts`). Этот модуль остался, чтобы
// четырнадцать островков, страницы и маршруты API не переписывались разом: имена
// и формы, которые они ждут, сохранены дословно.
//
// 🔒 ПОЧЕМУ ОБЁРТКА, А НЕ УДАЛЕНИЕ. Переписать хранилище и всех вызывающих одним
// коммитом — это ревизия, которую нельзя проверить по частям. Обёртка позволяет
// доказать хранилище отдельно, а вызывающих переводить по одному, и в любой
// момент видеть, что панель работает.
//
// 🪦 `writeProductsConfig()` больше НЕ пишет общий файл: он раскладывает записи по
// досье. Сам файл `products-config.json` остаётся на диске нетронутым до уборки —
// его не читает никто, и это единственный честный способ ничего не потерять, пока
// новое хранилище не доказано.

import type { ProjectTypeId } from "@/lib/project-types";
import {
  createProduct, listProducts as listDossiers, mutate, readProduct,
  removeProduct as removeDossier, routeTaken as routeTakenInStore,
  defaultSurface as defaultSurfaceInStore, productPaths as pathsInStore,
  DESCRIPTION_MAX as DESCRIPTION_MAX_STORE,
  type ProductDossier, type ProductPhase, type ProductSurface as StoreSurface,
} from "@/lib/product-store";

export const PRODUCTS_DIR = "PRODUCTS-CONFIG";
/** 🪦 Прежний общий файл. Оставлен именем ради вызывающих; хранилище его не читает. */
export const PRODUCTS_FILE = "products-config.json";

export type ProductSurface = StoreSurface;
export type ProductStatus = "draft" | "building" | "live";

/**
 * Восемь позиций прежнего линейного состояния. Сохранены для вызывающих; правда
 * теперь в паре «фаза + стадия» досье, а здесь — её перевод на старый язык.
 */
export const DEV_STATUSES = [
  "not-started", "decomposition", "skeleton", "revision",
  "building", "acceptance", "extra-tasks", "done",
] as const;

export type ProductDevStatus = (typeof DEV_STATUSES)[number];

export function isDevStatus(v: unknown): v is ProductDevStatus {
  return typeof v === "string" && (DEV_STATUSES as readonly string[]).includes(v);
}

export type Product = {
  id: string;
  title: string;
  type: ProjectTypeId;
  surface: ProductSurface;
  route: string;
  status: ProductStatus;
  createdAt: string;
  titleAuto?: boolean;
  description?: string;
  devStatus?: ProductDevStatus;
  steps?: number[];
};

export const DESCRIPTION_MAX = DESCRIPTION_MAX_STORE;

export type ProductsConfig = { version: number; products: Product[]; maxId?: number };

// ── перевод между досье и прежней записью ────────────────────────────────────

/**
 * Фаза и стадия → восемь прежних позиций.
 *
 * Перевод беднее источника, и это названо честно: `skeleton` и `revision`
 * прежнего списка были стадиями внутри разбора, а не отдельными состояниями, и
 * обратно из пары их не получить. Вызывающие, которым важна точность, читают
 * досье; здесь — совместимость.
 */
function devStatusFrom(p: ProductDossier): ProductDevStatus {
  if (p.phase === "intake") return "not-started";
  if (p.phase === "decomposition") return "decomposition";
  if (p.phase === "development") return "building";
  if (p.stage === "done") return "done";
  if (p.stage === "extra-cycle") return "extra-tasks";
  return "acceptance";
}

function phaseFrom(devStatus: ProductDevStatus): ProductPhase {
  switch (devStatus) {
    case "not-started": return "intake";
    case "decomposition": return "decomposition";
    case "skeleton":
    case "revision":
    case "building": return "development";
    default: return "analysis";
  }
}

function toProduct(p: ProductDossier): Product {
  return {
    id: p.id,
    title: p.title,
    type: p.type,
    surface: p.surface,
    route: p.route,
    // Публикация: в досье это булево «показан ли посетителю». Промежуточного
    // `building` там нет намеренно — оно описывало не публикацию, а работу, и для
    // работы теперь есть фаза.
    status: p.published ? "live" : "draft",
    createdAt: p.createdAt,
    ...(p.titleAuto ? { titleAuto: true } : {}),
    ...(p.description ? { description: p.description } : {}),
    devStatus: devStatusFrom(p),
    steps: p.steps.map((s) => s.number).sort((a, b) => a - b),
  };
}

// ── чтение ───────────────────────────────────────────────────────────────────

export function readProductsConfig(): ProductsConfig {
  const dossiers = listDossiers();
  const maxId = dossiers.reduce((m, p) => Math.max(m, Number(p.id.replace(/\D+/g, "")) || 0), 0);
  return { version: 1, products: dossiers.map(toProduct), maxId };
}

/**
 * Записать список записей.
 *
 * Раскладывает поля записи по досье и НЕ трогает ничего, чего в записи нет:
 * вопросы, ответы, кейсы и шаги живут в досье, и обёртка не имеет права стереть
 * их только потому, что вызывающий передал устаревшую форму продукта.
 */
export function writeProductsConfig(config: ProductsConfig): void {
  for (const product of config.products) applyToDossier(product.id, product);
}

function applyToDossier(id: string, patch: Partial<Product>): Product | null {
  const next = mutate(id, (d) => {
    if (patch.title !== undefined && patch.title.trim()) d.title = patch.title.trim();
    if (patch.type !== undefined) d.type = patch.type;
    if (patch.surface !== undefined) d.surface = patch.surface;
    if (patch.route !== undefined) d.route = patch.route;
    if (patch.titleAuto !== undefined) d.titleAuto = patch.titleAuto ? true : undefined;
    if (patch.status !== undefined) d.published = patch.status === "live";
    if (patch.devStatus !== undefined && isDevStatus(patch.devStatus)) d.phase = phaseFrom(patch.devStatus);
    if (patch.description !== undefined) {
      const text = patch.description.trim().slice(0, DESCRIPTION_MAX);
      d.description = text || undefined;
    }
    // `steps` прежней записи — только НОМЕРА, а в досье лежат сами шаги. Из
    // номеров записи не восстановить, поэтому список игнорируется: он производен
    // от `steps[]` досье и пересчитывается при каждом чтении.
  });
  return next ? toProduct(next) : null;
}

export function listProducts(): Product[] {
  return listDossiers().map(toProduct);
}

export function findProduct(id: string): Product | null {
  const p = readProduct(id);
  return p ? toProduct(p) : null;
}

export function productPaths(product: Pick<Product, "id" | "route">) {
  const paths = pathsInStore(product);
  // Прежнее имя четвёртого корня сохранено: вызывающие показывают его человеку.
  return { ...paths, useCases: paths.dossier };
}

export function routeTaken(route: string, exceptId?: string): boolean {
  return routeTakenInStore(route, exceptId);
}

export function defaultSurface(type: ProjectTypeId): ProductSurface {
  return defaultSurfaceInStore(type);
}

/** Отдать корень `/` другому продукту: прежний уезжает на свой сегмент. */
export function giveRootTo(id: string): { ok: boolean; movedFrom?: string; movedTo?: string } {
  const target = readProduct(id);
  if (!target) return { ok: false };
  const holder = listDossiers().find((p) => p.route === "/" && p.id !== id);
  if (holder) {
    mutate(holder.id, (d) => { d.route = `/${d.id}`; });
  }
  mutate(id, (d) => { d.route = "/"; });
  return { ok: true, movedFrom: holder?.id, movedTo: id };
}

export function addProduct(input: {
  title: string; type: ProjectTypeId; surface?: ProductSurface; route?: string; titleAuto?: boolean;
}): Product {
  return toProduct(createProduct(input));
}

/** Продукт, с которым владелец работает сейчас, — первый в порядке реестра. */
export function currentProduct(): Product | null {
  return listProducts()[0] ?? null;
}

/**
 * Продукт из адреса, или текущий.
 *
 * Название пришло СНАРУЖИ, а не выведено здесь: страница берёт его из своего
 * пути, и двух мнений о том, чей продукт открыт, не существует.
 */
export function activeProduct(requested?: string | null): Product | null {
  if (requested) {
    const named = findProduct(requested);
    if (named) return named;
  }
  return currentProduct();
}

/**
 * 🪦 Приём проекта, начатого до реестра продуктов. Делать нечего: продукт теперь
 * рождается вместе со своим досье, и «проекта без продукта» не бывает. Оставлено
 * именем ради вызывающих и возвращает текущий продукт, если он есть.
 */
export function adoptLegacyProjectType(): Product | null {
  return currentProduct();
}

export function devStatusOf(product: Pick<Product, "devStatus">): ProductDevStatus {
  return isDevStatus(product.devStatus) ? product.devStatus : "not-started";
}

export function stepsOf(product: Pick<Product, "steps">): number[] {
  return normalizeSteps(product.steps);
}

export function normalizeSteps(input: unknown): number[] {
  if (!Array.isArray(input)) return [];
  const numbers = input
    .map((x) => (typeof x === "number" ? x : Number(x)))
    .filter((n) => Number.isInteger(n) && n > 0);
  return [...new Set(numbers)].sort((a, b) => a - b);
}

export function updateProduct(
  id: string,
  patch: Partial<Pick<
    Product,
    "title" | "type" | "surface" | "route" | "status" | "titleAuto" | "description" | "devStatus" | "steps"
  >>,
): Product | null {
  return applyToDossier(id, patch);
}

export function removeProduct(id: string): { ok: boolean; product: Product | null } {
  const { ok, product } = removeDossier(id);
  return { ok, product: product ? toProduct(product) : null };
}
