import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { db } from "@/lib/db";

// List an automation's Instances (step 223.C.4). NOTE: projects-app's db is ASYNC — every query is
// awaited (see reports/errors/projects-app-db-is-async-await-required.md). Role-gated.
export const runtime = "nodejs";

const ROLES = ["architect", "manager", "agent"];

type InstanceRow = {
  id: string;
  title: string;
  specialization: string;
  overrides: string;
  status: string;
  created_at: string;
};

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.roles?.some((r) => ROLES.includes(r))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const automation = (req.nextUrl.searchParams.get("automation") ?? "").trim();
  if (!automation) return NextResponse.json({ instances: [] });

  const rows = (await db
    .prepare(
      `SELECT id, title, specialization, overrides, status, created_at FROM automation_instances
       WHERE automation = ? ORDER BY created_at ASC`,
    )
    .all(automation)) as InstanceRow[];

  const instances = rows.map((r) => ({
    id: r.id,
    title: r.title,
    specialization: r.specialization,
    status: r.status,
    createdAt: r.created_at,
    overrides: safeParse(r.overrides),
  }));
  return NextResponse.json({ instances });
}

function safeParse(s: string): Record<string, { disabledFunctions?: string[]; note?: string }> {
  try {
    return JSON.parse(s ?? "{}");
  } catch {
    return {};
  }
}
