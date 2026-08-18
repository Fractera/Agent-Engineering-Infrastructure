// ПРОДУКТ — ЕДИНСТВЕННЫЙ ИСТОЧНИК ПРАВДЫ (решение владельца 2026-08-18).
//
// 🔒 ЧТО ЭТО ЛЕЧИТ. Состояние одного продукта лежало в ЧЕТЫРЁХ местах: запись в
// `PRODUCTS-CONFIG/products-config.json`, кейсы файлами в
// `development-docs/USE-CASES/<id>/CASES/*.md`, вопросы и ответы в `RAW/`, шаги
// строками в таблице `development_steps`. На вопрос «где продукт» приходилось
// собирать ответ из четырёх хранилищ, и любые два из них могли разойтись молча.
//
// Теперь всё, чем продукт ЯВЛЯЕТСЯ, лежит в одном файле:
//
//   PRODUCTS-CONFIG/
//     registry.json      распределитель вечных номеров: список id и maxId
//     <id>.json          ВЕСЬ продукт: запись, вопросы, ответы, кейсы, шаги, фаза
//     <id>.quiz.jsonl    лента разговора Quiz — сырьё, дописывается строками
//
// 🔒 ПОЧЕМУ ЛЕНТА QUIZ — ФАЙЛ РЯДОМ. Она растёт неограниченно и является сырьём,
// а не состоянием: состояние — кейсы, которые из неё родились. Досье читается на
// каждый показ карточек; лента внутри него сделала бы каждый показ чтением
// мегабайта. Файл лежит в той же папке и назван здесь — «всё в одном месте»
// соблюдено.
//
// 🔒 ПОЧЕМУ `registry.json` — НЕ ВТОРОЙ ИСТОЧНИК. В нём нет ни одного факта о
// продукте: только `maxId`, без которого удалённый `p2` возродился бы с таблицами
// прежнего. Список `ids` — порядок показа, и он восстанавливается обходом папки.

import fs from "fs";
import path from "path";
import type { ProjectTypeId } from "@/lib/project-types";

const APP_DIR = process.env.APP_DIR ?? "/opt/fractera/app";
export const PRODUCTS_DIR = "PRODUCTS-CONFIG";
const dir = () => path.join(APP_DIR, PRODUCTS_DIR);
const dossierPath = (id: string) => path.join(dir(), `${id}.json`);
const quizPath = (id: string) => path.join(dir(), `${id}.quiz.jsonl`);
const registryPath = () => path.join(dir(), "registry.json");

// ── что такое продукт ────────────────────────────────────────────────────────

/** Где продукт живёт: своим адресом, вкладкой панели или вовсе без экрана. */
export type ProductSurface = "public" | "private" | "headless";

/**
 * Четыре фазы жизни продукта. Порядок значим — это путь, а не набор.
 *
 * `intake`        — вопросы, ответы, Quiz, подтверждение кейсов;
 * `decomposition` — кейсы разбираются на шаги;
 * `development`   — шаги выполняются;
 * `analysis`      — результат изучается: отсюда рождаются новые шаги или новый
 *                   разбор, и круг идёт заново.
 */
export const PHASES = ["intake", "decomposition", "development", "analysis"] as const;
export type ProductPhase = (typeof PHASES)[number];

/**
 * Стадия внутри фазы. ВЫЧИСЛЯЕТСЯ из данных самого досье и записывается тем же
 * писателем — поэтому разойтись с ними не может.
 */
export const STAGES = ["waiting", "in-progress", "review", "testing", "extra-cycle", "done"] as const;
export type ProductStage = (typeof STAGES)[number];

export type UseCaseRecord = {
  /** Слаг — машинное имя кейса, оно же его адрес в отчётах и шагах. */
  slug: string;
  title: string;
  summary: string;
  confirmed: boolean;
  confirmedAt: string | null;
  updatedAt: string;
};

export const STEP_STATUSES = ["new", "in-progress", "blocked", "done", "cancelled"] as const;
export type StepStatus = (typeof STEP_STATUSES)[number];
export const STEP_IMPORTANCE = ["optional", "mandatory", "critical"] as const;
export type StepImportance = (typeof STEP_IMPORTANCE)[number];

