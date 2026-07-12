import { readFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { db } from "@/lib/db";
import { createNodeId } from "@/lib/cuid";

// ACTIVATION QUIZ (step 227) — phase 2 of an automation's birth. Phase 1 (step 224) captured the type and
// the owner's INSTRUCTION and left a bare page whose default nodes are drafts. On the first visit this Quiz
// opens and turns that instruction into real nodes through a brainstorm:
//
//   one quiz step = ONE NODE + ONE development sub-step (handed to the coding agent, step 224 L6).
//
// It runs in the project's DEFAULT LANGUAGE (English only when none is set — owner's rule), is capped at
// 10 nodes per development step (context-overflow guard), and every turn is stored so a reload resumes.

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const MAX_NODES = 10;

export type QuizRow = { id: string; automation: string; status: string; language: string; node_count: number };
export type Turn = { role: string; content: string; node_index: number };

/** The global OpenAI key (step 208) — env first, then the app's own .env.local (the 207.16 env quirk). */
export function openAiKey(): string {
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;
  try {
    const raw = readFileSync(join(process.cwd(), ".env.local"), "utf-8");
    return (raw.match(/^OPENAI_API_KEY=(.+)$/m) ?? [])[1]?.trim() ?? "";
  } catch { return ""; }
}

/** The project's DEFAULT language — the first of NEXT_PUBLIC_SUPPORTED_LANGUAGES. English only when unset. */
export function defaultLanguage(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SUPPORTED_LANGUAGES;
  const raw = fromEnv ?? (() => {
    try {
      const f = readFileSync(join(process.cwd(), ".env.local"), "utf-8");
      return (f.match(/^NEXT_PUBLIC_SUPPORTED_LANGUAGES=(.+)$/m) ?? [])[1] ?? "";
    } catch { return ""; }
  })();
  const first = raw.split(",").map((s) => s.trim()).filter(Boolean)[0];
  return first || "en";
}

async function chat(messages: { role: string; content: string }[], model = "gpt-4o-mini"): Promise<string> {
  const key = openAiKey();
  if (!key) throw new Error("OPENAI_API_KEY is not set — add it in the workspace settings.");
  const r = await fetch(OPENAI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, messages, temperature: 0.4 }),
  });
  if (!r.ok) throw new Error(`OpenAI ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const d = (await r.json()) as { choices?: { message?: { content?: string } }[] };
  return d.choices?.[0]?.message?.content?.trim() ?? "";
}

/** The automation's seed: the owner's instruction from phase 1 (_data/instruction.md). */
export async function automationInstruction(projectDir: string): Promise<string> {
  return (await readFile(join(projectDir, "_data", "instruction.md"), "utf8").catch(() => "")).trim();
}

const SYSTEM = (lang: string, instruction: string, index: number) =>
  `You are designing an automation with its owner, one NODE at a time.

The owner's instruction (the seed of the whole automation):
"""
${instruction || "(not stated)"}
"""

You are now designing NODE #${index + 1}. A node is a typed container of deterministic functions: it takes
typed input, does one clear part of the work, and returns typed output. The first node is usually how the
work ARRIVES (the trigger/input), the middle nodes do the work, the last one delivers the result.

RULES
- Ask ONE short question at a time, and only what you still need to design THIS node.
- Ask at most 4 questions per node; the moment you understand this node, say so instead of asking more.
- Never ask about code or implementation details — ask about the owner's intent and the data.
- Write EVERY message in this language: ${lang}. Never switch to another language.`;

/** Ask the next question of the brainstorm for the current node. */
export async function nextQuestion(quiz: QuizRow, instruction: string, turns: Turn[]): Promise<string> {
  const history = turns.map((t) => ({ role: t.role === "user" ? "user" : "assistant", content: t.content }));
  const messages = [
    { role: "system", content: SYSTEM(quiz.language, instruction, quiz.node_count) },
    ...history,
    { role: "user", content: history.length === 0
        ? "Ask me your first question about this node."
        : "Ask your next question, or if you already understand this node, reply with exactly: READY" },
  ];
  return chat(messages);
}

/** Synthesize the current node (name + brief) from the brainstorm — this is what becomes the node's spec.md. */
export async function synthesizeNode(quiz: QuizRow, instruction: string, turns: Turn[]): Promise<{ name: string; spec: string }> {
  const transcript = turns.map((t) => `${t.role === "user" ? "OWNER" : "YOU"}: ${t.content}`).join("\n");
  const out = await chat([
    { role: "system", content: `You turn a design brainstorm into ONE node of an automation. Reply with STRICT JSON only:
{"name":"<a short English node name, 2-4 words>","spec":"<the brief for the coding agent, in ${quiz.language}: what this node does, its input, its output, the rules>"}
The node name is an identifier shown on the diagram — always English. The spec is written in ${quiz.language}.` },
    { role: "user", content: `The automation's instruction:\n${instruction}\n\nThe brainstorm for node #${quiz.node_count + 1}:\n${transcript || "(no questions were answered — infer the node from the instruction)"}` },
  ]);
  try {
    const j = JSON.parse(out.replace(/^```json\s*|\s*```$/g, "")) as { name?: string; spec?: string };
    return { name: (j.name ?? "New node").slice(0, 60), spec: (j.spec ?? "").trim() || "Not described." };
  } catch {
    return { name: `Node ${quiz.node_count + 1}`, spec: out || "Not described." };
  }
}

// ─── state ───────────────────────────────────────────────────────────────────────────────────────────

export async function getQuiz(automation: string): Promise<QuizRow | undefined> {
  return (await db.prepare(`SELECT * FROM automation_quiz WHERE automation = ?`).get(automation)) as QuizRow | undefined;
}

export async function startQuiz(automation: string): Promise<QuizRow> {
  const existing = await getQuiz(automation);
  if (existing) return existing;
  const id = createNodeId();
  await db.prepare(`INSERT INTO automation_quiz (id, automation, language) VALUES (?, ?, ?)`)
    .run(id, automation, defaultLanguage());
  return (await getQuiz(automation)) as QuizRow;
}

export async function turnsOf(quiz: QuizRow): Promise<Turn[]> {
  return (await db.prepare(
    `SELECT role, content, node_index FROM automation_quiz_turns WHERE quiz_id = ? AND node_index = ? ORDER BY created_at ASC`,
  ).all(quiz.id, quiz.node_count)) as Turn[];
}

export async function addTurn(quiz: QuizRow, role: "assistant" | "user", content: string): Promise<void> {
  await db.prepare(`INSERT INTO automation_quiz_turns (id, quiz_id, node_index, role, content) VALUES (?, ?, ?, ?, ?)`)
    .run(createNodeId(), quiz.id, quiz.node_count, role, content);
}

/** Advance to the next node (after one has been materialized as a draft + a dev step). Caps at 10. */
export async function advanceNode(quiz: QuizRow): Promise<{ done: boolean; nodeCount: number }> {
  const nodeCount = quiz.node_count + 1;
  const done = nodeCount >= MAX_NODES;
  await db.prepare(
    `UPDATE automation_quiz SET node_count = ?, status = ?, finished_at = ? WHERE id = ?`,
  ).run(nodeCount, done ? "done" : "active", done ? new Date().toISOString() : null, quiz.id);
  return { done, nodeCount };
}

export async function finishQuiz(quiz: QuizRow): Promise<void> {
  await db.prepare(`UPDATE automation_quiz SET status = 'done', finished_at = ? WHERE id = ?`)
    .run(new Date().toISOString(), quiz.id);
}

export const QUIZ_MAX_NODES = MAX_NODES;
