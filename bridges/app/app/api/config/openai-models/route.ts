import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { readEnvFile } from "@/lib/env-file";

const HERMES_ENV = process.env.HERMES_ENV_PATH ?? "/root/.hermes/.env";
const RAG_ENV    = process.env.RAG_ENV_PATH    ?? "/opt/fractera/services/rag/.env";

// Cache the upstream model list for 5 minutes — OpenAI rate-limits /v1/models
// at 60 rpm per key, no point spending budget on a list that barely changes.
type CacheEntry = { at: number; payload: unknown };
let cache: CacheEntry | null = null;
const TTL_MS = 5 * 60 * 1000;

// Top chat-completion model families we want to surface, ordered newest first.
// Canonical ids verified against developers.openai.com/api/docs/models/all
// on 2026-05. Higher weight = higher in the dropdown. Prefix match is
// strict (startsWith), so gpt-5.5 ranks above gpt-5.4 above gpt-5 etc.
const CHAT_FAMILY_RANK: { prefix: string; weight: number }[] = [
  { prefix: "gpt-5.5", weight: 155 },
  { prefix: "gpt-5.4", weight: 150 },
  { prefix: "gpt-5.3", weight: 145 },
  { prefix: "gpt-5.2", weight: 140 },
  { prefix: "gpt-5.1", weight: 135 },
  { prefix: "gpt-5",   weight: 130 },   // catches gpt-5, gpt-5-mini, gpt-5-codex etc not caught above
  { prefix: "gpt-4.1", weight: 90  },
  { prefix: "gpt-4o",  weight: 80  },
  { prefix: "o3",      weight: 70  },
  { prefix: "o1",      weight: 60  },
  { prefix: "gpt-4-turbo", weight: 30 },
];

// Suffixes / substrings that mean "this is not a usable general chat model"
// (image gen, embeddings, audio, fine-tunes, legacy snapshots).
const EXCLUDE_PATTERNS = [
  "embedding", "tts", "whisper", "dall-e", "moderation", "babbage",
  "davinci", "ada", "curie", ":", // ":" = fine-tune suffix
  "transcribe", "search", "realtime-preview",
];

function familyWeight(id: string): number {
  for (const { prefix, weight } of CHAT_FAMILY_RANK) {
    if (id.startsWith(prefix)) return weight;
  }
  return 0;
}

function getApiKey(): string | null {
  // Prefer Hermes' key (used by the main agent); fall back to RAG's. Both
  // typically hold the same value after our auto-fill propagation, but we
  // pick deterministically so the model list is consistent.
  const hermes = readEnvFile(HERMES_ENV);
  if (hermes.OPENAI_API_KEY) return hermes.OPENAI_API_KEY;
  const rag = readEnvFile(RAG_ENV);
  if (rag.LLM_BINDING_API_KEY) return rag.LLM_BINDING_API_KEY;
  return null;
}

export async function GET(req: NextRequest) {
  const ok = await requireAuth(req.headers.get("cookie") ?? "");
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (cache && Date.now() - cache.at < TTL_MS) {
    return NextResponse.json(cache.payload);
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    return NextResponse.json({
      error: "no_key",
      models: [],
      hint: "Set an OpenAI API key in Brain or Memory settings first.",
    }, { status: 200 });
  }

  let raw: { data?: { id: string; created?: number }[] } | null = null;
  try {
    const res = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      return NextResponse.json({
        error: `openai_${res.status}`,
        models: [],
      }, { status: 200 });
    }
    raw = await res.json();
  } catch (e) {
    return NextResponse.json({
      error: `fetch_failed: ${e}`,
      models: [],
    }, { status: 200 });
  }

  const list = (raw?.data ?? [])
    .map((m) => ({ id: m.id, created: m.created ?? 0 }))
    .filter((m) => {
      const lower = m.id.toLowerCase();
      if (EXCLUDE_PATTERNS.some((p) => lower.includes(p))) return false;
      // Keep only models in our recognised chat families.
      return familyWeight(m.id) > 0;
    })
    .map((m) => ({
      id: m.id,
      created: m.created,
      family: CHAT_FAMILY_RANK.find((f) => m.id.startsWith(f.prefix))!.prefix,
      weight: familyWeight(m.id),
    }))
    .sort((a, b) => {
      if (b.weight !== a.weight) return b.weight - a.weight;
      return (b.created ?? 0) - (a.created ?? 0);
    });

  // Top-of-family gets a "recommended" badge. Picks first hit per family so
  // the UI can show, e.g. "gpt-5" as primary and "gpt-5-mini" right below.
  const seen = new Set<string>();
  const models = list.map((m) => {
    const isTop = !seen.has(m.family);
    if (isTop) seen.add(m.family);
    return { id: m.id, created: m.created, family: m.family, recommended: isTop };
  });

  const payload = { models, cachedAt: Date.now() };
  cache = { at: Date.now(), payload };
  return NextResponse.json(payload);
}
