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
//
// После любой правки ядро проверяется ЦЕЛИКОМ. Не прошло — файл не меняется, наружу уходит список
// нарушений строками: отказ и есть обучение.
export const runtime = "nodejs";

type Body = {
  op?: "set" | "add" | "delete";
  address?: Address;
  set?: Record<string, unknown>;
  group?: GroupName;
  node?: Record<string, unknown>;
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
