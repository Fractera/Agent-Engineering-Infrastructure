// ПОИСК УЗЛОВОГО НАВЫКА В КОРПУСЕ (шаг 307.12) — «нужен узел, который делает X» → кандидаты с ID.
// Эмбеддит запрос, ищет по вектору (cosine), джойнит телеметрию (распространённость+успешность),
// печатает ранжированный список. Дев-инструмент, вне рантайм-папки.
//
// Env: OPENAI_API_KEY, DATABASE_URL. Запуск: node scripts/skill-find.mjs "<описание нужды>" [limit]
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const PSQL = process.env.PSQL_BIN ?? "C:\\Program Files\\PostgreSQL\\17\\bin\\psql.exe";
const query = process.argv[2];
const limit = Number(process.argv[3] ?? 5);
if (!query) {
  console.error('usage: node scripts/skill-find.mjs "<need description>" [limit]');
  process.exit(2);
}

async function embed(text) {
  const key = (process.env.OPENAI_API_KEY ?? "").trim();
  if (!key) throw new Error("OPENAI_API_KEY is not set");
  const r = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: { "Content-Type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: "text-embedding-3-small", input: text.slice(0, 8000) }),
  });
  if (!r.ok) throw new Error(`OpenAI embeddings HTTP ${r.status}`);
  const v = (await r.json())?.data?.[0]?.embedding;
  if (!Array.isArray(v) || v.length !== 1536) throw new Error(`bad embedding (len ${v?.length})`);
  return v;
}

const vec = `[${(await embed(query)).join(",")}]`;

// Последняя версия каждого lineage; похожесть = 1 − cosine; телеметрия слева (пусто до 307.13).
// Ранжирование прототипа — по похожести; телеметрия (серверы/успех) показывается для будущего веса.
const sql = `
WITH latest AS (
  SELECT DISTINCT ON (lineage) lineage, version, descriptor, embedding
  FROM skill_versions ORDER BY lineage, version DESC
),
tel AS (
  SELECT lineage, count(DISTINCT server_id) AS servers, sum(runs) AS runs, sum(ok_runs) AS ok_runs
  FROM telemetry GROUP BY lineage
)
SELECT l.lineage,
       l.version,
       l.descriptor->>'name' AS name,
       round((1 - (l.embedding <=> $vec$${vec}$vec$::vector))::numeric, 4) AS similarity,
       COALESCE(t.servers,0) AS servers,
       COALESCE(t.runs,0)    AS runs,
       COALESCE(t.ok_runs,0) AS ok_runs
FROM latest l LEFT JOIN tel t USING(lineage)
ORDER BY l.embedding <=> $vec$${vec}$vec$::vector
LIMIT ${Number.isFinite(limit) ? limit : 5};
`;

const tmp = join(process.env.TEMP ?? "/tmp", `skill-find.sql`);
writeFileSync(tmp, sql, "utf8");
let out;
try {
  out = execFileSync(PSQL, [process.env.DATABASE_URL, "-P", "pager=off", "-f", tmp], { encoding: "utf8" });
} catch (e) {
  console.error(`psql failed: ${String(e.stderr ?? e.message).slice(0, 300)}`);
  process.exit(1);
}
console.log(`query: "${query}"`);
console.log(out.trim());
