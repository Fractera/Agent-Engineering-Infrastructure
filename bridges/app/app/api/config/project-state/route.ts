import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { requireAuth } from "@/lib/require-auth";
import fs from "fs";

const execAsync = promisify(exec);
const PROJECT_DIR = "/opt/fractera/app";
const PLATFORM_COMMIT_FILE = "/opt/fractera/DEPLOYED_COMMIT";
const APP_ENV = process.env.APP_ENV_PATH ?? `${PROJECT_DIR}/.env.local`;

// The GitHub connection, in the exact three states the GitHub page already uses
// (`app/[lang]/github/_lib/git.ts`). The footer needs them for one decision: may
// the pull and push buttons be offered at all?
//
// Measured live on a fresh server (2026-08-13): the footer showed both buttons,
// they answered "USER_GITHUB_REPO_URL not set", and the menu warning about GitHub
// stayed lit at the same time. Two surfaces, two different truths. There is one
// rule now, and it lives here: only a connection GitHub itself confirmed counts.
type GitHubState = "unconfigured" | "unverified" | "working";

function githubState(): GitHubState {
  try {
    const body = fs.readFileSync(APP_ENV, "utf-8");
    const value = (key: string) => body.match(new RegExp(`^${key}=(.+)$`, "m"))?.[1].trim() ?? "";
    if (!value("USER_GITHUB_REPO_URL")) return "unconfigured";
    return value("USER_GITHUB_VERIFIED_AT") ? "working" : "unverified";
  } catch {
    // No env file at all is the honest "nothing is configured", not an error.
    return "unconfigured";
  }
}

// What the footer indicator needs in order to answer one question: what should I press next?
//
// Everything here is read from facts on disk — the slot's own git state and the commit the installer
// recorded for the platform. Nothing is guessed, and a repository that is not connected yet says so
// instead of falling back to a word like "dev", which claimed the panel was running in a developer's
// environment it can never be in.
export async function GET(req: NextRequest) {
  const ok = await requireAuth(req.headers.get("cookie") ?? "");
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const github = githubState();
  const opts = { timeout: 15000, cwd: PROJECT_DIR };
  const git = async (cmd: string): Promise<string | null> =>
    execAsync(`git -C ${PROJECT_DIR} ${cmd}`, opts).then(r => r.stdout.trim()).catch(() => null);

  // Platform version: written by the installer at deploy time (bootstrap.sh), so it names the
  // Fractera commit this server actually runs — independent of the user's own project.
  let platform: string | null = null;
  try {
    platform = fs.readFileSync(PLATFORM_COMMIT_FILE, "utf-8").trim().slice(0, 7) || null;
  } catch { platform = null; }

  // A repository directory is not a connection. A freshly bootstrapped server has its own .git — the
  // installer creates one so the slot can be pushed — but no remote until the owner connects GitHub.
  // Measured live: reporting that state as "connected" produced a footer with a commit nobody could
  // act on, and an ahead/behind comparison against a repository that did not exist.
  const hasGit = fs.existsSync(`${PROJECT_DIR}/.git`);
  const remoteUrl = hasGit
    ? await execAsync(`git -C ${PROJECT_DIR} config --get remote.origin.url`, opts)
        .then(r => r.stdout.trim()).catch(() => "")
    : "";
  if (!hasGit || !remoteUrl) {
    return NextResponse.json({ connected: false, github, platform });
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

  // Ahead/behind can only be computed against a remote-tracking ref, and that ref is a local cache: it
  // is as old as the last fetch. Measured live on this server, it did not exist at all — so the footer
  // would have reported "nothing to pull" forever while the repository moved ahead.
  //
  // Fetching on every footer render would put a network call behind an idle screen, so the refresh is
  // explicit: ?fetch=1, sent when the owner OPENS the card. A failed fetch is not fatal — the answer
  // then carries nulls and the card says the comparison is unavailable, instead of a confident zero.
  if (req.nextUrl.searchParams.get("fetch") === "1") {
    await execAsync(`git -C ${PROJECT_DIR} fetch origin main --quiet`, { timeout: 25000 }).catch(() => null);
  }

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
    github,
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
