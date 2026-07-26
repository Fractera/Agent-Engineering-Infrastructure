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

/** Рекурсивно заменить `DONOR_ADDRESS` → `address` во всех текстовых файлах папки. */
async function substituteAddress(dir: string, address: string): Promise<void> {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) {
      await substituteAddress(p, address);
      continue;
    }
    const dot = entry.name.lastIndexOf(".");
    const ext = dot >= 0 ? entry.name.slice(dot) : "";
    if (!TEXT_EXT.has(ext)) continue;
    const src = await readFile(p, "utf8");
    if (!src.includes(DONOR_ADDRESS)) continue;
    await writeFile(p, src.split(DONOR_ADDRESS).join(address), "utf8");
  }
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
  await substituteAddress(destBase, address);
  // 4. Идентичность ядра.
  await resetCoreIdentity(join(destBase, "_data", "automation.json"), title, author);

  return { ok: true, category, project, automation: address, url: `/projects/${address}` };
}
