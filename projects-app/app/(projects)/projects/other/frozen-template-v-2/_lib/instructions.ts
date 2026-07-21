import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { SYSTEM_INSTRUCTION_NAMES, type SystemInstructionName } from "../_data/automation.schema";

// ЧТЕНИЕ СИСТЕМНЫХ ИНСТРУКЦИЙ.
//
// Текст закона живёт в `_instructions/<имя>.md` и больше нигде. Объект ядра несёт ИМЯ своей инструкции —
// связь видна прямо в объекте, а стоит одно слово вместо полутора тысяч знаков.
//
// Читается по требованию: агент берёт ровно ту инструкцию, которая ему сейчас нужна, а не все восемнадцать.

const DIR = join(
  process.cwd(),
  "app",
  "(projects)",
  "projects",
  "other",
  "frozen-template-v-2",
  "_instructions",
);

const cache = new Map<string, string>();

export async function readInstruction(name: SystemInstructionName): Promise<string> {
  const cached = cache.get(name);
  if (cached !== undefined) return cached;
  const text = await readFile(join(DIR, `${name}.md`), "utf8").catch(() => ""); // не написана — законная пустота
  cache.set(name, text.trim());
  return text.trim();
}

/** Several at once, for a door that answers about several objects. */
export async function readInstructions(names: SystemInstructionName[]): Promise<Record<string, string>> {
  const unique = [...new Set(names)];
  const texts = await Promise.all(unique.map((n) => readInstruction(n)));
  return Object.fromEntries(unique.map((n, i) => [n, texts[i]]));
}

export const instructionNames = (): readonly SystemInstructionName[] => SYSTEM_INSTRUCTION_NAMES;
