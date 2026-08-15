// Пользовательские кейсы — папка проекта, а не один файл (решение владельца 2026-08-10).
//
// СТРОЕНИЕ, по образцу `DEVELOPMENT-STEPS/`:
//
//   USE-CASES/
//     CASES/   ← по файлу на кейс: заголовок, машинная шапка со статусом, сценарий
//     RAW/     ← сырьё: каждый заданный вопрос и каждый полученный ответ
//
// 🔒 ПОЧЕМУ СЫРЬЁ ОТДЕЛЬНО. Вопросов набегут сотни. Кейсы агент читает КАЖДУЮ
// сессию, сырьё — почти никогда. Держать их вместе значило бы оплачивать всю
// стенограмму в каждой сессии, а именно ради этой экономии и делались выключатели
// корпуса. Главная инструкция говорит об этом прямо: `RAW/` открывают только при
// прямой необходимости — когда ищут замысел, потерявшийся при синтезе.
//
// 🔒 ФАЙЛ — ИСТОЧНИК ИСТИНЫ. Никаких копий в базе панели: это файлы репозитория
// пользователя, они едут через git и принадлежат проекту.

import fs from "fs";
import path from "path";
// Только чтение записи по идентификатору: продукт приходит сюда АРГУМЕНТОМ, а
// не выводится складом самостоятельно. Выводить его здесь значило бы иметь два
// мнения о том, с чьими кейсами идёт работа.
import { findProduct } from "@/lib/products-config";

const APP_DIR = process.env.APP_DIR ?? "/opt/fractera/app";

export const USE_CASES_DIR = "development-docs/USE-CASES";
export const CASES_SUBDIR = "CASES";
export const RAW_SUBDIR = "RAW";
export const RAW_LOG = "quiz-log.md";
/** Одиночный файл прежнего формата — проекты, рождённые до папки. */
export const LEGACY_FILE = "USE-CASES.md";

const MARKER = "fractera:use-case v1";

export type CaseStatus = "draft" | "confirmed";

export type UseCase = {
  /** Имя файла без расширения — оно же адрес кейса. */
  id: string;
  title: string;
  summary: string;
  status: CaseStatus;
  confirmedAt: string | null;
};

// 🔒 КЕЙСЫ ЖИВУТ В ПАПКЕ СВОЕГО ПРОДУКТА (владелец 2026-08-15).
//
// Плоская папка отвечала на вопрос «чьи это кейсы» словом «проекта». Пока проект
// один, это сходит; на втором продукте вопрос становится главным, а ответа нет:
// у «проекта» нет ни адреса, ни папки, ни таблиц, и построить по нему нельзя.
//
// Место файла и есть ответ. Никакой метки `product:` в шапке кейса не нужно —
// метка описывает, а папка принуждает: два кейса с разными метками всё равно
// лежали бы рядом и правили один и тот же код.
//
// Продукт существует с момента выбора структуры (`PRODUCTS-CONFIG`), то есть до
// первого вопроса. Плоский путь остаётся только для проектов, начатых раньше, —
// и живёт до первого открытия страницы, где `migrateLegacyLayout()` переносит их
// в папку продукта.
const productDir = (pid: string) => path.join(APP_DIR, USE_CASES_DIR, pid);

const casesDir = (pid: string) => path.join(productDir(pid), CASES_SUBDIR);
const rawDir = (pid: string) => path.join(productDir(pid), RAW_SUBDIR);

/** Пути для показа человеку — с продуктом внутри, как они лежат на диске. */
export function useCasesPaths(pid: string): { cases: string; raw: string } {
  const base = `${USE_CASES_DIR}/${pid}`;
  return { cases: `${base}/${CASES_SUBDIR}/`, raw: `${base}/${RAW_SUBDIR}/` };
}

/**
 * Перенос кейсов, написанных до появления продуктов.
 *
 * Ничего не делает, когда переносить нечего, — а это все сервера, кроме тех, где
 * успели поработать в первые сутки. Файлы ПЕРЕЕЗЖАЮТ, а не копируются: две копии
 * кейсов в двух местах — это два ответа на вопрос, что строить.
 */
