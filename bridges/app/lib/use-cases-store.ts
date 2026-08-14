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

const casesDir = () => path.join(APP_DIR, USE_CASES_DIR, CASES_SUBDIR);
const rawDir = () => path.join(APP_DIR, USE_CASES_DIR, RAW_SUBDIR);

function ensureDirs(): void {
  fs.mkdirSync(casesDir(), { recursive: true });
  fs.mkdirSync(rawDir(), { recursive: true });
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

export function listCases(): CasesState {
  const dir = `${USE_CASES_DIR}/${CASES_SUBDIR}/`;
  const legacy = fs.existsSync(path.join(APP_DIR, LEGACY_FILE));
  try {
    const files = fs.readdirSync(casesDir())
      .filter((f) => f.endsWith(".md"))
      .sort();
    const cases = files.map((f) => {
      const id = f.replace(/\.md$/, "");
      return parseCase(id, fs.readFileSync(path.join(casesDir(), f), "utf-8"));
    });
    return { dir, exists: true, cases, legacy };
  } catch {
    return { dir, exists: false, cases: [], legacy };
  }
}

/** Следующий свободный номер — кейсы нумеруются, как шаги. */
function nextIndex(): number {
  const { cases } = listCases();
  const nums = cases.map((c) => Number(c.id.slice(0, 2))).filter((n) => Number.isFinite(n));
  return (nums.length ? Math.max(...nums) : 0) + 1;
}

function slugify(title: string): string {
  return title.toLowerCase()
    .replace(/[^a-z0-9а-яё\s-]/gi, "")
    .trim().replace(/\s+/g, "-").slice(0, 48) || "case";
}

/** Добавить кейсы, рождённые синтезом. Все — черновиками: подтверждает человек. */
export function appendCases(items: { title: string; summary: string }[]): string[] {
  ensureDirs();
  const ids: string[] = [];
  let n = nextIndex();
  for (const item of items) {
    const id = `${String(n).padStart(2, "0")}-${slugify(item.title)}`;
    fs.writeFileSync(
      path.join(casesDir(), `${id}.md`),
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
export function writeCase(id: string, patch: { title?: string; summary?: string }): boolean {
  const file = path.join(casesDir(), `${id}.md`);
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

export function setStatus(id: string, status: CaseStatus): boolean {
  const file = path.join(casesDir(), `${id}.md`);
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

export function confirmAll(): number {
  const { cases } = listCases();
  let n = 0;
  for (const c of cases) if (c.status !== "confirmed" && setStatus(c.id, "confirmed")) n += 1;
  return n;
}

export function deleteCase(id: string): boolean {
  try {
    fs.unlinkSync(path.join(casesDir(), `${id}.md`));
    return true;
  } catch {
    return false;
  }
}

// ── Сырьё ────────────────────────────────────────────────────────────────────
// Пишется ВСЕГДА: и в ручном режиме, и в автоквизе, и при правке кейса. Именно
// сюда возвращаются, когда ищут мысль, которую синтез не донёс.

export type RawTurn = { role: "user" | "assistant"; content: string };

export function appendRaw(turns: RawTurn[], note?: string): void {
  if (!turns.length) return;
  ensureDirs();
  const stamp = new Date().toISOString();
  const head = note ? `\n\n## ${stamp} — ${note}\n` : `\n\n## ${stamp}\n`;
  const body = turns
    .map((t) => (t.role === "user" ? `\n**Владелец:** ${t.content}\n` : `\n**Quiz:** ${t.content}\n`))
    .join("");
  fs.appendFileSync(path.join(rawDir(), RAW_LOG), head + body, "utf-8");
}

/**
 * Затравка — ответы на вводные вопросы, сведённые в один текст.
 *
 * Живёт отдельным файлом, потому что её читает КАЖДЫЙ вызов модели: и вопрос, и
 * автоквиз, и синтез начинаются с неё. Искать её каждый раз в растущей
 * стенограмме значило бы перечитывать сотни реплик ради семи ответов.
 */
export function writeSeed(text: string): void {
  ensureDirs();
  fs.writeFileSync(path.join(rawDir(), "seed.md"), text.trim() + "\n", "utf-8");
}

export function readSeed(): string {
  try {
    return fs.readFileSync(path.join(rawDir(), "seed.md"), "utf-8").trim();
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
export function appendTurns(turns: RawTurn[]): void {
  if (!turns.length) return;
  ensureDirs();
  const file = path.join(rawDir(), "turns.json");
  const all = [...readTurns(), ...turns];
  fs.writeFileSync(file, JSON.stringify(all, null, 1), "utf-8");
}

export function readTurns(): RawTurn[] {
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(rawDir(), "turns.json"), "utf-8")) as RawTurn[];
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

export function readQuestions(): string[] | null {
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(rawDir(), QUESTIONS_FILE), "utf-8")) as unknown;
    if (!Array.isArray(raw)) return null;
    const list = raw.filter((q): q is string => typeof q === "string" && q.trim().length > 0);
    return list.length ? list : null;
  } catch {
    return null;
  }
}

export function writeQuestions(list: string[]): void {
  ensureDirs();
  const clean = list.map((q) => q.trim()).filter(Boolean);
  fs.writeFileSync(path.join(rawDir(), QUESTIONS_FILE), JSON.stringify(clean, null, 1), "utf-8");
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
export function resetPreview(): Omit<ResetStat, "archive"> {
  const { cases } = listCases();
  const seed = readSeed();
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
export function resetUseCases(): ResetStat {
  const before = resetPreview();
  ensureDirs();
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dest = path.join(rawDir(), ARCHIVE_SUBDIR, stamp);
  let archive: string | null = null;

  try {
    fs.mkdirSync(dest, { recursive: true });
    archive = `${USE_CASES_DIR}/${RAW_SUBDIR}/${ARCHIVE_SUBDIR}/${stamp}/`;

    for (const name of ["seed.md", "turns.json", RAW_LOG, QUESTIONS_FILE]) {
      const from = path.join(rawDir(), name);
      if (fs.existsSync(from)) fs.renameSync(from, path.join(dest, name));
    }

    const casesTo = path.join(dest, CASES_SUBDIR);
    const files = fs.existsSync(casesDir()) ? fs.readdirSync(casesDir()).filter((f) => f.endsWith(".md")) : [];
    if (files.length) {
      fs.mkdirSync(casesTo, { recursive: true });
      for (const f of files) fs.renameSync(path.join(casesDir(), f), path.join(casesTo, f));
    }
  } catch {
    // Переезд не удался — не оставляем человека в грязном состоянии: убираем то,
    // что мешает начать заново. Молча вернуть «готово», не убрав ничего, хуже:
    // он нажмёт ещё раз и увидит тот же мусор.
    archive = null;
    for (const name of ["seed.md", "turns.json", RAW_LOG, QUESTIONS_FILE]) {
      try { fs.unlinkSync(path.join(rawDir(), name)); } catch { /* нечего убирать */ }
    }
    try {
      for (const f of fs.readdirSync(casesDir())) {
        if (f.endsWith(".md")) fs.unlinkSync(path.join(casesDir(), f));
      }
    } catch { /* папки нет — и хорошо */ }
  }

  return { ...before, archive };
}

export function readRaw(): string {
  try {
    return fs.readFileSync(path.join(rawDir(), RAW_LOG), "utf-8");
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

export function useCasesGate(): GateState {
  const { cases } = listCases();
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
export function migrateLegacy(): { ok: boolean; id?: string } {
  const file = path.join(APP_DIR, LEGACY_FILE);
  try {
    const text = fs.readFileSync(file, "utf-8").trim();
    if (!text) return { ok: false };
    const title = /^#\s+(.+)$/m.exec(text)?.[1]?.trim() || "Imported from USE-CASES.md";
    const [id] = appendCases([{ title, summary: text }]);
    return { ok: true, id };
  } catch {
    return { ok: false };
  }
}