export type StepRecord = {
  number: number;
  title: string;
  status: StepStatus;
  importance: StepImportance;
  /** `decomposition` — служебный шаг разбора; `work` — обычный. */
  kind: "work" | "decomposition";
  /** Слаги кейсов, которым служит шаг. Работа, не служащая ни одному, — работа, которую никто не заказывал. */
  cases: string[];
  plan: string;
  result: string;
  createdAt: string;
  updatedAt: string;
};

export type PlannedPage = { path: string; purpose: string };

export type ProductDossier = {
  /** Вечен и ничего не значит: на нём висят пути логики, таблиц и кейсов. */
  id: string;
  /** Имя владельца на ЕГО языке — нулевой шаг создания. */
  title: string;
  /** Имя поставила машина: она вправе его переписать, человеческое — никогда. */
  titleAuto?: boolean;
  type: ProjectTypeId;
  /** До двухсот знаков, пишет модель по ответам владельца. */
  description?: string;
  surface: ProductSurface;
  /** Публичный адрес. Пусто у `private` и `headless` — у них его нет и не должно быть. */
  route: string;
  /** Показан ли посетителю. Это НЕ фаза: продукт бывает завершён и не опубликован. */
  published: boolean;
  phase: ProductPhase;
  stage: ProductStage;
  createdAt: string;
  updatedAt: string;
  intake: { questions: string[]; answers: string[]; seed: string };
  cases: UseCaseRecord[];
  steps: StepRecord[];
  pages: PlannedPage[];
  /** Переходы фаз: кто и когда. История нужна, чтобы «мы это уже проходили» имело доказательство. */
  history: { at: string; phase: ProductPhase; stage: ProductStage; by: "owner" | "system" }[];
};

/** Карточка продукта: то, чем рисуется список и отвечает инструмент навыка. */
export type ProductSummary = {
  id: string; title: string; type: ProjectTypeId; route: string;
  surface: ProductSurface; published: boolean;
  phase: ProductPhase; stage: ProductStage;
  description?: string;
  counts: { cases: number; confirmed: number; steps: number; stepsDone: number };
};

/** Предел описания. Обрезает тот, кто хранит, — иначе однажды не обрежет никто. */
export const DESCRIPTION_MAX = 200;

// ── распределитель номеров ───────────────────────────────────────────────────

type Registry = { version: number; ids: string[]; maxId: number };

function readRegistry(): Registry {
  try {
    const raw = JSON.parse(fs.readFileSync(registryPath(), "utf-8")) as Partial<Registry>;
    return {
      version: typeof raw.version === "number" ? raw.version : 1,
      ids: Array.isArray(raw.ids) ? raw.ids.filter((x): x is string => typeof x === "string") : [],
      maxId: typeof raw.maxId === "number" ? raw.maxId : 0,
    };
  } catch {
    // Файла нет — восстанавливаем порядок обходом папки. Реестр производен:
    // потерять его неприятно, но не смертельно, а вот `maxId` восстановить
    // можно только по именам, поэтому берётся наибольший номер из увиденных.
    const ids = listIds();
    const maxId = ids.reduce((m, id) => Math.max(m, Number(id.replace(/\D+/g, "")) || 0), 0);
    return { version: 1, ids, maxId };
  }
}

function writeRegistry(r: Registry): void {
  fs.mkdirSync(dir(), { recursive: true });
  fs.writeFileSync(registryPath(), `${JSON.stringify(r, null, 2)}\n`, "utf-8");
}

/** Идентификаторы по файлам на диске — правда о том, какие продукты есть. */
function listIds(): string[] {
  try {
    return fs.readdirSync(dir())
      .filter((f) => /^p\d+\.json$/.test(f))
      .map((f) => f.replace(/\.json$/, ""))
      .sort((a, b) => (Number(a.slice(1)) || 0) - (Number(b.slice(1)) || 0));
  } catch {
    return [];
  }
}

// ── чтение и запись досье ────────────────────────────────────────────────────