export function migrateLegacyLayout(pid: string): boolean {
  const oldBase = path.join(APP_DIR, USE_CASES_DIR);
  const newBase = path.join(oldBase, pid);
  let moved = false;

  // 🔒 ПЕРЕНОС ПОФАЙЛОВО, А НЕ ПАПКОЙ ЦЕЛИКОМ (найдено проверкой 2026-08-16).
  //
  // Сначала здесь стояло «переименовать папку, если целевой ещё нет». Это
  // срабатывало ровно один раз в жизни сервера, и дальше плоская папка
  // становилась ЛОВУШКОЙ: файл, попавший в неё позже — из старого клона, из
  // слияния веток, руками, — панель уже не видела, а агент по своей инструкции
  // видел. Два ответа на вопрос «что строить» хуже, чем ни одного.
  //
  // Поэтому переносим каждый файл и повторяем это на каждом открытии страницы;
  // опустевшая плоская папка удаляется, чтобы ловушке негде было завестись.
  for (const sub of [CASES_SUBDIR, RAW_SUBDIR]) {
    const from = path.join(oldBase, sub);
    const to = path.join(newBase, sub);
    if (!fs.existsSync(from)) continue;
    try {
      fs.mkdirSync(to, { recursive: true });
      for (const name of fs.readdirSync(from)) {
        // `.gitkeep` — след пустой папки из шаблона, а не работа владельца.
        if (name === ".gitkeep") { fs.unlinkSync(path.join(from, name)); continue; }
        const target = path.join(to, name);
        // Имя занято — файл продукта старше и авторитетнее; пришедший кладём
        // рядом с пометкой, а не затираем чужую работу молча.
        const dest = fs.existsSync(target) ? path.join(to, `legacy-${name}`) : target;
        fs.renameSync(path.join(from, name), dest);
        moved = true;
      }
      if (!fs.readdirSync(from).length) fs.rmdirSync(from);
    } catch { /* не удалось — файлы остаются на месте, повторим при следующем открытии */ }
  }
  return moved;
}

function ensureDirs(pid: string): void {
  fs.mkdirSync(casesDir(pid), { recursive: true });
  fs.mkdirSync(rawDir(pid), { recursive: true });
}

