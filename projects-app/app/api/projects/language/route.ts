import { NextRequest, NextResponse } from "next/server";
import { authorize } from "@/lib/nodes";
import { defaultLanguage, languageName } from "@/lib/quiz";

// The project's DEFAULT language (step 227) — the language the activation Quiz will speak. The creation
// modal shows it EXPLICITLY, so the owner is never surprised by the language of their design session:
// "The Quiz will run in <language>. To change it, use the workspace settings."
// It is the first entry of NEXT_PUBLIC_SUPPORTED_LANGUAGES; English only when none is set.
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const code = defaultLanguage();
  return NextResponse.json({ code, name: languageName(code), isDefault: code === "en" });
}
