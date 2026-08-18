// Кейсы и Quiz — ТОНКАЯ ОБЁРТКА над досье продукта (2026-08-18).
//
// 🔒 ЧТО ИЗМЕНИЛОСЬ. Кейсы лежали файлами `development-docs/USE-CASES/<id>/CASES/*.md`,
// вопросы и ответы — в `RAW/`, подтверждение — строкой внутри файла кейса. Теперь
// всё это внутри `PRODUCTS-CONFIG/<id>.json` (`lib/product-store.ts`): один продукт —
// один файл, и вопрос «где состояние» имеет один ответ.
//
// Модуль остался, чтобы четырнадцать островков и оба маршрута `api/use-cases` не
// переписывались разом: имена, формы и смысл возвращаемых значений сохранены.
//
// 🪦 Прежние файлы на диске НЕ удаляются этим переездом — их переносит миграция
// (`scripts/migrate-products-to-dossier.mjs`), а стираются они отдельной уборкой,
// когда новое хранилище доказано.

import {
  readProduct, mutate, appendQuiz, readQuiz, productFiles, PRODUCTS_DIR,
  type QuizTurn,
} from "@/lib/product-store";

/** 🪦 Прежние пути. Оставлены именами: их печатают документы и отчёты. */
export const USE_CASES_DIR = "development-docs/USE-CASES";
export const CASES_SUBDIR = "CASES";
export const RAW_SUBDIR = "RAW";
export const RAW_LOG = "quiz-log.md";
export const LEGACY_FILE = "USE-CASES.md";
export const ARCHIVE_SUBDIR = "ARCHIVE";

export type CaseStatus = "draft" | "confirmed";

export type UseCase = {
  /** Слаг кейса — он же его адрес в шагах и отчётах. */
  id: string;
  title: string;
  summary: string;
  status: CaseStatus;
  confirmedAt: string | null;
};

export type CasesState = {
  dir: string;
  exists: boolean;
  cases: UseCase[];
  /** 🪦 Одиночный файл прежнего формата. Досье такого состояния не знает. */
  legacy: boolean;
};

export type RawTurn = { role: "user" | "assistant"; content: string };
export type PlannedPage = { path: string; purpose: string; cases?: string[] };

export type ResetStat = {
  seedAnswers: number;
  turns: number;
  cases: number;
  confirmed: number;
  archive: string | null;
};

export type GateState =
  | { kind: "missing"; total: 0; confirmed: 0 }
  | { kind: "unconfirmed"; total: number; confirmed: number }
  | { kind: "ready"; total: number; confirmed: number };

/** Где лежит продукт целиком — это и есть ответ на вопрос «где кейсы». */
export function useCasesPaths(pid: string): { cases: string; raw: string } {
  const files = productFiles(pid);
  return { cases: files.dossier, raw: files.quiz };
}

/** 🪦 Переносить нечего: продукт рождается вместе со своим досье. */
export function migrateLegacyLayout(): boolean {
  return false;
}

// ── кейсы ────────────────────────────────────────────────────────────────────

export function listCases(pid: string): CasesState {
  const p = readProduct(pid);
  const dir = productFiles(pid).dossier;
  if (!p) return { dir, exists: false, cases: [], legacy: false };
  return {
    dir,
    exists: true,
    cases: p.cases.map((c) => ({
      id: c.slug,
      title: c.title,
      summary: c.summary,
      status: c.confirmed ? "confirmed" : "draft",
      confirmedAt: c.confirmedAt,
    })),
    legacy: false,
  };
}

/** Слаг из заголовка: латиница и цифры, остальное — дефис. */
function slugify(title: string, taken: Set<string>, index: number): string {
  const base = title.toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const numbered = `${String(index).padStart(2, "0")}-${base || "case"}`;
  let slug = numbered;
  let n = 2;
  while (taken.has(slug)) slug = `${numbered}-${n++}`;
  return slug;
}

