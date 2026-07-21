import { SYSTEM_INSTRUCTIONS, allNodes, type Automation, type Info, type Warning } from "../_data/automation.schema";
import { addressText, type Address } from "./core-io";

// «ЧТО ЖДЁТ РАБОТЫ» — как владелец разговаривает с агентом.
//
// Владелец не пишет агенту письма: он оставляет запись НА ОБЪЕКТЕ — свою инструкцию (`info.crudUser`) или
// предупреждение. Наличие такой записи И ЕСТЬ признак того, что объект надо обновить; всё остальное в ядре
// уже сделано и читать его незачем.
//
// Поэтому вторая и последующие итерации начинаются отсюда, а не с чтения ядра: типичный ответ — сотни
// токенов вместо тысяч. Пустой ответ означает «работы нет» и является законным концом итерации.

export type WorkItem = {
  address: string;
  systemInstruction: string;
  name: string;
  crudUser?: string; // the owner's own words, when the object carries them
  warnings?: string[];
  status?: string;
};

const ownerWords = (info: Info): string | null => ("crudUser" in info ? info.crudUser : null);
const texts = (warnings: Warning[]): string[] => warnings.map((w) => w.text);

const item = (
  address: Address,
  systemInstruction: string,
  name: string,
  info: Info | null,
  warnings: Warning[],
  status?: string,
): WorkItem | null => {
  const crudUser = info ? ownerWords(info) : null;
  if (!crudUser && warnings.length === 0) return null; // nothing pending on this object
  return {
    address: addressText(address),
    systemInstruction,
    name,
    ...(crudUser ? { crudUser } : {}),
    ...(warnings.length ? { warnings: texts(warnings) } : {}),
    ...(status ? { status } : {}),
  };
};

export function pendingWork(core: Automation): WorkItem[] {
  const found: (WorkItem | null)[] = [];

  // the automation as a whole — the owner may instruct it, not only its parts
  found.push(item({ object: "passport" }, SYSTEM_INSTRUCTIONS.passport, core.passport.title, core.passport.info, []));

  // the set of use cases — a CONFLICT between cases belongs to no single case
  found.push(item({ object: "useCases" }, SYSTEM_INSTRUCTIONS.useCases, "use cases", null, core.useCases.warnings));

  // nodes, each with the instruction of ITS kind — the law it is developed by
  for (const node of allNodes(core.graph.nodes)) {
    const key = `kind.${node.kind}` as keyof typeof SYSTEM_INSTRUCTIONS;
    found.push(item({ object: "node", cuid: node.cuid }, SYSTEM_INSTRUCTIONS[key], node.name, node.info, node.warnings, node.status));
  }

  // tabs and the entities inside them
  for (const tab of core.components.tabs) {
    found.push(item({ object: "tab", name: tab.name }, SYSTEM_INSTRUCTIONS.tab, tab.name, tab.info, tab.warnings, tab.status));
    for (const entity of tab.entities) {
      found.push(
        item({ object: "entity", tab: tab.name, cuid: entity.cuid }, SYSTEM_INSTRUCTIONS.tab, entity.name, entity.info, entity.warnings, entity.status),
      );
    }
  }

  return found.filter((w): w is WorkItem => w !== null);
}
