import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import { execSync } from "child_process";
import { requireAuth } from "@/lib/require-auth";

// Step 500 — the embeddings key of the data layer's vector store.
//
// Replaces /api/config/rag, which configured LightRAG (:9621). LightRAG was
// installed to make the Hermes agent smarter; with Hermes gone its graph half
// went too, and the vector half now lives inside the data service (:3300),
// sharing that service's database, backup and auth. So the key it needs is the
// data service's own OPENAI_API_KEY — nothing else changes.

const DATA_ENV = process.env.DATA_ENV_PATH ?? "/opt/fractera/services/data/.env";
const RAG_ENV  = process.env.RAG_ENV_PATH  ?? "/opt/fractera/services/rag/.env";
const DATA_URL = process.env.DATA_INTERNAL_URL ?? "http://127.0.0.1:3300";

function parseEnv(content: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    out[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1);
  }
  return out;
}

// GET — is the store usable, which model, how many records. Asks the data
// service itself rather than guessing from the env file, so a key that is
// present but rejected by OpenAI still shows up as a failure at first use.
export async function GET(req: NextRequest) {
  const ok = await requireAuth(req.headers.get("cookie") ?? "");
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const r = await fetch(`${DATA_URL}/vectors/status`, {
      headers: { "x-data-secret": process.env.DATA_SECRET ?? "" },
      cache: "no-store",
    });
    if (!r.ok) return NextResponse.json({ configured: false, reachable: false });
    const data = await r.json();
    return NextResponse.json({ ...data, reachable: true });
  } catch {
    return NextResponse.json({ configured: false, reachable: false });
  }
}

// POST { apiKey } — write the key into the data service env and restart it.
// The restart is what makes the key live: the service reads process.env once.
export async function POST(req: NextRequest) {
  const ok = await requireAuth(req.headers.get("cookie") ?? "");
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const apiKey = typeof body?.apiKey === "string" ? body.apiKey.trim() : "";
  if (!apiKey.startsWith("sk-")) {
    return NextResponse.json({ error: "Expected an OpenAI key starting with sk-" }, { status: 400 });
  }

  try {
    const current = fs.existsSync(DATA_ENV) ? parseEnv(fs.readFileSync(DATA_ENV, "utf-8")) : {};
    current.OPENAI_API_KEY = apiKey;
    fs.writeFileSync(
      DATA_ENV,
      Object.entries(current).map(([k, v]) => `${k}=${v}`).join("\n") + "\n",
      { mode: 0o600 },
    );
  } catch (e) {
    return NextResponse.json({ error: `Could not write ${DATA_ENV}: ${String(e)}` }, { status: 500 });
  }

  // Fan out to the OTHER knowledge store. (step 500) There is ONE OpenAI key in
  // the product; agentic RAG needs it under three names, and its failure without
  // them is silent — ingest answers 200 and then embeds nothing (the exact defect
  // that cost a day the first time round). Writing them here keeps a single entry
  // point instead of asking the architect to type the key twice.
  let ragUpdated = false;
  try {
    if (fs.existsSync(RAG_ENV)) {
      const rag = parseEnv(fs.readFileSync(RAG_ENV, "utf-8"));
      rag.LLM_BINDING_API_KEY = apiKey;
      rag.EMBEDDING_BINDING_API_KEY = apiKey;
      rag.OPENAI_API_KEY = apiKey; // LightRAG's OpenAI client reads this exact name
      const body = Object.entries(rag).map(([k, v]) => `${k}=${v}`).join("\n") + "\n";
      fs.writeFileSync(RAG_ENV, body, { mode: 0o600 });
      ragUpdated = true;
    }
  } catch {
    ragUpdated = false; // reported, never fatal — the key is already saved
  }

  // Best-effort: a failed restart must not lose the key that is already saved.
  let restarted = true;
  try {
    execSync("pm2 restart fractera-data", { timeout: 20_000, stdio: "ignore" });
  } catch {
    restarted = false;
  }
  // Only restart RAG if it actually received the key, and only if it is running —
  // a stopped service is the architect's choice, not something to undo here.
  if (ragUpdated) {
    try { execSync("pm2 restart fractera-rag", { timeout: 20_000, stdio: "ignore" }); } catch { /* stopped or absent */ }
  }

  return NextResponse.json({ ok: true, restarted, ragUpdated });
}
