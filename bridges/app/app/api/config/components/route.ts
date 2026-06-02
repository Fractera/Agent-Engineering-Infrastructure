import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import { requireAuth } from "@/lib/require-auth";

// Resolved component selection written by bootstrap.sh (Easy Starter S1).
// Drives which AI tools the admin shows (carousel cards + settings panels).
// Missing file = an older server deployed before selective install → show all.
const MANIFEST = process.env.COMPONENTS_MANIFEST_PATH ?? "/opt/fractera/installed-components.json";

const ALL = [
  "claude-code",
  "codex",
  "gemini-cli",
  "qwen-code",
  "kimi-code",
  "memory",
  "brain",
] as const;

export async function GET(req: NextRequest) {
  const ok = await requireAuth(req.headers.get("cookie") ?? "");
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    if (fs.existsSync(MANIFEST)) {
      const raw = JSON.parse(fs.readFileSync(MANIFEST, "utf-8"));
      if (Array.isArray(raw)) {
        const components = raw.filter(
          (x): x is (typeof ALL)[number] => typeof x === "string" && (ALL as readonly string[]).includes(x),
        );
        return NextResponse.json({ components, source: "manifest" });
      }
    }
  } catch (e) {
    console.error("[config/components] manifest read failed", e);
  }

  // No manifest (old servers) or parse error → install set unknown → show all.
  return NextResponse.json({ components: ALL, source: "default" });
}
