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

function maskToken(s: string): string {
  return s.replace(/x-access-token:[^@]+@/g, "");
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

    const url  = authUrl(repoUrl, token);
    const opts = { timeout: 30000 };
    const lines: string[] = [];

    // Init local repo if this is first time
    if (!fs.existsSync(`${PROJECT_DIR}/.git`)) {
      const { stdout, stderr } = await execAsync(
        `git -C ${PROJECT_DIR} init && git -C ${PROJECT_DIR} symbolic-ref HEAD refs/heads/main`,
        opts
      );
      lines.push((stdout + stderr).trim());
    }

    // Ensure remote points to user's repo
    await execAsync(
      `git -C ${PROJECT_DIR} remote set-url origin "${url}" 2>/dev/null || git -C ${PROJECT_DIR} remote add origin "${url}"`,
      opts
    ).catch(() => null);

    // Stash local changes so pull doesn't abort
    const stashRes = await execAsync(
      `git -C ${PROJECT_DIR} stash --include-untracked`,
      opts
    ).catch(e => ({ stdout: e.stdout ?? "", stderr: e.stderr ?? "" }));
    const stashed = !(stashRes.stdout + stashRes.stderr).includes("No local changes");
    if (stashed) lines.push("Stashed local changes.");

    // Pull
    const { stdout, stderr } = await execAsync(
      `git -C ${PROJECT_DIR} pull origin main`,
      opts
    );
    lines.push((stdout + stderr).trim());

    // Restore stashed changes on top of pulled code
    if (stashed) {
      const popRes = await execAsync(
        `git -C ${PROJECT_DIR} stash pop`,
        opts
      ).catch(e => ({ stdout: e.stdout ?? "", stderr: e.stderr ?? "" }));
      lines.push((popRes.stdout + popRes.stderr).trim() || "Local changes restored.");
    }

    return NextResponse.json({ success: true, output: maskToken(lines.filter(Boolean).join("\n")) });
  } catch (e: any) {
    return NextResponse.json({
      success: false,
      error: maskToken((e.stdout ?? "") + (e.stderr ?? e.message)),
    }, { status: 500 });
  }
}
