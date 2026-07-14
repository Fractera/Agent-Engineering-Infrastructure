import { NextRequest, NextResponse } from "next/server";
import { authorize } from "@/lib/nodes";
import { removeTask, parseTaskClientId } from "@/lib/app-pages/readme";

// DELETE ONE to-do (step 242) — the client id encodes the page's rel path + the task id (base64url~uuid), so a
// single to-do is removed without needing the rel separately. Mirrors the service page's tasks/[id] route.
export const runtime = "nodejs";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await authorize(_req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;
  const { rel, taskId } = parseTaskClientId(id);
  if (!rel || !taskId) return NextResponse.json({ error: "bad task id" }, { status: 400 });
  await removeTask(rel, taskId);
  return NextResponse.json({ ok: true });
}
