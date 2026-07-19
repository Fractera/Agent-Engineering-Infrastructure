import { NextRequest, NextResponse } from "next/server";
import { authorize } from "@/lib/nodes";
import { openAiKey } from "@/lib/quiz";

// THE DEV REPORT TRANSLATOR (263.1, owner 2026-07-19) — the coding agent writes its final report in
// English between the @@FRACTERA_REPORT_*@@ markers; the console captures it and sends it here so the
// OWNER reads the outcome in his own UI language. Best-effort by design: any failure (no key, OpenAI
// down, unknown language) returns the ORIGINAL text with ok:true — the toast must never be blocked by
// the translation layer.
export const runtime = "nodejs";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

// The model is told the language by NAME, not by bare code (the quiz.ts convention — codes are fragile).
const LANGUAGE_NAMES: Record<string, string> = {
  en: "English", ru: "Russian (русский)", es: "Spanish (español)", fr: "French (français)",
  it: "Italian (italiano)", de: "German (Deutsch)", pt: "Portuguese (português)",
  pl: "Polish (polski)", tr: "Turkish (Türkçe)", nl: "Dutch (Nederlands)",
};

export async function POST(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => null)) as { report?: string; lang?: string } | null;
  const report = (body?.report ?? "").trim().slice(0, 4000);
  const lang = (body?.lang ?? "en").trim().toLowerCase();
  if (!report) return NextResponse.json({ error: "empty report" }, { status: 400 });

  const langName = LANGUAGE_NAMES[lang];
  const key = openAiKey();
  if (lang === "en" || !langName || !key) return NextResponse.json({ ok: true, text: report });

  try {
    const upstream = await fetch(OPENAI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content:
              `Translate the coding agent's final report into ${langName} for the product owner. ` +
              "Plain prose, no markdown, no code blocks; keep file/node names and technical identifiers untranslated. " +
              "Output ONLY the translation.",
          },
          { role: "user", content: report },
        ],
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!upstream.ok) return NextResponse.json({ ok: true, text: report });
    const data = (await upstream.json().catch(() => null)) as
      | { choices?: { message?: { content?: string } }[] }
      | null;
    const text = data?.choices?.[0]?.message?.content?.trim();
    return NextResponse.json({ ok: true, text: text || report });
  } catch {
    return NextResponse.json({ ok: true, text: report });
  }
}
