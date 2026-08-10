// Набор инструкций проекта — что агент читает на входе в сессию (2026-08-10).
//
// ЗАЧЕМ ЭТО СУЩЕСТВУЕТ. Инструкция, которую нельзя выключить, конкурирует с
// задачей за контекст и на мелкой работе проигрывает по цене: чтобы исправить
// опечатку, незачем поднимать весь корпус. Поэтому у каждого документа, кроме
// главной инструкции, есть выключатель.
//
// 🔒 ФЛАГ САМ ПО СЕБЕ НИЧЕГО НЕ ЗНАЧИТ. Агент читает `CLAUDE.md`, а не наш JSON,
// поэтому переключение обязано переписать УПРАВЛЯЕМУЮ ОБЛАСТЬ в инструкции слота.
// Область одна на весь корпус: список читаемого, список выключенного и законы
// включённых документов-способностей. Одна область — одно место, где смотреть.
//
// 🔒 ПРАВИТСЯ ТОЛЬКО МЕЖДУ МАРКЕРАМИ. `CLAUDE.md` — файл репозитория
// пользователя: его правят руками, он едет через git, в нём живут все прочие
// законы. Автоматическая правка свободной прозы однажды затрёт чужое
// предложение, и человек узнает об этом на конфликте слияния.
//
// 🔒 ГЛАВНУЮ ИНСТРУКЦИЮ ВЫКЛЮЧИТЬ НЕЛЬЗЯ — она несёт сам механизм.

import fs from "fs";
import path from "path";
import { DOC_FILES, STEPS_DIR, type DocKey } from "@/lib/product-docs";
import { SAMPLES_DIR } from "@/lib/code-samples";

const APP_DIR = process.env.APP_DIR ?? "/opt/fractera/app";
const CONFIG_PATH =
  process.env.PLATFORM_CONFIG_PATH ??
  path.join(APP_DIR, "PLATFORM-CONFIG", "platform-config.json");

const INSTRUCTION = "CLAUDE.md";
const BEGIN = "<!-- fractera:instruction-set begin -->";
const END = "<!-- fractera:instruction-set end -->";

// Прежняя одиночная область «передачи сессии». Осталась в проектах, которые
// успели её получить; при первой же записи нового формата убирается, чтобы две
// механики не расходились.
const LEGACY_BEGIN = "<!-- fractera:context-state begin -->";
const LEGACY_END = "<!-- fractera:context-state end -->";
const LEGACY_HEADING = /\n*#{2,4} [^\n]*CONTEXT-STATE\.md[^\n]*\n/;

/** Документ, которым нельзя управлять: он несёт сам механизм. */
export const ALWAYS_ON: DocKey = "doc-instruction";

/**
 * Два документа группы — ПАПКИ, а не файлы: шаги пишет агент по одному на работу,
 * образцы складывает владелец. Выключателя они заслуживают наравне с остальными:
 * история проекта и библиотека прошлых работ — самое объёмное, что можно не
 * читать ради мелкой задачи.
 */
export const FOLDER_DOCS: Record<string, string> = {
  "doc-steps": `${STEPS_DIR}/`,
  "doc-code-samples": `${SAMPLES_DIR}/`,
};

/** Что показывать в списках инструкции: файл или папку. */
export function docLabel(key: string): string {
  return FOLDER_DOCS[key] ?? DOC_FILES[key as DocKey] ?? key;
}

/** Порядок здесь не важен — он берётся из навигации. Важен состав. */
export const TOGGLEABLE: string[] = [
  ...(Object.keys(DOC_FILES) as DocKey[]).filter((k) => k !== ALWAYS_ON),
  ...Object.keys(FOLDER_DOCS),
];

/**
 * Состояние корпуса у проекта, который ещё ни разу не настраивали.
 *
 * Всё включено, кроме передачи сессии: она экспериментальная (решение владельца
 * 2026-08-10), а «Тестирование» включено намеренно — это требование к качеству
 * работы, а не удобство.
 */
export const INSTRUCTION_DEFAULTS: Record<string, boolean> = {
  "doc-context-state": false,
};

export function defaultEnabled(key: string): boolean {
  return INSTRUCTION_DEFAULTS[key] ?? true;
}

