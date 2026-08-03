// ДВИЖОК ИСПОЛНЕНИЯ v2 — СОБСТВЕННЫЙ, читает ТИПИЗИРОВАННОЕ ЯДРО напрямую (закон 0: внутри папки,
// снаружи только zod + node-builtins; НЕ импортирует платформенный lib/executor).
//
// Семантика зеркалит доказанный v1 (lib/executor.ts), но источник истины — automation.json, не meta.ts:
//   1. lifecycle обязан быть real-project — замороженный шаблон (всё hidden) не исполняется;
//   2. исполняются ТОЛЬКО видимые узлы; топологический порядок по видимым рёбрам (Kahn), при равенстве —
//      порядок рождения (индекс в графе);
//   3. один общий context-bag; функция узла = (ctx) => частичный ctx, слитый обратно в bag;
//   4. ПЕРВЫЙ throw останавливает цепочку — упавший прогон не пишет вывод (провал корректен);
//   5. возврат `null` из узла-условия = ветка не держит, штатная остановка (не ошибка).
//
// Контракт функции узла (общий для _lib/nodes/*.ts): NodeFn ниже.
import { readCore } from "./core-io";
import { allNodes, type Node } from "../_data/automation.schema";
import { NODE_FUNCTIONS } from "./nodes";
import { NODE_VALIDATORS } from "./validators";
import { appendRun } from "./runs";
import { chatKeyOf, loadChat, sealTurns } from "./components/conversation/state";
import type { TurnOutcome } from "../_data/record.schema";
import { assistantConfigOf } from "./components/conversation/config";
import { buildDialogue, classifyBudget, classifyWindow, userTurnsOnly } from "./components/conversation/context";

export type NodeCtx = Record<string, unknown>;
export type NodeResult = NodeCtx | null | void;
export type NodeFn = (ctx: NodeCtx) => NodeResult | Promise<NodeResult>;

export type RunNodeReport = { cuid: string; name: string; fn: string; status: "ok" | "stopped" | "fail"; outcome?: string; error?: string };
export type RunOutcome = { ok: boolean; runId: string; startedAt: string; nodes: RunNodeReport[]; context: NodeCtx; error?: string };
export type RunRefusal = { refusal: string };

