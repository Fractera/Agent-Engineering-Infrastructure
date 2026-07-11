import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { getSession } from "@/lib/auth/get-session";

// Live OpenAI model list for the Projects layer's model pickers (step 220 — self-sufficiency rule).
// The model dropdown in the Settings modal is ALWAYS fed by the real /v1/models list, never a stale
// hardcoded array. This route did not exist on :3003 before, so the picker silently degraded to a text
// box; adding it (same mechanism as the FNS slot / Admin routes) makes the dropdown work. SELF-SUFFICIENT:
// reads the projects-app's OWN OPENAI_API_KEY, no Admin/Hermes dependency. Cached 5 min.
export const runtime = "nodejs";

const ROLES = ["architect", "manager", "agent"];

// Chat-completion families to surface, newest first (higher weight = higher in the dropdown; strict
// startsWith so gpt-5.5 outranks gpt-5). Keep in sync with the FNS/Admin routes.
const CHAT_FAMILY_RANK: { prefix: string; weight: number }[] = [
  { prefix: "gpt-5.5", weight: 155 },
  { prefix: "gpt-5.4", weight: 150 },
  { prefix: "gpt-5.3", weight: 145 },
  { prefix: "gpt-5.2", weight: 140 },
  { prefix: "gpt-5.1", weight: 135 },
  { prefix: "gpt-5", weight: 130 },
  { prefix: "gpt-4.1", weight: 90 },
  { prefix: "gpt-4o", weight: 80 },
  { prefix: "o3", weight: 70 },
  { prefix: "o1", weight: 60 },
  { prefix: "gpt-4-turbo", weight: 30 },
];
const EXCLUDE_PATTERNS = [
  "embedding", "tts", "whisper", "dall-e", "moderation", "babbage",
  "davinci", "ada", "curie", ":", "transcribe", "search", "realtime-preview",
];

function familyWeight(id: string): number {
  for (const { prefix, weight } of CHAT_FAMILY_RANK) if (id.startsWith(prefix)) return weight;
  return 0;
}

function slotKey(): string {
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;
  // The step-context env quirk (207.16): fall back to reading .env.local directly.
  try {
    const raw = readFileSync(`${process.cwd()}/.env.local`, "utf-8");
    const m = raw.match(/^OPENAI_API_KEY=(.+)$/m);
    return m ? m[1].trim() : "";
  } catch { return ""; }
}

let cache: { at: number; payload: unknown } | null = null;
const TTL_MS = 5 * 60 * 1000;

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.roles?.some((r) => ROLES.includes(r))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (cache && Date.now() - cache.at < TTL_MS) return NextResponse.json(cache.payload);

  const apiKey = slotKey();
  if (!apiKey) {
    return NextResponse.json({ error: "no_key", models: [], hint: "Set the OpenAI key first." });
  }
  try {
    const res = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return NextResponse.json({ error: `openai_${res.status}`, models: [] });
    const raw = (await res.json()) as { data?: { id: string; created?: number }[] };
    const list = (raw.data ?? [])
      .map((m) => ({ id: m.id, created: m.created ?? 0 }))
      .filter((m) => !EXCLUDE_PATTERNS.some((p) => m.id.toLowerCase().includes(p)) && familyWeight(m.id) > 0)
      .map((m) => ({ ...m, family: CHAT_FAMILY_RANK.find((f) => m.id.startsWith(f.prefix))!.prefix, weight: familyWeight(m.id) }))
      .sort((a, b) => (b.weight !== a.weight ? b.weight - a.weight : (b.created ?? 0) - (a.created ?? 0)));
    const seen = new Set<string>();
    const models = list.map((m) => {
      const recommended = !seen.has(m.family);
      if (recommended) seen.add(m.family);
      return { id: m.id, family: m.family, recommended };
    });
    const payload = { models, cachedAt: Date.now() };
    cache = { at: Date.now(), payload };
    return NextResponse.json(payload);
  } catch (e) {
    return NextResponse.json({ error: `fetch_failed: ${e}`, models: [] });
  }
}
