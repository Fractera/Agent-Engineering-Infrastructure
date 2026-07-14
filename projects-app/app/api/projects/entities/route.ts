import { NextRequest, NextResponse } from "next/server";
import { authorize, resolveProject } from "@/lib/nodes";
import { getLiveEntities, setLiveEntity } from "@/lib/entities-live";
import { ENTITY_ORDER, type EntityKey } from "@/app/(projects)/projects/_shared/entities";

// THE ENTITIES LIVE OVERRIDE API (step 237) — the hamburger-menu switches read/write here. No rebuild:
// _data/config.ts stays the seed the automation is born with; a row here (once written) wins per key.
//   GET  ?automation=<cat/slug>          -> { entities: Partial<EntitiesConfig> } (live overrides only)
//   POST { automation, key, value }      -> { ok: true, entities } (full merged live map)
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const proj = resolveProject((req.nextUrl.searchParams.get("automation") ?? "").trim());
  if (!proj.ok) return NextResponse.json({ error: proj.error }, { status: 400 });
  const entities = await getLiveEntities(proj.automation);
  return NextResponse.json({ entities });
}

export async function POST(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => null)) as
    | { automation?: string; key?: string; value?: boolean }
    | null;
  const proj = resolveProject(String(body?.automation ?? ""));
  if (!proj.ok) return NextResponse.json({ error: proj.error }, { status: 400 });
  const key = String(body?.key ?? "") as EntityKey;
  if (!ENTITY_ORDER.includes(key)) return NextResponse.json({ error: "invalid entity key" }, { status: 400 });
  if (typeof body?.value !== "boolean") return NextResponse.json({ error: "value must be boolean" }, { status: 400 });

  const entities = await setLiveEntity(proj.automation, key, body.value);
  return NextResponse.json({ ok: true, entities });
}
