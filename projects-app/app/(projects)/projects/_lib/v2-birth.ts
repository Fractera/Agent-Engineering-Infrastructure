// РОЖДЕНИЕ v2-АВТОМАТИЗАЦИИ (шаг 301) — кнопка «Создать автоматизацию» клонирует замороженный v2-стартер
// в новую папку категории. Одна функция `createV2Automation` — общий путь для формы владельца и будущего
// вызова ИИ, как и v1-`createFrozenProject`.
//
// ЧТО ТАКОЕ v2-РОЖДЕНИЕ. Стартер `_lib/starters/stream/en/` — самодостаточная папка (закон 0): всё её
// поведение и адрес живут внутри. Поэтому рождение = ПРОСТАЯ КОПИЯ ПАПКИ, и всего две правки идентичности:
//   1. АДРЕС на диске — стартер держит его в ОДНОМ месте (`_lib/paths.ts` → `AUTOMATION_ADDRESS`), плюс он
//      мелькает в прозе и в URL cron.json; заменяем строку `other/frozen-template-v-2` на адрес
//      новорождённого во всех текстовых файлах копии;
//   2. ГЛОБАЛЬНАЯ идентичность ядра — свежая `passport.uuid`, имя владельца, автор, ПУСТЫЕ кейсы/история
//      (описание рождается в Quiz ПОСЛЕ создания). `lifecycle` остаётся `frozen-template`, все узлы скрыты:
//      новорождённый показывает пустой холст и приглашение описать кейсы (шаг 301, поток владельца).
//
// Рантайм-данные стартера (его доказательные строки шага 300) НЕ клонируются: новая автоматизация
// начинает с пустого склада.
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { projectsRoot } from "@/lib/nodes";
import { PROJECT_CATEGORIES } from "../_shared/categories";

// Адрес стартера-донора на диске (под lib-областью платформы, вне зоны реальных автоматизаций).
const DONOR_ADDRESS = "other/frozen-template-v-2";
const DONOR_REL = ["_lib", "starters", "stream", "en"];

// Слаг новой автоматизации: буква впереди, дальше строчная латиница/цифры/дефис (как SLUG_RE стартера v1).
const SLUG_RE = /^[a-z][a-z0-9-]*$/;

// Текстовые файлы, в которых подставляем адрес. Рантайм-каталог к этому моменту уже удалён.
const TEXT_EXT = new Set([".ts", ".tsx", ".json", ".md", ".mjs", ".cjs"]);

export type V2BirthInput = {
  category: string;
  project: string;
  title?: string;
  /** id пользователя, создавшего автоматизацию; по умолчанию — онбординг-архитектор. */
  author?: string;
  force?: boolean;
};

export type V2BirthResult =
  | { ok: true; category: string; project: string; automation: string; url: string }
  | { ok: false; error: string };

async function exists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

/** Рекурсивно заменить адрес `from` → `to` во всех текстовых файлах папки (paths.ts, cron.json URL, проза). */
async function substituteAddress(dir: string, from: string, to: string): Promise<void> {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) {
      await substituteAddress(p, from, to);
      continue;
    }
    const dot = entry.name.lastIndexOf(".");
    const ext = dot >= 0 ? entry.name.slice(dot) : "";
    if (!TEXT_EXT.has(ext)) continue;
    const src = await readFile(p, "utf8");
    if (!src.includes(from)) continue;
    await writeFile(p, src.split(from).join(to), "utf8");
  }
}

// Слаг из имени (клон именуется владельцем, часто по-русски) — транслит кириллицы + kebab; пустой → фолбэк.
const CYR: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "y",
  к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f",
  х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};
