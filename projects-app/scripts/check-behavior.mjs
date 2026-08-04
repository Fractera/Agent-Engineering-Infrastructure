// npm run check:behavior — ПРОГОНЯЕТ ФИКСИРОВАННЫЙ НАБОР ЖИВЫХ ПРОВЕРОК по автоматизациям, у которых
// есть `_checks/cases.json`.
//
// ЗАЧЕМ ОТДЕЛЬНЫЙ ГЕЙТ, КОГДА ЕСТЬ `check:core`. Схема доказывает, что ядро ЗАКОННО, и не может доказать,
// что автоматизация РАБОТАЕТ. Все дефекты последних шагов компилировались, проходили схему и при этом
// врали: уточняющий вопрос не доезжал до человека, автоматизация вписывала себе правило, которое не может
// исполнить, добыча падала и рапортовала успех. Такое ловится ТОЛЬКО живым прогоном и взглядом на вывод.
//
// ПОЧЕМУ ПО HTTP, А НЕ ВЫЗОВОМ ДВИЖКА. Проверять надо ту же дорогу, по которой приходит человек: дверь
// `api/run`, авторизация, рантайм сервера, ключ модели в окружении процесса. Собранный в обход движок
// проверял бы другую систему — соседнюю, похожую и не ту.
//
// 🔒 ЧТО ЭТО ДЕЛАЕТ С АВТОМАТИЗАЦИЕЙ И ЧТО КЛАДЁТ ОБРАТНО. Поведение нельзя проверить без следов: прогон
// пишет журналы, склады и состояние диалога, а слой эволюции переписывает САМО ЯДРО. Поэтому снимок
// `automation.json` и `rows.jsonl` делается ДО набора и возвращается ПОБАЙТНО после; строки возвращаются
// ещё и перед КАЖДЫМ случаем — иначе случаи заражают друг друга через общий диалог пульта.
import { readFileSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";

const TARGETS = [join("app", "(projects)", "projects", "other", "starter-v3")];

const BASE = (process.env.CHECK_BASE ?? "http://127.0.0.1:3003").replace(/\/$/, "");
const GATE_FILE = join(process.cwd(), "project-config", "agent-gate-secret");

/** Снимок файла: содержимое либо `null`, если файла не было (тогда «вернуть» = удалить). */
function snapshot(path) {
  return existsSync(path) ? readFileSync(path) : null;
}
function restore(path, snap) {
  if (snap === null) { if (existsSync(path)) rmSync(path); return; }
  writeFileSync(path, snap);
}

/** Значение поля контекста против ожидания. Словарь намеренно крошечный — см. `_checks/readme.md`. */
function matches(actual, expected) {
  if (expected && typeof expected === "object") {
    if (expected.nonempty) return String(actual ?? "").trim().length > 0;
    if (expected.absent) return String(actual ?? "").trim().length === 0;
    if (typeof expected.contains === "string") return String(actual ?? "").includes(expected.contains);
    return false;
  }
  return String(actual ?? "") === String(expected);
}

let failed = false;

for (const rel of TARGETS) {
  const root = join(process.cwd(), rel);
  const casesFile = join(root, "_checks", "cases.json");
  if (!existsSync(casesFile)) { console.log(`check:behavior SKIP — ${rel}: no _checks/cases.json`); continue; }

  const corePath = join(root, "_data", "automation.json");
  const rowsPath = join(root, "_data", "runtime", "rows.jsonl");
  const suite = JSON.parse(readFileSync(casesFile, "utf8"));
  const core = JSON.parse(readFileSync(corePath, "utf8"));
  const url = `${BASE}/projects/${suite.automation}/api/run`;

  const headers = { "content-type": "application/json" };
  if (existsSync(GATE_FILE)) headers["x-fractera-agent-gate"] = readFileSync(GATE_FILE, "utf8").trim();

  // Первый кейс набора — то, что человек выбрал бы кнопкой; список задач ВЫВЕДЕН из кейсов, второго
  // источника у него нет (`_components/control-panel/tasks.ts`).
  const firstCase = core.useCases?.cases?.[0]?.cuid ?? "";

  const coreSnap = snapshot(corePath);
  const rowsSnap = snapshot(rowsPath);
  const costs = new Map();
  let localFail = 0;

  console.log(`\ncheck:behavior — ${suite.automation} (${suite.cases.length} cases) → ${url}`);

  try {
    for (const c of suite.cases) {
      restore(rowsPath, rowsSnap); // каждый случай начинает с одного и того же состояния

      const input = { ...c.input };
      if (c.useTask) {
        if (!firstCase) { console.error(`  FAIL ${c.id} :: useTask, but the core has no use case to choose`); localFail++; continue; }
        input.taskCase = firstCase;
      }

      const started = Date.now();
      let res, body;
      try {
        res = await fetch(url, { method: "POST", headers, body: JSON.stringify({ input }) });
        body = await res.json();
      } catch (e) {
        console.error(`  FAIL ${c.id} :: the door is unreachable at ${url} — ${e instanceof Error ? e.message : String(e)}`);
        localFail++;
        continue;
      }
      const ms = Date.now() - started;

      const problems = [];
      const exp = c.expect ?? {};
      const ctx = body?.context ?? {};
      const cost = body?.cost ?? { nodeFunctions: 0, modelCalls: 0 };
      costs.set(c.id, cost);

      if (res.status === 403) problems.push("403 from the door — the agent gate secret is missing or wrong");
      if (typeof exp.ok === "boolean" && body?.ok !== exp.ok) problems.push(`ok=${body?.ok} (expected ${exp.ok})${body?.error ? ` — ${body.error}` : ""}`);
      for (const [field, want] of Object.entries(exp.context ?? {})) {
        if (!matches(ctx[field], want)) problems.push(`context.${field}=${JSON.stringify(ctx[field])} (expected ${JSON.stringify(want)})`);
      }
      if (exp.coreContains && !readFileSync(corePath, "utf8").includes(exp.coreContains)) {
        problems.push(`the core does not contain "${exp.coreContains}" — the automation did not edit itself`);
      }
      if (exp.cheaperThan) {
        const other = costs.get(exp.cheaperThan);
        if (!other) problems.push(`cheaperThan names "${exp.cheaperThan}", which did not run before this case`);
        else if (!(cost.modelCalls < other.modelCalls)) problems.push(`modelCalls=${cost.modelCalls}, not fewer than ${other.modelCalls} of "${exp.cheaperThan}"`);
      }
      if (exp.cost) {
        if (typeof exp.cost.modelCalls === "number" && cost.modelCalls > exp.cost.modelCalls) problems.push(`modelCalls=${cost.modelCalls} grew past the recorded ${exp.cost.modelCalls}`);
        if (typeof exp.cost.nodeFunctions === "number" && cost.nodeFunctions > exp.cost.nodeFunctions) problems.push(`nodeFunctions=${cost.nodeFunctions} grew past the recorded ${exp.cost.nodeFunctions}`);
      }

      const price = `fn=${cost.nodeFunctions} model=${cost.modelCalls} ${ms}ms`;
      if (problems.length) {
        localFail++;
        console.error(`  FAIL ${c.id}  [${price}]`);
        for (const p of problems) console.error(`       ${p}`);
        if (String(ctx.reply ?? "").trim()) console.error(`       reply: ${String(ctx.reply).slice(0, 200)}`);
      } else {
        console.log(`  PASS ${c.id}  [${price}]`);
      }
    }
  } finally {
    // Возврат ОБЯЗАН случиться даже на упавшем наборе: иначе проверка оставит автоматизацию изменённой.
    restore(corePath, coreSnap);
    restore(rowsPath, rowsSnap);
  }

  if (localFail) { failed = true; console.error(`check:behavior FAILED — ${suite.automation}: ${localFail} of ${suite.cases.length} cases`); }
  else console.log(`check:behavior OK — ${suite.automation}: ${suite.cases.length}/${suite.cases.length} cases, core and rows restored`);
}

process.exit(failed ? 1 : 0);
