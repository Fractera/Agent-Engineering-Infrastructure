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
  let body: { automation?: string; title?: string; specialization?: string };
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

  const id = randomUUID();
  await db
    .prepare(
      `INSERT INTO automation_instances (id, automation, title, specialization) VALUES (?, ?, ?, ?)`,
    )
    .run(id, automation, title, specialization);

  return NextResponse.json({ id, title, specialization, status: "new" });
}
