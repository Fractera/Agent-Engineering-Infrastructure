// Реестр продуктов одного сервера — четвёртый конфиг слота (владелец 2026-08-15).
//
// 🔒 ЗАЧЕМ ОН ПОЯВИЛСЯ. Пользовательские кейсы лежали плоско и принадлежали
// «проекту». Пока проект один, это работает; на втором ломается сразу. Один
// сервер несёт много продуктов — сегодня посадочная страница, завтра мозг
// компании, послезавтра каталог, — и вопрос «к какому из них относится этот
// кейс» не имеет ответа, если продукта как сущности не существует.
//
// «Проект» местом не является: у него нет адреса, папки и таблиц. У продукта —
// есть, и поэтому кейс, привязанный к продукту, становится исполнимым.
//
// 🔒 КОНТРАКТ ТОТ ЖЕ, ЧТО У ТРЁХ СОСЕДЕЙ (`APP-CONFIG`, `DESIGN-CONFIG`,
// `PLATFORM-CONFIG`): панель пишет, приложение читает на каждый запрос,
// применяется БЕЗ ПЕРЕСБОРКИ. Перевод продукта из `draft` в `live` публикует его
// — ничего не собирается и не разворачивается.
//
// 🔒 ЧЕГО ЗДЕСЬ НЕТ — самих кейсов. Они файлы в `development-docs/USE-CASES/<id>/`
// и едут в репозиторий вместе с кодом. Этот файл — оглавление, папки —
// содержание. Положить сюда тексты кейсов значило бы заставить рантайм-конфиг,
// который читается на каждый запрос, разбирать документ.

import fs from "fs";
import path from "path";
import type { ProjectTypeId } from "@/lib/project-types";

const APP_DIR = process.env.APP_DIR ?? "/opt/fractera/app";
export const PRODUCTS_DIR = "PRODUCTS-CONFIG";
export const PRODUCTS_FILE = "products-config.json";

const configPath = () => path.join(APP_DIR, PRODUCTS_DIR, PRODUCTS_FILE);

/** Где продукт живёт: своим адресом, вкладкой кабинета или вовсе без экрана. */
export type ProductSurface = "public" | "private" | "headless";

/** `draft` — его ещё описывают · `building` — строят · `live` — отдают посетителям. */
export type ProductStatus = "draft" | "building" | "live";

export type Product = {
  id: string;
  title: string;
  type: ProjectTypeId;
  surface: ProductSurface;
  /** Публичный адрес. Пусто у `private` и `headless` — у них его нет и не должно быть. */
  route: string;
  status: ProductStatus;
  createdAt: string;
};

export type ProductsConfig = { version: number; products: Product[] };

const EMPTY: ProductsConfig = { version: 1, products: [] };

/**
 * Поверхность по умолчанию — выводится из структуры проекта.
 *
 * 🔒 ЭТО НЕ УГАДЫВАНИЕ, А ЗНАНИЕ. Анализ конкурентов и мозг компании собирают
 * данные ДЛЯ владельца: публичный адрес им не нужен, а выданный по ошибке
 * означал бы, что внутренняя сводка компании открыта миру. Агентная
 * автоматизация живёт в каналах и расписании — экрана у неё нет вовсе.
 * Остальные девять структур публичны по своей природе.
 *
 * Владелец вправе изменить поверхность, но умолчание обязано быть безопасным:
 * ошибка в сторону «закрыто» стоит одного нажатия, ошибка в сторону «открыто» —
 * утечки.
 */
export function defaultSurface(type: ProjectTypeId): ProductSurface {
  if (type === "competitors" || type === "company-brain") return "private";
  if (type === "agents") return "headless";
  return "public";
}

export function readProductsConfig(): ProductsConfig {
  try {
    const raw = JSON.parse(fs.readFileSync(configPath(), "utf-8")) as unknown;
    if (!raw || typeof raw !== "object") return { ...EMPTY };
    const { version, products } = raw as Partial<ProductsConfig>;
    return {
      version: typeof version === "number" ? version : 1,
      products: Array.isArray(products) ? products.filter(isProduct) : [],
    };
  } catch {
    // Файла нет — это не поломка, а сервер, развёрнутый до появления реестра.
    // Пустой реестр читается как «продуктов ещё не заводили», и это правда.
    return { ...EMPTY };
  }
}

function isProduct(v: unknown): v is Product {
  if (!v || typeof v !== "object") return false;
  const p = v as Partial<Product>;
  return typeof p.id === "string" && p.id.length > 0 && typeof p.type === "string";
}

export function writeProductsConfig(config: ProductsConfig): void {
  fs.mkdirSync(path.join(APP_DIR, PRODUCTS_DIR), { recursive: true });
  fs.writeFileSync(configPath(), JSON.stringify(config, null, 2) + "\n", "utf-8");
}

export function listProducts(): Product[] {
  return readProductsConfig().products;
}

export function findProduct(id: string): Product | null {
  return listProducts().find((p) => p.id === id) ?? null;
}

