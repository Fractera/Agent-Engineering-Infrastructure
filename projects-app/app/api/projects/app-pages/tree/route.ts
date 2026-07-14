import { NextRequest, NextResponse } from "next/server";
import { authorize } from "@/lib/nodes";
import { scanAppTree } from "@/lib/app-pages/scan";

// THE SLOT-APP TREE (step 242) — GET -> { children: AppNode[] }. The folder tree of the application layer
// (slot `app/`) the "Application pages" accordion renders, so the owner can pick any folder and declare a
// public page in it. Read-only fs scan, dynamic (no rebuild). Gated by the projects-app authorize (open in
// IP-onboarding mode, role-gated in secure mode) — NOT the architect-only serviceApiGate the service page uses.
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  return NextResponse.json(await scanAppTree());
}