function parseCase(id: string, text: string): UseCase {
  const title = (/^#\s+(.+)$/m.exec(text)?.[1] ?? id).trim();
  const status = /\*\*status:\*\*\s*confirmed/i.test(text) ? "confirmed" : "draft";
  const confirmedAt = /\*\*confirmed:\*\*\s*(\S+)/i.exec(text)?.[1] ?? null;
  // Сценарий — всё после машинной шапки. Шапка кончается пустой строкой за
  // последним полем, поэтому режем по ней, а не по числу строк.
  const body = text.split(/\n\s*\n/).slice(1).filter((p) => !p.includes("**status:**")).join("\n\n").trim();
  return { id, title, summary: body, status, confirmedAt: confirmedAt === "—" ? null : confirmedAt };
}

function renderCase(c: Omit<UseCase, "id">): string {
  return `# ${c.title}

<!-- ${MARKER} -->
**status:** ${c.status}
**confirmed:** ${c.confirmedAt ?? "—"}

${c.summary.trim()}
`;
}

export type CasesState = {
  dir: string;
  exists: boolean;
  cases: UseCase[];
  /** Остался ли одиночный файл прежнего формата — его предлагают перенести. */
  legacy: boolean;
};

export function listCases(pid: string): CasesState {
  // Путь называется НАСТОЯЩИЙ — тот, из которого читаем. Здесь стояла плоская
  // строка: панель читала из папки продукта, а владельцу показывала
  // `USE-CASES/CASES/`, где лежит пустота. Проверено живьём 2026-08-16.
  const dir = useCasesPaths(pid).cases;
  const legacy = fs.existsSync(path.join(APP_DIR, LEGACY_FILE));
  try {
    const files = fs.readdirSync(casesDir(pid))
      .filter((f) => f.endsWith(".md"))
      .sort();
    const cases = files.map((f) => {
      const id = f.replace(/\.md$/, "");
      return parseCase(id, fs.readFileSync(path.join(casesDir(pid), f), "utf-8"));
    });
    return { dir, exists: true, cases, legacy };
  } catch {
    return { dir, exists: false, cases: [], legacy };
  }
}

/** Следующий свободный номер — кейсы нумеруются, как шаги. */
function nextIndex(pid: string): number {
  const { cases } = listCases(pid);
  const nums = cases.map((c) => Number(c.id.slice(0, 2))).filter((n) => Number.isFinite(n));
  return (nums.length ? Math.max(...nums) : 0) + 1;
}

/**
 * 🔒 ИМЯ ФАЙЛА КЕЙСА — ТОЛЬКО ЛАТИНИЦА (владелец 2026-08-15, прямой запрет).
 *
 * Здесь стояло `[^a-z0-9а-яё\s-]` — кириллица допускалась, и кейсы легли на диск
 * как `01-покупка-пачки-кофе.md`. Это ошибка двух родов сразу.
 *
 * Первый: имена файлов, идентификаторы и пути — машинный слой, у него один язык,
 * английский (правило 4г). Кириллица в пути — это ещё и разное поведение
 * файловых систем, кодировок и git на разной технике.
 *
 * Второй и главный: этот слой читает АГЕНТ на старте каждой сессии. Всё, что
 * лежит здесь на языке владельца, оплачивается токенами вечно и на каждом
 * запуске. Слова человека живут ВНУТРИ файла — заголовок и сценарий он читает и
 * подтверждает сам; имя файла ему читать незачем.
 *
 * Слаг даёт модель на английском (`slug` в ответе синтеза). Здесь остаётся
 * последний рубеж: всё, что не латиница, отбрасывается, и пустой результат
 * честно становится `case` — лучше безымянный номер, чем имя на трёх алфавитах.
 */
function slugify(slug: string): string {
  return slug.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim().replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "")
    .slice(0, 48) || "case";
}

/** Добавить кейсы, рождённые синтезом. Все — черновиками: подтверждает человек. */
export function appendCases(pid: string, items: { title: string; summary: string; slug?: string }[]): string[] {
  ensureDirs(pid);
  const ids: string[] = [];
  let n = nextIndex(pid);
  for (const item of items) {
    // Слаг приходит от модели по-английски. Заголовок в него больше НЕ идёт: он
    // на языке владельца, и именно так на диске появлялись кириллические имена.
    const id = `${String(n).padStart(2, "0")}-${slugify(item.slug ?? "")}`;
    fs.writeFileSync(
      path.join(casesDir(pid), `${id}.md`),
      renderCase({ title: item.title, summary: item.summary, status: "draft", confirmedAt: null }),
      "utf-8",
    );
    ids.push(id);
    n += 1;
  }
  return ids;
}

/**
 * Переписать кейс.
 *
 * 🔒 ЛЮБАЯ ПРАВКА СБРАСЫВАЕТ ПОДТВЕРЖДЕНИЕ. Иначе зелёный означал бы «когда-то
 * смотрел», а не «согласен вот с этим текстом» — и владелец подтвердил бы одно, а
 * агент строил бы по другому.
 */
export function writeCase(pid: string, id: string, patch: { title?: string; summary?: string }): boolean {
  const file = path.join(casesDir(pid), `${id}.md`);
  try {
    const current = parseCase(id, fs.readFileSync(file, "utf-8"));
    const next: Omit<UseCase, "id"> = {
      title: patch.title?.trim() || current.title,
      summary: patch.summary?.trim() || current.summary,
      status: "draft",
      confirmedAt: null,
    };
    fs.writeFileSync(file, renderCase(next), "utf-8");
    return true;
  } catch {
    return false;
  }
}

