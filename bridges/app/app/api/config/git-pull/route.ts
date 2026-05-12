import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { requireAuth } from "@/lib/require-auth";
import fs from "fs";

const execAsync = promisify(exec);
const APP_ENV     = process.env.APP_ENV_PATH ?? "/opt/fractera/app/.env.local";
const PROJECT_DIR = "/opt/fractera/app";

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

function authUrl(repo: string, token: string): string {
  return token ? repo.replace("https://", `https://x-access-token:${token}@`) : repo;
}

export async function POST(req: NextRequest) {
  const ok = await requireAuth(req.headers.get("cookie") ?? "");
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const vars = fs.existsSync(APP_ENV) ? parseEnv(fs.readFileSync(APP_ENV, "utf-8")) : {};
    const repoUrl = vars["GIT_REPO_URL"] ?? "";
    const token   = vars["GIT_TOKEN"] ?? "";

    if (!repoUrl) {
      return NextResponse.json({
        success: false,
        error: "GIT_REPO_URL not set. Add it in Settings → Env Variables.",
      }, { status: 400 });
    }

    const url = authUrl(repoUrl, token);
    const opts = { timeout: 30000 };

    // Init local repo if this is first time
    if (!fs.existsSync(`${PROJECT_DIR}/.git`)) {
      await execAsync(`git -C ${PROJECT_DIR} init && git -C ${PROJECT_DIR} checkout -b main`, opts);
    }

    // Ensure remote points to user's repo
    await execAsync(
      `git -C ${PROJECT_DIR} remote set-url origin "${url}" 2>/dev/null || git -C ${PROJECT_DIR} remote add origin "${url}"`,
      opts
    ).catch(() => null);

    const { stdout, stderr } = await execAsync(
      `git -C ${PROJECT_DIR} pull origin main`,
      opts
    );

    return NextResponse.json({ success: true, output: (stdout + stderr).trim() });
  } catch (e: any) {
    return NextResponse.json({
      success: false,
      error: ((e.stdout ?? "") + (e.stderr ?? e.message)).replace(/x-access-token:[^@]+@/g, ""),
    }, { status: 500 });
  }
}
