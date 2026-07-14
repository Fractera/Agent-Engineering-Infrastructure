import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { openAiKey } from "@/lib/quiz";

// THE "HOW IT WORKS" DESCRIPTION (step 237; rewired onto the entity-architecture standard in 238) — a
// plain-language explanation of a single automation, written BY THE AI, NOT hand-authored. Stored as a flat
// JSON file in the automation's own _data/ folder (NOT a TS module — this route reads/writes it with plain
// fs, so no build/rebuild is involved on either side); the modal's GET reads it directly, same as any other
// /api/projects/* route (already dynamic, canon-safe). Regenerated on demand only — the owner clicks
// "Get answer from AI" in the modal, nothing runs automatically.
//
// Step 238 split "collect" from "ask": the modal's own "Collect data" button already fetched the JSON2
// snapshot (GET /api/projects/fetch-current-automation-architecture-snapshot) and shows it with a Copy
// button; "Get answer from AI" then sends THAT SAME collected object here — no second gather, no drift
// between what the owner saw/copied and what the model actually read.

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const FILE = "how-it-works.json";

export type HowItWorks = { text: string; updatedAt: string };

export async function readHowItWorks(projectDir: string): Promise<HowItWorks | null> {
  try {
    const raw = await readFile(join(projectDir, "_data", FILE), "utf8");
    return JSON.parse(raw) as HowItWorks;
  } catch {
    return null;
  }
}

export async function generateHowItWorks(
  projectDir: string,
  collected: unknown,
  // The owner's OWN free-text request (step 241) — spoken or typed in the modal. It SHAPES the answer:
  // "keep it very short", "list it as first, second, third", "explain what happens if X". Empty = the
  // default short prose. It never overrides the safety framing below (plain language, no jargon), it only
  // steers length/structure/emphasis, so a weak or adversarial prompt cannot turn this into something else.
  userPrompt?: string,
): Promise<{ ok: true; result: HowItWorks } | { ok: false; error: string }> {
  const key = openAiKey();
  if (!key) return { ok: false, error: "OPENAI_API_KEY is not set" };

  const context = JSON.stringify(collected, null, 2);
  if (!context.trim() || context === "{}" || context === "null") {
    return { ok: false, error: "Nothing declared about this automation yet — build it first." };
  }

  const shaping = (userPrompt ?? "").trim().slice(0, 2000);
  const messages = [
    {
      role: "system",
      content:
        "You explain automations to their non-technical owner. Below is a JSON snapshot of this automation's current architecture (its nodes, links to other automations, use cases, and other declared entities). Write a clear, jargon-free explanation of WHAT it does and HOW it works. No code, no JSON keys or file names — plain prose a business owner can read quickly. If the owner asks below for a particular length, structure or emphasis, follow it; otherwise write a few short paragraphs.",
    },
    { role: "user", content: context },
    ...(shaping
      ? [{ role: "user", content: `How I want the answer written: ${shaping}` }]
      : []),
  ];

  let upstream: Response;
  try {
    upstream = await fetch(OPENAI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: "gpt-4o-mini", messages, temperature: 0.4 }),
    });
  } catch {
    return { ok: false, error: "Could not reach OpenAI" };
  }
  if (!upstream.ok) return { ok: false, error: `OpenAI ${upstream.status}` };

  const data = (await upstream.json().catch(() => null)) as
    | { choices?: { message?: { content?: string } }[] }
    | null;
  const text = data?.choices?.[0]?.message?.content?.trim();
  if (!text) return { ok: false, error: "OpenAI returned no text" };

  const result: HowItWorks = { text, updatedAt: new Date().toISOString() };
  await writeFile(join(projectDir, "_data", FILE), JSON.stringify(result, null, 2), "utf8");
  return { ok: true, result };
}