export function appendCases(
  pid: string,
  items: { title: string; summary: string; slug?: string }[],
): string[] {
  const created: string[] = [];
  mutate(pid, (d) => {
    const taken = new Set(d.cases.map((c) => c.slug));
    let index = d.cases.length + 1;
    for (const item of items) {
      const slug = item.slug && !taken.has(item.slug)
        ? item.slug
        : slugify(item.title, taken, index);
      taken.add(slug);
      index += 1;
      d.cases.push({
        slug,
        title: item.title.trim(),
        summary: item.summary.trim(),
        // 🔒 РОЖДЁННЫЙ КЕЙС ВСЕГДА ЧЕРНОВИК. Кейс, который модель подтвердила
        // сама, превращает гейт в украшение: подтверждает только владелец.
        confirmed: false,
        confirmedAt: null,
        updatedAt: new Date().toISOString(),
      });
      created.push(slug);
    }
  });
  return created;
}

/**
 * Правка кейса. 🔒 ЛЮБАЯ ПРАВКА СНИМАЕТ ПОДТВЕРЖДЕНИЕ — это закон хранилища, а не
 * вежливость: зелёное обязано означать «владелец согласился С ЭТИМ текстом», а не
 * «когда-то согласился с каким-то».
 */
export function writeCase(
  pid: string,
  id: string,
  patch: { title?: string; summary?: string },
): boolean {
  let found = false;
  mutate(pid, (d) => {
    const c = d.cases.find((x) => x.slug === id);
    if (!c) return;
    found = true;
    if (patch.title !== undefined) c.title = patch.title.trim();
    if (patch.summary !== undefined) c.summary = patch.summary.trim();
    c.confirmed = false;
    c.confirmedAt = null;
    c.updatedAt = new Date().toISOString();
  });
  return found;
}

export function setStatus(pid: string, id: string, status: CaseStatus): boolean {
  let found = false;
  mutate(pid, (d) => {
    const c = d.cases.find((x) => x.slug === id);
    if (!c) return;
    found = true;
    c.confirmed = status === "confirmed";
    c.confirmedAt = c.confirmed ? new Date().toISOString() : null;
    c.updatedAt = new Date().toISOString();
  });
  return found;
}

export function confirmAll(pid: string): number {
  let count = 0;
  mutate(pid, (d) => {
    for (const c of d.cases) {
      if (!c.confirmed) {
        c.confirmed = true;
        c.confirmedAt = new Date().toISOString();
        c.updatedAt = c.confirmedAt;
        count += 1;
      }
    }
  });
  return count;
}

export function deleteCase(pid: string, id: string): boolean {
  let found = false;
  mutate(pid, (d) => {
    const before = d.cases.length;
    d.cases = d.cases.filter((c) => c.slug !== id);
    found = d.cases.length < before;
  });
  return found;
}

export function useCasesGate(pid: string): GateState {
  const { cases } = listCases(pid);
  const confirmed = cases.filter((c) => c.status === "confirmed").length;
  if (cases.length === 0) return { kind: "missing", total: 0, confirmed: 0 };
  if (confirmed < cases.length) return { kind: "unconfirmed", total: cases.length, confirmed };
  return { kind: "ready", total: cases.length, confirmed };
}

// ── вопросы, ответы, лента разговора ─────────────────────────────────────────

export function readQuestions(pid: string): string[] | null {
  const p = readProduct(pid);
  if (!p || p.intake.questions.length === 0) return null;
  return p.intake.questions;
}

export function writeQuestions(pid: string, list: string[]): void {
  mutate(pid, (d) => { d.intake.questions = list.map((q) => q.trim()).filter(Boolean); });
}

export function readSeed(pid: string): string {
  return readProduct(pid)?.intake.seed ?? "";
}

/**
 * Затравка — сводка ответов, из которой работает Quiz. Пишется целиком: она
 * рождается одним действием (владелец прошёл вводный опрос), и дописывать её
 * кусками значило бы иметь два мнения о том, что он ответил.
 */
export function writeSeed(pid: string, text: string): void {
  mutate(pid, (d) => { d.intake.seed = text.trim(); });
}