export function setStatus(pid: string, id: string, status: CaseStatus): boolean {
  const file = path.join(casesDir(pid), `${id}.md`);
  try {
    const c = parseCase(id, fs.readFileSync(file, "utf-8"));
    fs.writeFileSync(
      file,
      renderCase({
        title: c.title,
        summary: c.summary,
        status,
        confirmedAt: status === "confirmed" ? new Date().toISOString() : null,
      }),
      "utf-8",
    );
    return true;
  } catch {
    return false;
  }
}

export function confirmAll(pid: string): number {
  const { cases } = listCases(pid);
  let n = 0;
  for (const c of cases) if (c.status !== "confirmed" && setStatus(pid, c.id, "confirmed")) n += 1;
  return n;
}

export function deleteCase(pid: string, id: string): boolean {
  try {
    fs.unlinkSync(path.join(casesDir(pid), `${id}.md`));
    return true;
  } catch {
    return false;
  }
}

// ── Сырьё ────────────────────────────────────────────────────────────────────
// Пишется ВСЕГДА: и в ручном режиме, и в автоквизе, и при правке кейса. Именно
// сюда возвращаются, когда ищут мысль, которую синтез не донёс.

export type RawTurn = { role: "user" | "assistant"; content: string };

export function appendRaw(pid: string, turns: RawTurn[], note?: string): void {
  if (!turns.length) return;
  ensureDirs(pid);
  const stamp = new Date().toISOString();
  const head = note ? `\n\n## ${stamp} — ${note}\n` : `\n\n## ${stamp}\n`;
  const body = turns
    .map((t) => (t.role === "user" ? `\n**Владелец:** ${t.content}\n` : `\n**Quiz:** ${t.content}\n`))
    .join("");
  fs.appendFileSync(path.join(rawDir(pid), RAW_LOG), head + body, "utf-8");
}

/**
 * Затравка — ответы на вводные вопросы, сведённые в один текст.
 *
 * Живёт отдельным файлом, потому что её читает КАЖДЫЙ вызов модели: и вопрос, и
 * автоквиз, и синтез начинаются с неё. Искать её каждый раз в растущей
 * стенограмме значило бы перечитывать сотни реплик ради семи ответов.
 */
export function writeSeed(pid: string, text: string): void {
  ensureDirs(pid);
  // 🔒 СТРУКТУРА ПРОЕКТА ВСТАЁТ ПЕРВОЙ СТРОКОЙ ЗАТРАВКИ (владелец 2026-08-15).
  //
  // Затравку читает КАЖДЫЙ вызов модели — и вопрос, и автоквиз, и синтез кейсов.
  // Значит это единственное место, куда достаточно положить выбранное
  // направление, чтобы оно дошло до всех трёх, не трогая промпты (а трогать их
  // нельзя: каждая формулировка в них оплачена разбором конкретного провала).
  //
  // Без этой строки выбор влиял бы только на текст семи вопросов и терялся бы
  // ровно там, где он ценнее всего: при синтезе, когда модель решает, что вообще
  // считать кейсом. Для маркетплейса и для лендинга это разные вещи.
  //
  // Заголовок по-английски намеренно: файл читают агент и модель, а их язык —
  // английский, как и у промптов рядом.
  // Источник истины о структуре — реестр продуктов, а не файл рядом. Пока их
  // было два, они успели бы разойтись: выбор структуры пишется в реестр, а
  // затравка читала бы вчерашний файл.
  const chosen = findProduct(pid);
  const head = chosen
    ? `Product: ${chosen.title} (id ${chosen.id}, type ${chosen.type}, ${chosen.surface}${chosen.route ? `, route ${chosen.route}` : ""})\n\n`
    : "";
  fs.writeFileSync(path.join(rawDir(pid), "seed.md"), head + text.trim() + "\n", "utf-8");
}

export function readSeed(pid: string): string {
  try {
    return fs.readFileSync(path.join(rawDir(pid), "seed.md"), "utf-8").trim();
  } catch {
    return "";
  }
}

