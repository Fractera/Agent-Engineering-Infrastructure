import { NextResponse } from "next/server";
import { getPlatformConfig } from "@/config/platform-config";

export const dynamic = "force-dynamic";

// Tiny public signature for the client reload poller (ConfigReloadWatcher). Returns the current
// platform-config `reloadNonce`; an "apply now" MCP/Platform write bumps it, the poller notices
// the change vs the value it booted with and reloads open tabs. Read-only, no secrets.
export async function GET() {
  const { reloadNonce } = getPlatformConfig();
  return NextResponse.json(
    { reloadNonce: reloadNonce ?? 0 },
    { headers: { "Cache-Control": "no-store" } }
  );
}
