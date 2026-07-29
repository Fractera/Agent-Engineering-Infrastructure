// ВЗНОС УЗЛОВОГО НАВЫКА В ФЕДЕРАТИВНЫЙ КОРПУС (шаг 307.11) — дев-инструмент, вне рантайм-папки.
//
// Для навыка собирает: ДЕСКРИПТОР (паспорт узла), БАНДЛ материализации (файл функции + фрагмент узла
// без cuid, с lineage + requires — зависимости от стандартной библиотеки папки), ЭМБЕДДИНГ дескриптора
// (OpenAI text-embedding-3-small), и пишет ИММУТАБЕЛЬНУЮ версию в Neon. Идемпотентно по bundle_hash:
// те же байты → новая версия НЕ создаётся.
//
// Env: OPENAI_API_KEY (эмбеддинг), DATABASE_URL (Neon). psql — из PostgreSQL 17.
// Запуск: node scripts/skill-contribute.mjs <automation.json> <function-name>
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { buildPassport, automationAddress } from "./node-passport.mjs";

// Windows-путь: node.execFileSync НЕ понимает git-bash `/c/...`. Переопределяется PSQL_BIN.
const PSQL = process.env.PSQL_BIN ?? "C:\\Program Files\\PostgreSQL\\17\\bin\\psql.exe";
const [, , corePath, fn] = process.argv;
if (!corePath || !fn) {
  console.error("usage: node scripts/skill-contribute.mjs <automation.json> <function-name>");
  process.exit(2);
}

const kebab = (s) => s.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();

// requires: относительные импорты функции ВНУТРИ папки (кроме type-only и ../executor) → что навык
// ждёт от стандартной библиотеки папки-получателя. Формат "_lib/<mod>.ts#name".
function parseRequires(fileText) {
  const out = [];
  const re = /import\s+(type\s+)?\{([^}]*)\}\s+from\s+["'](\.\.\/[^"']+)["']/g;
  let m;
  while ((m = re.exec(fileText))) {
    if (m[1]) continue; // import type — стирается, не рантайм-зависимость
    const mod = m[3].replace(/^\.\.\//, "").replace(/\.js$/, "");
    if (mod === "executor") continue; // только тип NodeCtx
    const names = m[2].split(",").map((s) => s.trim()).filter(Boolean);
    for (const name of names) out.push(`_lib/${mod}.ts#${name}`);
  }
  return out;
}

async function embed(text) {
  const key = (process.env.OPENAI_API_KEY ?? "").trim();
  if (!key) throw new Error("OPENAI_API_KEY is not set");
  const r = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: { "Content-Type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: "text-embedding-3-small", input: text.slice(0, 8000) }),
  });
  if (!r.ok) throw new Error(`OpenAI embeddings HTTP ${r.status}: ${await r.text()}`);
  const d = await r.json();
  const v = d?.data?.[0]?.embedding;
  if (!Array.isArray(v) || v.length !== 1536) throw new Error(`bad embedding (len ${v?.length})`);
  return v;
}

/** Дольщик $tag$…$tag$ для jsonb — тег гарантированно отсутствует в JSON. */
const dollar = (s, tag) => `$${tag}$${s}$${tag}$`;

const core = JSON.parse(readFileSync(corePath, "utf8"));
const address = automationAddress(corePath);
const { descriptor, embedText, node } = buildPassport(core, fn, address);
if (!node.lineage) throw new Error(`node "${fn}" has no lineage — set it before contributing (step 307.9)`);

const root = dirname(dirname(corePath));
const fnFile = join(root, "_lib", "nodes", `${kebab(fn)}.ts`);
const fnText = readFileSync(fnFile, "utf8");
const requires = parseRequires(fnText);

// Фрагмент узла для материализации: БЕЗ cuid (получатель выдаёт свой), С lineage (едет с копией),
// статус impорта задаст материализатор (in-development до локального пруфа).
const { cuid, ...fragment } = node;

const bundle = {
  files: [{ path: `_lib/nodes/${kebab(fn)}.ts`, content: fnText }],
  node: fragment,
  requires,
};
const bundleHash = createHash("sha256").update(JSON.stringify(bundle)).digest("hex");

const vector = await embed(embedText);
const vecLiteral = `[${vector.join(",")}]`;

const sql = `
INSERT INTO skills(lineage, name, summary, kind)
VALUES (${dollar(node.lineage, "lin")}, ${dollar(node.name, "nm")}, ${dollar(node.function.summary, "sm")}, ${dollar(node.kind, "kd")})
ON CONFLICT (lineage) DO NOTHING;

INSERT INTO skill_versions(lineage, version, descriptor, bundle, embedding, bundle_hash, proven_at)
SELECT ${dollar(node.lineage, "lin")},
       (SELECT COALESCE(MAX(version),0)+1 FROM skill_versions WHERE lineage=${dollar(node.lineage, "lin")}),
       ${dollar(JSON.stringify(descriptor), "desc")}::jsonb,
       ${dollar(JSON.stringify(bundle), "bnd")}::jsonb,
       ${dollar(vecLiteral, "vec")}::vector,
       ${dollar(bundleHash, "hsh")},
       now()
WHERE NOT EXISTS (SELECT 1 FROM skill_versions WHERE lineage=${dollar(node.lineage, "lin")} AND bundle_hash=${dollar(bundleHash, "hsh")});
`;

const tmp = join(process.env.TEMP ?? "/tmp", `contribute-${node.lineage}.sql`);
writeFileSync(tmp, sql, "utf8");
let out;
try {
  out = execFileSync(PSQL, [process.env.DATABASE_URL, "-v", "ON_ERROR_STOP=1", "-f", tmp], { encoding: "utf8" });
} catch (e) {
  // Не печатаем объект ошибки целиком — его spawnargs содержат DATABASE_URL (секрет). Только суть.
  console.error(`psql failed (${e.status ?? e.code}): ${String(e.stderr ?? e.message).slice(0, 500)}`);
  process.exit(1);
}
// Последний INSERT в выводе — это вставка в skill_versions (второй оператор). Его счётчик = вставлена ли версия.
const inserts = [...out.matchAll(/INSERT 0 (\d+)/g)];
const versionInserted = inserts.length > 0 && inserts[inserts.length - 1][1] === "1";
console.log(`lineage=${node.lineage} hash=${bundleHash.slice(0, 12)} requires=${requires.length} embedding=${vector.length}d → ${versionInserted ? "VERSION_INSERTED" : "NO_NEW_VERSION (idempotent)"}`);
