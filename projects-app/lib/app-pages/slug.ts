import { openAiKey } from "@/lib/quiz";

// PAGE-NAME → ENGLISH SLUG (step 242.2, owner) — the owner types or SPEAKS a page title in any language; the
// folder name must be a short, English, hyphenated identifier (a page at app/[lang]/<slug>/). This turns the
// spoken/typed title into that slug. When an OpenAI key is present it asks the model for a 2-4 word English
// slug (so "Счётчик калорий" → "calorie-counter"); with no key, or on any failure, it falls back to a
// deterministic transliteration-free slugify (fine for a title already in Latin script). NEVER throws — a
// naming helper must not block the declare flow.

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

/** Deterministic fallback: lowercase, non-alphanumeric runs → single dash, trimmed, capped. */
export function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);
}

export async function suggestSlug(title: string): Promise<string> {
  const t = title.trim();
  if (!t) return "page";
  const key = openAiKey();
  if (!key) return slugify(t) || "page";
  try {
    const r = await fetch(OPENAI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              'You turn a page title (in ANY language) into a short ENGLISH url slug for a folder name. Reply STRICT JSON only: {"slug":"<2-4 english words, lowercase, hyphen-separated, no spaces, letters/digits/hyphens only>"}. Translate to English if needed. Example: "Счётчик калорий" -> {"slug":"calorie-counter"}.',
          },
          { role: "user", content: t },
        ],
      }),
    });
    if (!r.ok) return slugify(t) || "page";
    const d = (await r.json()) as { choices?: { message?: { content?: string } }[] };
    const raw = d.choices?.[0]?.message?.content ?? "";
    const parsed = JSON.parse(raw.replace(/^```json\s*|\s*```$/g, "")) as { slug?: unknown };
    const slug = slugify(String(parsed.slug ?? ""));
    return slug || slugify(t) || "page";
  } catch {
    return slugify(t) || "page";
  }
}
