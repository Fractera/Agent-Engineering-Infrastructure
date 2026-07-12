import { readFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { db } from "@/lib/db";
import { createNodeId } from "@/lib/cuid";
import { listNodes, resolveProject } from "@/lib/nodes";
import { edgeByCuid, readEdgeFiles } from "@/lib/edges";

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

export type QuizRow = {
  id: string; automation: string; status: string; language: string; node_count: number;
  subject?: string; subject_ref?: string | null;
};
export type Turn = { role: string; content: string; node_index: number };

// STEP 225 G4 — the Quiz has a SUBJECT. It is the same brainstorm, the same language, the same streaming
// auto-mode and the same "one session → one artefact + one development step" contract; only WHAT it designs
// differs:
//   • project → the nodes of an automation (step 227, unchanged),
//   • edge    → HOW two automations are linked (which output feeds which input, under what conditions).
// The row key is the single `automation` column: "category/slug" for a project, "edge:<cuid>" for an edge.
export type QuizTarget =
  | { kind: "project"; key: string; automation: string; projectDir: string }
  | { kind: "edge"; key: string; cuid: string };

export const edgeQuizKey = (cuid: string) => `edge:${cuid}`;

/** Resolve the subject of a request ({automation} | {edge}) into a target — used by every quiz route. */
export async function resolveQuizTarget(
  input: { automation?: unknown; edge?: unknown },
): Promise<{ ok: true; target: QuizTarget } | { ok: false; error: string }> {
  const edge = String(input.edge ?? "").trim();
  if (edge) {
    const row = await edgeByCuid(edge);
    if (!row) return { ok: false, error: "edge not found" };
    return { ok: true, target: { kind: "edge", key: edgeQuizKey(edge), cuid: edge } };
  }
  const proj = resolveProject(String(input.automation ?? ""));
  if (!proj.ok) return { ok: false, error: proj.error };
  return {
    ok: true,
    target: { kind: "project", key: proj.automation, automation: proj.automation, projectDir: proj.projectDir },
  };
}

/** The global OpenAI key (step 208) — env first, then the app's own .env.local (the 207.16 env quirk). */
export function openAiKey(): string {
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;
  try {
    const raw = readFileSync(join(process.cwd(), ".env.local"), "utf-8");
    return (raw.match(/^OPENAI_API_KEY=(.+)$/m) ?? [])[1]?.trim() ?? "";
  } catch { return ""; }
}

// The language the Quiz SPEAKS. The model is told the language by NAME, not by code ("Russian (русский)",
// not "ru") — a bare code is fragile. The creation modal shows this name to the owner up front, so the
// language is never a surprise (owner's requirement).
const LANGUAGE_NAMES: Record<string, string> = {
  en: "English", ru: "Russian (русский)", es: "Spanish (español)", de: "German (Deutsch)",
  fr: "French (français)", it: "Italian (italiano)", pt: "Portuguese (português)", pl: "Polish (polski)",
  uk: "Ukrainian (українська)", tr: "Turkish (Türkçe)", ar: "Arabic (العربية)", zh: "Chinese (中文)",
  ja: "Japanese (日本語)", ko: "Korean (한국어)", hi: "Hindi (हिन्दी)", nl: "Dutch (Nederlands)",
};

/** The human name of a language code — what the model is told and what the owner is shown. */
export function languageName(code: string): string {
  return LANGUAGE_NAMES[code.toLowerCase()] ?? code;
}

/** The project's DEFAULT language — the FIRST of NEXT_PUBLIC_SUPPORTED_LANGUAGES. English only when none
 *  is set anywhere.
 *
 *  WHERE IT LIVES (the step-212 class of bug, avoided here): the owner sets the languages in the workspace
 *  settings, which write them into the SLOT's .env.local (/opt/fractera/app/.env.local) — projects-app has
 *  no copy of that key. Reading only our own env would leave the Quiz stuck in English no matter what the
 *  owner chose. So we read, in order: our env → our .env.local → THE SLOT's .env.local. */
function readLanguagesFrom(path: string): string {
  try {
    const f = readFileSync(path, "utf-8");
    return (f.match(/^NEXT_PUBLIC_SUPPORTED_LANGUAGES=(.+)$/m) ?? [])[1] ?? "";
  } catch { return ""; }
}

export function defaultLanguage(): string {
  const raw =
    process.env.NEXT_PUBLIC_SUPPORTED_LANGUAGES ||
    readLanguagesFrom(join(process.cwd(), ".env.local")) ||
    readLanguagesFrom("/opt/fractera/app/.env.local");
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
    { role: "system", content: SYSTEM(languageName(quiz.language), instruction, quiz.node_count) },
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
{"name":"<a short English node name, 2-4 words>","spec":"<the brief for the coding agent, in ${languageName(quiz.language)}: what this node does, its input, its output, the rules>"}
The node name is an identifier shown on the diagram — always English. The spec is written in ${languageName(quiz.language)}.` },
    { role: "user", content: `The automation's instruction:\n${instruction}\n\nThe brainstorm for node #${quiz.node_count + 1}:\n${transcript || "(no questions were answered — infer the node from the instruction)"}` },
  ]);
  try {
    const j = JSON.parse(out.replace(/^```json\s*|\s*```$/g, "")) as { name?: string; spec?: string };
    return { name: (j.name ?? "New node").slice(0, 60), spec: (j.spec ?? "").trim() || "Not described." };
  } catch {
    return { name: `Node ${quiz.node_count + 1}`, spec: out || "Not described." };
  }
}

