import { type NextRequest, NextResponse } from "next/server";
import { authorize } from "@/lib/nodes";
import {
  readCore,
  writeCore,
  locate,
  checkWritable,
  checkAdd,
  checkDelete,
  createCuid,
  groupOfNode,
  type Address,
} from "../../_lib/core-io";
import { KIND_PORTS, allNodes, entitiesOf, type GroupName, type NodeKind } from "../../_data/automation.schema";
import { readEnvPresence } from "@/lib/env-presence";
import { checkReadReceipt, needsReceipt } from "../../_lib/read-receipt";

// Ключи, пустое значение которых — законное умолчание, а не отсутствие. Список короткий и живёт рядом
// с законом, который им пользуется; каталог `_components/channels.ts` знает то же самое для формы ввода.
const OPTIONAL_ENV_KEYS = new Set(["TELEGRAM_ALLOWED_CHAT_ID"]);

// ДВЕРЬ ПРАВКИ — ОДИН объект по адресу. Переписывать файл целиком не нужно и запрещено: правка стоит
// десятки токенов вместо тысяч и не может задеть соседа.
//
//   POST { address, set }                    — изменить названные поля объекта
//   POST { op: "add",    group, node }       — добавить узел (упирается в квоту группы)
//   POST { op: "delete", address }           — удалить узел вместе с его рёбрами (тоже по квоте)
//   POST { op: "connect", from, to }         — соединить два узла ребром
//   POST { op: "disconnect", edge }          — убрать ребро
//   POST { op: "visibility", address, state } — раскрыть или скрыть узел ВМЕСТЕ с его рёбрами
//   POST { op: "append", object, value }     — дописать версию в историю или кейс в набор
//
// Почему рождение сущности — операция, а не запись поля: `cuid` есть идентичность, и её выдаёт ядро,
// а не вызывающий (иначе два объекта получат один адрес). По той же причине белый список полей
// (`WRITABLE`) не содержит ни `edges`, ни `versions`, ни `cases`: списки не переписываются целиком —
// в них добавляют по одному.
//
// После любой правки ядро проверяется ЦЕЛИКОМ. Не прошло — файл не меняется, наружу уходит список
// нарушений строками: отказ и есть обучение.
export const runtime = "nodejs";

type Body = {
  op?: "set" | "add" | "delete" | "connect" | "disconnect" | "visibility" | "append" | "answer-warning";
  address?: Address;
  set?: Record<string, unknown>;
  group?: GroupName;
  node?: Record<string, unknown>;
  from?: string;
  to?: string;
  edge?: string;
  state?: "visible" | "hidden";
  object?: "history" | "useCases";
  value?: Record<string, unknown>;
  /** `op:"answer-warning"` — какое предупреждение закрывает ответ и что ответил владелец. */
  warningCuid?: string;
  answer?: string;
};

/** Объект ядра, у которого есть `warnings[]` и `info`/`status` — то, что закрывает ответ владельца. */
type WarnHolder = { name?: string; warnings: { cuid: string; text: string }[]; info: unknown; status: string };

/**
 * ТЕКСТ СЫРОЙ ИНСТРУКЦИИ ИЗ ОТВЕТА НА ПРЕДУПРЕЖДЕНИЕ (требование владельца 2026-07-24).
 *
 * Ответ владельца НЕ ложится в ядро голым: агент, читающий `info.crudUser`, обязан понимать, ЧТО это
 * ответ на его же вопрос — иначе он прочтёт реплику без контекста и переспросит снова. Поэтому запись
 * несёт три части: пометку «это ответ на предупреждение», ПОЛНЫЙ текст предупреждения и слова владельца.
 */
const answerBrief = (warningText: string, answer: string) =>
  [
    "ОТВЕТ НА ПРЕДУПРЕЖДЕНИЕ. Это сообщение получено в ответ на предупреждение, которое ты сформировал при предыдущем обращении.",
    `ПОЛНЫЙ ТЕКСТ ПРЕДУПРЕЖДЕНИЯ: ${warningText}`,
    `ОТВЕТ ВЛАДЕЛЬЦА: ${answer}`,
    "Запусти разработку по этому объекту с учётом ответа.",
  ].join("\n");

/** Маркер, по которому полоса-уведомление узнаёт, что владелец ОТВЕТИЛ на предупреждение. */
export const ANSWER_MARKER = "ОТВЕТ НА ПРЕДУПРЕЖДЕНИЕ.";

const bad = (error: string | string[], status = 400) =>
  NextResponse.json(Array.isArray(error) ? { errors: error } : { error }, { status });

