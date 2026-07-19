import { NextResponse } from "next/server";
import { exec } from "node:child_process";

// RESTART THE BRIDGE (owner 2026-07-19, 263.1) — the production self-heal for a genuinely crashed bridge
// process: the Bridges panel's "Restart bridge" button POSTs here and we ask pm2 to restart it. The
// false-offline case (a stale probe after an admin rebuild) is healed separately by the panel's
// re-probe — this button is for the real thing, so a user never needs SSH to bring the bridges back.
export const runtime = "nodejs";

export async function POST() {
  return await new Promise<NextResponse>((resolve) => {
    exec("pm2 restart fractera-bridge", { timeout: 20_000 }, (err, _stdout, stderr) => {
      if (err) {
        resolve(NextResponse.json({ error: `restart failed: ${stderr || err.message}` }, { status: 502 }));
      } else {
        resolve(NextResponse.json({ ok: true }));
      }
    });
  });
}