/**
 * Лента разговора в машинном виде — чтобы Quiz ПРОДОЛЖАЛСЯ, а не начинался заново.
 *
 * ЗАЧЕМ ОТДЕЛЬНО ОТ `quiz-log.md`. Тот лог человеческий: его читают глазами в
 * день, когда ищут потерянный замысел. А продолжить разговор можно только по
 * структуре — разбирать прозу обратно в реплики значит терять их на первой же
 * необычной формулировке.
 *
 * Владелец описал это прямо: отвечать «сколько выдержит», устать, нажать автоквиз.
 * Между заходами лента обязана пережить закрытие окна.
 */
export function appendTurns(pid: string, turns: RawTurn[]): void {
  if (!turns.length) return;
  ensureDirs(pid);
  const file = path.join(rawDir(pid), "turns.json");
  const all = [...readTurns(), ...turns];
  fs.writeFileSync(file, JSON.stringify(all, null, 1), "utf-8");
}

export function readTurns(pid: string): RawTurn[] {
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(rawDir(pid), "turns.json"), "utf-8")) as RawTurn[];
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

// ── Вводные вопросы проекта ──────────────────────────────────────────────────
//
// 🔒 ВОПРОСЫ ПРИНАДЛЕЖАТ ПРОЕКТУ, А НЕ ПАНЕЛИ (владелец 2026-08-14).
//
// Семь вопросов были зашиты в словарь панели и задавались одинаково интернет-
// магазину и клинике. Но вопрос — это половина ответа: неверный заставляет
// человека описывать не тот продукт, который у него в голове, и весь Quiz потом
// идёт по чужой колее.
//
// Поэтому владелец правит их ДО опроса, а правленый список ложится файлом в
// папку проекта: он едет в репозиторий вместе с кейсами, и агент видит, о чём
// спрашивали. Файла нет — значит владелец ещё не смотрел вопросы, и панель
// показывает ему предложенные.
const QUESTIONS_FILE = "questions.json";

// ── Структура проекта ────────────────────────────────────────────────────────
//
// 🪦 `project-type.json` БОЛЬШЕ НЕ ПИШЕТСЯ (владелец 2026-08-15, тот же день).
//
// Файл прожил несколько часов и хранил ОДНУ структуру на весь сервер. Это верно
// ровно до второго продукта, а сервер несёт их много: сегодня посадочная
// страница, завтра мозг компании. Структура без продукта не имеет владельца.
//
// Теперь она — поле записи продукта в `PRODUCTS-CONFIG/products-config.json`
// (`lib/products-config.ts`). Читать структуру отсюда нельзя: два источника
// разошлись бы в первый же день.
//
// Имя файла остаётся здесь ровно для двух дел: перенести старый выбор в реестр
// (`adoptLegacyProjectType`) и увезти файл в архив при «начать сначала».
const PROJECT_TYPE_FILE = "project-type.json";

export function readQuestions(pid: string): string[] | null {
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(rawDir(pid), QUESTIONS_FILE), "utf-8")) as unknown;
    if (!Array.isArray(raw)) return null;
    const list = raw.filter((q): q is string => typeof q === "string" && q.trim().length > 0);
    return list.length ? list : null;
  } catch {
    return null;
  }
}

export function writeQuestions(pid: string, list: string[]): void {
  ensureDirs(pid);
  const clean = list.map((q) => q.trim()).filter(Boolean);
  fs.writeFileSync(path.join(rawDir(pid), QUESTIONS_FILE), JSON.stringify(clean, null, 1), "utf-8");
}