export async function POST(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as Body;
  const op = body.op ?? "set";

  // 🔒 РАСПИСКА О ПРОЧТЕНИИ (требование владельца 2026-08-02). Состав узлов и связи нельзя менять,
  // не прочитав ЦЕЛИКОМ ядро и схему: из фрагмента не видно, какие связи законны, и модель строит рёбра
  // по догадке. Правка данных (`set`) и раскрытие узла (`visibility`) сюда НЕ подпадают — ими работает
  // владелец из своего интерфейса. Границы и честные пределы этой гарантии — `_lib/read-receipt.ts`.
  if (needsReceipt(op)) {
    const receipt = await checkReadReceipt(req.headers);
    if (!receipt.ok) return NextResponse.json({ error: receipt.why }, { status: 428 });
  }

  const core = await readCore();

  // ─── ОТВЕТ НА ПРЕДУПРЕЖДЕНИЕ ──────────────────────────────────────────────────────────────────────
  // Владелец отвечает агенту прямо в Центре проблем. Одним действием, атомарно:
  //   1. предупреждение СНИМАЕТСЯ с объекта (вопрос закрыт — висеть ему больше незачем);
  //   2. ответ ложится в СЫРУЮ ИНСТРУКЦИЮ объекта (`info.crudUser`) вместе с полным текстом снятого
  //      предупреждения — чтобы агент читал ответ В КОНТЕКСТЕ своего же вопроса;
  //   3. объект переходит в `in-development` — работа по нему возобновляется.
  // Разбить это на три вызова нельзя: между ними ядро побывало бы в состоянии «вопрос снят, ответа нет».
  if (op === "answer-warning") {
    const cuid = String(body.warningCuid ?? "").trim();
    const answer = String(body.answer ?? "").trim();
    if (!cuid) return bad("warningCuid is required — an answer closes ONE warning");
    if (!answer) return bad("answer is empty — an answer without words is not an answer");

    // Ищем владельца предупреждения среди всех объектов, у которых есть `warnings[]`.
    const holders: WarnHolder[] = [
      ...(allNodes(core.graph.nodes) as unknown as WarnHolder[]),
      ...(core.components.tabs as unknown as WarnHolder[]),
      ...(core.components.tabs.flatMap((t) => entitiesOf(t)) as unknown as WarnHolder[]),
      core.useCases as unknown as WarnHolder,
    ];
    const holder = holders.find((h) => h.warnings?.some((w) => w.cuid === cuid));
    if (!holder) return bad(`no warning with cuid "${cuid}"`, 404);
    const warning = holder.warnings.find((w) => w.cuid === cuid)!;

    holder.warnings = holder.warnings.filter((w) => w.cuid !== cuid);
    holder.info = { crudUser: answerBrief(warning.text, answer) };
    holder.status = "in-development";

    const written = await writeCore(core);
    return written.ok ? NextResponse.json({ ok: true }) : bad(written.errors, 422);
  }

  // ─── ДОБАВИТЬ УЗЕЛ ────────────────────────────────────────────────────────────────────────────────
  if (op === "add") {
    const group = body.group;
    if (!group || !core.graph.nodes.groups[group]) return bad("op add needs a group: input | intent | middle | output");
    const draft = { ...(body.node ?? {}) } as Record<string, unknown>;
    const kind = draft.kind as NodeKind | undefined;
    if (!kind) return bad("op add needs node.kind");

    const refusal = checkAdd(core, group, kind);
    if (refusal) return bad(refusal);

    // identity and ports are given by the core, never by the caller
    draft.cuid = createCuid();
    draft.in = KIND_PORTS[kind].in;
    draft.out = KIND_PORTS[kind].out;

    // THE FREE NODE (step 273). The canvas sends only what the owner actually chose — group, kind, the
    // channel and his own words — and the core fills the rest. Two reasons this belongs here and not in
    // the client: a node must be lawful the moment it is written (the whole core is validated), and the
    // defaults ARE law, so they may not drift in a component.
    //
    // IT IS BORN HIDDEN, and that is the whole trick: a visible node with a required port and no edge is
    // refused, but a HIDDEN one may stand unwired — that is how the frozen template ships. So the owner
    // gets his node on the canvas immediately, wires it at his leisure, and REVEALING it (op: "visibility")
    // is the moment the law checks his work. There is no "unsaved draft" state anywhere, and no second
    // code path: revealing IS saving.
    draft.state ??= "hidden";
    draft.name ||= "New node";
    draft.description ??= "";
    // The owner's own words are the task itself (`info.crudUser`) — see the `nodes` instruction. When he
    // wrote nothing, the honest record is that the node is still unexplained, not an invented summary.
    if (!draft.info) draft.info = { crudUser: `${String(draft.name)} — not described yet.` };
    draft.status ??= "in-development";
    draft.warnings ??= [];
    draft.envKeys ??= [];
    draft.run ??= "sequential";
    draft.estDurationMs ??= 60000;
    if (!draft.function) {
      // A function name is the address of its file and must be unique across the core, so the core issues
      // it rather than trusting a caller who cannot see the other nodes.
      const taken = new Set(allNodes(core.graph.nodes).map((n) => n.function.name));
      const stem =
        String(draft.name)
          .toLowerCase()
          .replace(/[^a-z0-9]+(.)/g, (_, c: string) => c.toUpperCase())
          .replace(/[^a-zA-Z0-9]/g, "") || "newNode";
      let name = stem;
      for (let i = 2; taken.has(name); i++) name = `${stem}${i}`;
      draft.function = {
        name,
        summary: "Not written yet — this node is the owner's request, not built code.",
        accepts: "Not defined yet.",
        returns: "Not defined yet.",
      };
    }

    core.graph.nodes.groups[group]!.nodes.push(draft as never);

    const written = await writeCore(core);
    return written.ok ? NextResponse.json({ ok: true, cuid: draft.cuid }) : bad(written.errors, 422);
  }

  // ─── УДАЛИТЬ УЗЕЛ ─────────────────────────────────────────────────────────────────────────────────
  if (op === "delete") {
    const address = body.address;
    // Удалить КЕЙС по адресу (шаг 298, панель кейсов). Кейс — не узел: у него нет квоты группы и рёбер,
    // он просто уходит из набора. Набор целиком не переписывается — удаляют по одному, как и добавляют.
    if (address?.object === "useCase") {
      const before = core.useCases.cases.length;
      core.useCases.cases = core.useCases.cases.filter((c) => c.cuid !== address.cuid);
      if (core.useCases.cases.length === before) return bad(`no use case with cuid "${address.cuid}"`, 404);
      const written = await writeCore(core);
      return written.ok ? NextResponse.json({ ok: true }) : bad(written.errors, 422);
    }
    if (!address || address.object !== "node") return bad("op delete takes the address of a node or a use case");
    const node = allNodes(core.graph.nodes).find((n) => n.cuid === address.cuid);
    if (!node) return bad(`no node with cuid "${address.cuid}"`, 404);
    const group = groupOfNode(core, address.cuid)!;

    const refusal = checkDelete(core, group, node.kind);
    if (refusal) return bad(refusal);

    const groupNodes = core.graph.nodes.groups[group]!; // группа проверена выше
    groupNodes.nodes = groupNodes.nodes.filter((n) => n.cuid !== address.cuid);
    // an edge to a node that no longer exists is not an edge
    core.graph.edges = core.graph.edges.filter((e) => e.from !== address.cuid && e.to !== address.cuid);

    const written = await writeCore(core);
    return written.ok ? NextResponse.json({ ok: true }) : bad(written.errors, 422);
  }

  // ─── СОЕДИНИТЬ ДВА УЗЛА ───────────────────────────────────────────────────────────────────────────
  // The edge's own cuid is issued here, and its visibility is DERIVED: an edge is shown only when both
  // its ends are shown (the core refuses any other combination), so there is nothing to ask about.
  if (op === "connect") {
    const { from, to } = body;
    if (!from || !to) return bad("op connect needs from and to — the cuids of two nodes");
    const nodes = allNodes(core.graph.nodes);
    const source = nodes.find((n) => n.cuid === from);
    const target = nodes.find((n) => n.cuid === to);
    if (!source) return bad(`no node with cuid "${from}"`, 404);
    if (!target) return bad(`no node with cuid "${to}"`, 404);
    if (core.graph.edges.some((e) => e.from === from && e.to === to)) return bad("these two nodes are already connected");

    const cuid = createCuid();
    core.graph.edges.push({
      cuid,
      from,
      to,
      state: source.state === "visible" && target.state === "visible" ? "visible" : "hidden",
    });

    // the new edge's cuid goes back in the answer — it is the only way to address it later
    const written = await writeCore(core);
    return written.ok ? NextResponse.json({ ok: true, cuid }) : bad(written.errors, 422);
  }

  // ─── УБРАТЬ РЕБРО ─────────────────────────────────────────────────────────────────────────────────
  if (op === "disconnect") {
    const edge = body.edge;
    if (!edge) return bad("op disconnect needs edge — the cuid of the edge");
    if (!core.graph.edges.some((e) => e.cuid === edge)) return bad(`no edge with cuid "${edge}"`, 404);
    core.graph.edges = core.graph.edges.filter((e) => e.cuid !== edge);

    const written = await writeCore(core);
    return written.ok ? NextResponse.json({ ok: true }) : bad(written.errors, 422);
  }

  // ─── РАСКРЫТЬ ИЛИ СКРЫТЬ УЗЕЛ ─────────────────────────────────────────────────────────────────────
  // ОДНА операция вместо трёх правок подряд — и это не удобство, а необходимость. Видимость ребра
  // ПРОИЗВОДНА от концов (закон схемы: видимое ребро со скрытым концом — нарушение), поэтому «скрыть
  // узел» и «скрыть его рёбра» обязаны попасть в ОДНУ запись: между двумя отдельными запросами ядро
  // побывало бы в незаконном состоянии и вторая правка уже не прошла бы валидацию.
  //
  // Три закона владельца (2026-07-22). Отказ формулируется человеческим языком — отказ и есть обучение:
  //   1) срединный узел скрывают только в стартовом шаблоне: в реальном проекте середина — это сама
  //      работа автоматизации, её нельзя погасить кликом;
  //   2) последний видимый вход и последний видимый выход скрыть нельзя — иначе автоматизация,
  //      которую владелец нечаянно «разделся», перестала бы работать;
  //   3) всё остальное — свободно: владелец держит на холсте ровно те каналы, которые ему нужны.
  if (op === "visibility") {
    const address = body.address;
    const next = body.state;
    if (!address || address.object !== "node") return bad("op visibility takes the address of a node");
    if (next !== "visible" && next !== "hidden") return bad('op visibility needs state: "visible" | "hidden"');

    const node = allNodes(core.graph.nodes).find((n) => n.cuid === address.cuid);
    if (!node) return bad(`no node with cuid "${address.cuid}"`, 404);
    const group = groupOfNode(core, address.cuid)!;

    if (node.state === next) return bad(`node "${node.name}" is already ${next}`);

    // ЗАКОН «СНАЧАЛА КЛЮЧИ, ПОТОМ КАНАЛ» (владелец, шаг 293; переехал сюда из экрана настроек в 294).
    // Раскрыть канал, к которому нельзя подключиться, значит соврать на холсте: узел будет выглядеть
    // рабочим и падать на каждом прогоне. Здесь закон стоит потому, что дверь — единственное место,
    // через которое проходят ВСЕ: холст, меню, агент. В компоненте он защищал бы один экран из трёх.
    //
    // Необязательный ключ (пустой = законное умолчание) раскрытию не мешает — проверяются только те,
    // без которых канал не работает вовсе.
    if (next === "visible" && node.envKeys.length) {
      const required = node.envKeys.filter((k) => !OPTIONAL_ENV_KEYS.has(k.name)).map((k) => k.name);
      const present = await readEnvPresence(required);
      const missing = required.filter((k) => !present[k]);
      if (missing.length) {
        return bad(
          `"${node.name}" cannot be revealed yet: its channel needs ${missing.join(", ")}. ` +
            `Open Settings and connect the service — then reveal the node.`,
        );
      }
    }

    // ОДНОСТОРОННИЙ закон (исправлено в 273.A по живому тесту). Владелец сказал: срединный узел нельзя
    // СКРЫТЬ после перехода в реальный проект — середина и есть работа автоматизации. Про раскрытие он
    // не говорил ничего, и запрещать его нельзя: свободный срединный узел рождается скрытым, и
    // раскрытие — единственный способ его сохранить. Симметричный запрет делал новую механику
    // неработающей by construction.
    if (group === "middle" && next === "hidden" && core.passport.lifecycle === "real-project") {
      return bad(
        `"${node.name}" is a middle node — the automation's own work. A middle node may only be hidden while the ` +
          `automation is still a frozen template; this one is a real project. Inputs and outputs stay switchable, ` +
          `and a middle node can always be REVEALED — it is hiding one that is refused.`,
      );
    }

    if (next === "hidden" && core.passport.lifecycle === "real-project" && (group === "input" || group === "output")) {
      const stillVisible = core.graph.nodes.groups[group]!.nodes.filter((n) => n.state === "visible" && n.cuid !== node.cuid);
      if (stillVisible.length === 0) {
        return bad(
          `"${node.name}" is the last visible ${group} — hiding it would leave the automation with no ${group} ` +
            `at all and it would stop working. Open another ${group} channel first, then hide this one.`,
        );
      }
    }

    node.state = next;

    // Рёбра выводятся, а не спрашиваются: ребро видно ровно тогда, когда видны ОБА его конца.
    const byCuid = new Map(allNodes(core.graph.nodes).map((n) => [n.cuid, n]));
    const touched: string[] = [];
    for (const edge of core.graph.edges) {
      if (edge.from !== node.cuid && edge.to !== node.cuid) continue;
      const from = byCuid.get(edge.from);
      const to = byCuid.get(edge.to);
      const derived = from?.state === "visible" && to?.state === "visible" ? "visible" : "hidden";
      if (edge.state !== derived) {
        edge.state = derived;
        touched.push(`${from?.name ?? edge.from} → ${to?.name ?? edge.to}: ${derived}`);
      }
    }

    const written = await writeCore(core);
    // Что именно изменилось — уходит наружу: ни один вывод не молчит, иначе он воспроизведётся незаметно.
    return written.ok ? NextResponse.json({ ok: true, node: node.name, state: next, edges: touched }) : bad(written.errors, 422);
  }

  // ─── ДОПИСАТЬ В СПИСОК ────────────────────────────────────────────────────────────────────────────
  // История и кейсы РАСТУТ — версия не переписывается и кейс не редактируется скопом. Идентичность и
  // порядковый номер выдаёт ядро: номер, которым владелец называет кейс вслух, обязан быть уникальным,
  // и надёжнее посчитать его здесь, чем надеяться на модель.
  if (op === "append") {
    const { object, value } = body;
    if (object !== "history" && object !== "useCases") return bad('op append takes object: "history" | "useCases"');
    if (!value || typeof value !== "object") return bad("op append needs value — the version or the use case to add");

    // the two lists are pushed separately: a union of two array types has no common push signature
    const numbers: number[] =
      object === "history" ? core.history.versions.map((v) => v.number) : core.useCases.cases.map((c) => c.number);
    const next = numbers.reduce((max, n) => Math.max(max, n), 0) + 1;
    const born = { ...value, cuid: createCuid(), number: next };
    if (object === "history") core.history.versions.push(born as never);
    else core.useCases.cases.push(born as never);

    const written = await writeCore(core);
    return written.ok ? NextResponse.json({ ok: true, number: next }) : bad(written.errors, 422);
  }

  // ─── ИЗМЕНИТЬ ОБЪЕКТ ──────────────────────────────────────────────────────────────────────────────
  const address = body.address;
  if (!address?.object) return bad("an address is required: { object: \"node\", cuid } and the like");
  const set = body.set ?? {};
  if (!Object.keys(set).length) return bad("set is empty — name the fields to change");

  const refusals = checkWritable(address.object, set);
  if (refusals.length) return bad(refusals);

  const found = locate(core, address);
  if (!found.ok) return bad(found.error, 404);

  // 🔒 `data` СЛИВАЕТСЯ ПО ПОЛЯМ, А НЕ ЗАМЕНЯЕТСЯ ЦЕЛИКОМ (шаг 312.7, найдено собственной ошибкой).
  //
  // Что случилось: правка ОДНОГО поля вкладки «Ассистент» (`set: { data: { qa: [...] } }`) снесла всё
  // остальное — инструкцию поведения, язык, окно памяти. Дверь честно исполнила `Object.assign`: `data`
  // для неё обычное поле, и новое значение заменило старое. Владелец, меняющий одну настройку из
  // интерфейса, теряет соседние и узнаёт об этом, когда автоматизация уже отвечает по умолчанию.
  //
  // `data` — единственное поле, которое является СЛОВАРЁМ НАСТРОЕК, а не значением. Поэтому именно у
  // него слияние верхнего уровня: пришедшие ключи побеждают, непришедшие остаются. Убрать настройку
  // по-прежнему можно — прислав её пустой (`""`, `[]`, `null`), то есть намеренно, а не по забывчивости.
  const patch = { ...set } as Record<string, unknown>;
  const incoming = patch.data;
  if (incoming && typeof incoming === "object" && !Array.isArray(incoming)) {
    const current = (found.target as Record<string, unknown>).data;
    if (current && typeof current === "object" && !Array.isArray(current)) {
      patch.data = { ...(current as Record<string, unknown>), ...(incoming as Record<string, unknown>) };
    }
  }
  Object.assign(found.target, patch);

  const written = await writeCore(core);
  return written.ok ? NextResponse.json({ ok: true }) : bad(written.errors, 422);
}
