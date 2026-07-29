// МАТЕРИАЛИЗАЦИЯ УЗЛОВОГО НАВЫКА КОПИЕЙ (шаг 307.12) — берёт навык из корпуса и ВСТАВЛЯЕТ его в папку
// автоматизации-получателя: копирует файл функции, вставляет фрагмент узла (СВЕЖИЙ cuid, lineage из
// бандла, статус `in-development` — импортированный код НЕ proven, пока не доказан локально: supply-chain
// -гейт), проверяет `requires` против папки, регистрирует функцию в index.ts. Дев-инструмент, вне
// рантайм-папки. Env: DATABASE_URL. Запуск: node scripts/skill-materialize.mjs <lineage> <target automation.json>
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { randomBytes } from "node:crypto";

const PSQL = process.env.PSQL_BIN ?? "C:\\Program Files\\PostgreSQL\\17\\bin\\psql.exe";
const [, , lineage, targetCore] = process.argv;
if (!lineage || !targetCore) {
  console.error("usage: node scripts/skill-materialize.mjs <lineage> <target automation.json>");
  process.exit(2);
}

const freshCuid = () => `c${Date.now().toString(36)}${randomBytes(6).toString("hex")}`;

// 1. Забрать последнюю версию бандла из корпуса.
let bundleRaw;
try {
  bundleRaw = execFileSync(
    PSQL,
    [process.env.DATABASE_URL, "-t", "-A", "-c", `SELECT bundle FROM skill_versions WHERE lineage='${lineage}' ORDER BY version DESC LIMIT 1`],
    { encoding: "utf8" },
  ).trim();
} catch (e) {
  console.error(`psql failed: ${String(e.stderr ?? e.message).slice(0, 300)}`);
  process.exit(1);
}
if (!bundleRaw) {
  console.error(`no skill with lineage "${lineage}" in the corpus`);
  process.exit(1);
}
const bundle = JSON.parse(bundleRaw);

const root = dirname(dirname(targetCore)); // <root>/_data/automation.json → <root>

// 2. Скопировать файл(ы) функции в папку-получателя.
for (const f of bundle.files) {
  const dest = join(root, ...f.path.split("/"));
  writeFileSync(dest, f.content, "utf8");
  console.log(`copied ${f.path} (${f.content.length} bytes)`);
}

// 3. Проверить requires против библиотеки папки-получателя (supply-chain-честность: не тихо оборвать).
const missing = [];
for (const req of bundle.requires ?? []) {
  const [rel, name] = req.split("#");
  const file = join(root, ...rel.split("/"));
  if (!existsSync(file) || (name && !new RegExp(`export\\s+(async\\s+)?(function|const)\\s+${name}\\b`).test(readFileSync(file, "utf8")))) {
    missing.push(req);
  }
}
if (missing.length) console.log(`⚠ requires MISSING in target: ${missing.join(", ")}`);
else console.log(`requires satisfied: ${(bundle.requires ?? []).length}`);

// 4. Вставить фрагмент узла в срединную группу ядра — свежий cuid, lineage из бандла, in-development.
const core = JSON.parse(readFileSync(targetCore, "utf8"));
const fn = bundle.node.function?.name;
const already = Object.values(core.graph.nodes.groups)
  .flatMap((g) => g.nodes ?? [])
  .some((n) => n.function?.name === fn);
if (already) {
  console.log(`node "${fn}" already present in target core — skipping fragment insert`);
} else {
  const cuid = freshCuid();
  core.graph.nodes.groups.middle.nodes.push({ cuid, ...bundle.node, status: "in-development" });
  writeFileSync(targetCore, JSON.stringify(core, null, 2) + "\n", "utf8");
  console.log(`inserted node "${fn}" cuid=${cuid} lineage=${bundle.node.lineage} status=in-development`);
}

// 5. Зарегистрировать функцию в index.ts папки-получателя (import + запись в NODE_FUNCTIONS).
const idxPath = join(root, "_lib", "nodes", "index.ts");
const kebab = fn.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
let idx = readFileSync(idxPath, "utf8");
if (!idx.includes(`from "./${kebab}"`)) {
  idx = idx.replace(/(\n)(export const NODE_FUNCTIONS)/, `$1import { ${fn} } from "./${kebab}";\n$2`);
}
if (!new RegExp(`\\b${fn}\\b\\s*,`).test(idx.split("NODE_FUNCTIONS")[1] ?? "")) {
  idx = idx.replace(/(NODE_FUNCTIONS[^{]*\{)/, `$1\n  ${fn},`);
}
writeFileSync(idxPath, idx, "utf8");
console.log(`registered "${fn}" in _lib/nodes/index.ts`);
console.log("===MATERIALIZED===");