// ─── EDGE subject (step 225 G4) ──────────────────────────────────────────────────────────────────────
// The edge brainstorm needs to SEE both sides: the two automations, every node they own (the model must be
// able to name the exact output node and the exact input node), and the link's current brief. That context
// is the edge's equivalent of a project's instruction.md — the seed the whole session hangs on.

export async function edgeContext(cuid: string): Promise<string> {
  const edge = await edgeByCuid(cuid);
  if (!edge) return "";
  const files = await readEdgeFiles(cuid);
  const side = async (automation: string, role: string) => {
    const nodes = await listNodes(automation);
    const list = nodes.length
      ? nodes
          .map((n, i) => `  ${i + 1}. ${n.name} (slug: ${n.slug}, cuid: ${n.cuid})${n.draft ? " — still a draft" : ""}`)
          .join("\n")
      : "  (no nodes yet)";
    return `${role} AUTOMATION: ${automation}\nits nodes:\n${list}`;
  };
  return [
    `LINK: ${edge.name}`,
    await side(edge.from_automation, "SOURCE"),
    await side(edge.to_automation, "TARGET"),
    `THE LINK'S CURRENT BRIEF (spec.md):\n${files.spec.trim() || "(empty — nothing described yet)"}`,
  ].join("\n\n");
}

const EDGE_SYSTEM = (lang: string, ctx: string) =>
  `You are designing, with its owner, a LINK between two automations — a programmable integration that lives
between them (it belongs to neither).

${ctx || "(no context)"}

WHAT THE LINK MUST END UP SAYING
- WHICH OUTPUT of WHICH node of the source automation feeds WHICH INPUT of WHICH node of the target one
  (name the nodes — you have their list above),
- UNDER WHAT CONDITIONS it fires (every record? only some? on a schedule? on an event?),
- HOW the two stay IN SYNC (what happens on failure, on a repeat, on a change of the source record).

RULES
- Ask ONE short question at a time, and only what you still need to design THIS link.
- Ask at most 5 questions; the moment you understand the link, say so instead of asking more.
- Never ask about code — ask about the owner's intent and the data crossing the link.
- Write EVERY message in this language: ${lang}. Never switch to another language.`;

/** The seed a session hangs on: a project's instruction, or an edge's two-sided context. */
export async function quizSeed(target: QuizTarget): Promise<string> {
  return target.kind === "project" ? automationInstruction(target.projectDir) : edgeContext(target.cuid);
}

/** The next question — for either subject (the routes never branch on prompts themselves). */
export async function nextQuestionFor(quiz: QuizRow, target: QuizTarget, seed: string, turns: Turn[]): Promise<string> {
  if (target.kind === "project") return nextQuestion(quiz, seed, turns);
  const history = turns.map((t) => ({ role: t.role === "user" ? "user" : "assistant", content: t.content }));
  return chat([
    { role: "system", content: EDGE_SYSTEM(languageName(quiz.language), seed) },
    ...history,
    { role: "user", content: history.length === 0
        ? "Ask me your first question about this link."
        : "Ask your next question, or if you already understand this link, reply with exactly: READY" },
  ]);
}

