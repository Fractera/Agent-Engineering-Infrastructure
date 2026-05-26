import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const FALLBACK_RAW_URL = "https://raw.githubusercontent.com/Fractera/ai-workspace/main/README.md";

function getRawReadmeUrl(repoUrl: string): string {
  const clean = repoUrl.replace(/\.git$/, "");
  return clean.replace("https://github.com/", "https://raw.githubusercontent.com/") + "/main/README.md";
}

export async function GET() {
  // 1. Try local README.md (monorepo root — one level above app/)
  const localPath = join(process.cwd(), "..", "README.md");
  if (existsSync(localPath)) {
    const content = readFileSync(localPath, "utf8");
    return NextResponse.json({ content, source: "local" });
  }

  // 2. Determine raw URL — env override or fallback to Fractera/ai-workspace
  const repoUrl = process.env.UPSTREAM_REPO_URL;
  const rawUrl  = repoUrl ? getRawReadmeUrl(repoUrl) : FALLBACK_RAW_URL;

  try {
    const res = await fetch(rawUrl, { next: { revalidate: 3600 } });
    if (!res.ok) throw new Error(`GitHub returned ${res.status}`);
    const content = await res.text();
    return NextResponse.json({ content, source: "github" });
  } catch {
    return NextResponse.json(
      { error: true, message: "Unfortunately, failed to retrieve data from GitHub. Please try again later." },
      { status: 503 }
    );
  }
}
