// npm run check:instructions — ДЕРЖИТ ОБЕЩАНИЯ, КОТОРЫЕ ИНСТРУКЦИИ ДАЮТ ХОЛОДНОЙ СЕССИИ.
//
// 🔴 ЗАЧЕМ. Новая сессия начинает с чтения `CLAUDE.md` / `AGENTS.md`, а дальше идёт по ИМЕНАМ: «читай
// `kind.transform.md`», «возьми выжимку через `GET api/core`», «структурная правка требует расписки».
// Каждое такое имя — обещание. Обещание гниёт молча: файл переименовали, имя выпало из словаря схемы,
// дверь стала отвечать 404 — и холодный агент упирается в пустоту ровно там, где ему сказали идти. Ни
// `check:core`, ни `check:behavior` этого не видят: ядро законно, поведение живо, а карта врёт.
//
// ЧТО ПРОВЕРЯЕТСЯ (пять обещаний, все — из текста самих инструкций):
//   1. каждое имя закона, названное в документах, существует файлом;
//   2. файл закона и словарь схемы совпадают в ОБЕ стороны — файл без имени недосягаем для агента без
//      файловой системы, имя без файла даёт пустую дверь;
//   3. дверь `api/instruction?name=` реально отдаёт КАЖДЫЙ закон (живой запрос, а не вера в код);
//   4. обложка `GET api/core` укладывается в замеренный бюджет — за неё платит КАЖДАЯ новая сессия
//      первым же вызовом, и растёт она незаметно;
//   5. расписка о чтении работает обеими сторонами: без заголовков структурная правка получает 428, а с
//      верными хешами — уже НЕ 428 (проверяется заведомо негодной правкой, ядро не меняется).
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";

const TARGETS = [join("app", "(projects)", "projects", "other", "starter-v3")];
const BASE = (process.env.CHECK_BASE ?? "http://127.0.0.1:3003").replace(/\/$/, "");
const GATE_FILE = join(process.cwd(), "project-config", "agent-gate-secret");
// 🔒 ПОРОГ ЗАМЕРЕН, А НЕ ЖЕЛАЕМЫЙ. Инструкции обещали «~800 токенов» — замер 2026-08-04 дал 11 400
// (паспорт-инструкция 6 400 + выжимка 4 800). Обещание исправлено на правду, а порог поставлен чуть выше
// факта: задача гейта — ловить ДАЛЬНЕЙШЕЕ разрастание обложки, потому что растёт она незаметно, а платит
// за неё КАЖДАЯ новая сессия первым же вызовом. Уменьшили обложку — опустите и порог, иначе он врёт.
const COVER_TOKEN_LIMIT = 12_500;

const sha256 = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");
const estimateTokens = (t) => {
  let a = 0, w = 0;
  for (const ch of t) ((ch.codePointAt(0) ?? 0) < 128 ? a++ : w++);
  return Math.ceil(a / 4 + w / 2);
};

let failed = false;