function normalize(raw: Partial<ProductDossier>, id: string): ProductDossier {
  const now = new Date().toISOString();
  const cases = Array.isArray(raw.cases) ? raw.cases : [];
  const steps = Array.isArray(raw.steps) ? raw.steps : [];
  return {
    id,
    title: typeof raw.title === "string" && raw.title.trim() ? raw.title : id,
    titleAuto: raw.titleAuto === true ? true : undefined,
    type: (raw.type ?? "custom") as ProjectTypeId,
    description: typeof raw.description === "string" ? raw.description : undefined,
    surface: (raw.surface ?? "public") as ProductSurface,
    route: typeof raw.route === "string" ? raw.route : "",
    published: raw.published === true,
    phase: (PHASES as readonly string[]).includes(raw.phase as string)
      ? (raw.phase as ProductPhase) : "intake",
    stage: (STAGES as readonly string[]).includes(raw.stage as string)
      ? (raw.stage as ProductStage) : "waiting",
    createdAt: raw.createdAt ?? now,
    updatedAt: raw.updatedAt ?? now,
    intake: {
      questions: raw.intake?.questions ?? [],
      answers: raw.intake?.answers ?? [],
      seed: raw.intake?.seed ?? "",
    },
    cases,
    steps,
    pages: Array.isArray(raw.pages) ? raw.pages : [],
    history: Array.isArray(raw.history) ? raw.history : [],
  };
}

export function readProduct(id: string): ProductDossier | null {
  try {
    const raw = JSON.parse(fs.readFileSync(dossierPath(id), "utf-8")) as Partial<ProductDossier>;
    return normalize(raw, id);
  } catch {
    return null;
  }
}

/**
 * Записать досье. ЕДИНСТВЕННЫЙ писатель — через него проходит каждое изменение,
 * поэтому здесь же пересчитывается стадия: она не может разойтись с данными,
 * потому что считается из них в ту же секунду, что и сохраняется.
 */
export function writeProduct(product: ProductDossier): ProductDossier {
  const next: ProductDossier = {
    ...product,
    stage: computeStage(product),
    updatedAt: new Date().toISOString(),
  };
  fs.mkdirSync(dir(), { recursive: true });
  fs.writeFileSync(dossierPath(next.id), `${JSON.stringify(next, null, 2)}\n`, "utf-8");

  const reg = readRegistry();
  if (!reg.ids.includes(next.id)) {
    reg.ids.push(next.id);
    reg.maxId = Math.max(reg.maxId, Number(next.id.replace(/\D+/g, "")) || 0);
    writeRegistry(reg);
  }
  return next;
}

/**
 * Изменить продукт одной операцией: прочитать, поправить черновик, записать.
 *
 * 🔒 ВОЗВРАЩЁННОЕ ЗНАЧЕНИЕ ИГНОРИРУЕТСЯ НАМЕРЕННО, и это не мелочь — так было
 * поймано проверкой 2026-08-18. Сначала функция писала `patch(draft) ?? draft`,
 * то есть доверяла возврату. Стрелка `(d) => d.cases.push(x)` возвращает ЧИСЛО
 * (длину массива), и на запись уходило число вместо продукта: файл терял всё, а
 * первым падал расчёт стадии. Правится не вызывающими, а контрактом: пишется
 * всегда черновик, и никакая случайная стрелка не может его подменить.
 */
export function mutate(
  id: string,
  patch: (p: ProductDossier) => unknown,
): ProductDossier | null {
  const current = readProduct(id);
  if (!current) return null;
  const draft = structuredClone(current);
  patch(draft);
  return writeProduct(draft);
}

// ── стадия: вычисляется из данных того же досье ──────────────────────────────

/**
 * 🔒 СТАДИЯ — ПРОИЗВОДНОЕ, А НЕ МНЕНИЕ. Она отвечает на вопрос «что уже лежит
 * внутри продукта», и ответ целиком в его же массивах. Хранить её отдельным
 * решением значило бы завести второе мнение о том же: закрыли шаг — карточка
 * продолжала бы врать.
 */
