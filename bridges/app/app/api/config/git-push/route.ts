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
    const body = await req.json().catch(() => ({})) as { message?: string };
    const msg = (body.message ?? "").trim() || `admin: manual push ${new Date().toISOString().slice(0, 16).replace("T", " ")}`;

    const lines: string[] = [];

    const { stdout: s1, stderr: e1 } = await execAsync(`git -C ${REPO} add -A`, { timeout: 10000 });
    lines.push((s1 + e1).trim());

    // commit may exit 1 if nothing to commit — that is fine, push still runs
    const commitResult = await execAsync(
      `git -C ${REPO} commit -m "${msg.replace(/"/g, "'")}"`,
      { timeout: 10000 }
    ).catch((e) => ({ stdout: e.stdout ?? "", stderr: e.stderr ?? "" }));
    lines.push((commitResult.stdout + commitResult.stderr).trim());

    const { stdout: s3, stderr: e3 } = await execAsync(`git -C ${REPO} push`, { timeout: 30000 });
    lines.push((s3 + e3).trim());

    return NextResponse.json({ success: true, output: lines.filter(Boolean).join("\n") });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: (e.stdout ?? "") + (e.stderr ?? e.message) }, { status: 500 });
  }
}
