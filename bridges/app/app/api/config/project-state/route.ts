import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { requireAuth } from "@/lib/require-auth";
import fs from "fs";

const execAsync = promisify(exec);
const PROJECT_DIR = "/opt/fractera/app";
const PLATFORM_COMMIT_FILE = "/opt/fractera/DEPLOYED_COMMIT";

// What the footer indicator needs in order to answer one question: what should I press next?
//
// Everything here is read from facts on disk — the slot's own git state and the commit the installer
// recorded for the platform. Nothing is guessed, and a repository that is not connected yet says so
// instead of falling back to a word like "dev", which claimed the panel was running in a developer's
// environment it can never be in.
export async function GET(req: NextRequest) {
  const ok = await requireAuth(req.headers.get("cookie") ?? "");
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const opts = { timeout: 15000, cwd: PROJECT_DIR };
  const git = async (cmd: string): Promise<string | null> =>
    execAsync(`git -C ${PROJECT_DIR} ${cmd}`, opts).then(r => r.stdout.trim()).catch(() => null);

  // Platform version: written by the installer at deploy time (bootstrap.sh), so it names the
  // Fractera commit this server actually runs — independent of the user's own project.
  let platform: string | null = null;
  try {
    platform = fs.readFileSync(PLATFORM_COMMIT_FILE, "utf-8").trim().slice(0, 7) || null;
  } catch { platform = null; }

  const hasGit = fs.existsSync(`${PROJECT_DIR}/.git`);
  if (!hasGit) {
    return NextResponse.json({ connected: false, platform });
  }

  const [commit, subject, branch, status, remote] = await Promise.all([
    git("rev-parse --short HEAD"),
    git("log -1 --pretty=%s"),
    git("rev-parse --abbrev-ref HEAD"),
    git("status --porcelain"),
    git("remote get-url origin"),
  ]);

  // Uncommitted work is counted in lines, not guessed from a boolean: "3 files" tells the owner
  // whether they forgot a file or changed half the project.
  const uncommitted = status ? status.split("\n").filter(Boolean).length : 0;

  // Ahead/behind is only meaningful once the remote-tracking ref exists locally; a repository that
  // has never fetched reports nulls rather than a confident zero.
  let ahead: number | null = null;
  let behind: number | null = null;
  const counts = await git("rev-list --left-right --count origin/main...HEAD");
  if (counts) {
    const [b, a] = counts.split(/\s+/).map(n => Number(n));
    if (Number.isFinite(b) && Number.isFinite(a)) { behind = b; ahead = a; }
  }

  // The repository name without the token that may sit in the URL.
  const repo = remote
    ? remote.replace(/^https:\/\/[^@]+@/, "https://").replace(/^.*github\.com[/:]/, "").replace(/\.git$/, "")
    : null;

  return NextResponse.json({
    connected: true,
    repo,
    branch,
    commit,
    subject,
    uncommitted,
    ahead,
    behind,
    platform,
  });
}
