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
  /**
   * Имя поставлено машиной, а не человеком.
   *
   * 🔒 БЕЗ ЭТОГО ФЛАГА ИМЯ ВРЁТ (найдено проверкой живьём 2026-08-15). До того,
   * как продукту даст имя модель, панель зовёт его названием структуры —
   * «Мозг компании». Владелец передумывает и берёт посадочную страницу; имя
   * менять нельзя, если его выбрал человек, — и лендинг остаётся «Мозгом
   * компании» навсегда.
   *
   * Отличить одно от другого сравнением строк невозможно: «Мозг компании» —
   * законное имя и для владельца тоже. Поэтому машина помечает СВОИ имена и
   * вправе их переписывать; человеческое имя не трогается никогда.
   */
  titleAuto?: boolean;
  /**
   * Что это за продукт — двумя фразами, НА ЯЗЫКЕ ВЛАДЕЛЬЦА (владелец 2026-08-16).
   *
   * 🔒 ЭТО ЕДИНСТВЕННОЕ ПОЛЕ КОНФИГА НЕ НА АНГЛИЙСКОМ, И ИСКЛЮЧЕНИЕ ОСОЗНАННОЕ.
   * Правило шага 509 гласит: машинный слой одноязычен, потому что его грузит
   * агент на старте каждой сессии и второй язык оплачивается токенами вечно.
   * Правило остаётся в силе для всего остального — `id`, `route`, `type`,
   * `surface`, имена файлов, `PAGES.md`.
   *
   * Здесь оно уступает по прямой причине: описание читает ЧЕЛОВЕК и никто
   * больше. Владелец открывает панель, видит карточку и должен за две секунды
   * понять, какой из продуктов перед ним, — на английском это работает ровно для
   * тех, кто на нём думает. Цена ограничена: двести знаков на продукт, а
   * продуктов у сервера единицы.
   *
   * 🔒 ИМЯ ПРИ ЭТОМ ОСТАЁТСЯ АНГЛИЙСКИМ. Оно попадает в отчёты, в заголовок
   * плана страниц и в разговор с агентом — то есть живёт в машинном слое, в
   * отличие от описания. Разделение проведено намеренно: имя для машины,
   * описание для человека.
   *
   * Не длиннее 200 знаков — обрезается при записи, а не «желательно».
   */
  description?: string;
};

/** Предел описания. Живёт здесь, а не в вызывающем коде: обрезать обязан тот, кто хранит. */
export const DESCRIPTION_MAX = 200;

export type ProductsConfig = {
  version: number;
  products: Product[];
  /**
   * Наибольший выданный номер — включая продукты, которых уже нет.
   *
   * 🔒 БЕЗ НЕГО `id` ПЕРЕИСПОЛЬЗУЕТСЯ ПОСЛЕ УДАЛЕНИЯ. Счётчик берёт первый
   * свободный номер; удалив `p2` и заведя следующий продукт, владелец получил бы
   * `p2` второй раз — с таблицами `p2_*` прежнего продукта, его папкой в архиве
   * и его логикой в `lib/products/p2/`. Идентификатор обязан быть вечным даже
   * после смерти продукта, иначе «вечный id» из шага 509 — не свойство, а
   * совпадение.
   *
   * Поле необязательное: конфиг, где его нет, читается как прежде.
   */
  maxId?: number;
};

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
  // 🔒 CRM ЗАКРЫТА ПО УМОЛЧАНИЮ, И ЭТО НЕ ОСТОРОЖНОСТЬ, А ЕДИНСТВЕННЫЙ ВЕРНЫЙ
  // ОТВЕТ (2026-08-16). В ней лежат чужие персональные данные — имена, телефоны,
  // переписка, суммы сделок. Публичный адрес, выданный ей по умолчанию, означал
  // бы клиентскую базу, открытую миру, и узнал бы об этом владелец последним.
  // Правило умолчания записано парой строк выше: ошибка в сторону «закрыто»
  // стоит одного нажатия, ошибка в сторону «открыто» — утечки.
  if (type === "competitors" || type === "company-brain" || type === "crm") return "private";
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
 * Машинный идентификатор: `p1`, `p2`, … — и ничего больше.
 *
 * 🔒 НИКОГДА НЕ ИЗ НАЗВАНИЯ. Название придумывает модель, а правит владелец:
 * «Юристы» станет «Юридическими услугами» в первую же неделю. Выводить из него
 * пути значит ломать папку кейсов при каждом переименовании.
 *
 * 🔒 И НИКОГДА НЕ ИЗ СТРУКТУРЫ — это выяснилось проверкой живьём (2026-08-15).
 * Сначала здесь стояло `<тип>-<номер>`: `store-1`, `landing-2`. Читается лучше,
 * но структуру владелец МЕНЯЕТ — передумал на втором экране, и продукт типа
 * «мозг компании» навсегда остался с идентификатором `store-1`, а за ним и
 * `lib/products/store-1/` с таблицами `store_1_*` у продукта, который магазином
 * не является.
 *
 * Идентификатор обязан пережить смену всего остального, поэтому он не значит
 * ничего. Читаемость даёт название, а адрес — `route`.
 */
