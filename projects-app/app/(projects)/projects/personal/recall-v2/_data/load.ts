import { readCore } from "../_lib/core-io";
import { type Automation } from "./automation.schema";

// ЕДИНСТВЕННАЯ ДВЕРЬ К ЯДРУ ДЛЯ СТРАНИЦЫ. Никто не читает `automation.json` сам — все зовут отсюда,
// поэтому непроверенные данные внутрь автоматизации попасть не могут.
//
// Ядро читается С ДИСКА в момент запроса (`_lib/core-io.ts`), а не подключается импортом: правка одного
// объекта через дверь `api/patch` видна сразу, без пересборки (требование 5).

export async function loadAutomation(): Promise<Automation> {
  return readCore();
}
