import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import fs from "fs";
import path from "path";

// The guide is served from disk rather than imported into the bundle, so its text can be corrected by
// editing one file and reloading the panel — no rebuild for a wording fix. bridges/app is the process
// cwd, and _content sits inside it, so the file travels with the repository like any other source file.
const GUIDE = path.join(process.cwd(), "_content", "how-to-build.md");

export async function GET(req: NextRequest) {
  const ok = await requireAuth(req.headers.get("cookie") ?? "");
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    return NextResponse.json({ content: fs.readFileSync(GUIDE, "utf-8") });
  } catch (e) {
    // Loud, not empty: a missing guide is a deployment problem, and a blank page would hide it.
    return NextResponse.json(
      { error: `Guide not found at ${GUIDE}: ${String(e)}` },
      { status: 500 }
    );
  }
}