function nextId(taken: Set<string>, maxIssued = 0): string {
  // 🔒 НАЧИНАЕМ ПОСЛЕ НАИБОЛЬШЕГО КОГДА-ЛИБО ВЫДАННОГО, а не после наибольшего
  // живого: удалённый `p2` не имеет права воскреснуть у другого продукта — за
  // его номером остались таблицы `p2_*` и папка в архиве.
  for (let n = maxIssued + 1; ; n += 1) {
    const id = `p${n}`;
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
  // 🔒 СТРАНИЦЫ — ЕДИНСТВЕННОЕ ИСКЛЮЧЕНИЕ: они идут от АДРЕСА, а не от `id`.
  // В Next имя папки маршрута и есть сегмент адреса, поэтому продукт на `/shop`
  // обязан лежать в `app/[lang]/shop/` — иначе адрес будет другим. Плата за это
  // названа честно: переезд продукта на другой адрес переименовывает папку
  // страниц. Всё остальное (логика, таблицы, кейсы) держится за вечный `id` и
  // при переезде не двигается вовсе.
  const segment = product.route.replace(/^\//, "") || product.id;
  return {
    // Корневой продукт живёт в группе маршрутов: она не добавляет сегмент в адрес.
    pages: root ? "app/[lang]/(root)/" : `app/[lang]/${segment}/`,
    lib: `lib/products/${product.id}/`,
    tablePrefix: `${product.id.replace(/-/g, "_")}_`,
    useCases: `development-docs/USE-CASES/${product.id}/`,
  };
}

/** Занят ли адрес другим продуктом. Двое на одном адресе — это молчаливая пропажа одного из них. */
export function routeTaken(route: string, exceptId?: string): boolean {
  return listProducts().some((p) => p.route === route && p.id !== exceptId && route !== "");
}

/**
 * Адрес, положенный продукту с такой поверхностью.
 *
 * Первый публичный занимает корень — самый частый случай, когда сайт на сервере
 * один. Следующие встают на свой сегмент; передача корня — отдельное осознанное
 * действие владельца (партия 5). У `private` и `headless` адреса нет: вкладка
 * кабинета и телеграм-агент публичной страницей не владеют.
 */
function routeFor(surface: ProductSurface, id: string, others: Product[]): string {
  if (surface !== "public") return "";
  return others.some((p) => p.route === "/") ? `/${id}` : "/";
}

/**
 * Отдать корень `/` другому продукту (партия 5).
 *
 * 🔒 ЭТО РАЗРЕШЕНО, НО ЯВНО. Человек начинает с посадочной страницы, а через
 * месяц решает, что главным будет магазин, — запретить ему это значило бы
 * загнать в тупик на ровном месте. Но операция не бесплатна: адреса всех страниц
 * прежнего владельца корня меняются, поэтому она делается отдельным действием, а
 * не побочным эффектом другой правки.
 *
 * Прежний владелец корня не остаётся без адреса: он получает свой сегмент. Иначе
 * публичный продукт стал бы недоступен ни по какому пути — ровно тот дефект,
 * который уже был пойман на смене поверхности.
 */
export function giveRootTo(id: string): { ok: boolean; movedFrom?: string; movedTo?: string } {
  const config = readProductsConfig();
  const target = config.products.find((p) => p.id === id);
  if (!target || target.surface !== "public") return { ok: false };

  const previous = config.products.find((p) => p.route === "/" && p.id !== id);
  if (previous) previous.route = `/${previous.id}`;
  target.route = "/";
  writeProductsConfig(config);
  return { ok: true, movedFrom: previous?.id, movedTo: previous?.route };
}

export function addProduct(
  input: {
    title: string; type: ProjectTypeId; surface?: ProductSurface; route?: string;
    /** Имя поставила машина (название структуры) — его можно будет переписать. */
    titleAuto?: boolean;
  },
): Product {
  const config = readProductsConfig();
  const taken = new Set(config.products.map((p) => p.id));
  const surface = input.surface ?? defaultSurface(input.type);
  // Живые номера тоже учитываются: конфиг мог родиться до появления `maxId`.
  const maxLive = Math.max(0, ...config.products.map((p) => Number(String(p.id).replace(/\D+/g, "")) || 0));
  const id = nextId(taken, Math.max(config.maxId ?? 0, maxLive));
  const route = input.route ?? routeFor(surface, id, config.products);

  const product: Product = {
    id,
    title: input.title.trim() || id,
    type: input.type,
    surface,
    route,
    status: "draft",
    createdAt: new Date().toISOString(),
    ...(input.titleAuto ? { titleAuto: true } : {}),
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
 * Продукт, с которым владелец работает СЕЙЧАС (партия 5).
 *
 * 🔒 ВЫБОР ЖИВЁТ В АДРЕСЕ, А НЕ В ФАЙЛЕ. `?product=p2` — и всё: ссылка делится,
 * страница переживает перезагрузку, кнопка «назад» работает, и ничего не
 * ломается без JavaScript. Поле «текущий» в конфиге было бы состоянием ОДНОГО
 * человека, записанным в файл проекта, который едет в репозиторий и общий для
 * всех — два окна панели начали бы перебивать выбор друг у друга.
 *
 * Неизвестный или пустой идентификатор молча уступает первому продукту: адрес
 * приходит снаружи, и опечатка в нём не повод показать пустой экран.
 */
export function activeProduct(requested?: string | null): Product | null {
  const all = listProducts();
  if (requested) {
    const found = all.find((p) => p.id === requested);
    if (found) return found;
  }
  return all[0] ?? null;
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
    // Имя тоже машинное — это было название структуры, а не выбор владельца.
    const product = addProduct({
      title: raw.title || raw.id, type: raw.id as ProjectTypeId, titleAuto: true,
    });
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
  patch: Partial<Pick<Product, "title" | "type" | "surface" | "route" | "status" | "titleAuto" | "description">>,
): Product | null {
  const config = readProductsConfig();
  const i = config.products.findIndex((p) => p.id === id);
  if (i < 0) return null;

  const next = { ...config.products[i], ...patch };

  // Предел описания держит хранилище, а не тот, кто пишет: вызывающих будет
  // несколько (модель, форма владельца, будущий импорт), и договориться они
  // между собой не смогут. Пустая строка = «описания нет», поле снимается
  // целиком, чтобы в конфиге не копились ключи со значением "".
  if (patch.description !== undefined) {
    const d = patch.description.trim().slice(0, DESCRIPTION_MAX);
    if (d) next.description = d;
    else delete next.description;
  }

  // 🔒 ПОВЕРХНОСТЬ И АДРЕС МЕНЯЮТСЯ ПАРОЙ (найдено проверкой живьём 2026-08-15).
  //
  // Владелец выбрал «мозг компании» — продукт стал `private`, адреса не получил,
  // и это верно. Затем передумал на «посадочную страницу»: поверхность стала
  // `public`, а адрес остался пустым — публичный продукт, которого нет ни по
  // какому пути. Отказа при этом никто не увидел бы: и панель, и конфиг
  // выглядели исправными.
  //
  // Поэтому адрес пересчитывается всякий раз, когда меняется поверхность и адрес
  // не назван явно: стал публичным без адреса — получает его; перестал быть
  // публичным — теряет, чтобы за ним не осталось занятого корня, которого он уже
  // не показывает.
  if (patch.surface && patch.route === undefined && patch.surface !== config.products[i].surface) {
    const others = config.products.filter((p) => p.id !== id);
    next.route = patch.surface === "public"
      ? (next.route || routeFor("public", id, others))
      : "";
  }

  config.products[i] = next;
  writeProductsConfig(config);
  return next;
}

/**
 * Убрать ЗАПИСЬ продукта из реестра (владелец 2026-08-16).
 *
 * 🔒 ЗАПИСЬ И ДОКУМЕНТЫ УБИРАЮТСЯ РАЗНЫМИ ФУНКЦИЯМИ, И ЭТО НЕ ДРОБЛЕНИЕ РАДИ
 * дробления. Здесь `PRODUCTS-CONFIG`, там папка кейсов; у них разные способы
 * отказать и разная цена отказа. Слепив их в одну, мы получили бы состояние
 * «запись стёрта, папка осталась» без всякого способа о нём узнать.
 *
 * 🔒 `id` НЕ ПЕРЕИСПОЛЬЗУЕТСЯ ПОСЛЕ УДАЛЕНИЯ. Счётчик берёт максимум из
 * СУЩЕСТВОВАВШИХ когда-либо, а не из оставшихся: иначе удалив `p2` и заведя
 * новый продукт, владелец получил бы `p2` второй раз — с чужими таблицами
 * `p2_*` и чужой папкой в архиве. Идентификатор вечен даже после смерти
 * продукта.
 */
export function removeProduct(id: string): { ok: boolean; product: Product | null } {
  const config = readProductsConfig();
  const product = config.products.find((p) => p.id === id) ?? null;
  if (!product) return { ok: false, product: null };

  config.products = config.products.filter((p) => p.id !== id);
  // Максимальный выданный номер запоминается, чтобы следующий продукт не занял
  // освободившийся. Поле необязательное: конфиг, где его нет, читается как
  // прежде — счётчик тогда просто считает по живым.
  const used = Number(String(product.id).replace(/\D+/g, "")) || 0;
  config.maxId = Math.max(config.maxId ?? 0, used);
  writeProductsConfig(config);
  return { ok: true, product };
}