// ── План страниц продукта ────────────────────────────────────────────────────
//
// 🔒 ПЛАН — ЭТО НАМЕРЕНИЕ, А НЕ ОПИСЬ (владелец 2026-08-15).
//
// Владелец просил, чтобы агент знал, с какими страницами продукта работать.
// Соблазн — держать список страниц в конфиге; но список файлов есть ПРОИЗВОДНОЕ
// от файловой системы, и записанный руками он разойдётся с ней в первую неделю:
// агент создал страницу, конфиг не тронул, следующий агент работает по вчерашней
// карте. Ровно этот класс ошибки уже стоил трёх дефектов в реестре продуктов.
//
// Поэтому здесь лежит другое знание — то, которое вывести НЕЛЬЗЯ: какие страницы
// продукт ДОЛЖЕН получить, судя по кейсам. Что построено на самом деле, всегда
// считается обходом папок; расхождение плана и факта и есть ответ на вопрос «что
// ещё не сделано».
//
// Файл человеческий и правится свободно: это план владельца, а не машинная
// запись. Модель лишь предлагает первую версию.
const PAGES_FILE = "PAGES.md";

export type PlannedPage = { path: string; purpose: string };

export function writePagesPlan(pid: string, pages: PlannedPage[], productTitle: string): void {
  if (!pages.length) return;
  fs.mkdirSync(productDir(pid), { recursive: true });
  const rows = pages
    .map((p) => `| \`${p.path}\` | ${p.purpose.replace(/\|/g, "\\|")} |`)
    .join("\n");
  // 🔒 ФАЙЛ АНГЛИЙСКИЙ ЦЕЛИКОМ (владелец 2026-08-15). Его читает агент на старте
  // сессии, а не человек: человек видит те же страницы в панели, на своём языке.
  // Второй язык здесь оплачивался бы токенами на каждом запуске.
  const body = `# Pages of "${productTitle}"

Proposed from your use cases. This is a PLAN — what this product should have, not an
inventory of what exists: edit it freely, add and remove rows. What is actually built
is always visible in the product's folders.

| Path | Why it exists |
|---|---|
${rows}
`;
  fs.writeFileSync(path.join(productDir(pid), PAGES_FILE), body, "utf-8");
}

export function readPagesPlan(pid: string): string {
  try {
    return fs.readFileSync(path.join(productDir(pid), PAGES_FILE), "utf-8");
  } catch {
    return "";
  }
}

// ── Начать сначала ───────────────────────────────────────────────────────────
//
// 🔒 БЕЗ ЭТОГО КАЧЕСТВЕННЫЙ ОПРОС БЫЛ НЕДОСТИЖИМ (владелец 2026-08-14).
//
// Затравка писалась один раз и не удалялась ничем: человек, проскочивший первый
// опрос наспех, оставался в нём навсегда. Хуже — лента разговора копится и
// уходит в модель на КАЖДЫЙ вызов, поэтому даже отличные новые ответы тонули в
// старом мусоре. Кнопка «начать сначала» — не удобство, а единственный способ
// получить чистый опрос.
//
// 🔒 УДАЛЯЕМ ПЕРЕЕЗДОМ, А НЕ СТИРАНИЕМ. Экраны становятся чистыми, но файлы
// уезжают в `RAW/ARCHIVE/<дата>/`. Стереть описание продукта одним нажатием —
// слишком дорогая ошибка, чтобы полагаться на твёрдость руки; а лежащая в папке
// проекта копия ничего не стоит и никому не мешает.

export const ARCHIVE_SUBDIR = "ARCHIVE";

export type ResetStat = {
  /** Сколько ответов было в затравке (по числу непустых абзацев). */
  seedAnswers: number;
  turns: number;
  cases: number;
  confirmed: number;
  /** Куда всё уехало — путь показывается владельцу, чтобы он мог туда сходить. */
  archive: string | null;
};

/** Что именно исчезнет — считается ДО удаления, чтобы окно подтверждения называло числа. */
export function resetPreview(pid: string): Omit<ResetStat, "archive"> {
  const { cases } = listCases(pid);
  const seed = readSeed(pid);
  return {
    seedAnswers: seed ? seed.split(/\n\s*\n/).filter((p) => p.trim()).length : 0,
    turns: readTurns().length,
    cases: cases.length,
    confirmed: cases.filter((c) => c.status === "confirmed").length,
  };
}

