import { readFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { db } from "@/lib/db";
import { createNodeId } from "@/lib/cuid";
import { listNodes, resolveProject } from "@/lib/nodes";
import { edgeByCuid, readEdgeFiles } from "@/lib/edges";
import { caseByCuid, listCases, reviewState } from "@/lib/use-cases";
import { getTransport, type EntityType } from "@/lib/entity-store";
// Aliased: this file already has its OWN local `UI_LANGS` (six languages, the Quiz-prompt system below,
// step 232.1) — a different, older, unrelated concept. This import is the TEN admin-layer languages
// (step 234.1/234.2, CLAUDE.md 4г), used only by translateCategoryCopy() further down.
import { UI_LANGS as TEN_UI_LANGS } from "@/app/(projects)/projects/_shared/ui-langs";

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
// STEP 239 — one more subject: an ENTITY of an automation (dashboard / analytics / calendar / map /
// processes / fork-activation). The owner presses "Add with AI" on that entity's Requirement panel and the
// SAME brainstorm helps him articulate WHAT that component should do; its closing move writes the result into
// the entity's transport container (never a second store, never a dev step — dispatch is a separate action,
// the page-level wave in step 240). `entityType` is the EntityType string; the row key is
// "entity:<automation>:<entityType>".
export type QuizTarget =
  | { kind: "project"; key: string; automation: string; projectDir: string }
  | { kind: "edge"; key: string; cuid: string }
  | { kind: "usecases"; key: string; automation: string; projectDir: string }
  | { kind: "usecase"; key: string; cuid: string; automation: string; projectDir: string }
  | { kind: "entity"; key: string; automation: string; projectDir: string; entityType: string }
  // STEP 242 — a PUBLIC application page: the owner brainstorms what EXTERNAL users see/do on a page they
  // declared in the application layer (slot app/). `pageRel` is the filesystem rel of the page folder; the
  // brainstorm becomes a TO-DO LIST written into that page's README (page-apply), not an entity brief.
  | { kind: "page"; key: string; automation: string; projectDir: string; pageRel: string };

export const edgeQuizKey = (cuid: string) => `edge:${cuid}`;
export const useCaseQuizKey = (cuid: string) => `usecase:${cuid}`;
export const useCasesQuizKey = (automation: string) => `usecases:${automation}`;
export const entityQuizKey = (automation: string, entityType: string) => `entity:${automation}:${entityType}`;
export const pageQuizKey = (automation: string, rel: string) => `page:${automation}:${rel}`;

/** The automation a target belongs to ("" for an edge, which belongs to none). */
export function targetAutomation(target: QuizTarget): string {
  return target.kind === "edge" ? "" : target.automation;
}

/** Resolve the subject of a request ({automation} | {edge} | {useCase} | {automation, cases:true}) into a
 *  target — used by every quiz route. */
export async function resolveQuizTarget(
  input: { automation?: unknown; edge?: unknown; useCase?: unknown; cases?: unknown; entity?: unknown; page?: unknown },
): Promise<{ ok: true; target: QuizTarget } | { ok: false; error: string }> {
  const edge = String(input.edge ?? "").trim();
  if (edge) {
    const row = await edgeByCuid(edge);
    if (!row) return { ok: false, error: "edge not found" };
    return { ok: true, target: { kind: "edge", key: edgeQuizKey(edge), cuid: edge } };
  }

  // STEP 239 — an entity subject: {entity: "<entityType>", automation}. Resolved before the plain project
  // fallback (which is the no-subject default).
  const entity = String(input.entity ?? "").trim();
  if (entity) {
    const p = resolveProject(String(input.automation ?? ""));
    if (!p.ok) return { ok: false, error: p.error };
    return {
      ok: true,
      target: { kind: "entity", key: entityQuizKey(p.automation, entity), automation: p.automation, projectDir: p.projectDir, entityType: entity },
    };
  }

  // STEP 242 — a public application page: {page: "<rel>", automation}. Resolved before the project fallback,
  // like the entity subject above.
  const page = String(input.page ?? "").trim();
  if (page) {
    const p = resolveProject(String(input.automation ?? ""));
    if (!p.ok) return { ok: false, error: p.error };
    return {
      ok: true,
      target: { kind: "page", key: pageQuizKey(p.automation, page), automation: p.automation, projectDir: p.projectDir, pageRel: page },
    };
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

async function chat(
  messages: { role: string; content: string }[],
  model = "gpt-4o-mini",
  opts?: { json?: boolean },
): Promise<string> {
  const key = openAiKey();
  if (!key) throw new Error("OPENAI_API_KEY is not set — add it in the workspace settings.");
  const r = await fetch(OPENAI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model, messages, temperature: 0.4,
      ...(opts?.json ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  if (!r.ok) throw new Error(`OpenAI ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const d = (await r.json()) as { choices?: { message?: { content?: string } }[] };
  return d.choices?.[0]?.message?.content?.trim() ?? "";
}

// CATEGORY TITLE/DESCRIPTION TRANSLATION (step 234.1) — the ONLY runtime LLM-translation call in this
// codebase: everywhere else UI chrome is a hand-authored static dictionary (rule 4г), because a category's
// title/description is arbitrary OWNER-TYPED content, unknowable in advance. One JSON-mode call returns all
// ten languages at once; `null` means "translation failed" for any reason (missing key thrown earlier by
// `chat()`, non-2xx from OpenAI, malformed/partial JSON) — the caller does not need to know WHY, only THAT,
// per the owner's call: a single "check your key and balance" message covers every failure mode.
export async function translateCategoryCopy(
  title: string,
  description: string,
): Promise<Record<string, { title: string; description: string }> | null> {
  const codes = TEN_UI_LANGS.join(", ");
  try {
    const raw = await chat(
      [
        {
          role: "system",
          content:
            `Translate a short product-category title and description into all of these language codes: ` +
            `${codes}. Return ONLY a JSON object whose keys are EXACTLY these codes, each value ` +
            `{"title": "...", "description": "..."}. Preserve the original wording verbatim in whichever ` +
            `language you detect it to be written in (its own code's slot); translate naturally, concisely, ` +
            `as UI copy (not literally word-for-word) into the other nine. No extra keys, no commentary.`,
        },
        { role: "user", content: JSON.stringify({ title, description }) },
      ],
      "gpt-4o-mini",
      { json: true },
    );
    const parsed = JSON.parse(raw) as Record<string, { title?: string; description?: string }>;
    const out: Record<string, { title: string; description: string }> = {};
    for (const code of TEN_UI_LANGS) {
      const t = parsed[code]?.title?.trim();
      const d = parsed[code]?.description?.trim();
      if (!t || !d) return null; // partial result — treat as a full failure, never write half a translation
      out[code] = { title: t, description: d };
    }
    return out;
  } catch {
    return null;
  }
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

// ─── ENTITY subject (step 239) ─────────────────────────────────────────────────────────────────────────
// The brainstorm for one accordion entity of an automation (dashboard / analytics / calendar / map /
// processes / fork-activation). It needs to SEE what the automation IS (so the requirement fits the real
// automation) and what this entity already asks for (the current transport brief). The result is plain
// requirement TEXT — WHAT this component must do — that the owner then dispatches with the rest in the wave.

const ENTITY_LABELS: Record<string, string> = {
  dashboard: "Dashboard (a data view — tables/metrics of what the automation produces)",
  analytics: "Analytics (charts/insights over the automation's data)",
  calendar: "Calendar (a time view of the automation's events/schedule)",
  map: "Map (a geographic view of the automation's data)",
  processes: "Processes (the timeline of the automation's runs/forks)",
  "fork-activation": "Fork activation (how a run of this INSTANCED automation is started: which start settings it takes, how a fork is created and passed those settings, and how its launch is scheduled)",
};

export async function entityContext(automation: string, projectDir: string, entityType: string): Promise<string> {
  const instruction = await automationInstruction(projectDir);
  const descSrc = await readFile(join(projectDir, "_data", "description.ts"), "utf8").catch(() => "");
  const title = (descSrc.match(/title:\s*("(?:[^"\\]|\\.)*")/) ?? [])[1];
  let name = automation;
  try { if (title) name = JSON.parse(title) as string; } catch { /* keep slug */ }
  const current = await getTransport(automation, entityType as EntityType, "").catch(() => null);
  const brief = (current?.payload as { brief?: string } | undefined)?.brief?.trim() ?? "";
  return [
    `AUTOMATION: ${name} (${automation})`,
    `WHAT IT DOES (the owner's instruction):\n${instruction || "(not stated)"}`,
    `THE ENTITY YOU ARE DESIGNING: ${ENTITY_LABELS[entityType] ?? entityType}`,
    `THIS ENTITY'S CURRENT REQUIREMENT:\n${brief || "(empty — nothing described yet)"}`,
  ].join("\n\n");
}

const ENTITY_SYSTEM = (lang: string, ctx: string) =>
  `You are helping the owner describe, in plain words, a REQUIREMENT for ONE part of their automation — the
entity named below. You are NOT writing code and NOT choosing a component: you help the owner say clearly
WHAT this part must show or do, so a coding agent can build it later.

${ctx || "(no context)"}

RULES
- Ask ONE short question at a time, and only what you still need to understand THIS entity's requirement.
- Ask at most 4 questions; the moment the requirement is clear, say so instead of asking more.
- Never ask about code, frameworks or components — ask what the owner wants to see and why.
- Write EVERY message in this language: ${lang}. Never switch to another language.`;

// STEP 242 — the PUBLIC APPLICATION PAGE subject. Same shape as entityContext (name + instruction), but the
// subject is a page EXTERNAL users will use, addressed by its filesystem rel under the slot app/.
export async function pageContext(automation: string, projectDir: string, rel: string): Promise<string> {
  const instruction = await automationInstruction(projectDir);
  const descSrc = await readFile(join(projectDir, "_data", "description.ts"), "utf8").catch(() => "");
  const title = (descSrc.match(/title:\s*("(?:[^"\\]|\\.)*")/) ?? [])[1];
  let name = automation;
  try { if (title) name = JSON.parse(title) as string; } catch { /* keep slug */ }
  return [
    `AUTOMATION: ${name} (${automation})`,
    `WHAT IT DOES (the owner's instruction):\n${instruction || "(not stated)"}`,
    `THE PUBLIC PAGE YOU ARE DESIGNING: app/${rel} — used by EXTERNAL users of this automation (not just the owner).`,
  ].join("\n\n");
}

const PAGE_SYSTEM = (lang: string, ctx: string) =>
  `You are helping the owner describe a PUBLIC PAGE of their application — a page EXTERNAL users (not just the
owner) will use: a registration page, a public interface, a landing page. You are NOT writing code and NOT
choosing a component: you help the owner say clearly WHAT a visitor sees, enters and gets on this page, so a
coding agent can build it later.

${ctx || "(no context)"}

RULES
- Ask ONE short question at a time, only what you still need to understand THIS page.
- Ask at most 4 questions; the moment the page is clear, say so instead of asking more.
- Never ask about code, frameworks or components — ask what the visitor sees, does and receives.
- Write EVERY message in this language: ${lang}. Never switch to another language.`;

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

// THE PROMPTS THE OWNER READS (step 232.1, extended to ten languages step 237.2, owner's rule): the ten
// languages we ship — English, Spanish, French, Italian, Russian, German, Portuguese, Polish, Turkish,
// Dutch — CARRY their translations here. Any other language falls back to English. Deterministic on
// purpose: no model call, no API key, nothing to drift — a greeting that failed to translate would leave
// the owner staring at a blank first turn.
const UI_LANGS = ["en", "es", "fr", "it", "ru", "de", "pt", "pl", "tr", "nl"] as const;
type UiLang = (typeof UI_LANGS)[number];

type PromptKey = "greeting" | "describeFirst" | "tooThin" | "noCases" | "notReviewed";

const PROMPTS: Record<UiLang, Record<PromptKey, string>> = {
  en: {
    greeting:
      "Before we build this automation, describe its USER CASES — every scenario that can come up for you, or for the AI, while working with it. Speak freely, in your own words: who does what, when, what comes in and what should come out, and what happens when something goes wrong. There is no format to follow. Voice dictation is recommended — it is the fastest way to get everything out.\n\nWhen your description is detailed enough, I will turn it into numbered user cases, and only then will we design the automation itself. Without this description the automation cannot be created.",
    describeFirst:
      "Describe the scenarios first — without a detailed description the automation cannot be created. Tell me who uses it, what comes in, what must come out, and what happens when something goes wrong.",
    tooThin:
      "I could not turn this into a single user case yet — the description is still too thin. Say more about the scenarios: who triggers the automation, what it receives, and what it must produce.",
    noCases:
      "This automation has no user cases yet. Describe the scenarios first (the Quiz collects them) — without a detailed description the automation cannot be built.",
    notReviewed:
      "Read the user cases and confirm them before development starts — this is where you and the AI agree that it understood you. Open the Use cases panel and press \"I read them\".",
  },
  ru: {
    greeting:
      "Прежде чем строить эту автоматизацию, опишите её ПОЛЬЗОВАТЕЛЬСКИЕ КЕЙСЫ — все сценарии, какие могут встретиться у вас или у искусственного интеллекта при работе с ней. Говорите свободно, своими словами: кто что делает и когда, что приходит на вход и что должно получиться на выходе, что происходит, когда что-то идёт не так. Никакого формата соблюдать не нужно. Рекомендуется голосовой набор — так быстрее всего выговорить всё целиком.\n\nКогда описание станет достаточно подробным, я превращу его в пронумерованные пользовательские кейсы, и только после этого мы займёмся самой автоматизацией. Без этого описания создать автоматизацию не получится.",
    describeFirst:
      "Сначала опишите сценарии — без подробного описания автоматизацию создать не получится. Расскажите, кто ею пользуется, что приходит на вход, что должно получиться на выходе и что происходит, когда что-то идёт не так.",
    tooThin:
      "Пока из этого не получается ни одного пользовательского кейса — описание слишком общее. Расскажите подробнее: кто запускает автоматизацию, что она получает и что должна выдать.",
    noCases:
      "У этой автоматизации ещё нет пользовательских кейсов. Сначала опишите сценарии (их собирает Quiz) — без подробного описания автоматизацию не построить.",
    notReviewed:
      "Прочитайте пользовательские кейсы и подтвердите их — здесь вы и ИИ договариваетесь, что он понял вас правильно. Откройте панель «User cases» и нажмите «Я прочитал».",
  },
  es: {
    greeting:
      "Antes de construir esta automatización, describe sus CASOS DE USO: todos los escenarios que pueden surgirte a ti, o a la IA, al trabajar con ella. Habla con libertad, con tus palabras: quién hace qué y cuándo, qué entra y qué debe salir, y qué ocurre cuando algo va mal. No hay ningún formato que seguir. Se recomienda el dictado por voz: es la forma más rápida de contarlo todo.\n\nCuando la descripción sea lo bastante detallada, la convertiré en casos de uso numerados, y solo entonces diseñaremos la automatización. Sin esta descripción no se puede crear la automatización.",
    describeFirst:
      "Describe primero los escenarios: sin una descripción detallada no se puede crear la automatización. Cuéntame quién la usa, qué entra, qué debe salir y qué ocurre cuando algo va mal.",
    tooThin:
      "Todavía no puedo convertir esto en un solo caso de uso: la descripción es demasiado escueta. Cuéntame más sobre los escenarios: quién dispara la automatización, qué recibe y qué debe producir.",
    noCases:
      "Esta automatización aún no tiene casos de uso. Describe primero los escenarios (el Quiz los recoge): sin una descripción detallada no se puede construir.",
    notReviewed:
      "Lee los casos de uso y confírmalos antes de empezar el desarrollo: aquí es donde tú y la IA acordáis que te ha entendido. Abre el panel «User cases» y pulsa «I read them».",
  },
  fr: {
    greeting:
      "Avant de construire cette automatisation, décrivez ses CAS D'USAGE — tous les scénarios qui peuvent se présenter pour vous, ou pour l'IA, en l'utilisant. Parlez librement, avec vos mots : qui fait quoi et quand, ce qui entre et ce qui doit sortir, et ce qui se passe quand quelque chose tourne mal. Aucun format à respecter. La dictée vocale est recommandée — c'est le moyen le plus rapide de tout exprimer.\n\nQuand votre description sera assez détaillée, je la transformerai en cas d'usage numérotés, et seulement ensuite nous concevrons l'automatisation. Sans cette description, l'automatisation ne peut pas être créée.",
    describeFirst:
      "Décrivez d'abord les scénarios — sans description détaillée, l'automatisation ne peut pas être créée. Dites-moi qui l'utilise, ce qui entre, ce qui doit sortir et ce qui se passe en cas d'erreur.",
    tooThin:
      "Je n'arrive pas encore à en tirer un seul cas d'usage : la description reste trop vague. Parlez davantage des scénarios : qui déclenche l'automatisation, ce qu'elle reçoit et ce qu'elle doit produire.",
    noCases:
      "Cette automatisation n'a encore aucun cas d'usage. Décrivez d'abord les scénarios (le Quiz les recueille) — sans description détaillée, rien ne peut être construit.",
    notReviewed:
      "Lisez les cas d'usage et confirmez-les avant que le développement commence — c'est ici que vous et l'IA vous mettez d'accord. Ouvrez le panneau « User cases » et appuyez sur « I read them ».",
  },
  it: {
    greeting:
      "Prima di costruire questa automazione, descrivi i suoi CASI D'USO — tutti gli scenari che possono capitare a te, o all'IA, lavorando con essa. Parla liberamente, con parole tue: chi fa cosa e quando, cosa entra e cosa deve uscire, e cosa succede quando qualcosa va storto. Non c'è alcun formato da seguire. È consigliata la dettatura vocale: è il modo più rapido per dire tutto.\n\nQuando la descrizione sarà abbastanza dettagliata, la trasformerò in casi d'uso numerati, e solo allora progetteremo l'automazione. Senza questa descrizione l'automazione non può essere creata.",
    describeFirst:
      "Descrivi prima gli scenari — senza una descrizione dettagliata l'automazione non può essere creata. Dimmi chi la usa, cosa entra, cosa deve uscire e cosa succede quando qualcosa va storto.",
    tooThin:
      "Non riesco ancora a ricavarne un solo caso d'uso: la descrizione è troppo generica. Racconta di più sugli scenari: chi avvia l'automazione, cosa riceve e cosa deve produrre.",
    noCases:
      "Questa automazione non ha ancora casi d'uso. Descrivi prima gli scenari (li raccoglie il Quiz) — senza una descrizione dettagliata non si può costruire nulla.",
    notReviewed:
      "Leggi i casi d'uso e confermali prima che inizi lo sviluppo: qui tu e l'IA vi accordate sul fatto che ti abbia capito. Apri il pannello «User cases» e premi «I read them».",
  },
  de: {
    greeting:
      "Bevor wir diese Automatisierung bauen, beschreibe ihre ANWENDUNGSFÄLLE — alle Szenarien, die dir oder der KI im Umgang mit ihr begegnen können. Sprich frei, in deinen eigenen Worten: wer was wann tut, was hereinkommt und was herauskommen soll, und was passiert, wenn etwas schiefgeht. Es gibt kein Format einzuhalten. Spracheingabe wird empfohlen — so bekommst du am schnellsten alles heraus.\n\nWenn deine Beschreibung ausführlich genug ist, mache ich daraus nummerierte Anwendungsfälle, und erst dann entwerfen wir die Automatisierung selbst. Ohne diese Beschreibung kann die Automatisierung nicht erstellt werden.",
    describeFirst:
      "Beschreibe zuerst die Szenarien — ohne ausführliche Beschreibung kann die Automatisierung nicht erstellt werden. Sag mir, wer sie nutzt, was hereinkommt, was herauskommen muss und was passiert, wenn etwas schiefgeht.",
    tooThin:
      "Daraus lässt sich noch kein einziger Anwendungsfall machen — die Beschreibung ist zu dünn. Erzähl mehr über die Szenarien: wer die Automatisierung auslöst, was sie erhält und was sie liefern muss.",
    noCases:
      "Diese Automatisierung hat noch keine Anwendungsfälle. Beschreibe zuerst die Szenarien (das Quiz sammelt sie) — ohne ausführliche Beschreibung lässt sich nichts bauen.",
    notReviewed:
      "Lies die Anwendungsfälle und bestätige sie, bevor die Entwicklung beginnt — hier einigt ihr euch, du und die KI, dass sie dich verstanden hat. Öffne das Panel „User cases“ und drücke „I read them“.",
  },
  pt: {
    greeting:
      "Antes de construirmos esta automação, descreva os seus CASOS DE USO — todos os cenários que podem surgir para si, ou para a IA, ao trabalhar com ela. Fale livremente, com as suas próprias palavras: quem faz o quê e quando, o que entra e o que deve sair, e o que acontece quando algo corre mal. Não há nenhum formato a seguir. Recomenda-se o ditado por voz — é a forma mais rápida de dizer tudo.\n\nQuando a sua descrição for suficientemente detalhada, transformá-la-ei em casos de uso numerados, e só depois desenharemos a própria automação. Sem esta descrição a automação não pode ser criada.",
    describeFirst:
      "Descreva primeiro os cenários — sem uma descrição detalhada a automação não pode ser criada. Diga-me quem a usa, o que entra, o que deve sair e o que acontece quando algo corre mal.",
    tooThin:
      "Ainda não consegui transformar isto num único caso de uso — a descrição continua demasiado vaga. Fale mais sobre os cenários: quem aciona a automação, o que ela recebe e o que deve produzir.",
    noCases:
      "Esta automação ainda não tem casos de uso. Descreva primeiro os cenários (o Quiz recolhe-os) — sem uma descrição detalhada a automação não pode ser construída.",
    notReviewed:
      "Leia os casos de uso e confirme-os antes de o desenvolvimento começar — é aqui que você e a IA acordam que ela o entendeu. Abra o painel «User cases» e prima «I read them».",
  },
  pl: {
    greeting:
      "Zanim zbudujemy tę automatyzację, opisz jej PRZYPADKI UŻYCIA — wszystkie scenariusze, jakie mogą się pojawić u ciebie lub u AI podczas pracy z nią. Mów swobodnie, własnymi słowami: kto co robi i kiedy, co wchodzi i co powinno wyjść, i co się dzieje, gdy coś pójdzie nie tak. Nie ma żadnego formatu do zachowania. Zalecane jest dyktowanie głosowe — to najszybszy sposób, by powiedzieć wszystko.\n\nGdy twój opis będzie wystarczająco szczegółowy, zamienię go w ponumerowane przypadki użycia, i dopiero wtedy zaprojektujemy samą automatyzację. Bez tego opisu automatyzacji nie da się utworzyć.",
    describeFirst:
      "Najpierw opisz scenariusze — bez szczegółowego opisu automatyzacji nie da się utworzyć. Powiedz mi, kto z niej korzysta, co wchodzi, co powinno wyjść i co się dzieje, gdy coś pójdzie nie tak.",
    tooThin:
      "Nie udało mi się jeszcze zamienić tego w choćby jeden przypadek użycia — opis jest wciąż zbyt ogólny. Powiedz więcej o scenariuszach: kto uruchamia automatyzację, co otrzymuje i co powinna wyprodukować.",
    noCases:
      "Ta automatyzacja nie ma jeszcze przypadków użycia. Najpierw opisz scenariusze (zbiera je Quiz) — bez szczegółowego opisu nie da się niczego zbudować.",
    notReviewed:
      "Przeczytaj przypadki użycia i potwierdź je, zanim rozpocznie się rozwój — tu ty i AI zgadzacie się, że dobrze cię zrozumiała. Otwórz panel «User cases» i naciśnij «I read them».",
  },
  tr: {
    greeting:
      "Bu otomasyonu inşa etmeden önce, KULLANIM SENARYOLARINI tanımlayın — onunla çalışırken sizin veya yapay zekânın karşılaşabileceği her senaryo. Kendi sözlerinizle, serbestçe konuşun: kim ne yapıyor ve ne zaman, ne giriyor ve ne çıkması gerekiyor, ve bir şeyler ters gittiğinde ne oluyor. Uyulması gereken bir format yok. Sesli dikte önerilir — her şeyi anlatmanın en hızlı yolu budur.\n\nAçıklamanız yeterince ayrıntılı olduğunda, onu numaralandırılmış kullanım senaryolarına dönüştüreceğim ve ancak o zaman otomasyonun kendisini tasarlayacağız. Bu açıklama olmadan otomasyon oluşturulamaz.",
    describeFirst:
      "Önce senaryoları tanımlayın — ayrıntılı bir açıklama olmadan otomasyon oluşturulamaz. Bana kimin kullandığını, neyin girdiğini, neyin çıkması gerektiğini ve bir şeyler ters gittiğinde ne olduğunu anlatın.",
    tooThin:
      "Bunu henüz tek bir kullanım senaryosuna dönüştüremedim — açıklama hâlâ çok yetersiz. Senaryolar hakkında daha fazla şey söyleyin: otomasyonu kim tetikliyor, neyi alıyor ve ne üretmesi gerekiyor.",
    noCases:
      "Bu otomasyonun henüz kullanım senaryosu yok. Önce senaryoları tanımlayın (Quiz onları toplar) — ayrıntılı bir açıklama olmadan hiçbir şey inşa edilemez.",
    notReviewed:
      "Geliştirme başlamadan önce kullanım senaryolarını okuyun ve onaylayın — burada siz ve yapay zekâ, onun sizi doğru anladığı konusunda anlaşırsınız. «User cases» panelini açın ve «I read them» düğmesine basın.",
  },
  nl: {
    greeting:
      "Voordat we deze automatisering bouwen, beschrijf de GEBRUIKSCASUSSEN ervan — elk scenario dat zich voor jou, of voor de AI, kan voordoen bij het werken ermee. Spreek vrijuit, in je eigen woorden: wie doet wat en wanneer, wat komt binnen en wat moet eruit komen, en wat gebeurt er als iets misgaat. Er is geen vast format om te volgen. Spraakinvoer wordt aanbevolen — het is de snelste manier om alles eruit te krijgen.\n\nZodra je beschrijving gedetailleerd genoeg is, zet ik hem om in genummerde gebruikscasussen, en pas dan ontwerpen we de automatisering zelf. Zonder deze beschrijving kan de automatisering niet worden aangemaakt.",
    describeFirst:
      "Beschrijf eerst de scenario's — zonder een gedetailleerde beschrijving kan de automatisering niet worden aangemaakt. Vertel me wie hem gebruikt, wat erin komt, wat eruit moet komen en wat er gebeurt als iets misgaat.",
    tooThin:
      "Ik kon hier nog geen enkele gebruikscasus uit halen — de beschrijving is nog te vaag. Vertel meer over de scenario's: wie de automatisering activeert, wat hij ontvangt en wat hij moet opleveren.",
    noCases:
      "Deze automatisering heeft nog geen gebruikscasussen. Beschrijf eerst de scenario's (de Quiz verzamelt ze) — zonder een gedetailleerde beschrijving kan er niets worden gebouwd.",
    notReviewed:
      "Lees de gebruikscasussen en bevestig ze voordat de ontwikkeling begint — hier spreken jij en de AI af dat ze je goed heeft begrepen. Open het paneel «User cases» en druk op «I read them».",
  },
};

/** The owner-facing text in HIS language: one of the six we ship, English for anything else. */
export function t(key: PromptKey, language: string = defaultLanguage()): string {
  const code = language.toLowerCase().slice(0, 2) as UiLang;
  return (PROMPTS[code] ?? PROMPTS.en)[key];
}

export function useCasesGreeting(language: string): string {
  return t("greeting", language);
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
  if (target.kind === "entity") return entityContext(target.automation, target.projectDir, target.entityType);
  if (target.kind === "page") return pageContext(target.automation, target.projectDir, target.pageRel);
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
  if (target.kind === "entity") {
    return chat([
      { role: "system", content: ENTITY_SYSTEM(languageName(quiz.language), seed) },
      ...history,
      { role: "user", content: history.length === 0
          ? "Ask me your first question about what I need from this part of the automation."
          : "Ask your next question, or if the requirement is clear, reply with exactly: READY" },
    ]);
  }
  if (target.kind === "page") {
    return chat([
      { role: "system", content: PAGE_SYSTEM(languageName(quiz.language), seed) },
      ...history,
      { role: "user", content: history.length === 0
          ? "Ask me your first question about what this public page must do for its visitors."
          : "Ask your next question, or if the page is clear, reply with exactly: READY" },
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

/** Synthesize the ENTITY REQUIREMENT from the brainstorm (step 239) — plain text of WHAT this part must do,
 *  in the project's language. It becomes the entity's transport brief; NO name, NO code, NO dev step. */
export async function synthesizeEntity(quiz: QuizRow, seed: string, turns: Turn[]): Promise<{ brief: string }> {
  const transcript = turns.map((t) => `${t.role === "user" ? "OWNER" : "YOU"}: ${t.content}`).join("\n");
  const out = await chat([
    { role: "system", content: `You turn a short conversation into ONE clear REQUIREMENT for a part of an automation. Reply with STRICT JSON only:
{"brief":"<the requirement, in ${languageName(quiz.language)}: WHAT this part must show or do, its data, and any rules — never code or a component choice>"}
The brief is written in ${languageName(quiz.language)}. Keep only what the owner actually wants; do not invent scope he did not state.` },
    { role: "user", content: `${seed}\n\nThe conversation:\n${transcript || "(no questions were answered — infer the requirement from the context)"}` },
  ], "gpt-4o-mini", { json: true });
  try {
    const j = JSON.parse(out.replace(/^```json\s*|\s*```$/g, "")) as { brief?: string };
    return { brief: (j.brief ?? "").trim() || out.trim() || "Not described." };
  } catch {
    return { brief: out.trim() || "Not described." };
  }
}

/** Synthesize the PUBLIC PAGE's to-do list from the brainstorm (step 242) — a short list of concrete,
 *  buildable tasks (a section, a field, a behaviour), in the project's language. Each item is written into the
 *  page's README to-do list by page-apply; NO code, NO component names, NO dev step. */
export async function synthesizePage(quiz: QuizRow, seed: string, turns: Turn[]): Promise<{ todos: string[] }> {
  const transcript = turns.map((t) => `${t.role === "user" ? "OWNER" : "YOU"}: ${t.content}`).join("\n");
  const out = await chat([
    { role: "system", content: `You turn a short conversation into a TO-DO LIST for a coding agent building ONE public application page. Reply with STRICT JSON only:
{"todos":["<one concrete task, in ${languageName(quiz.language)}>", "..."]}
Each item is one buildable task — a section, a field, a rule, a behaviour a visitor experiences — never code or a component name. Give 2-6 items. Keep only what the owner actually wants; do not invent scope he did not state.` },
    { role: "user", content: `${seed}\n\nThe conversation:\n${transcript || "(no questions were answered — infer the page from the context)"}` },
  ], "gpt-4o-mini", { json: true });
  try {
    const j = JSON.parse(out.replace(/^```json\s*|\s*```$/g, "")) as { todos?: unknown };
    const todos = Array.isArray(j.todos) ? j.todos.map(String).map((s) => s.trim()).filter(Boolean).slice(0, 10) : [];
    return { todos: todos.length ? todos : [out.trim() || "Not described."] };
  } catch {
    return { todos: [out.trim() || "Not described."] };
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
  if (target.kind === "entity") {
    return `You are drafting the REQUIREMENT for one part of an automation ALONE, thinking out loud, in the
language: ${lang}.

${seed || "(no context)"}

Run the brainstorm YOURSELF: ask the questions you would have asked the owner and answer them from the
context above, using reasonable defaults where it is silent. Be concrete and short (under 200 words). End
with a clear statement of WHAT this part must show or do for this automation — never code or a component
choice. Write ONLY in ${lang}. The owner is reading you live and may edit your text — write it as the final
requirement, not as a chat.`;
  }
  if (target.kind === "page") {
    return `You are designing a PUBLIC APPLICATION PAGE ALONE, thinking out loud, in the language: ${lang}.

${seed || "(no context)"}

Run the brainstorm YOURSELF: ask the questions you would have asked the owner and answer them from the context
above, using reasonable defaults where it is silent. Be concrete and short (under 200 words). End with a clear
statement of WHAT a visitor sees, enters and gets on this page — never code or a component choice. Write ONLY
in ${lang}. The owner is reading you live and may edit your text — write it as the final brief, not as a chat.`;
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
  // No explicit row. It is mid-node-design if it already produced nodes. But node_count only counts nodes the
  // QUIZ itself made — the in-product develop agent (step 250) and the Builder create nodes with node_count
  // still 0, which used to pin the phase at "usecases" forever and force the use-cases modal open on every
  // visit even after the cases were written AND approved (probe-250c). The real signal the use-cases stage is
  // done is the step-231 REVIEW: cases exist and the owner confirmed them → the automation is past use cases.
  if (quiz.node_count > 0) return "nodes";
  const rev = await reviewState(target.automation);
  return rev.hasCases && rev.reviewed ? "nodes" : "usecases";
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
