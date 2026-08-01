// npm run check:core — прогоняет AutomationSchema.safeParse по ядрам, у которых схема лежит РЯДОМ.
//
// ЗАЧЕМ ОТДЕЛЬНЫЙ ГЕЙТ. Зелёная сборка (`next build` + type-check) НЕ запускает валидацию схемой: safeParse
// живёт в рантайме (`readCore` на запрос). Именно safeParse держит ЗАКОНЫ графа — таблицу связей KIND_PORTS,
// проверку рёбер по source-стороне, квоты групп, уникальность имён функций. Поэтому «собралось» ≠ «правильно».
// Этот скрипт делает валидацию схемой ОБЯЗАТЕЛЬНЫМ, воспроизводимым шагом, а не тем, что можно пропустить.
//
// Важно: safeParse НЕ ловит недосоединённость СКРЫТЫХ узлов (required-порт без ребра штрафуется только у
// ВИДИМЫХ узлов). Значит зелёный check:core необходим, но не достаточен — путь «вход → … → выход» и полноту
// связей по required-портам держит уже человек/агент, а не только схема.
//
// ДВЕ ЦЕЛИ (шаг 311). У каждой автоматизации СВОЯ копия схемы (папка самодостаточна, закон 0), поэтому и
// проверять надо каждую своей: замороженный стартер v2 живёт по трёхслойному закону, а `other/starter-v3` —
// по четырёхслойному (группа `intent`). Один общий прогон по обеим целям гарантирует, что новый закон не
// сломал старое ядро и что новое ядро законно по своему.
import { build } from "esbuild";
import { readFileSync, existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { join } from "node:path";
import { tmpdir } from "node:os";

const TARGETS = [
  { label: "frozen starter v2", base: "app/(projects)/projects/_lib/starters/stream/en/_data" },
  { label: "starter-v3 (intent layer)", base: "app/(projects)/projects/other/starter-v3/_data" },
];

// Все группы, какие может объявить ядро; считаем узлы по тем, что реально есть в этом ядре.
const GROUPS = ["input", "intent", "middle", "output"];

let failed = false;

for (const [i, t] of TARGETS.entries()) {
  const schemaTs = join(t.base, "automation.schema.ts");
  const coreJson = join(t.base, "automation.json");
  if (!existsSync(schemaTs) || !existsSync(coreJson)) {
    console.log(`check:core SKIP — ${t.label}: no core at ${t.base}`);
    continue;
  }
  const out = join(tmpdir(), `check-core-schema-${i}.mjs`);
  await build({ entryPoints: [schemaTs], bundle: true, format: "esm", platform: "node", target: "node20", outfile: out, logLevel: "silent" });
  const { AutomationSchema } = await import(pathToFileURL(out).href);
  const core = JSON.parse(readFileSync(coreJson, "utf8"));
  const r = AutomationSchema.safeParse(core);

  if (r.success) {
    const g = r.data.graph;
    const nodeCount = GROUPS.reduce((a, grp) => a + (g.nodes.groups[grp]?.nodes.length ?? 0), 0);
    const groups = GROUPS.filter((grp) => g.nodes.groups[grp]).map((grp) => `${grp}=${g.nodes.groups[grp].nodes.length}`).join(" ");
    console.log(`check:core OK — ${t.label}: passes AutomationSchema (nodes: ${nodeCount} [${groups}], edges: ${g.edges.length})`);
    continue;
  }
  failed = true;
  console.error(`check:core FAILED — ${t.label}: automation.json violates the schema:`);
  for (const issue of r.error.issues) console.error("  " + (issue.path.join(".") || "root") + " :: " + issue.message);
}

process.exit(failed ? 1 : 0);