for (const rel of TARGETS) {
  const root = join(process.cwd(), rel);
  const instrDir = join(root, "_instructions");
  if (!existsSync(instrDir)) { console.log(`check:instructions SKIP — ${rel}: no _instructions/`); continue; }

  const problems = [];
  const files = readdirSync(instrDir).filter((f) => f.endsWith(".md")).map((f) => f.slice(0, -3));
  const fileSet = new Set(files);

  // 1. Каждое имя, названное в документах, существует файлом.
  const docs = ["CLAUDE.md", "AGENTS.md", "ARCHITECTURE.md"].map((f) => join(root, f))
    .concat(files.map((n) => join(instrDir, `${n}.md`)))
    .filter(existsSync);
  let refs = 0;
  for (const doc of docs) {
    const text = readFileSync(doc, "utf8");
    for (const m of text.matchAll(/`([a-z0-9.\-]+)\.md`/g)) {
      const name = m[1];
      refs++;
      if (fileSet.has(name) || existsSync(join(root, `${name}.md`))) continue;
      problems.push(`${doc.replace(root, ".")} points at "${name}.md", which does not exist`);
    }
  }

  // 2. Файлы и словарь схемы совпадают в обе стороны.
  const schemaText = readFileSync(join(root, "_data", "automation.schema.ts"), "utf8");
  const block = schemaText.match(/SYSTEM_INSTRUCTION_NAMES\s*=\s*\[([\s\S]*?)\]/);
  const declared = new Set([...(block?.[1] ?? "").matchAll(/"([^"]+)"/g)].map((m) => m[1]));
  for (const n of files) if (!declared.has(n)) problems.push(`_instructions/${n}.md exists but is not in SYSTEM_INSTRUCTION_NAMES — an agent without filesystem access can never reach it`);
  for (const n of declared) if (!fileSet.has(n)) problems.push(`SYSTEM_INSTRUCTION_NAMES declares "${n}" but there is no _instructions/${n}.md — the door would serve nothing`);

  // ── ЖИВЫЕ ОБЕЩАНИЯ ───────────────────────────────────────────────────────────────────────────────
  const headers = {};
  if (existsSync(GATE_FILE)) headers["x-fractera-agent-gate"] = readFileSync(GATE_FILE, "utf8").trim();
  const address = `${BASE}/projects/${rel.split(/[\\/]/).slice(-2).join("/")}/api`;

  let live = true;
  try {
    // 3. Дверь отдаёт каждый закон.
    for (const n of files) {
      const r = await fetch(`${address}/instruction?name=${encodeURIComponent(n)}`, { headers });
      if (!r.ok) { problems.push(`GET api/instruction?name=${n} → HTTP ${r.status}`); continue; }
      const body = await r.json().catch(() => null);
      const text = String(body?.text ?? body?.instruction ?? "").trim();
      if (!text) problems.push(`GET api/instruction?name=${n} answered 200 with nothing in it`);
    }

    // 4. Выжимка закона не разрослась.
    const digestRes = await fetch(`${address}/core`, { headers });
    if (!digestRes.ok) problems.push(`GET api/core → HTTP ${digestRes.status}`);
    else {
      const size = estimateTokens(JSON.stringify(await digestRes.json()));
      console.log(`  api/core cover: ~${size} tokens (limit ${COVER_TOKEN_LIMIT})`);
      if (size > COVER_TOKEN_LIMIT) problems.push(`the api/core cover costs ~${size} tokens, past its ${COVER_TOKEN_LIMIT} budget — every new session pays this on its first call`);
    }

    // 5. Расписка о чтении — обе стороны. Правка заведомо негодная: два несуществующих адреса, поэтому
    //    ядро не меняется ни в одном исходе, а различаются ТОЛЬКО коды отказа.
    const bogus = JSON.stringify({ op: "connect", from: "cnotarealnodeaaaa", to: "cnotarealnodebbbb" });
    const without = await fetch(`${address}/patch`, { method: "POST", headers: { ...headers, "content-type": "application/json" }, body: bogus });
    if (without.status !== 428) problems.push(`a structural patch with NO read receipt got HTTP ${without.status}, and the law says 428 — the gate that makes reading mandatory is open`);

    const withReceipt = await fetch(`${address}/patch`, {
      method: "POST",
      headers: {
        ...headers,
        "content-type": "application/json",
        "x-core-read": sha256(join(root, "_data", "automation.json")),
        "x-schema-read": sha256(join(root, "_data", "automation.schema.ts")),
      },
      body: bogus,
    });
    if (withReceipt.status === 428) problems.push(`a correct read receipt was still refused with 428 — the hashes the instructions tell an agent to compute do not match what the door computes`);
  } catch (e) {
    live = false;
    problems.push(`the automation is unreachable at ${address} — ${e instanceof Error ? e.message : String(e)}`);
  }

  if (problems.length) {
    failed = true;
    console.error(`check:instructions FAILED — ${rel}:`);
    for (const p of problems) console.error(`  ${p}`);
  } else {
    console.log(`check:instructions OK — ${rel}: ${refs} named references resolve, ${files.length} laws served${live ? ", digest and read receipt hold" : ""}`);
  }
}

process.exit(failed ? 1 : 0);
