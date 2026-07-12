import { readFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { db } from "@/lib/db";
import { createNodeId } from "@/lib/cuid";
import { listNodes, resolveProject } from "@/lib/nodes";
import { edgeByCuid, readEdgeFiles } from "@/lib/edges";
import { caseByCuid, listCases } from "@/lib/use-cases";

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
// STEP 231 — two more subjects, both about USER CASES of an automation that already exists:
//   • usecases → the owner walks the WHOLE set again (the pencil on the panel's header): the model asks about
//     each existing case in turn and takes any new ones he adds,
//   • usecase  → ONE case (the pencil on a case): the same brainstorm, scoped to it.
// Both end the same way a node does: the change becomes ONE development step per changed/added case.
export type QuizTarget =
  | { kind: "project"; key: string; automation: string; projectDir: string }
  | { kind: "edge"; key: string; cuid: string }
  | { kind: "usecases"; key: string; automation: string; projectDir: string }
  | { kind: "usecase"; key: string; cuid: string; automation: string; projectDir: string };

export const edgeQuizKey = (cuid: string) => `edge:${cuid}`;
export const useCaseQuizKey = (cuid: string) => `usecase:${cuid}`;
export const useCasesQuizKey = (automation: string) => `usecases:${automation}`;

/** The automation a target belongs to ("" for an edge, which belongs to none). */
export function targetAutomation(target: QuizTarget): string {
  return target.kind === "edge" ? "" : target.automation;
}

/** Resolve the subject of a request ({automation} | {edge} | {useCase} | {automation, cases:true}) into a
 *  target — used by every quiz route. */
export async function resolveQuizTarget(
  input: { automation?: unknown; edge?: unknown; useCase?: unknown; cases?: unknown },
): Promise<{ ok: true; target: QuizTarget } | { ok: false; error: string }> {
  const edge = String(input.edge ?? "").trim();
  if (edge) {
    const row = await edgeByCuid(edge);
    if (!row) return { ok: false, error: "edge not found" };
    return { ok: true, target: { kind: "edge", key: edgeQuizKey(edge), cuid: edge } };
  }

  const useCase = String(input.useCase ?? "").trim();
  if (useCase) {
    const row = await caseByCuid(useCase);
    if (!row) return { ok: false, error: "user case not found" };
    const p = resolveProject(row.automation);
    if (!p.ok) return { ok: false, error: p.error };
    return {
      ok: true,
      target: { kind: "usecase", key: useCaseQuizKey(useCase), cuid: useCase, automation: p.automation, projectDir: p.projectDir },
    };
  }

  const proj = resolveProject(String(input.automation ?? ""));
  if (!proj.ok) return { ok: false, error: proj.error };
  if (input.cases) {
    return {
      ok: true,
      target: { kind: "usecases", key: useCasesQuizKey(proj.automation), automation: proj.automation, projectDir: proj.projectDir },
    };
  }
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

/** The project's DEFAULT language — what the Quiz speaks and what the creation modal promises.
 *
 *  TWO KEYS, and they are NOT the same (the bug the owner caught: his default was Russian, the Quiz still
 *  announced English):
 *    • NEXT_PUBLIC_DEFAULT_LOCALE      — the language he CHOSE as default in the workspace settings,
 *    • NEXT_PUBLIC_SUPPORTED_LANGUAGES — the set of BUILT languages; its order is not a preference.
 *  The chosen default wins; the first supported language is only the fallback, English the last resort.
 *
 *  WHERE THEY LIVE (the step-212 class of bug, avoided here): the settings write both keys into the SLOT's
 *  .env.local (/opt/fractera/app/.env.local) — projects-app has no copy. Reading only our own env would
 *  leave the Quiz stuck in English no matter what the owner chose. So we read, in order: our env → our
 *  .env.local → THE SLOT's .env.local. */
function readEnvFrom(path: string, key: string): string {
  try {
    const f = readFileSync(path, "utf-8");
    return (f.match(new RegExp(`^${key}=(.+)$`, "m")) ?? [])[1]?.trim() ?? "";
  } catch { return ""; }
}

function readKey(key: string): string {
  return (
    (process.env[key] ?? "") ||
    readEnvFrom(join(process.cwd(), ".env.local"), key) ||
    readEnvFrom("/opt/fractera/app/.env.local", key)
  );
}

export function defaultLanguage(): string {
  const chosen = readKey("NEXT_PUBLIC_DEFAULT_LOCALE").toLowerCase();
  if (chosen) return chosen;
  const first = readKey("NEXT_PUBLIC_SUPPORTED_LANGUAGES").split(",").map((s) => s.trim()).filter(Boolean)[0];
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

/** Synthesize the current node (name + brief + estimated process time) from the brainstorm. The name+spec
 *  become the node's meta/spec.md; estMinutes → estDurationMs feeds the Processes timeline (step 230) — a
 *  rough guess, refined later against real execution. */
export async function synthesizeNode(quiz: QuizRow, instruction: string, turns: Turn[]): Promise<{ name: string; spec: string; estDurationMs: number }> {
  const transcript = turns.map((t) => `${t.role === "user" ? "OWNER" : "YOU"}: ${t.content}`).join("\n");
  const out = await chat([
    { role: "system", content: `You turn a design brainstorm into ONE node of an automation. Reply with STRICT JSON only:
{"name":"<a short English node name, 2-4 words>","spec":"<the brief for the coding agent, in ${languageName(quiz.language)}: what this node does, its input, its output, the rules>","estMinutes":<a rough guess of how many minutes this node's process takes to run, a positive number>}
The node name is an identifier shown on the diagram — always English. The spec is written in ${languageName(quiz.language)}. estMinutes is a hypothetical estimate (no precision needed).` },
    { role: "user", content: `The automation's instruction:\n${instruction}\n\nThe brainstorm for node #${quiz.node_count + 1}:\n${transcript || "(no questions were answered — infer the node from the instruction)"}` },
  ]);
  try {
    const j = JSON.parse(out.replace(/^```json\s*|\s*```$/g, "")) as { name?: string; spec?: string; estMinutes?: number };
    const mins = typeof j.estMinutes === "number" && j.estMinutes > 0 ? j.estMinutes : 1;
    return { name: (j.name ?? "New node").slice(0, 60), spec: (j.spec ?? "").trim() || "Not described.", estDurationMs: Math.round(mins * 60_000) };
  } catch {
    return { name: `Node ${quiz.node_count + 1}`, spec: out || "Not described.", estDurationMs: 60_000 };
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

// ─── PHASE 1 of a project: THE USER CASES (step 231) ─────────────────────────────────────────────────
// The owner's rule: an automation is NOT created from an instruction. Its birth starts with the SCENARIOS —
// everything that can happen to the user (or to the AI) while working with it. Only when they are described
// in enough detail does the Quiz move on to designing nodes. Skipping is refused, loudly.

export type QuizPhase = "usecases" | "nodes";

/** The FIRST thing the owner ever reads in the Quiz. Deterministic (no model call, no key needed) so the
 *  greeting can never fail or drift; translated for the languages we ship, and model-translated otherwise. */
const GREETING_EN =
  "Before we build this automation, describe its USER CASES — every scenario that can come up for you, or " +
  "for the AI, while working with it. Speak freely, in your own words: who does what, when, what comes in " +
  "and what should come out, and what happens when something goes wrong. There is no format to follow. " +
  "Voice dictation is recommended — it is the fastest way to get everything out.\n\n" +
  "When your description is detailed enough, I will turn it into numbered user cases, and only then will we " +
  "design the automation itself. Without this description the automation cannot be created.";

const GREETING_RU =
  "Прежде чем строить эту автоматизацию, опишите её ПОЛЬЗОВАТЕЛЬСКИЕ КЕЙСЫ — все сценарии, какие могут " +
  "встретиться у вас или у искусственного интеллекта при работе с ней. Говорите свободно, своими словами: " +
  "кто что делает и когда, что приходит на вход и что должно получиться на выходе, что происходит, когда " +
  "что-то идёт не так. Никакого формата соблюдать не нужно. Рекомендуется голосовой набор — так быстрее " +
  "всего выговорить всё целиком.\n\n" +
  "Когда описание станет достаточно подробным, я превращу его в пронумерованные пользовательские кейсы, и " +
  "только после этого мы займёмся самой автоматизацией. Без этого описания создать автоматизацию не получится.";

export async function useCasesGreeting(language: string): Promise<string> {
  const code = language.toLowerCase();
  if (code.startsWith("ru")) return GREETING_RU;
  if (code.startsWith("en")) return GREETING_EN;
  try {
    return await chat([
      { role: "system", content: `Translate the text into ${languageName(code)}. Keep the meaning, the tone and the paragraph break. Reply with the translation only.` },
      { role: "user", content: GREETING_EN },
    ]);
  } catch {
    return GREETING_EN; // the key may be missing — the owner still gets the instruction, in English
  }
}

const USECASES_SYSTEM = (lang: string, instruction: string) =>
  `You are helping an automation's owner describe its USER CASES — the scenarios the automation must handle.
This happens BEFORE any node of the automation is designed: nothing gets built until the scenarios are clear.

The owner's instruction (all you know so far):
"""
${instruction || "(not stated)"}
"""

WHAT A GOOD SET OF USER CASES CONTAINS
- who triggers the automation and how (a person, a schedule, an incoming message, another system),
- what data comes IN and what must come OUT,
- the normal path, and the variations the owner cares about,
- what should happen when something goes wrong or the input is unexpected.

RULES
- Ask ONE short question at a time. Ask only about SCENARIOS — never about code, nodes or implementation.
- The owner may speak in long, unstructured dictation. Accept it: your job is to fill the gaps, not to
  reformat what he said.
- When you have a detailed picture of the scenarios (enough to write them as separate cases), reply with
  exactly: READY
- Write EVERY message in this language: ${lang}. Never switch to another language.`;

/** The next question of the use-case interview (phase 1). READY = the description is detailed enough. */
export async function nextUseCaseQuestion(quiz: QuizRow, instruction: string, turns: Turn[]): Promise<string> {
  const history = turns.map((t) => ({ role: t.role === "user" ? "user" : "assistant", content: t.content }));
  return chat([
    { role: "system", content: USECASES_SYSTEM(languageName(quiz.language), instruction) },
    ...history,
    { role: "user", content: history.length <= 1
        ? "Ask your first question about the scenarios."
        : "Ask your next question, or if the scenarios are described in enough detail, reply with exactly: READY" },
  ]);
}

/** Turn the interview into NUMBERED user cases. Each case = one scenario, told from the user's side. */
export async function synthesizeUseCases(
  quiz: QuizRow, instruction: string, turns: Turn[],
): Promise<{ title: string; summary: string }[]> {
  const transcript = turns.map((t) => `${t.role === "user" ? "OWNER" : "YOU"}: ${t.content}`).join("\n");
  const out = await chat([
    { role: "system", content: `You turn a conversation about an automation into its USER CASES. Reply with STRICT JSON only:
{"cases":[{"title":"<a short case title, max 8 words, in ${languageName(quiz.language)}>","summary":"<the scenario in 1-4 sentences, in ${languageName(quiz.language)}: who does what, the input, the expected result, the edge case>"}]}
Write 1 to 8 cases. One case = ONE scenario — never merge two, never invent a scenario the owner did not
imply. If the owner described only one thing, return exactly one case.` },
    { role: "user", content: `The owner's instruction:\n${instruction || "(not stated)"}\n\nThe conversation:\n${transcript || "(the owner said nothing — derive the cases from the instruction alone)"}` },
  ]);
  try {
    const j = JSON.parse(out.replace(/^```json\s*|\s*```$/g, "")) as { cases?: { title?: string; summary?: string }[] };
    const cases = (j.cases ?? [])
      .map((c) => ({ title: (c.title ?? "").trim().slice(0, 200), summary: (c.summary ?? "").trim() }))
      .filter((c) => c.title);
    return cases;
  } catch {
    return [];
  }
}

/** The auto-quiz prompt of the use-case phase — the model drafts the scenarios itself, out loud. */
const USECASES_AUTO_SYSTEM = (lang: string, instruction: string) =>
  `You are describing the USER CASES of an automation ALONE, thinking out loud, in the language: ${lang}.

The owner's instruction (the seed):
"""
${instruction || "(not stated)"}
"""

Write the scenarios the automation must handle: who triggers it, what comes in, what must come out, the
variations, and what happens when something goes wrong. Be concrete and short (under 250 words). The owner is
reading you live and may edit your text — write it as the final description of the scenarios, not as a chat.
Write ONLY in ${lang}.`;

// ─── EDITING the cases of a LIVE automation (step 231) ───────────────────────────────────────────────
// The pencil on the panel's header re-opens the WHOLE set (the model asks about each case in turn and takes
// new ones); the pencil on a case re-opens THAT case. Both see what the automation already is — its
// instruction, its cases and its nodes — so the model asks about a change, not about a blank page.

async function caseEditContext(automation: string, projectDir: string, only?: string): Promise<string> {
  const instruction = await automationInstruction(projectDir);
  const cases = await listCases(automation);
  const nodes = await listNodes(automation);
  const caseList = cases.length
    ? cases
        .map((c, i) =>
          `  ${String(i + 1).padStart(2, "0")}. ${c.title} [${c.status}]${only && c.cuid === only ? "   <-- THE CASE WE ARE EDITING" : ""}\n      ${c.summary || "(no description)"}`,
        )
        .join("\n")
    : "  (none yet)";
  const nodeList = nodes.length
    ? nodes.map((n, i) => `  ${i + 1}. ${n.name}${n.draft ? " (still a draft)" : ""}`).join("\n")
    : "  (no nodes yet)";
  return [
    `AUTOMATION: ${automation}`,
    `THE OWNER'S ORIGINAL INSTRUCTION:\n${instruction || "(not stated)"}`,
    `ITS USER CASES TODAY:\n${caseList}`,
    `THE NODES THAT IMPLEMENT THEM TODAY:\n${nodeList}`,
  ].join("\n\n");
}

const CASE_EDIT_SYSTEM = (lang: string, ctx: string, single: boolean) =>
  `You are revisiting the USER CASES of an automation that already exists, together with its owner.

${ctx}

YOUR JOB
${single
    ? `- Go through THE ONE case marked above: is it still what the owner wants? What must change?`
    : `- Go through the existing cases ONE BY ONE, in order: for each, ask whether it is still right and what
   should change. When they are done, ask whether he wants to ADD a case that is missing.`}
- The owner may dictate long, unstructured answers. Accept them — your job is to end up with clear cases.

RULES
- Ask ONE short question at a time. Ask about SCENARIOS, never about code or which node to touch.
- When you have what you need, reply with exactly: READY
- Write EVERY message in this language: ${lang}. Never switch to another language.`;

/** The revision of a case (or of the whole set) into its new text. `cuid` names an EXISTING case; a case
 *  without one is NEW. Cases the owner did not touch must NOT be returned — silence means "unchanged". */
export async function synthesizeCaseEdit(
  quiz: QuizRow, seed: string, turns: Turn[], only?: string,
): Promise<{ cuid?: string; title: string; summary: string }[]> {
  const transcript = turns.map((t) => `${t.role === "user" ? "OWNER" : "YOU"}: ${t.content}`).join("\n");
  const out = await chat([
    { role: "system", content: `You turn a conversation about an automation's USER CASES into the cases that CHANGED. Reply with STRICT JSON only:
{"cases":[{"cuid":"<the cuid of an existing case, or omit the field for a NEW case>","title":"<short title in ${languageName(quiz.language)}>","summary":"<the scenario in 1-4 sentences, in ${languageName(quiz.language)}>"}]}
Return ONLY the cases that changed or were added${only ? ` (you are editing the case ${only} — usually exactly that one)` : ""}. If nothing changed, return {"cases":[]}. Never invent a scenario the owner did not state.` },
    { role: "user", content: `${seed}\n\nThe conversation:\n${transcript || "(the owner said nothing)"}` },
  ]);
  try {
    const j = JSON.parse(out.replace(/^```json\s*|\s*```$/g, "")) as { cases?: { cuid?: string; title?: string; summary?: string }[] };
    return (j.cases ?? [])
      .map((c) => ({ cuid: c.cuid?.trim() || undefined, title: (c.title ?? "").trim().slice(0, 200), summary: (c.summary ?? "").trim() }))
      .filter((c) => c.title);
  } catch {
    return [];
  }
}

/** The seed a session hangs on: a project's instruction, an edge's two-sided context, or (when the owner is
 *  revisiting the scenarios of a live automation) what that automation is today. */
export async function quizSeed(target: QuizTarget): Promise<string> {
  if (target.kind === "edge") return edgeContext(target.cuid);
  if (target.kind === "usecases") return caseEditContext(target.automation, target.projectDir);
  if (target.kind === "usecase") return caseEditContext(target.automation, target.projectDir, target.cuid);
  return automationInstruction(target.projectDir);
}

/** The next question — for every subject AND phase (the routes never branch on prompts themselves). */
export async function nextQuestionFor(quiz: QuizRow, target: QuizTarget, seed: string, turns: Turn[]): Promise<string> {
  if (target.kind === "project") {
    const phase = await getPhase(quiz, target);
    return phase === "usecases" ? nextUseCaseQuestion(quiz, seed, turns) : nextQuestion(quiz, seed, turns);
  }
  const history = turns.map((t) => ({ role: t.role === "user" ? "user" : "assistant", content: t.content }));
  if (target.kind === "usecases" || target.kind === "usecase") {
    return chat([
      { role: "system", content: CASE_EDIT_SYSTEM(languageName(quiz.language), seed, target.kind === "usecase") },
      ...history,
      { role: "user", content: history.length === 0
          ? "Start: ask me your first question."
          : "Ask your next question, or if you have what you need, reply with exactly: READY" },
    ]);
  }
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

/** The system prompt of the STREAMING auto-quiz (227.B) — the model brainstorms with itself, per subject and
 *  per phase (in the use-case phase it drafts the SCENARIOS, not a node). */
export async function autoSystemPrompt(quiz: QuizRow, target: QuizTarget, seed: string): Promise<string> {
  const lang = languageName(quiz.language);
  if (target.kind === "project" && (await getPhase(quiz, target)) === "usecases") {
    return USECASES_AUTO_SYSTEM(lang, seed);
  }
  if (target.kind === "usecases" || target.kind === "usecase") {
    return `You are revisiting the USER CASES of an existing automation ALONE, thinking out loud, in the language: ${lang}.

${seed}

Say, case by case, what should change and why, and name any scenario that is missing. Be concrete and short
(under 250 words). The owner is reading you live and may edit your text — write it as the final statement of
the scenarios, not as a chat. Write ONLY in ${lang}.`;
  }
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
  // The row KEY already carries the subject ("category/slug" for a project, "edge:<cuid>" for a link), so
  // the insert writes only the columns that exist on EVERY database. The subject/subject_ref columns are in
  // SCHEMA for fresh servers, but an already-running database is served by the data service — its tables are
  // created once and a CREATE TABLE IF NOT EXISTS never adds a column to them. Writing a column that an
  // existing DB does not have is what broke the Quiz (SqliteError: no column named subject). Never insert a
  // newly-added column into a table that already exists on live servers.
  await db.prepare(
    `INSERT INTO automation_quiz (id, automation, language) VALUES (?, ?, ?)`,
  ).run(id, target.key, defaultLanguage());
  return (await getQuizByKey(target.key)) as QuizRow;
}

export async function startQuiz(automation: string): Promise<QuizRow> {
  const proj = resolveProject(automation);
  if (!proj.ok) throw new Error(proj.error);
  return startQuizFor({ kind: "project", key: proj.automation, automation: proj.automation, projectDir: proj.projectDir });
}

// ─── phase state (step 231) ──────────────────────────────────────────────────────────────────────────
// Stored in its own table (automation_quiz_phase), never as a column on automation_quiz: a live database
// never gains a column (the "no column named subject" lesson, 225 G4). An EDGE has no use-case phase — a
// link is designed between automations that already have their scenarios.

/** The turn INDEX a phase writes to: the use-case interview lives at -1, node #N at N. Keeping them apart
 *  means the scenarios conversation never contaminates the node brainstorm (and survives the switch). */
export const USECASES_TURN_INDEX = -1;

export async function getPhase(quiz: QuizRow, target: QuizTarget): Promise<QuizPhase> {
  if (target.kind !== "project") return "nodes";
  const row = (await db.prepare(`SELECT phase FROM automation_quiz_phase WHERE quiz_id = ?`).get(quiz.id)) as
    | { phase: string }
    | undefined;
  if (row?.phase === "nodes" || row?.phase === "usecases") return row.phase;
  // No row: a quiz that predates this step. It is mid-node-design if it already produced nodes; otherwise it
  // has not really started, so it begins where every automation now begins — with the user cases.
  return quiz.node_count > 0 ? "nodes" : "usecases";
}

export async function setPhase(quiz: QuizRow, phase: QuizPhase): Promise<void> {
  await db.prepare(`DELETE FROM automation_quiz_phase WHERE quiz_id = ?`).run(quiz.id);
  await db.prepare(`INSERT INTO automation_quiz_phase (quiz_id, phase, updated_at) VALUES (?, ?, ?)`)
    .run(quiz.id, phase, new Date().toISOString());
}

const indexOfPhase = (quiz: QuizRow, phase: QuizPhase) =>
  phase === "usecases" ? USECASES_TURN_INDEX : quiz.node_count;

/** The turns of the CURRENT phase (use these in the routes — `turnsOf` is the node-phase primitive). */
export async function turnsFor(quiz: QuizRow, target: QuizTarget): Promise<Turn[]> {
  return turnsAt(quiz, indexOfPhase(quiz, await getPhase(quiz, target)));
}

export async function addTurnFor(
  quiz: QuizRow, target: QuizTarget, role: "assistant" | "user", content: string,
): Promise<void> {
  await addTurnAt(quiz, indexOfPhase(quiz, await getPhase(quiz, target)), role, content);
}

export async function turnsAt(quiz: QuizRow, index: number): Promise<Turn[]> {
  return (await db.prepare(
    `SELECT role, content, node_index FROM automation_quiz_turns WHERE quiz_id = ? AND node_index = ? ORDER BY created_at ASC`,
  ).all(quiz.id, index)) as Turn[];
}

export async function addTurnAt(
  quiz: QuizRow, index: number, role: "assistant" | "user", content: string,
): Promise<void> {
  await db.prepare(`INSERT INTO automation_quiz_turns (id, quiz_id, node_index, role, content) VALUES (?, ?, ?, ?, ?)`)
    .run(createNodeId(), quiz.id, index, role, content);
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

/** Re-open a finished session (step 225 G4): the owner ended the Quiz, then opened it again from the global
 *  canvas to design MORE nodes. Refused once the 10-node cap is reached — that cap is the context guard. */
export async function reopenQuiz(quiz: QuizRow): Promise<{ reopened: boolean; capped: boolean }> {
  if (quiz.node_count >= MAX_NODES) return { reopened: false, capped: true };
  await db.prepare(`UPDATE automation_quiz SET status = 'active', finished_at = NULL WHERE id = ?`).run(quiz.id);
  return { reopened: true, capped: false };
}

/** Drop a session entirely (step 231) — used by the use-case EDIT subjects: each pencil click is a fresh
 *  conversation about the scenarios as they are NOW, never a resumed old one. */
export async function deleteQuiz(quiz: QuizRow): Promise<void> {
  await db.prepare(`DELETE FROM automation_quiz_turns WHERE quiz_id = ?`).run(quiz.id);
  await db.prepare(`DELETE FROM automation_quiz_phase WHERE quiz_id = ?`).run(quiz.id);
  await db.prepare(`DELETE FROM automation_quiz WHERE id = ?`).run(quiz.id);
}

export async function finishQuiz(quiz: QuizRow): Promise<void> {
  await db.prepare(`UPDATE automation_quiz SET status = 'done', finished_at = ? WHERE id = ?`)
    .run(new Date().toISOString(), quiz.id);
}

export const QUIZ_MAX_NODES = MAX_NODES;
