// МОЗГ Quiz пользовательских кейсов — перенос из слоя проектов (коммит `c7aad6c`,
// `projects-app/.../use-cases/server/quiz-brain.ts`), снесённого шагом 500.
//
// 🔒 ПРОМПТЫ ПЕРЕНЕСЕНЫ ДОСЛОВНО. Они переживали правки владельца больше года, и
// каждая формулировка в них оплачена разбором конкретного провала. Перепишешь
// «покрасивее» — вернёшь провал, о котором уже забыли.
//
// Три функции и три разные задачи:
//   1. следующий вопрос — по ОДНОМУ короткому за раз, на языке владельца;
//   2. автоквиз — модель пишет описание сценариев вслух, стримом, а владелец
//      читает и правит;
//   3. синтез — разговор превращается в пронумерованные кейсы строгим JSON.
//
// МОДЕЛЬ. Владелец решил (2026-08-10): та, что выбрана в панели. Сегодня продукт
// хранит ровно один выбор модели — `LLM_MODEL` в окружении службы RAG; его и
// берём, с честным запасным вариантом. Появится отдельный выбор — подключится
// сюда одной строкой.

import fs from "fs";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const RAG_ENV = process.env.RAG_ENV_PATH ?? "/opt/fractera/services/rag/.env";
const APP_ENV = process.env.APP_ENV_PATH ?? "/opt/fractera/app/.env.local";

function readEnvFrom(file: string, names: string[]): string {
  try {
    const raw = fs.readFileSync(file, "utf-8");
    for (const name of names) {
      const m = raw.match(new RegExp(`^${name}=(.+)$`, "m"));
      if (m && m[1].trim()) return m[1].trim();
    }
  } catch { /* файла нет — идём дальше */ }
  return "";
}

/** Тот же порядок поиска, что у расшифровки речи: одно правило на всю панель. */
export function openAiKey(): string {
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;
  return (
    readEnvFrom(RAG_ENV, ["OPENAI_API_KEY", "LLM_BINDING_API_KEY"]) ||
    readEnvFrom(APP_ENV, ["OPENAI_API_KEY"])
  );
}

export function quizModel(): string {
  return process.env.QUIZ_MODEL || readEnvFrom(RAG_ENV, ["LLM_MODEL"]) || "gpt-4o-mini";
}

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English", ru: "Russian (русский)", es: "Spanish (español)", de: "German (Deutsch)",
  fr: "French (français)", it: "Italian (italiano)", pt: "Portuguese (português)", pl: "Polish (polski)",
  uk: "Ukrainian (українська)", tr: "Turkish (Türkçe)", ar: "Arabic (العربية)", zh: "Chinese (中文)",
  ja: "Japanese (日本語)", ko: "Korean (한국어)", hi: "Hindi (हिन्दी)", nl: "Dutch (Nederlands)",
};
export function languageName(code: string): string {
  return LANGUAGE_NAMES[code.toLowerCase()] ?? code;
}

export type Turn = { role: "user" | "assistant"; content: string };

