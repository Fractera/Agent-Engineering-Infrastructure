import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getSession } from "@/lib/auth/get-session";
import { db } from "@/lib/db";

// Create an Instance = FORK the Master (step 223.C.4). The Instance inherits ALL the Master's nodes by
// reference (the Master lives in code); here we record only what makes THIS run different: a title and
// the `specialization` (the run's overall condition). Per-node overrides are added later via
// instances/override. NOTE: async db — every query awaited. Role-gated.
export const runtime = "nodejs";

const ROLES = ["architect", "manager", "agent"];

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.roles?.some((r) => ROLES.includes(r))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  let body: { automation?: string; title?: string; specialization?: string; params?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  const automation = (body.automation ?? "").trim();
  const title = (body.title ?? "").trim();
  const specialization = (body.specialization ?? "").trim();
  if (!automation || !title) {
    return NextResponse.json({ error: "automation and title are required" }, { status: 400 });
  }

  // STEP 241 — a fork's PARAMETERS: the typed settings THIS run works from (the article's keyword, the word
  // count…). They are what makes an instanced run a specific run rather than the Master's defaults, and the
  // executor REFUSES to run a fork without them ("fork-without-params") rather than silently using defaults.
  // They live in the instance's `overrides` JSON under `params`, alongside the per-node overrides — no new
  // column (lesson 225 G4). The owner designs WHICH parameters a run takes in the fork-activation surface
  // (step 239); this is where a concrete run supplies them.
  const params = body.params && typeof body.params === "object" ? body.params : {};

  const id = randomUUID();
  await db
    .prepare(
      `INSERT INTO automation_instances (id, automation, title, specialization, overrides) VALUES (?, ?, ?, ?, ?)`,
    )
    .run(id, automation, title, specialization, JSON.stringify({ params }));

  return NextResponse.json({ id, title, specialization, params, status: "new" });
}