function slugify(s: string): string {
  const raw = s.toLowerCase().replace(/[а-яё]/g, (c) => CYR[c] ?? "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);
  return /^[a-z]/.test(raw) ? raw : raw ? `a-${raw}`.slice(0, 48).replace(/-+$/, "") : "";
}
/** Свободный слаг в категории (папки ещё нет). Фолбэк — от исходного слага, а не голый «clone». */
async function uniqueSlug(root: string, category: string, base: string, sourceSlug: string): Promise<string> {
  const rootSlug = slugify(base) || `${sourceSlug}-clone`.slice(0, 48);
  let slug = rootSlug;
  let i = 2;
  while (await exists(join(root, category, slug))) slug = `${rootSlug}-${i++}`;
  return slug;
}

/** Патч идентичности ядра новорождённого: свежая uuid, имя, автор, пустые кейсы/история, остаётся frozen. */
async function resetCoreIdentity(corePath: string, title: string, author: string): Promise<void> {
  const core = JSON.parse(await readFile(corePath, "utf8")) as {
    passport: Record<string, unknown> & { info?: unknown };
    useCases: Record<string, unknown>;
    history: Record<string, unknown>;
  };
  core.passport.uuid = randomUUID();
  core.passport.title = title;
  core.passport.author = author;
  core.passport.description = "";
  core.passport.info = { crudUser: title };
  core.passport.howItWorks = [];
  core.useCases.cases = [];
  core.useCases.reviewedSignature = "";
  core.history.versions = [];
  await writeFile(corePath, `${JSON.stringify(core, null, 2)}\n`, "utf8");
}

export async function createV2Automation(
  input: V2BirthInput,
  opts?: { projectsRoot?: string },
): Promise<V2BirthResult> {
  const category = String(input.category ?? "").trim();
  const project = String(input.project ?? "").trim();
  const title = String(input.title ?? "").trim() || project;
  const author = String(input.author ?? "").trim() || "architect";
  const root = opts?.projectsRoot ?? projectsRoot();

  if (!PROJECT_CATEGORIES.some((c) => c.slug === category)) {
    return { ok: false, error: `category must be one of ${PROJECT_CATEGORIES.map((c) => c.slug).join(" | ")}` };
  }
  if (!SLUG_RE.test(project)) {
    return { ok: false, error: "project must be a kebab-case slug (starts with a letter)" };
  }

  const donorDir = join(root, ...DONOR_REL);
  if (!(await exists(donorDir))) {
    return { ok: false, error: "the v2 stream starter is missing — cannot birth a clone from it" };
  }

  const destBase = join(root, category, project);
  if ((await exists(destBase)) && !input.force) {
    return { ok: false, error: `automation already exists: ${category}/${project} (pass force to overwrite)` };
  }

  const address = `${category}/${project}`;
  // 1. Копия всей папки стартера.
  await mkdir(join(root, category), { recursive: true });
  await cp(donorDir, destBase, { recursive: true, force: true });
  // 2. Свежий рантайм: доказательные строки стартера в клон не переносятся.
  await rm(join(destBase, "_data", "runtime"), { recursive: true, force: true });
  // 3. Подстановка адреса во всех текстовых файлах копии (paths.ts, cron.json URL, проза).
  await substituteAddress(destBase, DONOR_ADDRESS, address);
  // 4. Идентичность ядра.
  await resetCoreIdentity(join(destBase, "_data", "automation.json"), title, author);

  return { ok: true, category, project, automation: address, url: `/projects/${address}` };
}

// КЛОН СУЩЕСТВУЮЩЕЙ v2-АВТОМАТИЗАЦИИ (шаг 301) — отличается от рождения из стартера: копируется НЕ пустой
// донор, а рабочая автоматизация СО ВСЕМ содержимым (узлы, кейсы, компоненты, lifecycle). Меняется только
// идентичность: свежая `passport.uuid` (иначе коллизия с исходной), новое имя, автор, СБРОС подтверждения
// (`reviewedSignature` — клон переподтверждают) и истории; рантайм-данные (строки прогонов) НЕ переносятся —
// чистый клон. Слаг подставляется во всех файлах так же, как при рождении. Клон ложится в ТУ ЖЕ категорию.
export async function cloneV2Automation(
  sourceAddress: string,
  title: string,
  author: string,
  opts?: { projectsRoot?: string },
): Promise<V2BirthResult> {
  const root = opts?.projectsRoot ?? projectsRoot();
  const [category, sourceSlug] = String(sourceAddress ?? "").trim().split("/");
  if (!category || !sourceSlug) return { ok: false, error: "source automation address must be <category>/<slug>" };
  const sourceDir = join(root, category, sourceSlug);
  if (!(await exists(join(sourceDir, "_data", "automation.json")))) {
    return { ok: false, error: "not a v2 automation (no _data/automation.json) — nothing to clone" };
  }

  const name = String(title ?? "").trim() || `${sourceSlug} copy`;
  const slug = await uniqueSlug(root, category, name, sourceSlug);
  const address = `${category}/${slug}`;
  const destBase = join(root, category, slug);

  await cp(sourceDir, destBase, { recursive: true, force: true });
  await rm(join(destBase, "_data", "runtime"), { recursive: true, force: true });
  await substituteAddress(destBase, sourceAddress, address);

  // Идентичность клона: свежая uuid + имя + автор, СБРОС подтверждения и истории. Кейсы, граф, компоненты и
  // lifecycle сохраняются (клон рабочей автоматизации остаётся рабочим).
  const corePath = join(destBase, "_data", "automation.json");
  const core = JSON.parse(await readFile(corePath, "utf8")) as {
    passport: Record<string, unknown>;
    useCases: Record<string, unknown>;
    history: Record<string, unknown>;
  };
  core.passport.uuid = randomUUID();
  core.passport.title = name;
  core.passport.author = author || "architect";
  core.useCases.reviewedSignature = "";
  core.history.versions = [];
  await writeFile(corePath, `${JSON.stringify(core, null, 2)}\n`, "utf8");

  return { ok: true, category, project: slug, automation: address, url: `/projects/${address}` };
}