// ── Законы документов-способностей ────────────────────────────────────────────
// Обычному документу достаточно попасть в список «читать» или «не читать».
// Способность меняет ПОВЕДЕНИЕ, поэтому её закон стоит в инструкции целиком —
// и когда она выключена, об этом говорится прямо, а не молчанием.

const LAWS: Record<string, { on: string; off: string }> = {
  "doc-testing": {
    on: `**Testing — ON.** Every step AND every sub-step ends with **two independent proofs from two
different planes**, written out in the four-field shape defined in \`TESTING.md\` (what was run, the
verbatim output, what it proves, and what that output would look like WITHOUT the change). Compilation is
never one of the two: a build log looks identical whether or not the feature works. One of the proofs
carries a negative control — a case whose answer is required to differ. **No two proofs ⇒ the step is not
closed, and the word "done" is not available.** A proof you cannot obtain is named out loud, before
reporting readiness — never replaced by a cheaper one.`,
    off: `**Testing — OFF.** The owner switched the two-proof requirement off. Do not demand it and do not
block a step on it. Report what you observed, honestly and briefly.`,
  },
  "doc-context-state": {
    on: `**Context handoff — ON.** \`CONTEXT-STATE.md\` is the handoff between two context windows:
1. **Read it at session entry, before any other document.** Empty means there is nothing to resume.
2. **Write it as the window fills:** at **50%** write it and tell the architect half the window is spent;
   at **65%** close what is open and start nothing new; at **75%** require the architect to end the step.
3. **What it says is a HINT, not proof.** It records where work was INTERRUPTED, not where it is: the file
   may say step 123 while the repository has passed 124, 125 and closed 126. Verify with
   \`git log --oneline -10\` and the recorded \`git_head\` BEFORE acting, and say which account you follow.
4. **A baton is handed over once.** Once adopted and confirmed, the file must be empty again.`,
    off: `**Context handoff — OFF.** Do not read \`CONTEXT-STATE.md\`, do not write it, and never demand
that a step be closed on account of it.`,
  },
};

export type InstructionState = {
  ok: boolean;
  config: Record<string, unknown>;
  enabled: Record<string, boolean>;
  /** Набор, действовавший до мастер-выключения. `null` — мастер не применялся. */
  snapshot: string[] | null;
};

export function readInstructionSet(): InstructionState {
  let config: Record<string, unknown> = {};
  let ok = true;
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8")) as Record<string, unknown>;
    }
  } catch {
    ok = false;
  }

  const saved = (config.instructions ?? {}) as Record<string, unknown>;
  const enabled: Record<string, boolean> = {};
  for (const key of TOGGLEABLE) {
    enabled[key] = typeof saved[key] === "boolean" ? (saved[key] as boolean) : defaultEnabled(key);
  }

  const snap = saved.snapshot;
  const snapshot = Array.isArray(snap) ? (snap as string[]) : null;

  return { ok, config, enabled, snapshot };
}

/** Записать набор целиком, не потеряв чужие ветки конфига. */
export function writeInstructionSet(
  config: Record<string, unknown>,
  enabled: Record<string, boolean>,
  snapshot: string[] | null,
): void {
  const instructions: Record<string, unknown> = { ...enabled };
  if (snapshot) instructions.snapshot = snapshot;
  const next = { ...config, instructions };
  fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(next, null, 2), "utf-8");
}