/**
 * Убрать всё, что относится к опросу и его плодам: вопросы, затравку, ленту,
 * стенограмму и кейсы. Разработка приложения этим не задевается — кейсы это
 * описание замысла, а не код.
 */
export function resetUseCases(pid: string): ResetStat {
  const before = resetPreview(pid);
  ensureDirs(pid);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dest = path.join(rawDir(pid), ARCHIVE_SUBDIR, stamp);
  let archive: string | null = null;

  try {
    fs.mkdirSync(dest, { recursive: true });
    archive = `${useCasesPaths(pid).raw}${ARCHIVE_SUBDIR}/${stamp}/`;

    for (const name of ["seed.md", "turns.json", RAW_LOG, QUESTIONS_FILE, PROJECT_TYPE_FILE]) {
      const from = path.join(rawDir(pid), name);
      if (fs.existsSync(from)) fs.renameSync(from, path.join(dest, name));
    }

    const casesTo = path.join(dest, CASES_SUBDIR);
    const files = fs.existsSync(casesDir(pid)) ? fs.readdirSync(casesDir(pid)).filter((f) => f.endsWith(".md")) : [];
    if (files.length) {
      fs.mkdirSync(casesTo, { recursive: true });
      for (const f of files) fs.renameSync(path.join(casesDir(pid), f), path.join(casesTo, f));
    }
  } catch {
    // Переезд не удался — не оставляем человека в грязном состоянии: убираем то,
    // что мешает начать заново. Молча вернуть «готово», не убрав ничего, хуже:
    // он нажмёт ещё раз и увидит тот же мусор.
    archive = null;
    for (const name of ["seed.md", "turns.json", RAW_LOG, QUESTIONS_FILE, PROJECT_TYPE_FILE]) {
      try { fs.unlinkSync(path.join(rawDir(pid), name)); } catch { /* нечего убирать */ }
    }
    try {
      for (const f of fs.readdirSync(casesDir(pid))) {
        if (f.endsWith(".md")) fs.unlinkSync(path.join(casesDir(pid), f));
      }
    } catch { /* папки нет — и хорошо */ }
  }

  return { ...before, archive };
}

export function readRaw(pid: string): string {
  try {
    return fs.readFileSync(path.join(rawDir(pid), RAW_LOG), "utf-8");
  } catch {
    return "";
  }
}

// ── Состояние гейта ──────────────────────────────────────────────────────────

export type GateState =
  /** Папки нет или в ней ни одного кейса — разработку начинать нельзя. */
  | { kind: "missing"; total: 0; confirmed: 0 }
  /** Кейсы есть, но не все подтверждены — половина лучше, чем ничего. */
  | { kind: "unconfirmed"; total: number; confirmed: number }
  | { kind: "ready"; total: number; confirmed: number };

export function useCasesGate(pid: string): GateState {
  const { cases } = listCases(pid);
  const confirmed = cases.filter((c) => c.status === "confirmed").length;
  if (cases.length === 0) return { kind: "missing", total: 0, confirmed: 0 };
  if (confirmed < cases.length) return { kind: "unconfirmed", total: cases.length, confirmed };
  return { kind: "ready", total: cases.length, confirmed };
}

/**
 * Перенести одиночный `USE-CASES.md` прежнего формата в папку.
 *
 * Не удаляем и не игнорируем молча: файл написан человеком, и решение о его
 * судьбе принимает он. Кладём его содержимое одним кейсом-черновиком, а исходник
 * оставляем на месте до тех пор, пока владелец не удалит его сам.
 */
export function migrateLegacy(pid: string): { ok: boolean; id?: string } {
  const file = path.join(APP_DIR, LEGACY_FILE);
  try {
    const text = fs.readFileSync(file, "utf-8").trim();
    if (!text) return { ok: false };
    const title = /^#\s+(.+)$/m.exec(text)?.[1]?.trim() || "Imported from USE-CASES.md";
    const [id] = appendCases(pid, [{ title, summary: text }]);
    return { ok: true, id };
  } catch {
    return { ok: false };
  }
}