async function chat(messages: { role: string; content: string }[], opts?: { json?: boolean }): Promise<string> {
  const key = openAiKey();
  if (!key) throw new Error("no-key");
  const r = await fetch(OPENAI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: quizModel(), messages, temperature: 0.4,
      ...(opts?.json ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  if (!r.ok) throw new Error(`OpenAI ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const d = (await r.json()) as { choices?: { message?: { content?: string } }[] };
  return d.choices?.[0]?.message?.content?.trim() ?? "";
}

// ── 1. Вопрос-ответ (ручной диалог) ──────────────────────────────────────────

function usecasesSystem(lang: string, seed: string): string {
  return `You are helping a product's owner describe its USER CASES — the scenarios the product must handle.
This happens BEFORE anything is built: nothing gets built until the scenarios are clear.

What the owner has already told you:
"""
${seed || "(nothing yet)"}
"""

WHAT A GOOD SET OF USER CASES CONTAINS
- who uses the product and what brings them to it,
- what they do, step by step, in the normal path,
- what must be true when they are done — the outcome they came for,
- the variations the owner cares about,
- what should happen when something goes wrong or the input is unexpected.

Ask ONE short question at a time, IN THE SAME LANGUAGE THE OWNER WRITES IN — mirror the language of their
messages exactly (before they have written anything, use ${languageName(lang)}). When you have enough to
write the scenarios, reply with exactly: READY`;
}

export async function nextQuestion(lang: string, seed: string, turns: Turn[]): Promise<string> {
  return chat([
    { role: "system", content: usecasesSystem(lang, seed) },
    ...turns,
    { role: "user", content: turns.length === 0
        ? "Start: ask me your first question."
        : "Ask your next question, or if you have what you need, reply with exactly: READY" },
  ]);
}

// ── 2. Автоквиз (стрим) ──────────────────────────────────────────────────────

export function autoMessages(lang: string, seed: string, turns: Turn[]) {
  const transcript = turns.map((x) => `${x.role === "user" ? "OWNER" : "DESIGNER"}: ${x.content}`).join("\n");
  const system = `You are describing the USER CASES of a product ALONE, thinking out loud, IN THE SAME
LANGUAGE THE OWNER USES in the text below — mirror their language exactly (if there is no owner text yet, use
${languageName(lang)}).

What the owner told you (the seed):
"""
${seed || "(not stated)"}
"""

ENUMERATE the DISTINCT scenarios the product must handle — the main flow, its meaningful variations, the
different people who use it, the different outcomes, and what happens when something goes wrong — EACH AS ITS
OWN SHORT PARAGRAPH. Do NOT merge them into one blob: the more clearly separated the scenarios are here, the
better they become real, separate user cases. Be concrete and short (aim under 300 words total). The owner
reads you live and may edit your text — write it as the final description of the scenarios, not as a chat.
Write ONLY in the owner's language.`;
  return [
    { role: "system", content: system },
    { role: "user", content: transcript
        ? `What has been said so far:\n${transcript}\n\nContinue describing the user cases.`
        : "Describe the user cases." },
  ];
}

/** Стрим автоквиза: отдаём тело ответа OpenAI как есть — клиент читает SSE сам. */
export async function autoStream(lang: string, seed: string, turns: Turn[]): Promise<Response> {
  const key = openAiKey();
  if (!key) throw new Error("no-key");
  return fetch(OPENAI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: quizModel(), messages: autoMessages(lang, seed, turns), temperature: 0.4, stream: true,
    }),
  });
}

// ── 3. Синтез разговора в кейсы ──────────────────────────────────────────────

export async function synthesize(seed: string, turns: Turn[]): Promise<{ title: string; summary: string }[]> {
  const transcript = turns.map((t) => `${t.role === "user" ? "OWNER" : "YOU"}: ${t.content}`).join("\n");
  const out = await chat([
    { role: "system", content: `You turn a conversation about a product into its USER CASES. Reply with STRICT JSON only:
{"cases":[{"title":"<a short case title, max 8 words>","summary":"<the scenario in 1-4 sentences: who does what, what they came for, the expected result, the edge case>"}]}

DECOMPOSE the owner's description into its DISTINCT user cases: the main path, each meaningful variation, each
different person or trigger, and the important failure / edge cases — EACH AS A SEPARATE CASE. Aim for SEVERAL
(typically 3 to 8), not one. NEVER invent a scenario the owner did not imply or state. Only if the owner truly
described a single, indivisible scenario is one case acceptable — but first look for the natural sub-scenarios
inside what they said (e.g. "log a meal", "get the calorie count back", "the daily summary", "an unrecognised
photo" are four cases, not one).
Write the title and summary in the SAME LANGUAGE the owner used in the conversation.` },
    { role: "user", content: `What the owner told you:\n${seed || "(not stated)"}\n\nThe conversation:\n${transcript || "(the owner said nothing beyond the seed — derive the cases from it alone)"}` },
  ], { json: true });
  try {
    const j = JSON.parse(out.replace(/^```json\s*|\s*```$/g, "")) as { cases?: { title?: string; summary?: string }[] };
    return (j.cases ?? [])
      .map((c) => ({ title: (c.title ?? "").trim().slice(0, 200), summary: (c.summary ?? "").trim() }))
      .filter((c) => c.title);
  } catch {
    return [];
  }
}

/** Переписать ОДИН кейс по замечанию владельца — правка, а не новый разговор. */
export async function rewriteCase(
  title: string, summary: string, remark: string,
): Promise<{ title: string; summary: string } | null> {
  const out = await chat([
    { role: "system", content: `You rewrite ONE user case after its owner's remark. Reply with STRICT JSON only:
{"title":"<short title, max 8 words>","summary":"<the scenario in 1-4 sentences>"}

Keep everything the owner did not ask to change. Their remark is the authority: if it contradicts the current
text, the remark wins. NEVER add a scenario they did not mention. Answer in the language of the remark.` },
    { role: "user", content: `Current case:\nTITLE: ${title}\nSUMMARY: ${summary}\n\nThe owner's remark:\n${remark}` },
  ], { json: true });
  try {
    const j = JSON.parse(out.replace(/^```json\s*|\s*```$/g, "")) as { title?: string; summary?: string };
    if (!j.title?.trim()) return null;
    return { title: j.title.trim().slice(0, 200), summary: (j.summary ?? "").trim() };
  } catch {
    return null;
  }
}