/** Текст управляемой области целиком. */
export function renderSection(enabled: Record<string, boolean>): string {
  const on = TOGGLEABLE.filter((k) => enabled[k]).map(docLabel);
  const off = TOGGLEABLE.filter((k) => !enabled[k]).map(docLabel);

  const lines: string[] = [
    `**Managed by the control panel — do not edit this block by hand.**`,
    ``,
    `It is the authority on WHICH of this project's documents exist for you at all. A document listed as`,
    `switched off is not read even when another part of this instruction asks for it — **this block wins**.`,
    ``,
    `**Active:** ${on.length ? on.map((f) => `\`${f}\``).join(", ") : "— (only this instruction)"}`,
    ``,
    `**Switched OFF — do not read, do not demand, do not report as missing:** ${
      off.length ? off.map((f) => `\`${f}\``).join(", ") : "—"
    }`,
    ``,
    // Плоский список «читать на входе» врал: часть документов активна, но
    // читается ПО ТРЕБОВАНИЮ, и инструкция рядом это прямо запрещает. Блок
    // отвечает «можно ли пользоваться», стадия 6.0 — «когда».
    `Active does NOT mean "load at session entry". Each document keeps the reading rule this instruction`,
    `gives it: most are read on entry, \`TROUBLESHOOTING.md\` only on demand, \`CODE-SAMPLES/\` only when the`,
    `owner names a sample. This block answers "may I use it at all", stage 6.0 answers "when".`,
    ``,
    `A switched-off document is a deliberate choice of the owner, usually to keep a small task cheap. It is`,
    `not a missing document: never offer to recreate it and never work around its absence.`,
  ];

  for (const key of TOGGLEABLE) {
    const law = LAWS[key];
    if (!law) continue;
    lines.push(``, enabled[key] ? law.on : law.off);
  }

  return `${BEGIN}\n${lines.join("\n")}\n${END}`;
}

export type SectionSync = { ok: boolean; changed: boolean; added: boolean; reason?: string };

/**
 * Привести управляемую область в инструкции слота в соответствие с набором.
 *
 * Best-effort: это побочное действие сохранения, и его отказ не имеет права
 * уронить сохранение. Но и промолчать он не должен — результат уезжает наверх.
 */
export function syncInstructionSection(enabled: Record<string, boolean>): SectionSync {
  const file = path.join(APP_DIR, INSTRUCTION);
  const block = renderSection(enabled);

  try {
    if (!fs.existsSync(file)) return { ok: false, changed: false, added: false, reason: "no CLAUDE.md" };
    let text = fs.readFileSync(file, "utf-8");

    // Миграция: одиночная область передачи сессии уходит внутрь общей.
    const ls = text.indexOf(LEGACY_BEGIN);
    const le = text.indexOf(LEGACY_END);
    if (ls !== -1 && le !== -1 && le > ls) {
      text = (text.slice(0, ls) + text.slice(le + LEGACY_END.length)).replace(LEGACY_HEADING, "\n");
    }

    const start = text.indexOf(BEGIN);
    const end = text.indexOf(END);

    if (start !== -1 && end !== -1 && end > start) {
      const next = text.slice(0, start) + block + text.slice(end + END.length);
      if (next === text) return { ok: true, changed: false, added: false };
      fs.writeFileSync(file, next, "utf-8");
      return { ok: true, changed: true, added: false };
    }

    const section = `\n\n## Instruction set\n\n${block}\n`;
    fs.writeFileSync(file, text.replace(/\s*$/, "") + section, "utf-8");
    return { ok: true, changed: true, added: true };
  } catch (e) {
    return { ok: false, changed: false, added: false, reason: String(e) };
  }
}

// ── Документы, которые панель умеет создать сама ──────────────────────────────
// Проект мог родиться раньше документа: тогда включённое правило указывает на
// файл, которого нет, и страница раздела открывается пустой. Шаблоны лежат
// файлами в панели, поэтому их можно править как обычные документы.

const TEMPLATES: Record<string, string> = {
  "doc-context-state": "CONTEXT-STATE.template.md",
  "doc-testing": "TESTING.template.md",
};

export function readTemplate(key: string): string {
  const name = TEMPLATES[key];
  if (!name) return "";
  try {
    return fs.readFileSync(path.join(process.cwd(), "_content", name), "utf-8");
  } catch {
    return "";
  }
}

/** Создать документ из шаблона, если его нет. Существующий НИКОГДА не трогаем. */
export function ensureDoc(key: string): { ok: boolean; created: boolean; reason?: string } {
  const file = DOC_FILES[key as DocKey];
  if (!file) return { ok: true, created: false };
  const template = readTemplate(key);
  if (!template) return { ok: true, created: false };
  const target = path.join(APP_DIR, file);
  try {
    if (fs.existsSync(target)) return { ok: true, created: false };
    fs.writeFileSync(target, template, "utf-8");
    return { ok: true, created: true };
  } catch (e) {
    return { ok: false, created: false, reason: String(e) };
  }
}
