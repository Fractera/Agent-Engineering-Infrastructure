import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { requireAuth } from "@/lib/require-auth";

const execAsync = promisify(exec);
const REPO = "/opt/fractera";

export async function POST(req: NextRequest) {
  const ok = await requireAuth(req.headers.get("cookie") ?? "");
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { stdout, stderr } = await execAsync(`git -C ${REPO} pull`, { timeout: 30000 });
    return NextResponse.json({ success: true, output: (stdout + stderr).trim() });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: (e.stdout ?? "") + (e.stderr ?? e.message) }, { status: 500 });
  }
}
