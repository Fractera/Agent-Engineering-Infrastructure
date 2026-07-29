// ТЕЛЕМЕТРИЯ v0 (шаг 307.13) — журнал прогонов `runs.jsonl` → агрегаты по lineage в Neon. Считает,
// сколько раз навык (по lineage, НЕ по локальному cuid) исполнялся и с каким успехом, по серверу и дню.
// НИКОГДА не зовётся из пути прогона (телеметрия не в рантайме исполнения); только числа, ни байта
// полезной нагрузки. Идемпотентно: агрегат ПЕРЕСЧИТЫВАЕТСЯ из журнала целиком и UPSERT'ится — повтор не
// задваивает. Дев-инструмент, вне рантайм-папки. Env: DATABASE_URL.
// Запуск: node scripts/telemetry-push.mjs <automation.json> <runs.jsonl> <server_id>
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const PSQL = process.env.PSQL_BIN ?? "C:\\Program Files\\PostgreSQL\\17\\bin\\psql.exe";
const [, , corePath, runsPath, serverId] = process.argv;
if (!corePath || !runsPath || !serverId) {
  console.error("usage: node scripts/telemetry-push.mjs <automation.json> <runs.jsonl> <server_id>");
  process.exit(2);
}

// cuid → lineage: телеметрия агрегирует по ПАТТЕРНУ, а локальный cuid у каждого экземпляра свой.
const core = JSON.parse(readFileSync(corePath, "utf8"));
const lineageOf = new Map();
for (const g of Object.values(core.graph.nodes.groups))
  for (const n of g.nodes ?? []) if (n.lineage) lineageOf.set(n.cuid, n.lineage);

// Агрегат { "lineage\tday": { runs, ok } } из журнала. Узел без lineage — пропускается (не наш навык).
const agg = new Map();
for (const line of readFileSync(runsPath, "utf8").split("\n")) {
  if (!line.trim()) continue;
  let run;
  try { run = JSON.parse(line); } catch { continue; }
  const day = String(run.startedAt ?? run.finishedAt ?? "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) continue;
  for (const rep of run.nodes ?? []) {
    const lin = lineageOf.get(rep.cuid);
    if (!lin) continue;
    const key = `${lin}\t${day}`;
    const cur = agg.get(key) ?? { runs: 0, ok: 0 };
    cur.runs += 1;
    if (rep.status === "ok") cur.ok += 1;
    agg.set(key, cur);
  }
}

if (!agg.size) { console.log("no skill runs in the journal — nothing to push"); process.exit(0); }

// UPSERT: пересчитанный агрегат замещает прежний (не инкремент) → повтор идемпотентен.
const esc = (s) => s.replace(/'/g, "''");
const rows = [...agg.entries()].map(([key, v]) => {
  const [lin, day] = key.split("\t");
  return `('${esc(lin)}','${esc(serverId)}','${day}',${v.runs},${v.ok})`;
});
const sql = `
INSERT INTO telemetry(lineage, server_id, day, runs, ok_runs) VALUES
${rows.join(",\n")}
ON CONFLICT (lineage, server_id, day) DO UPDATE SET runs = EXCLUDED.runs, ok_runs = EXCLUDED.ok_runs;
`;
const tmp = join(process.env.TEMP ?? "/tmp", "telemetry-push.sql");
writeFileSync(tmp, sql, "utf8");
try {
  const out = execFileSync(PSQL, [process.env.DATABASE_URL, "-v", "ON_ERROR_STOP=1", "-f", tmp], { encoding: "utf8" });
  console.log(`pushed ${rows.length} (lineage,day) aggregates for server ${serverId}: ${out.trim()}`);
} catch (e) {
  console.error(`psql failed: ${String(e.stderr ?? e.message).slice(0, 300)}`);
  process.exit(1);
}
