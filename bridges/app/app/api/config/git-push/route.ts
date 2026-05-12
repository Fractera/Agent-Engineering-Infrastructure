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
    const body = await req.json().catch(() => ({})) as { message?: string };
    const msg  = (body.message ?? "").trim() || `admin: push ${new Date().toISOString().slice(0, 16).replace("T", " ")}`;
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

    // Create .gitignore if missing (prevents node_modules / .next / secrets from being committed)
    const gitignorePath = `${PROJECT_DIR}/.gitignore`;
    if (!fs.existsSync(gitignorePath)) {
      fs.writeFileSync(gitignorePath, [
        "node_modules/",
        ".next/",
        "out/",
        ".env.local",
        ".env*.local",
        "storage/",
        "data/*.sqlite",
        "data/*.sqlite-shm",
        "data/*.sqlite-wal",
      ].join("\n") + "\n", "utf-8");
    }

    // Ensure remote points to user's repo
    await execAsync(
      `git -C ${PROJECT_DIR} remote set-url origin "${url}" 2>/dev/null || git -C ${PROJECT_DIR} remote add origin "${url}"`,
      opts
    ).catch(() => null);

    // Stage all changes
    const { stdout: s1, stderr: e1 } = await execAsync(`git -C ${PROJECT_DIR} add -A`, opts);
    lines.push((s1 + e1).trim());

    // Commit (ignore exit 1 when nothing new to commit — push still runs for pending commits)
    const commitRes = await execAsync(
      `git -C ${PROJECT_DIR} -c user.email="admin@fractera.ai" -c user.name="Fractera Admin" commit -m "${msg.replace(/"/g, "'")}"`,
      opts
    ).catch(e => ({ stdout: e.stdout ?? "", stderr: e.stderr ?? "" }));
    lines.push((commitRes.stdout + commitRes.stderr).trim());

    // Push
    const { stdout: s3, stderr: e3 } = await execAsync(
      `git -C ${PROJECT_DIR} push -u origin main`,
      opts
    );
    lines.push((s3 + e3).trim());

    return NextResponse.json({ success: true, output: maskToken(lines.filter(Boolean).join("\n")) });
  } catch (e: any) {
    return NextResponse.json({
      success: false,
      error: maskToken((e.stdout ?? "") + (e.stderr ?? e.message)),
    }, { status: 500 });
  }
}
