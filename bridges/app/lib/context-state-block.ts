// Блок «Передача сессии» в главной инструкции гостевого приложения.
//
// ЗАЧЕМ ЭТО ВООБЩЕ ЕСТЬ. Выключатель возможности обязан менять ПОВЕДЕНИЕ агента,
// а поведение агента задаётся `CLAUDE.md` в корне слота. Флага в конфиге
// недостаточно: агент читает инструкцию, а не наш JSON.
//
// 🔒 ПОЧЕМУ БЛОК С МАРКЕРАМИ, А НЕ ПРАВКА ТЕКСТА. `CLAUDE.md` — файл
// РЕПОЗИТОРИЯ пользователя: его правят руками, он едет через git, в нём живут
// все прочие законы. Автоматическая правка свободной прозы рано или поздно
// затрёт чужое предложение, и человек узнает об этом на конфликте слияния.
// Переписывается только то, что между маркерами: диff всегда крошечный и
// читаемый.
//
// Маркеров нет (старый клон, владелец удалил) — блок ДОБАВЛЯЕТСЯ один раз в
// конец файла, и вызывающий получает `added: true`, чтобы сказать об этом вслух.
// Молча дописать в чужую инструкцию — худший из возможных исходов.

import fs from "fs";
import path from "path";

const APP_DIR = process.env.APP_DIR ?? "/opt/fractera/app";
const INSTRUCTION = "CLAUDE.md";

const BEGIN = "<!-- fractera:context-state begin -->";
const END = "<!-- fractera:context-state end -->";

/** Выключено: агент обязан вести себя так, будто механизма нет вовсе. */
const OFF_BODY = `**Switched OFF.** The context handoff is an experimental capability and it is currently disabled in the
control panel (App features → Experimental). Do not read \`CONTEXT-STATE.md\`, do not write it, and never
demand that a step be closed on account of it. This block is rewritten automatically when the switch
changes — do not edit it by hand.`;

/**
 * Включено: четыре правила, и третье — самое важное.
 *
 * Пример «123 против 126» стоит в тексте дословно по требованию владельца: без
 * него закон читается как формальность, а с ним — как описание конкретной
 * поломки, которую агент способен устроить за пять минут.
 */
const ON_BODY = `**Switched ON.** \`CONTEXT-STATE.md\` is the handoff between two context windows, and these four rules are
mandatory. This block is rewritten automatically when the switch changes — do not edit it by hand.

1. **Read it at session entry, before any other document.** Empty means there is nothing to resume.
2. **Write it as the window fills:** at **50%** write it and tell the architect half the window is spent;
   at **65%** close what is open and start nothing new; at **75%** require the architect to end the step
   or sub-step. Whatever is not in the file when the window ends is lost, and the ending gives no warning.
3. **What it says is a HINT, not proof.** It records where work was INTERRUPTED, not where it is. A
   session can be cut off by a power failure long after its last note: the file may say step 123 while the
   repository has passed 124, 125 and closed 126. Acting on that line rebuilds finished work and reports
   progress that is really regression. Verify with \`git log --oneline -10\` and the recorded \`git_head\`
   BEFORE acting, and say out loud which account you are following.
4. **A baton is handed over once.** Once you have adopted it and confirmed the true position, the file
   must be empty again — the session entry hook does that for you; if it did not run, do it yourself.`;

export type BlockSync = { ok: boolean; changed: boolean; added: boolean; reason?: string };

/**
 * Привести блок в инструкции слота в соответствие с выключателем.
 *
 * Best-effort по устройству: это побочное действие сохранения настроек, и его
 * отказ не имеет права уронить сохранение. Но и промолчать он не должен —
 * результат возвращается вызывающему.
 */
export function syncContextStateBlock(enabled: boolean): BlockSync {
  const file = path.join(APP_DIR, INSTRUCTION);
  const block = `${BEGIN}\n${enabled ? ON_BODY : OFF_BODY}\n${END}`;

  try {
    if (!fs.existsSync(file)) return { ok: false, changed: false, added: false, reason: "no CLAUDE.md" };
    const text = fs.readFileSync(file, "utf-8");

    const start = text.indexOf(BEGIN);
    const end = text.indexOf(END);

    if (start !== -1 && end !== -1 && end > start) {
      const next = text.slice(0, start) + block + text.slice(end + END.length);
      if (next === text) return { ok: true, changed: false, added: false };
      fs.writeFileSync(file, next, "utf-8");
      return { ok: true, changed: true, added: false };
    }

    // Маркеров нет — добавляем раздел целиком, с заголовком, чтобы он не выглядел
    // обрывком, и сообщаем об этом наверх.
    const section = `\n\n### ⏳ \`CONTEXT-STATE.md\` — the handoff between two context windows\n\n${block}\n`;
    fs.writeFileSync(file, text.replace(/\s*$/, "") + section, "utf-8");
    return { ok: true, changed: true, added: true };
  } catch (e) {
    return { ok: false, changed: false, added: false, reason: String(e) };
  }
}
