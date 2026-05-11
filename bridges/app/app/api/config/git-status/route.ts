import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import { requireAuth } from "@/lib/require-auth";

const APP_ENV = process.env.APP_ENV_PATH ?? "/opt/fractera/app/.env.local";

function parseEnv(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    result[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1);
  }
  return result;
}

function extractRepo(url: string): string | null {
  try {
    const clean = url.trim().replace(/\.git$/, "");
    const parts = clean.split("/");
    if (parts.length < 2) return null;
    return `${parts[parts.length - 2]}/${parts[parts.length - 1]}`;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const ok = await requireAuth(req.headers.get("cookie") ?? "");
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const vars = fs.existsSync(APP_ENV)
      ? parseEnv(fs.readFileSync(APP_ENV, "utf-8"))
      : {};

    const repoUrl = vars["GIT_REPO_URL"] ?? "";
    if (!repoUrl) {
      return NextResponse.json({ connected: false, repo: null });
    }

    const repo = extractRepo(repoUrl);
    return NextResponse.json({ connected: !!repo, repo });
  } catch {
    return NextResponse.json({ connected: false, repo: null });
  }
}
