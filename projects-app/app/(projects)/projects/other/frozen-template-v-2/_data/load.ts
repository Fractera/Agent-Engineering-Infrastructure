import core from "./automation.json";
import { AutomationSchema, type Automation } from "./automation.schema";

// ЕДИНСТВЕННАЯ ДВЕРЬ К ЯДРУ. Никто не читает `automation.json` сам — все зовут отсюда,
// поэтому непроверенные данные внутрь автоматизации попасть не могут.
//
// ⚠️ ВРЕМЕННО: ядро подключается импортом, то есть попадает в сборку. Файл остаётся единственным
// источником истины, но правка становится видна после пересборки. Чтение с диска в момент
// запроса — требование 5.

// an error explains itself: the path to the field plus what is wrong with it
function explain(issues: { path: PropertyKey[]; message: string }[]): string {
  return issues.map((i) => `${i.path.join(".") || "<root>"} — ${i.message}`).join("\n");
}

export async function loadAutomation(): Promise<Automation> {
  const result = AutomationSchema.safeParse(core);
  if (!result.success) {
    throw new Error(`automation.json does not match the schema:\n${explain(result.error.issues)}`);
  }
  return result.data;
}
