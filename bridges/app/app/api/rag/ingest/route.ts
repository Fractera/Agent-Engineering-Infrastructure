import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const RAG_URL = process.env.LIGHTRAG_URL ?? "http://localhost:9621";
const RAG_KEY = process.env.LIGHTRAG_API_KEY ?? "";

const SCAN_ROOT = "/opt/fractera/app";
const INCLUDE_EXT = new Set([".ts", ".tsx", ".js", ".jsx", ".md", ".json", ".css"]);
const EXCLUDE_DIRS = new Set([".next", "node_modules", ".git", "public", "dist", ".turbo"]);
const EXCLUDE_FILES = new Set(["package-lock.json", "yarn.lock", "pnpm-lock.yaml"]);

function collectFiles(dir: string, found: string[] = []): string[] {
  if (!fs.existsSync(dir)) return found;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!EXCLUDE_DIRS.has(entry.name)) collectFiles(path.join(dir, entry.name), found);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (INCLUDE_EXT.has(ext) && !EXCLUDE_FILES.has(entry.name)) {
        found.push(path.join(dir, entry.name));
      }
    }
  }
  return found;
}

async function ingestText(text: string, description: string): Promise<boolean> {
  try {
    const res = await fetch(`${RAG_URL}/documents/text`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": RAG_KEY },
      // LightRAG stores the origin under `file_source`; `description` is ignored
      // by its API, which is why every document showed up as "unknown_source".
      body: JSON.stringify({ text, file_source: description || "document" }),
      signal: AbortSignal.timeout(120000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);

    // Direct text insert — one document, the normal path.
    if (body?.text) {
      const ok = await ingestText(body.text, body.description ?? "");
      if (!ok) return NextResponse.json({ available: false, error: "LightRAG unreachable" }, { status: 502 });
      return NextResponse.json({ ok: true });
    }

    // (step 500) Indexing the SLOT'S SOURCE CODE now needs an explicit flag.
    // It used to be what an empty POST did, and an empty POST is easy to send by
    // accident — it queued 285 source files into the graph, each costing an LLM
    // entity-extraction pass. That behaviour made sense when LightRAG existed to
    // make the Hermes agent smarter about the codebase; Hermes is gone, and a
    // knowledge base is for the owner's DOCUMENTS, not for .tsx files.
    if (body?.scanApp !== true) {
      return NextResponse.json(
        { error: "Nothing to ingest: send { text } for a document, or { scanApp: true } to index the app source." },
        { status: 400 },
      );
    }

    // Scan app/ directory
    const files = collectFiles(SCAN_ROOT);
    const results: { path: string; ok: boolean }[] = [];

    for (const filePath of files) {
      try {
        const text = fs.readFileSync(filePath, "utf-8");
        if (text.trim().length < 50) continue; // skip nearly-empty files
        const ok = await ingestText(text, filePath.replace("/opt/fractera/app/", "app/"));
        results.push({ path: filePath, ok });
      } catch {
        results.push({ path: filePath, ok: false });
      }
    }

    return NextResponse.json({
      scanned: files.length,
      inserted: results.filter(r => r.ok).length,
      failed: results.filter(r => !r.ok).length,
      results,
    });
  } catch {
    return NextResponse.json({ available: false }, { status: 503 });
  }
}
