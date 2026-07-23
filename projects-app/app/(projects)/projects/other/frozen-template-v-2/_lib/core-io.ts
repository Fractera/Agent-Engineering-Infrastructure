import { readFile, writeFile, rename } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { join } from "node:path";
import {
  AutomationSchema,
  GROUP_POLICY,
  allNodes,
  type Automation,
  type Node,
  type GroupName,
} from "../_data/automation.schema";

// ЕДИНСТВЕННЫЙ МОДУЛЬ ЧТЕНИЯ И ЗАПИСИ ЯДРА.
//
// Ядро читается с диска в момент запроса и пишется атомарно (временный файл → переименование), поэтому
// правка одного объекта видна сразу и никогда не оставляет наполовину записанный файл.
//
// Здесь же живёт адресация: у каждого объекта ядра есть адрес из уже существующих ключей — cuid там, где
// объект можно переименовать или размножить, естественное имя там, где имя И ЕСТЬ идентичность.

const CORE_PATH = join(process.cwd(), "app", "(projects)", "projects", "other", "frozen-template-v-2", "_data", "automation.json");

// ─── ЧТЕНИЕ ─────────────────────────────────────────────────────────────────────────────────────────
const explain = (issues: { path: PropertyKey[]; message: string }[]): string =>
  issues.map((i) => `${i.path.join(".") || "<root>"} — ${i.message}`).join("\n");

export async function readCore(): Promise<Automation> {
  const raw = await readFile(CORE_PATH, "utf8");
  const result = AutomationSchema.safeParse(JSON.parse(raw));
  if (!result.success) throw new Error(`automation.json does not match the schema:\n${explain(result.error.issues)}`);
  return result.data;
}

// ─── ИДЕНТИЧНОСТЬ ───────────────────────────────────────────────────────────────────────────────────
// Cuid выдаёт ядро, а не тот, кто просит: идентичность — не поле ввода. Форма та же, что у остальных
// (буква впереди, дальше строчная латиница и цифры) — модель повторяет её без ошибок формата.
let counter = Math.floor(Math.random() * 0xffffff);

export function createCuid(): string {
  const time = Date.now().toString(36);
  const count = (counter++ & 0xffffff).toString(36);
  return `c${time}${count}${randomBytes(8).toString("hex")}`;
}

// ─── АДРЕС ОБЪЕКТА ──────────────────────────────────────────────────────────────────────────────────
export type Address =
  | { object: "passport" }
  | { object: "graph" }
  | { object: "components" }
  | { object: "history" }
  | { object: "useCases" }
  | { object: "node"; cuid: string }
  | { object: "edge"; cuid: string }
  | { object: "tab"; name: string }
  | { object: "entity"; tab: string; cuid: string }
  | { object: "useCase"; cuid: string };

export const addressText = (a: Address): string =>
  a.object === "node" || a.object === "edge" || a.object === "useCase"
    ? `${a.object}:${a.cuid}`
    : a.object === "tab"
      ? `tab:${a.name}`
      : a.object === "entity"
        ? `entity:${a.tab}/${a.cuid}`
        : a.object;

/** Which group a node sits in — needed by the quota laws on add/delete. */
export const groupOfNode = (core: Automation, cuid: string): GroupName | null => {
  const groups = core.graph.nodes.groups;
  for (const name of ["input", "middle", "output"] as GroupName[]) {
    if (groups[name].nodes.some((n) => n.cuid === cuid)) return name;
  }
  return null;
};

/** The object an address points at, or an explanation of why it points at nothing. */
export function locate(core: Automation, a: Address): { ok: true; target: Record<string, unknown> } | { ok: false; error: string } {
  const groups = core.graph.nodes.groups;
  switch (a.object) {
    case "passport":
      return { ok: true, target: core.passport as unknown as Record<string, unknown> };
    case "graph":
      return { ok: true, target: core.graph as unknown as Record<string, unknown> };
    case "components":
      return { ok: true, target: core.components as unknown as Record<string, unknown> };
    case "history":
      return { ok: true, target: core.history as unknown as Record<string, unknown> };
    case "useCases":
      return { ok: true, target: core.useCases as unknown as Record<string, unknown> };
    case "node": {
      const node = allNodes(core.graph.nodes).find((n) => n.cuid === a.cuid);
      return node ? { ok: true, target: node as unknown as Record<string, unknown> } : { ok: false, error: `no node with cuid "${a.cuid}"` };
    }
    case "edge": {
      const edge = core.graph.edges.find((e) => e.cuid === a.cuid);
      return edge ? { ok: true, target: edge as unknown as Record<string, unknown> } : { ok: false, error: `no edge with cuid "${a.cuid}"` };
    }
    case "tab": {
      const tab = core.components.tabs.find((t) => t.name === a.name);
      return tab ? { ok: true, target: tab as unknown as Record<string, unknown> } : { ok: false, error: `no tab named "${a.name}"` };
    }
    case "entity": {
      const tab = core.components.tabs.find((t) => t.name === a.tab);
      if (!tab) return { ok: false, error: `no tab named "${a.tab}"` };
      const entity = tab.entities.find((en) => en.cuid === a.cuid);
      return entity ? { ok: true, target: entity as unknown as Record<string, unknown> } : { ok: false, error: `tab "${a.tab}" has no entity "${a.cuid}"` };
    }
    case "useCase": {
      const useCase = core.useCases.cases.find((u) => u.cuid === a.cuid);
      return useCase ? { ok: true, target: useCase as unknown as Record<string, unknown> } : { ok: false, error: `no use case with cuid "${a.cuid}"` };
    }
  }
  void groups;
  return { ok: false, error: "unknown address" };
}