/** Ответы по вопросам — тем же порядком, что вопросы. */
export function writeAnswers(pid: string, answers: string[]): void {
  mutate(pid, (d) => { d.intake.answers = answers.map((a) => a.trim()); });
}

export function appendTurns(pid: string, turns: RawTurn[]): void {
  appendQuiz(pid, turns as QuizTurn[]);
}

export function readTurns(pid: string): RawTurn[] {
  return readQuiz(pid).map(({ role, content }) => ({ role, content }));
}

/** Лента с пометкой — тем же файлом: пометка едет отдельной репликой. */
export function appendRaw(pid: string, turns: RawTurn[], note?: string): void {
  appendQuiz(pid, [
    ...(note ? [{ role: "assistant" as const, content: `— ${note} —` }] : []),
    ...turns,
  ]);
}

export function readRaw(pid: string): string {
  return readQuiz(pid).map((t) => `**${t.role}:** ${t.content}`).join("\n\n");
}

// ── план страниц ─────────────────────────────────────────────────────────────

export function writePagesPlan(pid: string, pages: PlannedPage[], _productTitle?: string): void {
  mutate(pid, (d) => {
    d.pages = pages
      .map((p) => ({
        path: p.path.trim(),
        purpose: p.purpose.trim(),
        ...(p.cases?.length ? { cases: p.cases.map((c) => c.trim()).filter(Boolean) } : {}),
      }))
      .filter((p) => p.path);
  });
}

/** План страниц человеческим текстом — так его печатают страницы и отчёты. */
export function readPagesPlan(pid: string): string {
  const p = readProduct(pid);
  if (!p || p.pages.length === 0) return "";
  return [`# ${p.title}`, "", ...p.pages.map((x) => `- \`${x.path}\` — ${x.purpose}`)].join("\n");
}

// ── сброс и удаление ─────────────────────────────────────────────────────────

export function resetPreview(pid: string): Omit<ResetStat, "archive"> {
  const p = readProduct(pid);
  if (!p) return { seedAnswers: 0, turns: 0, cases: 0, confirmed: 0 };
  return {
    seedAnswers: p.intake.answers.filter(Boolean).length
      || p.intake.seed.split(/\n{2,}/).filter((x) => x.trim()).length,
    turns: readQuiz(pid).length,
    cases: p.cases.length,
    confirmed: p.cases.filter((c) => c.confirmed).length,
  };
}

/**
 * Начать сначала: вопросы, ответы и кейсы уходят, продукт остаётся.
 *
 * 🔒 СНИМОК УЕЗЖАЕТ В АРХИВ, А НЕ СТИРАЕТСЯ. Одно нажатие не должно стоить
 * разговора на сорок вопросов; человек, нажавший его по ошибке, обязан иметь куда
 * вернуться. Лента разговора при этом остаётся на месте — она сырьё, и её потеря
 * не восстановима вовсе.
 */
export function resetUseCases(pid: string): ResetStat {
  const before = resetPreview(pid);
  const p = readProduct(pid);
  if (!p) return { ...before, archive: null };

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const archive = `${PRODUCTS_DIR}/ARCHIVE/${pid}-reset-${stamp}.json`;
  try {
    const fs = require("fs") as typeof import("fs");
    const path = require("path") as typeof import("path");
    const APP_DIR = process.env.APP_DIR ?? "/opt/fractera/app";
    const target = path.join(APP_DIR, archive);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, `${JSON.stringify(p, null, 2)}\n`, "utf-8");
  } catch {
    return { ...before, archive: null };
  }

  mutate(pid, (d) => {
    d.intake = { questions: [], answers: [], seed: "" };
    d.cases = [];
    d.phase = "intake";
  });
  return { ...before, archive };
}

/** 🪦 Удаление документов продукта отдельно от него самого больше не существует. */
export function deleteProductDocs(pid: string): { archive: string | null; cases: number } {
  const stat = resetUseCases(pid);
  return { archive: stat.archive, cases: stat.cases };
}

/** 🪦 Перенос одиночного `USE-CASES.md`: формата больше нет. */
export function migrateLegacy(): { ok: boolean; id?: string } {
  return { ok: false };
}
