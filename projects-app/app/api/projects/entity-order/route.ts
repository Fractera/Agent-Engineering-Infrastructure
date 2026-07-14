import { NextRequest, NextResponse } from "next/server";
import { authorize, resolveProject } from "@/lib/nodes";
import { getEntityOrder, setEntityOrder } from "@/lib/entity-order-live";
import { DEFAULT_ENTITY_ORDER, resolveEntityOrder } from "@/app/(projects)/projects/_shared/entities";

// THE ENTITY-ORDER LIVE API (step 241, owner) — the hamburger menu's drag-to-reorder reads/writes here. No
// rebuild: the stored array wins over DEFAULT_ENTITY_ORDER and the accordions follow it instantly.
//   GET  ?automation=<cat/slug>     -> { order: OrderableKey[] } (resolved: stored ranking + any new key appended)
//   POST { automation, order }      -> { ok: true, order } (resolved and stored)
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const proj = resolveProject((req.nextUrl.searchParams.get("automation") ?? "").trim());
  if (!proj.ok) return NextResponse.json({ error: proj.error }, { status: 400 });
  const order = resolveEntityOrder(await getEntityOrder(proj.automation));
  return NextResponse.json({ order });
}

export async function POST(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => null)) as { automation?: string; order?: unknown } | null;
  const proj = resolveProject(String(body?.automation ?? ""));
  if (!proj.ok) return NextResponse.json({ error: proj.error }, { status: 400 });
  if (!Array.isArray(body?.order)) return NextResponse.json({ error: "order must be an array" }, { status: 400 });

  // Resolve BEFORE storing — drop anything unknown and guarantee every known key is present exactly once, so
  // a malformed or partial client payload can never persist a broken order.
  const known = new Set<string>(DEFAULT_ENTITY_ORDER);
  const order = resolveEntityOrder((body.order as unknown[]).filter((k): k is string => typeof k === "string" && known.has(k)));
  await setEntityOrder(proj.automation, order);
  return NextResponse.json({ ok: true, order });
}
