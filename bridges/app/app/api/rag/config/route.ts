import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import { execSync } from "child_process";
import { requireAuth } from "@/lib/require-auth";

// LightRAG's own settings. (step 500) Rewritten free of Hermes: the previous
// version imported lib/openai-key.ts, which fanned the key into Hermes' .env,
// its config.yaml and its credential pool. Hermes is gone, so restoring that
// module would have dragged it back.
//
// The key itself is NOT set here. There is one OpenAI key in the product, entered
// in OpenAI settings (/api/config/embeddings), and that route fans it out to every
// store that needs it — the vector store in the data service and this one. This
// route only reports whether the fan-out reached LightRAG, and lets the architect
// pick its model.

const RAG_ENV = process.env.RAG_ENV_PATH ?? "/opt/fractera/services/rag/.env";

function parseEnv(content: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    out[t.slice(0, eq).trim()] = t.slice(eq + 1);
  }
  return out;
}

function serializeEnv(vars: Record<string, string>): string {
  return Object.entries(vars).map(([k, v]) => `${k}=${v}`).join("\n") + "\n";
}

export async function GET(req: NextRequest) {
  const ok = await requireAuth(req.headers.get("cookie") ?? "");
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const vars = fs.existsSync(RAG_ENV) ? parseEnv(fs.readFileSync(RAG_ENV, "utf-8")) : {};
    // "Configured" means the key actually reached THIS service. Reporting the
    // product-wide key instead would claim readiness LightRAG does not have —
    // and its failure mode is silent: ingest answers 200, then embeds nothing.
    return NextResponse.json({
      configured: Boolean(vars.EMBEDDING_BINDING_API_KEY || vars.OPENAI_API_KEY),
      model: vars.LLM_MODEL ?? "gpt-4o-mini",
    });
  } catch {
    return NextResponse.json({ configured: false, model: "gpt-4o-mini" });
  }
}

// POST { vars: { LLM_MODEL: "..." } } — a MERGE, never a rewrite: the file also
// holds the key, the storage backends and the working dir.
export async function POST(req: NextRequest) {
  const ok = await requireAuth(req.headers.get("cookie") ?? "");
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const incoming = body?.vars;
  if (!incoming || typeof incoming !== "object") {
    return NextResponse.json({ error: "`vars` object is required" }, { status: 400 });
  }
  // Only the model is settable here. Anything else belongs to the installer or to
  // the key fan-out, and letting the panel write it would create a second owner.
  const model = typeof incoming.LLM_MODEL === "string" ? incoming.LLM_MODEL.trim() : "";
  if (!model) return NextResponse.json({ error: "LLM_MODEL is required" }, { status: 400 });

  try {
    const vars = fs.existsSync(RAG_ENV) ? parseEnv(fs.readFileSync(RAG_ENV, "utf-8")) : {};
    vars.LLM_MODEL = model;
    fs.writeFileSync(RAG_ENV, serializeEnv(vars), { mode: 0o600 });
  } catch (e) {
    return NextResponse.json({ error: `Could not write ${RAG_ENV}: ${String(e)}` }, { status: 500 });
  }

  // The service reads its env once at start, so the value is only live after a
  // restart. Best-effort: a failed restart must not lose the saved setting.
  let restarted = true;
  try {
    execSync("pm2 restart fractera-rag", { timeout: 20_000, stdio: "ignore" });
  } catch {
    restarted = false;
  }
  return NextResponse.json({ ok: true, restarted });
}