// ─── ЧТО МОЖНО ПИСАТЬ ───────────────────────────────────────────────────────────────────────────────
// Белый список на каждый вид объекта. Всё, чего здесь нет, — не пишется НИКОГДА:
//   systemInstruction — приколочена (её текст авторский, живёт в схеме);
//   cuid / kind       — идентичность и вид не меняются: другой вид = другой узел;
//   in / out          — выводятся из вида по таблице связей, а не объявляются заново.
export const WRITABLE: Record<Address["object"], string[]> = {
  // `ai` — какой моделью думает эта автоматизация; меняется в Настройках (шаг 295). Тип и адрес
  // по-прежнему не пишутся: тип — решение о природе автоматизации, адрес задаётся положением папки.
  passport: ["title", "description", "author", "sharing", "info", "lifecycle", "howItWorks", "ai"],
  graph: [],
  components: [],
  history: [],
  useCases: ["warnings"],
  node: ["name", "description", "state", "ioType", "info", "status", "warnings", "envKeys", "function", "run", "estDurationMs"],
  edge: ["state"],
  tab: ["presence", "info", "status", "warnings", "envKeys"],
  entity: ["name", "info", "status", "warnings", "envKeys", "data"],
  useCase: ["text", "status"],
};

const PINNED_REFUSAL =
  "a system instruction is not part of the core at all — it is authored in automation.schema.ts and attached by the doors when they answer";
const DERIVED_REFUSAL: Record<string, string> = {
  cuid: "a cuid is identity — it is never rewritten",
  kind: "a node's kind is for life — another kind means another node (add it, hide this one)",
  in: "ports are derived from the kind by the connection table — they are never declared anew",
  out: "ports are derived from the kind by the connection table — they are never declared anew",
};

/** Refuse a write field for field, so the refusal itself teaches what may be written. */
export function checkWritable(object: Address["object"], set: Record<string, unknown>): string[] {
  const allowed = WRITABLE[object];
  const refusals: string[] = [];
  for (const key of Object.keys(set)) {
    if (key === "systemInstruction") refusals.push(`${key}: ${PINNED_REFUSAL}`);
    else if (DERIVED_REFUSAL[key]) refusals.push(`${key}: ${DERIVED_REFUSAL[key]}`);
    else if (!allowed.includes(key)) {
      refusals.push(allowed.length ? `${key}: not writable on "${object}" — writable: ${allowed.join(", ")}` : `${key}: "${object}" takes no direct writes`);
    }
  }
  return refusals;
}

// ─── КВОТЫ ГРУПП ПРИ ДОБАВЛЕНИИ И УДАЛЕНИИ ──────────────────────────────────────────────────────────
// Правила групп перестают быть только проверкой при чтении: дверь физически отказывает в создании
// второго коннектора и в удалении двери-канала.
export function checkAdd(core: Automation, group: GroupName, kind: Node["kind"]): string | null {
  const law = GROUP_POLICY[group];
  const rule = law.kinds[kind];
  if (!rule) return `a "${kind}" cannot live in the "${group}" group — it holds ${Object.keys(law.kinds).join(", ")}`;
  if (rule.addition === "forbidden") {
    return `adding a "${kind}" is forbidden — the "${group}" group carries exactly ${rule.minNodes} of it`;
  }
  return null;
}

export function checkDelete(core: Automation, group: GroupName, kind: Node["kind"]): string | null {
  const law = GROUP_POLICY[group];
  const rule = law.kinds[kind];
  if (!rule) return `the "${group}" group has no "${kind}" to delete`;
  const count = core.graph.nodes.groups[group].nodes.filter((n) => n.kind === kind).length;
  if (rule.deletion === "forbidden") {
    return `deleting a "${kind}" is forbidden — an unused one is HIDDEN (state: "hidden"), never removed`;
  }
  if (count <= rule.minNodes) {
    return `the "${group}" group keeps at least ${rule.minNodes} "${kind}" node(s) — it has ${count}`;
  }
  return null;
}

// ─── ЗАПИСЬ ─────────────────────────────────────────────────────────────────────────────────────────
/** Validate the WHOLE core and write it atomically. A core that would be unlawful is never written — the
 *  caller gets the list of violations instead, and the file on disk stays exactly as it was. */
export async function writeCore(candidate: unknown): Promise<{ ok: true } | { ok: false; errors: string[] }> {
  const result = AutomationSchema.safeParse(candidate);
  if (!result.success) {
    return { ok: false, errors: result.error.issues.map((i) => `${i.path.join(".") || "<root>"} — ${i.message}`) };
  }
  const tmp = `${CORE_PATH}.tmp`;
  await writeFile(tmp, `${JSON.stringify(candidate, null, 2)}\n`, "utf8");
  await rename(tmp, CORE_PATH);
  return { ok: true };
}