/** Synthesize the LINK from the brainstorm — this is what becomes the edge's spec.md and its dev step. */
export async function synthesizeEdge(quiz: QuizRow, seed: string, turns: Turn[]): Promise<{ name: string; spec: string }> {
  const transcript = turns.map((t) => `${t.role === "user" ? "OWNER" : "YOU"}: ${t.content}`).join("\n");
  const out = await chat([
    { role: "system", content: `You turn a design brainstorm into the BRIEF of ONE link between two automations. Reply with STRICT JSON only:
{"name":"<a short English link name, 2-5 words>","spec":"<the brief for the coding agent, in ${languageName(quiz.language)}: which output of which source node feeds which input of which target node, the conditions, the sync/failure rules>"}
The link name is shown on the global canvas — always English. The spec is written in ${languageName(quiz.language)}.` },
    { role: "user", content: `The link's context:\n${seed}\n\nThe brainstorm:\n${transcript || "(no questions were answered — infer the link from the context)"}` },
  ]);
  try {
    const j = JSON.parse(out.replace(/^```json\s*|\s*```$/g, "")) as { name?: string; spec?: string };
    return { name: (j.name ?? "").slice(0, 60).trim(), spec: (j.spec ?? "").trim() || "Not described." };
  } catch {
    return { name: "", spec: out || "Not described." };
  }
}

/** The system prompt of the STREAMING auto-quiz (227.B) — the model brainstorms with itself, per subject. */
export function autoSystemPrompt(quiz: QuizRow, target: QuizTarget, seed: string): string {
  const lang = languageName(quiz.language);
  if (target.kind === "edge") {
    return `You are designing a LINK between two automations ALONE, thinking out loud, in the language: ${lang}.

${seed || "(no context)"}

Run the brainstorm YOURSELF: ask the questions you would have asked the owner and answer them from the
context above, using reasonable defaults where it is silent. Be concrete and short (under 200 words). End
with a clear statement of WHICH output of WHICH source node feeds WHICH input of WHICH target node, under
what conditions, and how they stay in sync. Write ONLY in ${lang}. The owner is reading you live and may
edit your text — so write it as the final brief, not as a chat.`;
  }
  return `You are designing an automation ALONE, thinking out loud, in the language: ${lang}.

The owner's instruction (the seed):
"""
${seed || "(not stated)"}
"""

You are designing NODE #${quiz.node_count + 1}. Run the brainstorm YOURSELF: ask the questions you would
have asked the owner and answer them from the instruction, using reasonable defaults where it is silent.
Be concrete and short (under 200 words). End with a clear statement of what this node does, what it takes
in, and what it returns. Write ONLY in ${lang}. The owner is reading you live and may edit your
text — so write it as the final brief, not as a chat.`;
}

// ─── state ───────────────────────────────────────────────────────────────────────────────────────────

/** By the row key ("category/slug" for a project, "edge:<cuid>" for an edge). */
export async function getQuizByKey(key: string): Promise<QuizRow | undefined> {
  return (await db.prepare(`SELECT * FROM automation_quiz WHERE automation = ?`).get(key)) as QuizRow | undefined;
}

export async function getQuiz(automation: string): Promise<QuizRow | undefined> {
  return getQuizByKey(automation);
}

export async function getQuizFor(target: QuizTarget): Promise<QuizRow | undefined> {
  return getQuizByKey(target.key);
}

export async function startQuizFor(target: QuizTarget): Promise<QuizRow> {
  const existing = await getQuizByKey(target.key);
  if (existing) return existing;
  const id = createNodeId();
  await db.prepare(
    `INSERT INTO automation_quiz (id, automation, subject, subject_ref, language) VALUES (?, ?, ?, ?, ?)`,
  ).run(
    id, target.key, target.kind, target.kind === "edge" ? target.cuid : null, defaultLanguage(),
  );
  return (await getQuizByKey(target.key)) as QuizRow;
}

export async function startQuiz(automation: string): Promise<QuizRow> {
  const proj = resolveProject(automation);
  if (!proj.ok) throw new Error(proj.error);
  return startQuizFor({ kind: "project", key: proj.automation, automation: proj.automation, projectDir: proj.projectDir });
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