/**
 * Машинный идентификатор: структура + порядковый номер (`store-1`, `landing-2`).
 *
 * 🔒 НИКОГДА НЕ ИЗ НАЗВАНИЯ. Название придумывает модель, а правит владелец —
 * «Юристы» станет «Юридическими услугами» в первую же неделю. Выводить из него
 * пути значит ломать папку кейсов при каждом переименовании.
 */
function nextId(type: ProjectTypeId, taken: Set<string>): string {
  for (let n = 1; ; n += 1) {
    const id = `${type}-${n}`;
    if (!taken.has(id)) return id;
  }
}

/**
 * Четыре корня продукта. Выводятся из `id` и НЕ хранятся полем.
 *
 * 🔒 ПОЧЕМУ НЕ НАСТРАИВАЮТСЯ. Настраиваемый путь — ещё одно место, которое
 * однажды разойдётся с реальностью, и агент станет писать код туда, где его
 * никто не читает. Выводимый разойтись не может.
 *
 * Это же и граница агента: работая по кейсу продукта, он пишет внутри этих
 * корней и в общие компоненты — чужой корень трогать нельзя. Два продукта в
 * одних файлах — это то, как два набора кейсов молча переписывают друг друга.
 */
export function productPaths(product: Pick<Product, "id" | "route">) {
  const root = product.route === "/";
  return {
    // Корневой продукт живёт в группе маршрутов: она не добавляет сегмент в адрес.
    pages: root ? "app/[lang]/(root)/" : `app/[lang]/${product.id}/`,
    lib: `lib/products/${product.id}/`,
    tablePrefix: `${product.id.replace(/-/g, "_")}_`,
    useCases: `development-docs/USE-CASES/${product.id}/`,
  };
}

/** Занят ли адрес другим продуктом. Двое на одном адресе — это молчаливая пропажа одного из них. */
export function routeTaken(route: string, exceptId?: string): boolean {
  return listProducts().some((p) => p.route === route && p.id !== exceptId && route !== "");
}

export function addProduct(
  input: { title: string; type: ProjectTypeId; surface?: ProductSurface; route?: string },
): Product {
  const config = readProductsConfig();
  const taken = new Set(config.products.map((p) => p.id));
  const surface = input.surface ?? defaultSurface(input.type);
  const id = nextId(input.type, taken);

  // Адрес по умолчанию: первый публичный продукт занимает корень — самый частый
  // случай, когда сайт на сервере один. Следующие встают на свой сегмент;
  // передача корня — отдельное осознанное действие владельца (партия 5).
  const rootHeld = config.products.some((p) => p.route === "/");
  const route = input.route ?? (surface === "public" ? (rootHeld ? `/${id}` : "/") : "");

  const product: Product = {
    id,
    title: input.title.trim() || id,
    type: input.type,
    surface,
    route,
    status: "draft",
    createdAt: new Date().toISOString(),
  };
  config.products.push(product);
  writeProductsConfig(config);
  return product;
}

/**
 * Продукт, с которым владелец работает сейчас.
 *
 * Сегодня продукт один, поэтому «текущий» — единственный. Переключение между
 * продуктами появится вместе с секцией продуктов (партия 4), и тогда выбор
 * станет явным; заводить его сейчас значило бы хранить состояние, которое никто
 * не может изменить.
 */
export function currentProduct(): Product | null {
  return listProducts()[0] ?? null;
}

/**
 * Приём проекта, начатого ДО реестра.
 *
 * На серверах, где владелец уже выбрал структуру, лежит `USE-CASES/RAW/
 * project-type.json` — выбор, сделанный когда продукта как сущности не
 * существовало. Молча его потерять нельзя: человек ответил на вопрос, и ответ
 * обязан пережить появление нового механизма.
 *
 * Читаем файл здесь напрямую, а не через склад кейсов: пять строк чтения дешевле
 * связи между двумя модулями, которая нужна ровно один раз в жизни сервера.
 */
export function adoptLegacyProjectType(): Product | null {
  if (listProducts().length) return null;
  try {
    const legacy = path.join(APP_DIR, "development-docs/USE-CASES/RAW/project-type.json");
    const raw = JSON.parse(fs.readFileSync(legacy, "utf-8")) as { id?: string; title?: string };
    if (!raw?.id) return null;
    const product = addProduct({ title: raw.title || raw.id, type: raw.id as ProjectTypeId });
    // Файл не удаляем: он лежит в папке проекта владельца и ничему не мешает, а
    // стереть чужой файл ради чистоты — не наше право. Источником истины он быть
    // перестал в ту секунду, когда появилась запись продукта.
    return product;
  } catch {
    return null;
  }
}

/** Правка записи. `id` и `createdAt` неизменны — на них держатся все пути продукта. */
export function updateProduct(
  id: string,
  patch: Partial<Pick<Product, "title" | "type" | "surface" | "route" | "status">>,
): Product | null {
  const config = readProductsConfig();
  const i = config.products.findIndex((p) => p.id === id);
  if (i < 0) return null;
  config.products[i] = { ...config.products[i], ...patch };
  writeProductsConfig(config);
  return config.products[i];
}
