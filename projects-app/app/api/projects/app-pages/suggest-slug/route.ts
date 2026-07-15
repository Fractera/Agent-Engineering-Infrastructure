import { NextRequest, NextResponse } from "next/server";
import { authorize } from "@/lib/nodes";
import { suggestSlug } from "@/lib/app-pages/slug";

// SUGGEST AN ENGLISH SLUG (step 242.2) — POST { title } -> { slug }. The declare wizard's step 3 calls this
// to preview the English folder name for a title the owner typed or SPOKE (any language). Deterministic
// fallback inside suggestSlug, so this never fails hard.
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => null)) as { title?: string } | null;
  const slug = await suggestSlug(String(body?.title ?? ""));
  return NextResponse.json({ slug });
}
