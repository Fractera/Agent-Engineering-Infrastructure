// npm run check:core — прогоняет AutomationSchema.safeParse по automation.json замороженного шаблона v2.
//
// ЗАЧЕМ ОТДЕЛЬНЫЙ ГЕЙТ. Зелёная сборка (`next build` + type-check) НЕ запускает валидацию схемой: safeParse
// живёт в рантайме (`readCore` на запрос). Именно safeParse держит ЗАКОНЫ графа — таблицу связей KIND_PORTS,
// проверку рёбер по source-стороне, квоты групп, уникальность имён функций. Поэтому «собралось» ≠ «правильно».
// Этот скрипт делает валидацию схемой ОБЯЗАТЕЛЬНЫМ, воспроизводимым шагом, а не тем, что можно пропустить.
//
// Важно: safeParse НЕ ловит недосоединённость СКРЫТЫХ узлов (required-порт без ребра штрафуется только у
// ВИДИМЫХ узлов). Значит зелёный check:core необходим, но не достаточен — путь «вход → … → выход» и полноту
// связей по required-портам держит уже человек/агент, а не только схема.
import { build } from "esbuild";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { join } from "node:path";
import { tmpdir } from "node:os";

const base = "app/(projects)/projects/other/frozen-template-v-2/_data";
const schemaTs = join(base, "automation.schema.ts");
const coreJson = join(base, "automation.json");
const out = join(tmpdir(), "check-core-schema.mjs");

await build({ entryPoints: [schemaTs], bundle: true, format: "esm", platform: "node", target: "node20", outfile: out, logLevel: "silent" });
const { AutomationSchema } = await import(pathToFileURL(out).href);
const core = JSON.parse(readFileSync(coreJson, "utf8"));
const r = AutomationSchema.safeParse(core);

if (r.success) {
  const g = r.data.graph;
  const nodeCount = ["input", "middle", "output"].reduce((a, grp) => a + g.nodes.groups[grp].nodes.length, 0);
  console.log(`check:core OK — automation.json passes AutomationSchema (nodes: ${nodeCount}, edges: ${g.edges.length})`);
  process.exit(0);
}
console.error("check:core FAILED — automation.json violates the schema:");
for (const i of r.error.issues) console.error("  " + (i.path.join(".") || "root") + " :: " + i.message);
process.exit(1);
