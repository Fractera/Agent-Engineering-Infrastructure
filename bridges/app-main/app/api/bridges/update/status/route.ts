import { NextResponse } from "next/server";
import { execSync } from "child_process";
import path from "path";

const UPSTREAM = process.env.UPSTREAM_REPO_URL;
// process.cwd() is app/ — the git root is one level up
const APP_DIR  = path.resolve(process.cwd(), "..");

export async function GET() {
  if (!UPSTREAM) {
    return NextResponse.json({ configured: false, available: false });
  }

  try {
    // Ensure upstream remote exists
    const remotes = execSync("git remote", { cwd: APP_DIR, encoding: "utf8" });
    if (!remotes.includes("upstream")) {
      execSync(`git remote add upstream ${UPSTREAM}`, { cwd: APP_DIR });
    }

    // Fetch silently
    execSync("git fetch upstream --quiet", { cwd: APP_DIR, timeout: 15000 });

    // Count commits ahead
    const behind = execSync("git rev-list HEAD..upstream/main --count", {
      cwd: APP_DIR, encoding: "utf8",
    }).trim();

    const count = parseInt(behind, 10);

    // Get latest commit message from upstream if available
    let latestMessage = "";
    if (count > 0) {
      latestMessage = execSync("git log upstream/main -1 --pretty=%s", {
        cwd: APP_DIR, encoding: "utf8",
      }).trim();
    }

    return NextResponse.json({ configured: true, available: count > 0, count, latestMessage });
  } catch {
    return NextResponse.json({ configured: true, available: false, error: "fetch failed" });
  }
}