const cuid = () => `crun${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

/** Kahn topological sort over the visible edges; ties broken by birth order (index in the node list). */
function topoOrder(nodes: Node[], edges: { from: string; to: string }[]): Node[] {
  const order = new Map(nodes.map((n, i) => [n.cuid, i]));
  const indeg = new Map(nodes.map((n) => [n.cuid, 0]));
  const outAdj = new Map<string, string[]>(nodes.map((n) => [n.cuid, []]));
  for (const e of edges) {
    if (!indeg.has(e.from) || !indeg.has(e.to)) continue;
    indeg.set(e.to, (indeg.get(e.to) ?? 0) + 1);
    outAdj.get(e.from)!.push(e.to);
  }
  const byCuid = new Map(nodes.map((n) => [n.cuid, n]));
  const ready = nodes.filter((n) => (indeg.get(n.cuid) ?? 0) === 0).map((n) => n.cuid);
  const result: Node[] = [];
  const seen = new Set<string>();
  while (ready.length) {
    ready.sort((a, b) => (order.get(a)! - order.get(b)!)); // stable birth-order tiebreak
    const cur = ready.shift()!;
    if (seen.has(cur)) continue;
    seen.add(cur);
    result.push(byCuid.get(cur)!);
    for (const nxt of outAdj.get(cur) ?? []) {
      indeg.set(nxt, (indeg.get(nxt) ?? 0) - 1);
      if ((indeg.get(nxt) ?? 0) === 0) ready.push(nxt);
    }
  }
  // any node left out (a cycle) is appended in birth order so it still runs deterministically
  for (const n of nodes) if (!seen.has(n.cuid)) result.push(n);
  return result;
}

/**
 * ЧЕМ КОНЧИЛСЯ ПРОГОН ДЛЯ РАЗГОВОРА (330.3) — исход в терминах человека, а не узлов. Порядок важен:
 * отказ по секрету остаётся отказом, даже если технически прогон прошёл гладко; упавший узел — провал,
 * что бы ни успел сказать валидатор до него; и только потом — исход последнего решавшего узла
 * (`found` / `missing` / `unreachable`).
 */
function turnOutcomeOf(ctx: NodeCtx, failed: boolean): TurnOutcome {
  if (String(ctx.intentClass ?? "") === "refuse") return "refused";
  if (failed) return "failed";
  const last = String(ctx.outcome ?? "");
  if (last === "missing" || last === "unreachable") return last;
  return "ok";
}

/**
 * ЧТО ПРОГОН ОСТАВИЛ В СКЛАДАХ СУЩНОСТЕЙ (330.3). Карта явная, а не выведенная из имени склада: поле
 * памяти зовётся `vectorRowId`, а склад — `vector-memory`, и молчаливая деривация здесь ошиблась бы.
 * Журналы прогона (`history`, `analytics`, `toast`) сюда НЕ входят: они хранят, что произошло, а не что
 * появилось, — та же граница, что у `ENTITY_STORES`.
 */
const ROW_FIELDS: Array<[field: string, table: string]> = [
  ["databaseRowId", "database"],
  ["vectorRowId", "vector-memory"],
  ["storageRowId", "storage"],
  ["mapRowId", "map"],
  ["calendarRowId", "calendar"],
];

function createdRows(ctx: NodeCtx): { table: string; id: string }[] {
  const out: { table: string; id: string }[] = [];
  for (const [field, table] of ROW_FIELDS) {
    const id = String(ctx[field] ?? "").trim();
    if (id) out.push({ table, id });
  }
  return out;
}

export async function executeAutomation(input: NodeCtx): Promise<RunOutcome | RunRefusal> {
  const core = await readCore();
  if (core.passport.lifecycle !== "real-project") {
    return { refusal: "a frozen template does not run — set lifecycle to real-project and reveal the nodes first" };
  }
  const nodes = allNodes(core.graph.nodes);
  const visible = nodes.filter((n) => n.state === "visible");
  if (!visible.length) return { refusal: "there is no visible node to run" };

  const visibleCuids = new Set(visible.map((n) => n.cuid));
  const edges = core.graph.edges.filter((e) => visibleCuids.has(e.from) && visibleCuids.has(e.to));
  const order = topoOrder(visible, edges);

  const runId = cuid();
  const startedAt = new Date().toISOString();
  // `runId` в контексте — не украшение: по нему слой намерения кэширует ОДНО прочтение запроса моделью на
  // весь прогон (`guessClass`), иначе одиннадцать классов спросили бы модель одиннадцать раз.
  let ctx: NodeCtx = { ...input, runId };
  const reports: RunNodeReport[] = [];

  // 🔒 ПЛОСКОСТЬ ДИАЛОГА (шаг 312.3, решение владельца о «третьем измерении»). Разговор не помещается в
  // одну плоскость конвейера: вопрос задан в одном прогоне, ответ приходит следующим сообщением. Ось, по
  // которой это замыкается, — ВРЕМЯ, и её носитель — состояние чата.
  //
  // Прикрепляется РОВНО ОДИН РАЗ за прогон и ровно в тот момент, когда двери уже назвали собеседника: до
  // первого узла НЕ входного вида. Раньше движок начинал с `ctx = { ...input }` и ничего больше, поэтому
  // висящий вопрос жил только внутри прогона и умирал вместе с ним.
  //
  // Читать состояние может ЛЮБОЙ слой — это обычные поля контекста. ПИСАТЬ его вправе только узел речи
  // (`converse`), как строку тоста пишет только `deliverToast`: один автор на одну сущность.
  let chatAttached = false;
  const attachChat = async () => {
    chatAttached = true;
    const key = chatKeyOf(ctx);
    if (!key) return; // собеседника нет (крон, вебхук) — плоскости тоже нет, и это законно
    const state = await loadChat(key);
    // 🔒 ОКНО ДИАЛОГА — ИЗ ВКЛАДКИ ВЛАДЕЛЬЦА (шаг 330.1). Ядро уже прочитано выше, поэтому настройка
    // достаётся без единого лишнего чтения. До этого движок звал `formatDialog` без окна и получал зашитые
    // восемь реплик: у владельца была настройка, у модели — своё число, и они не встречались.
    //
    // 🔒 ДВА ПОТРЕБИТЕЛЯ КОНТЕКСТА, ОДИН СБОРЩИК (шаг 330.2). Речи нужен разговор, чтению класса — только
    // завязка последнего обмена, и платит оно на КАЖДОМ прогоне. Поэтому собирается два среза одним
    // модулем: полный под бюджет владельца и краткий под выведенную из него долю. Собирать историю самому
    // узлу больше не нужно и нельзя — иначе бюджет опять станет ничьим.
    const cfg = assistantConfigOf(core.components);
    // Сводка сессии (330.4) едет полному срезу: она покрывает вытесненное и стоит около сотни токенов.
    // Краткому срезу класса она НЕ нужна — класс решается по последнему обмену, а не по истории сессии.
    const dialogue = buildDialogue(state.messages, { lastN: cfg.lastN, tokenBudget: cfg.tokenBudget, summary: state.summary });
    // Краткий срез — ТОЛЬКО реплики человека (330.2R): ответы бота несут вердикт прошлого прогона, и
    // классификатор начинал его повторять. Обоснование — `userTurnsOnly` в сборщике.
    const brief = buildDialogue(userTurnsOnly(state.messages), {
      lastN: classifyWindow(cfg.lastN),
      tokenBudget: classifyBudget(cfg.tokenBudget),
    });
    ctx = {
      ...ctx,
      chatKey: key,
      chatLang: ctx.chatLang ?? state.lang,
      pendingQuestion: ctx.pendingQuestion ?? state.pending,
      recentDialog: ctx.recentDialog ?? dialogue.text,
      // Краткий срез для чтения класса — отдельным полем, чтобы классификатор не выбирал сам, сколько
      // взять: сколько взять, решено здесь и один раз.
      recentDialogBrief: ctx.recentDialogBrief ?? brief.text,
      // 🔒 РАСХОД НАЗЫВАЕТСЯ ВСЛУХ. Сколько стоил контекст и что упёрлось первым — окно или бюджет —
      // видно в исходе прогона. Молчаливое урезание контекста неотличимо от «модель тупая».
      dialogueBudget: {
        budget: dialogue.budget,
        used: dialogue.used,
        dropped: dialogue.dropped,
        limitedBy: dialogue.limitedBy,
        summaryUsed: dialogue.summaryUsed,
        briefUsed: brief.used,
        briefBudget: brief.budget,
      },
    };
  };

  for (const node of order) {
    if (!chatAttached && node.kind !== "input" && node.kind !== "input-connector") await attachChat();
    const fnName = node.function.name;
    const fn = NODE_FUNCTIONS[fnName] as NodeFn | undefined;
    if (!fn) {
      reports.push({ cuid: node.cuid, name: node.name, fn: fnName, status: "fail", error: `no function "${fnName}" is registered in _lib/nodes/index.ts` });
      break;
    }
    try {
      const out = await fn(ctx);
      if (out === null) {
        // a condition whose branch does not hold — a lawful stop, not a failure
        reports.push({ cuid: node.cuid, name: node.name, fn: fnName, status: "stopped" });
        break;
      }
      const patch = (out && typeof out === "object" ? out : {}) as NodeCtx;

      // 🔒 ВАЛИДАТОР — ТРЕТИЙ УРОВЕНЬ ПРИНУЖДЕНИЯ (шаг 311.8, требование владельца). Схема требует, чтобы
      // решающий узел объявил валидатор и не менее двух исходов; загрузка модуля требует, чтобы валидатор
      // существовал; здесь результат ОБЯЗАН получить имя одного из объявленных исходов. Без этого узла в
      // цепочке любой провал выглядел бы успехом — ровно то, что случилось с 403 от источника в 311.7.
      let outcomeName = "";
      if (node.function.validator) {
        const validate = NODE_VALIDATORS[node.function.validator];
        if (!validate) {
          reports.push({ cuid: node.cuid, name: node.name, fn: fnName, status: "fail", error: `no validator "${node.function.validator}" is registered in _lib/validators.ts — the node's result cannot be classified, and an unclassified result is never let through` });
          break;
        }
        outcomeName = String(validate(patch, ctx) ?? "");
        const declared = node.function.outcomes.map((o) => o.name);
        if (!declared.includes(outcomeName)) {
          reports.push({ cuid: node.cuid, name: node.name, fn: fnName, status: "fail", error: `the validator returned the outcome "${outcomeName}", which this node does not declare (${declared.join(" | ") || "none"}) — an unnamed outcome is a silent failure, so the run stops honestly here` });
          break;
        }
      }

      ctx = { ...ctx, ...patch, ...(outcomeName ? { outcome: outcomeName } : {}) };
      reports.push({ cuid: node.cuid, name: node.name, fn: fnName, status: "ok", ...(outcomeName ? { outcome: outcomeName } : {}) });
    } catch (e) {
      reports.push({ cuid: node.cuid, name: node.name, fn: fnName, status: "fail", error: e instanceof Error ? e.message : String(e) });
      break;
    }
  }

  const failed = reports.find((r) => r.status === "fail");
  const outcome: RunOutcome = { ok: !failed, runId, startedAt, nodes: reports, context: ctx, error: failed?.error };

  // 🔒 ЗАПЕЧАТАТЬ РЕПЛИКИ ЭТОГО ПРОГОНА (шаг 330.3). Речь сказала своё ДО выходов и потому не знала, чем
  // всё кончится; теперь известно — и реплики получают исход и созданные записи. Без этого модель,
  // перечитывая переписку, видела ровный разговор там, где прогон падал или ничего не нашёл, и уверенно
  // продолжала поверх неудачи.
  //
  // Лучший-случай-не-обязателен: запечатывание не вправе уронить прогон, ответ человеку уже отправлен.
  const chatKey = String(ctx.chatKey ?? "").trim();
  if (chatKey) {
    try {
      await sealTurns(chatKey, runId, { outcome: turnOutcomeOf(ctx, Boolean(failed)), links: createdRows(ctx) });
    } catch { /* память диалога вторична по отношению к ответу — молча не мешаем */ }
  }

  await appendRun({ runId, startedAt, finishedAt: new Date().toISOString(), ok: outcome.ok, nodes: reports });
  return outcome;
}
