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
      body: JSON.stringify({ text, description }),
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

    // Direct text insert
    if (body?.text) {
      const ok = await ingestText(body.text, body.description ?? "");
      if (!ok) return NextResponse.json({ available: false, error: "LightRAG unreachable" }, { status: 502 });
      return NextResponse.json({ ok: true });
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
