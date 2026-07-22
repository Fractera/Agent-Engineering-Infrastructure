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
import { KIND_PORTS, allNodes, type GroupName, type NodeKind } from "../../_data/automation.schema";

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
  op?: "set" | "add" | "delete" | "connect" | "disconnect" | "visibility" | "append";
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
};

const bad = (error: string | string[], status = 400) =>
  NextResponse.json(Array.isArray(error) ? { errors: error } : { error }, { status });

export async function POST(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as Body;
  const op = body.op ?? "set";
  const core = await readCore();

  // ─── ДОБАВИТЬ УЗЕЛ ────────────────────────────────────────────────────────────────────────────────
  if (op === "add") {
    const group = body.group;
    if (!group || !core.graph.nodes.groups[group]) return bad("op add needs a group: input | middle | output");
    const draft = { ...(body.node ?? {}) } as Record<string, unknown>;
    const kind = draft.kind as NodeKind | undefined;
    if (!kind) return bad("op add needs node.kind");

    const refusal = checkAdd(core, group, kind);
    if (refusal) return bad(refusal);

    // identity and ports are given by the core, never by the caller
    draft.cuid = createCuid();
    draft.in = KIND_PORTS[kind].in;
    draft.out = KIND_PORTS[kind].out;
    core.graph.nodes.groups[group].nodes.push(draft as never);

    const written = await writeCore(core);
    return written.ok ? NextResponse.json({ ok: true, cuid: draft.cuid }) : bad(written.errors, 422);
  }

  // ─── УДАЛИТЬ УЗЕЛ ─────────────────────────────────────────────────────────────────────────────────
  if (op === "delete") {
    const address = body.address;
    if (!address || address.object !== "node") return bad("op delete takes the address of a node");
    const node = allNodes(core.graph.nodes).find((n) => n.cuid === address.cuid);
    if (!node) return bad(`no node with cuid "${address.cuid}"`, 404);
    const group = groupOfNode(core, address.cuid)!;

    const refusal = checkDelete(core, group, node.kind);
    if (refusal) return bad(refusal);

    const groupNodes = core.graph.nodes.groups[group];
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

    if (group === "middle" && core.passport.lifecycle === "real-project") {
      return bad(
        `"${node.name}" is a middle node — the automation's own work. Middle nodes may only be hidden while the ` +
          `automation is still a frozen template; this one is a real project. Inputs and outputs stay switchable.`,
      );
    }

    if (next === "hidden" && core.passport.lifecycle === "real-project" && (group === "input" || group === "output")) {
      const stillVisible = core.graph.nodes.groups[group].nodes.filter((n) => n.state === "visible" && n.cuid !== node.cuid);
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
  Object.assign(found.target, set);

  const written = await writeCore(core);
  return written.ok ? NextResponse.json({ ok: true }) : bad(written.errors, 422);
}