export function computeStage(p: ProductDossier): ProductStage {
  if (p.phase === "intake") {
    if (p.intake.questions.length === 0) return "waiting";
    if (p.intake.answers.length === 0 && !p.intake.seed) return "in-progress";
    if (p.cases.length === 0) return "in-progress";
    return p.cases.every((c) => c.confirmed) ? "done" : "review";
  }

  if (p.phase === "decomposition") {
    if (p.steps.length === 0) return "waiting";
    return p.steps.some((s) => s.status !== "done" && s.status !== "cancelled")
      ? "in-progress" : "done";
  }

  if (p.phase === "development") {
    const live = p.steps.filter((s) => s.kind === "work" && s.status !== "cancelled");
    if (live.length === 0) return "waiting";
    if (live.every((s) => s.status === "done")) return "done";
    return live.some((s) => s.status === "in-progress" || s.status === "blocked")
      ? "in-progress" : "waiting";
  }

  // `analysis` — работа человека, вывести её из файлов неоткуда. Поэтому здесь
  // сохраняется то, что поставил владелец, и только «завершено» считается само:
  // разбирать нечего, пока не закрыты все шаги.
  const openWork = p.steps.some((s) => s.kind === "work" && s.status !== "done" && s.status !== "cancelled");
  if (openWork) return "extra-cycle";
  return p.stage === "done" ? "done" : p.stage;
}

/** Перевести продукт в другую фазу. Записывает, кто это сделал. */
export function setPhase(id: string, phase: ProductPhase, by: "owner" | "system"): ProductDossier | null {
  return mutate(id, (p) => {
    if (p.phase === phase) return;
    p.phase = phase;
    p.stage = computeStage({ ...p, phase });
    p.history.push({ at: new Date().toISOString(), phase, stage: p.stage, by });
  });
}

// ── список и карточки ────────────────────────────────────────────────────────

export function listProducts(): ProductDossier[] {
  const reg = readRegistry();
  const onDisk = listIds();
  // Порядок из реестра, всё незнакомое — следом: файл, положенный руками, не
  // должен исчезать из списка только потому, что реестр о нём не знает.
  const ordered = [...reg.ids.filter((id) => onDisk.includes(id)),
                   ...onDisk.filter((id) => !reg.ids.includes(id))];
  return ordered.map((id) => readProduct(id)).filter((p): p is ProductDossier => p !== null);
}

/**
 * Сводка — то, чем рисуются карточки И отвечает инструмент навыка.
 *
 * 🔒 ОДНА ФУНКЦИЯ НА ОБА ПРИМЕНЕНИЯ. Две реализации одного и того же (одна для
 * страницы, другая для инструмента) разошлись бы, и агент видел бы не то, что
 * владелец. Здесь же лежит закон экономии: агенту НИКОГДА не отдаётся содержимое
 * всех продуктов — только эта сводка; досье выдаётся по одному, по имени.
 */
export function productsSummary(): ProductSummary[] {
  return listProducts().map(summaryOf);
}

export function summaryOf(p: ProductDossier): ProductSummary {
  return {
    id: p.id, title: p.title, type: p.type, route: p.route,
    surface: p.surface, published: p.published,
    phase: p.phase, stage: p.stage,
    description: p.description,
    counts: {
      cases: p.cases.length,
      confirmed: p.cases.filter((c) => c.confirmed).length,
      steps: p.steps.filter((s) => s.kind === "work").length,
      stepsDone: p.steps.filter((s) => s.kind === "work" && s.status === "done").length,
    },
  };
}

// ── рождение и смерть продукта ───────────────────────────────────────────────

/**
 * Поверхность по умолчанию — знание, а не угадывание: анализ конкурентов, мозг
 * компании и CRM собирают данные ДЛЯ владельца, и публичный адрес, выданный им
 * по ошибке, означал бы чужие персональные данные, открытые миру. Ошибка в
 * сторону «закрыто» стоит одного нажатия, ошибка в сторону «открыто» — утечки.
 */
export function defaultSurface(type: ProjectTypeId): ProductSurface {
  if (type === "crm" || type === "company-brain" || type === "business-brain" || type === "competitors") {
    return "private";
  }
  if (type === "agents") return "headless";
  return "public";
}

export function routeTaken(route: string, exceptId?: string): boolean {
  return listProducts().some((p) => p.route === route && p.id !== exceptId && route !== "");
}

