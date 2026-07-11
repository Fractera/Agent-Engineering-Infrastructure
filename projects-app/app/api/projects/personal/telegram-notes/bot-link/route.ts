import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/get-session";

// The automation's REAL Telegram link (step 207.16, use-cases accordion): resolves the bot @username
// via getMe from the slot's own token — the same identity the footer/deep-links use — and returns the
// https://t.me/<username> chat link. Graceful: no token / Telegram down → { link: null } (the UI hides
// the link instead of showing a dead one). Role-gated like the other project-config routes.
export const runtime = "nodejs";

const ROLES = ["architect", "manager", "agent"];

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.roles?.some((r) => ROLES.includes(r))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const token = process.env.TELEGRAM_BOT_TOKEN ?? "";
  if (!token) return NextResponse.json({ link: null, username: null, name: null });
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/getMe`, { signal: AbortSignal.timeout(8000) });
    const d = (await r.json()) as { ok?: boolean; result?: { username?: string; first_name?: string } };
    const username = d?.ok && d.result?.username ? String(d.result.username) : null;
    // The bot's display name (step 218 info panel) — separate from @username: Telegram lets
    // an owner set this to anything up to 64 chars, so the panel truncates it, not this route.
    const name = d?.ok && d.result?.first_name ? String(d.result.first_name) : null;
    return NextResponse.json({ link: username ? `https://t.me/${username}` : null, username, name });
  } catch {
    return NextResponse.json({ link: null, username: null, name: null });
  }
}
