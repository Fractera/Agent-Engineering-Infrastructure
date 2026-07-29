// ГЕНЕРАТОР «ПАСПОРТА УЗЛА» — денормализованный дескриптор одного срединного навыка для взноса в
// федеративный корпус (шаг 307.9). Дев-инструмент: живёт ВНЕ рантайм-папки автоматизации (в
// projects-app/scripts/), поэтому закон 0 самодостаточности папки не задет.
//
// Голый объект узла из automation.json не самоописателен: узел «parse date» не знает НИ зачем он
// (кейс), НИ где стоит (соседи по рёбрам). Паспорт склеивает это в один документ — то, что ищется
// вектором, и то, из чего строится провенанс.
//
// Запуск:  node scripts/node-passport.mjs <путь-к-automation.json> <имя-функции|cuid>
// Печатает JSON: { descriptor, embedText }.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";

const [, , corePath, ref] = process.argv;
if (!corePath || !ref) {
  console.error("usage: node scripts/node-passport.mjs <automation.json> <function-name|cuid>");
  process.exit(2);
}

const core = JSON.parse(readFileSync(corePath, "utf8"));

// Адрес автоматизации берём из соседнего paths.ts (AUTOMATION_ADDRESS) — единственное место, где он
// записан буквально. Не нашли — оставляем "unknown", провенанс всё равно несёт cuid+lineage.
function automationAddress() {
  try {
    const root = dirname(dirname(corePath)); // <root>/_data/automation.json → <root>
    const paths = readFileSync(join(root, "_lib", "paths.ts"), "utf8");
    const m = /AUTOMATION_ADDRESS\s*=\s*["']([^"']+)["']/.exec(paths);
    return m ? m[1] : "unknown";
  } catch {
    return "unknown";
  }
}

const allNodes = Object.values(core.graph.nodes.groups).flatMap((g) => g.nodes ?? []);
const node = allNodes.find((n) => n.function?.name === ref || n.cuid === ref);
if (!node) {
  console.error(`no node with function/cuid "${ref}" in ${corePath}`);
  process.exit(1);
}

const byCuid = new Map(allNodes.map((n) => [n.cuid, n]));
const brief = (n) => (n ? { name: n.name, kind: n.kind, ioType: n.ioType ?? null } : null);
const edges = core.graph.edges ?? [];
const upstream = edges.filter((e) => e.to === node.cuid).map((e) => brief(byCuid.get(e.from))).filter(Boolean);
const downstream = edges.filter((e) => e.from === node.cuid).map((e) => brief(byCuid.get(e.to))).filter(Boolean);

// «Зачем» — тексты кейсов, которым узел служит (serves → useCases.cases).
const cases = core.useCases?.cases ?? [];
const serves = (node.serves ?? [])
  .map((cuid) => cases.find((c) => c.cuid === cuid))
  .filter(Boolean)
  .map((c) => ({ cuid: c.cuid, text: c.text ?? c.title ?? "" }));

const address = automationAddress();
const provenance = `projects/${address}?unit=node&node=${node.cuid}&lineage=${node.lineage || ""}`;

const descriptor = {
  unit: "node",
  automation: address,
  cuid: node.cuid,
  lineage: node.lineage || "",
  name: node.name,
  kind: node.kind,
  ioType: node.ioType ?? null,
  function: node.function,
  info: node.info ?? null,
  envKeys: node.envKeys ?? [],
  serves,
  neighbors: { upstream, downstream },
  howItWorks: core.passport?.howItWorks ?? [],
  provenance,
};

// Плоский текст для эмбеддинга — то, по чему ищут «нужен узел, который делает X».
const embedText = [
  node.name,
  node.function?.summary,
  node.function?.accepts ? `accepts: ${node.function.accepts}` : "",
  node.function?.returns ? `returns: ${node.function.returns}` : "",
  serves.length ? `serves cases: ${serves.map((s) => s.text).join(" | ")}` : "",
  upstream.length ? `after: ${upstream.map((n) => n.kind + (n.ioType ? `(${n.ioType})` : "")).join(", ")}` : "",
  downstream.length ? `before: ${downstream.map((n) => n.kind + (n.ioType ? `(${n.ioType})` : "")).join(", ")}` : "",
]
  .filter(Boolean)
  .join(". ");

process.stdout.write(JSON.stringify({ descriptor, embedText }, null, 2) + "\n");