export function createProduct(input: {
  title: string; type: ProjectTypeId; surface?: ProductSurface; route?: string; titleAuto?: boolean;
}): ProductDossier {
  const reg = readRegistry();
  const next = Math.max(reg.maxId, ...listIds().map((id) => Number(id.slice(1)) || 0), 0) + 1;
  const id = `p${next}`;
  const surface = input.surface ?? defaultSurface(input.type);
  // Первый публичный продукт получает корень, следующие — свой сегмент по id.
  // Адрес выводится, а не спрашивается: спросить его до того, как продукт описан,
  // значит просить решение раньше, чем для него есть основание.
  const route = input.route ?? (surface !== "public" ? ""
    : routeTaken("/") ? `/${id}` : "/");
  const now = new Date().toISOString();

  reg.maxId = next;
  writeRegistry(reg);

  return writeProduct({
    id,
    title: input.title.trim() || id,
    ...(input.titleAuto ? { titleAuto: true } : {}),
    type: input.type,
    surface,
    route,
    published: false,
    phase: "intake",
    stage: "waiting",
    createdAt: now,
    updatedAt: now,
    intake: { questions: [], answers: [], seed: "" },
    cases: [], steps: [], pages: [],
    history: [{ at: now, phase: "intake", stage: "waiting", by: "owner" }],
  });
}

/**
 * Удалить продукт. Досье уезжает в архив, а не исчезает: удаление — единственное
 * действие панели без отката, и человек, нажавший его по ошибке, обязан иметь
 * куда вернуться. `maxId` при этом НЕ уменьшается — иначе следующий продукт
 * получил бы имя удалённого вместе с его таблицами.
 */
export function removeProduct(id: string): { ok: boolean; product: ProductDossier | null } {
  const product = readProduct(id);
  if (!product) return { ok: false, product: null };
  const archive = path.join(dir(), "ARCHIVE");
  try {
    fs.mkdirSync(archive, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    fs.renameSync(dossierPath(id), path.join(archive, `${id}-${stamp}.json`));
    if (fs.existsSync(quizPath(id))) {
      fs.renameSync(quizPath(id), path.join(archive, `${id}-${stamp}.quiz.jsonl`));
    }
  } catch {
    return { ok: false, product };
  }
  const reg = readRegistry();
  reg.ids = reg.ids.filter((x) => x !== id);
  writeRegistry(reg);
  return { ok: true, product };
}

// ── лента Quiz: сырьё рядом с досье ──────────────────────────────────────────

export type QuizTurn = { role: "user" | "assistant"; content: string; at?: string };

export function appendQuiz(id: string, turns: QuizTurn[]): void {
  if (!turns.length) return;
  fs.mkdirSync(dir(), { recursive: true });
  const at = new Date().toISOString();
  const lines = turns.map((t) => JSON.stringify({ at, ...t })).join("\n");
  fs.appendFileSync(quizPath(id), `${lines}\n`, "utf-8");
}

export function readQuiz(id: string): QuizTurn[] {
  try {
    return fs.readFileSync(quizPath(id), "utf-8")
      .split("\n").filter(Boolean)
      .map((l) => JSON.parse(l) as QuizTurn);
  } catch {
    return [];
  }
}

/** Пути, которые показываются человеку: где лежит его продукт целиком. */
export function productFiles(id: string): { dossier: string; quiz: string } {
  return { dossier: `${PRODUCTS_DIR}/${id}.json`, quiz: `${PRODUCTS_DIR}/${id}.quiz.jsonl` };
}

/**
 * Четыре корня продукта — выводятся из записи, никогда не выдумываются.
 *
 * Страницы идут от АДРЕСА, потому что в Next имя папки и есть сегмент адреса;
 * остальное держится за вечный `id` и при переезде продукта не двигается.
 */
export function productPaths(p: Pick<ProductDossier, "id" | "route">) {
  const segment = p.route.replace(/^\/+|\/+$/g, "");
  return {
    pages: segment ? `app/[lang]/(publicLayer)/${segment}/` : "app/[lang]/(publicLayer)/",
    lib: `lib/products/${p.id}/`,
    tablePrefix: `${p.id.replace(/-/g, "_")}_`,
    dossier: `${PRODUCTS_DIR}/${p.id}.json`,
  };
}
