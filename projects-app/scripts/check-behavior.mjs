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
      restore(corePath, coreSnap); // ...и с нетронутого ядра: эволюция предыдущего случая ему не наследство

      // 🔒 НАСТРОЙКИ ПОД СЛУЧАЙ. Вытеснение из памяти нельзя честно проверить на боевом бюджете: пришлось
      // бы гнать десятки реплик, платя за каждую. Поведение вытеснения от масштаба не зависит, поэтому
      // случай вправе назвать СВОЙ бюджет — а снимок вернёт настройки владельца сразу после.
      //
      // Настройки живут на ENTITY вкладки, а не на самой вкладке: схема компонента `.strict()`, и лишнее
      // поле `data` у неё делает ядро незаконным — дверь честно отвечает 500 (поймано этим же набором).
      if (c.settings) {
        const core2 = JSON.parse(readFileSync(corePath, "utf8"));
        const tab = core2.components.tabs.find((t) => t.name === "assistant");
        const entity = tab && (Array.isArray(tab.entities) ? tab.entities[0] : tab.entity);
        if (!entity) { console.error(`  FAIL ${c.id} :: settings, but the assistant tab has no entity to configure`); localFail++; continue; }
        entity.data = { ...(entity.data ?? {}), ...c.settings };
        writeFileSync(corePath, JSON.stringify(core2, null, 2));
      }

      // Диалог — вещь МНОГОХОДОВАЯ: вопрос задан в одном прогоне, ответ приходит следующим. Поэтому случай
      // может назвать последовательность реплик одного чата; ожидания судят ПОСЛЕДНИЙ прогон, остальные —
      // подготовка сцены.
      // 🔒 РАЗОВОЕ СЛОВО (`{{nonce}}`). Проверка памяти обязана мерить ТО, что заявляет. Долгая память
      // общая и снимком не возвращается: одно и то же слово, прогнанное вчера, всплывёт из индекса и
      // случай пройдёт по чужой причине — ложный зелёный, худший род проверки. Свежее слово на каждый
      // прогон брать неоткуда, кроме контекста этой сессии.
      const nonce = "Zel" + Math.random().toString(36).slice(2, 7);
      const sub = (o) => JSON.parse(JSON.stringify(o).replaceAll("{{nonce}}", nonce));

      const steps = (c.inputs ?? [c.input]).map(sub).map((i) => {
        const one = { ...i };
        if (c.useTask) one.taskCase = firstCase;
        return one;
      });
      if (c.useTask && !firstCase) { console.error(`  FAIL ${c.id} :: useTask, but the core has no use case to choose`); localFail++; continue; }

      const started = Date.now();
      let res, body, unreachable = "";
      for (const input of steps) {
        try {
          res = await fetch(url, { method: "POST", headers, body: JSON.stringify({ input }) });
          body = await res.json();
        } catch (e) {
          unreachable = e instanceof Error ? e.message : String(e);
          break;
        }
      }
      if (unreachable) {
        console.error(`  FAIL ${c.id} :: the door is unreachable at ${url} — ${unreachable}`);
        localFail++;
        continue;
      }
      const ms = Date.now() - started;

      const problems = [];
      const exp = sub(c.expect ?? {});
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
      if (exp.coreNotContains && readFileSync(corePath, "utf8").includes(exp.coreNotContains)) {
        problems.push(`the core CONTAINS "${exp.coreNotContains}" — the automation wrote into itself something it must not`);
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
        // Провал в разговоре почти всегда объясняется тем, ЧТО модель прочла. Показываем это сразу: без
        // расхода и текста контекста отладка превращается в перебор догадок (и превратилась однажды).
        if (ctx.dialogueBudget) console.error(`       budget: ${JSON.stringify(ctx.dialogueBudget)}`);
        if (String(ctx.recentDialog ?? "").trim()) {
          console.error("       recentDialog:");
          for (const line of String(ctx.recentDialog).split("\n")) console.error(`         ${line.slice(0, 160)}`);
        }
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
