import { readFile, writeFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { openAiKey } from "@/lib/quiz";

// THE "HOW IT WORKS" DESCRIPTION (step 237) — a plain-language explanation of a single automation, written
// BY THE AI from an analysis of the automation's own declared components (README, diagram, node
// instructions), NOT hand-authored. Stored as a flat JSON file in the automation's own _data/ folder (NOT a
// TS module — this route reads/writes it with plain fs, so no build/rebuild is involved on either side);
// the modal's GET reads it directly, same as any other /api/projects/* route (already dynamic, canon-safe).
// Regenerated on demand only — the owner clicks "Get answer from AI" in the modal, nothing runs automatically.

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

/** Every text component the project already declares about itself — the raw source, not a summary the
 *  model would have to trust second-hand. Node `functions.ts` bodies are deliberately excluded: the goal
 *  is a plain description for a non-technical owner, not a code review. */
async function gatherContext(projectDir: string): Promise<string> {
  const parts: string[] = [];
  const readIfExists = async (rel: string) => {
    const t = await readFile(join(projectDir, rel), "utf8").catch(() => "");
    if (t.trim()) parts.push(`--- ${rel} ---\n${t.trim()}`);
  };
  await readIfExists("README.md");
  await readIfExists("_data/description.ts");
  await readIfExists("_data/diagram.ts");
  const nodeDirs = await readdir(join(projectDir, "_nodes"), { withFileTypes: true }).catch(() => []);
  for (const d of nodeDirs) {
    if (!d.isDirectory()) continue;
    await readIfExists(`_nodes/${d.name}/meta.ts`);
    await readIfExists(`_nodes/${d.name}/instruction.ts`);
  }
  return parts.join("\n\n");
}

export async function generateHowItWorks(projectDir: string): Promise<{ ok: true; result: HowItWorks } | { ok: false; error: string }> {
  const key = openAiKey();
  if (!key) return { ok: false, error: "OPENAI_API_KEY is not set" };

  const context = await gatherContext(projectDir);
  if (!context.trim()) {
    return { ok: false, error: "Nothing declared about this automation yet — build it first." };
  }

  const messages = [
    {
      role: "system",
      content:
        "You explain automations to their non-technical owner. Given the automation's own README, diagram and node declarations below, write a short, clear, jargon-free explanation of WHAT it does and HOW it works, as a few short paragraphs. No headings, no bullet lists, no code, no file names — plain prose a business owner can read in under a minute.",
    },
    { role: "user", content: context },
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
