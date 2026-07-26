import { readFileSync } from "node:fs";
import { join } from "node:path";

// МОЗГ v2-QUIZ пользовательских кейсов — самодостаточный (без БД, без @/lib): ИИ-функции описания сценариев
// и синтеза их в кейсы. Промпты перенесены ДОСЛОВНО из v1 `lib/quiz.ts` (правило переноса), но вся обвязка
// сессии/узлов/рёбер/БД v1 отброшена: у v2 кейсы живут в ЯДРЕ, а разговор держит сам клиент (stateless).
//
// КЛЮЧ — глобальный ключ рабочего пространства (шаг 208): окружение → своя `.env.local` → `.env.local` слота.

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

export function openAiKey(): string {
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;
  try {
    const raw = readFileSync(join(process.cwd(), ".env.local"), "utf-8");
    return (raw.match(/^OPENAI_API_KEY=(.+)$/m) ?? [])[1]?.trim() ?? "";
  } catch { return ""; }
}

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

/** Язык проекта по умолчанию — на нём Quiz говорит (перенос v1 `defaultLanguage`). */
export function defaultLanguage(): string {
  const chosen = readKey("NEXT_PUBLIC_DEFAULT_LOCALE").toLowerCase();
  if (chosen) return chosen;
  const first = readKey("NEXT_PUBLIC_SUPPORTED_LANGUAGES").split(",").map((s) => s.trim()).filter(Boolean)[0];
  return first || "en";
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
  if (!key) throw new Error("OPENAI_API_KEY is not set — add it in the workspace settings.");
  const r = await fetch(OPENAI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: "gpt-4o-mini", messages, temperature: 0.4,
      ...(opts?.json ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  if (!r.ok) throw new Error(`OpenAI ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const d = (await r.json()) as { choices?: { message?: { content?: string } }[] };
  return d.choices?.[0]?.message?.content?.trim() ?? "";
}

// ── ВОПРОС-ОТВЕТ (ручной диалог) — система, дословно из v1 `USECASES_SYSTEM` (сокращённая до сути описания
//    сценариев; блок обязательных вопросов о каналах сохранён). ─────────────────────────────────────────
function usecasesSystem(lang: string, instruction: string): string {
  return `You are helping an automation's owner describe its USER CASES — the scenarios the automation must handle.
This happens BEFORE any node of the automation is designed: nothing gets built until the scenarios are clear.

The owner's instruction (all you know so far):
"""
${instruction || "(not stated)"}
"""

WHAT A GOOD SET OF USER CASES CONTAINS
- who triggers the automation and how (a person, a schedule, an incoming message, another system),
- which INPUT and OUTPUT channels it must have,
- what data comes IN and what must come OUT,
- the normal path, and the variations the owner cares about,
- what should happen when something goes wrong or the input is unexpected.

Ask ONE short question at a time, IN THE SAME LANGUAGE THE OWNER WRITES IN — mirror the language of their
messages exactly (before they have written anything, use ${languageName(lang)}). When you have enough to
write the scenarios, reply with exactly: READY`;
}

/** Следующий вопрос по описанию сценариев (ручной режим). Разговор целиком приходит от клиента. */
export async function nextUseCaseQuestion(lang: string, instruction: string, turns: Turn[]): Promise<string> {
  return chat([
    { role: "system", content: usecasesSystem(lang, instruction) },
    ...turns,
    { role: "user", content: turns.length === 0
        ? "Start: ask me your first question."
        : "Ask your next question, or if you have what you need, reply with exactly: READY" },
  ]);
}

// ── АВТОКВИЗ — система, дословно из v1 `USECASES_AUTO_SYSTEM`. ────────────────────────────────────────────
export function autoMessages(lang: string, instruction: string, turns: Turn[]) {
  const transcript = turns.map((x) => `${x.role === "user" ? "OWNER" : "DESIGNER"}: ${x.content}`).join("\n");
  const system = `You are describing the USER CASES of an automation ALONE, thinking out loud, IN THE SAME
LANGUAGE THE OWNER USES in the text below — mirror their language exactly (if there is no owner text yet, use
${languageName(lang)}).

The owner's instruction (the seed):
"""
${instruction || "(not stated)"}
"""

ENUMERATE the DISTINCT scenarios the automation must handle — the main flow, its meaningful variations, the
different triggers and outputs, and what happens when something goes wrong — EACH AS ITS OWN SHORT PARAGRAPH.
Do NOT merge them into one blob: the more clearly separated the scenarios are here, the better they become
real, separate user cases. Be concrete and short (aim under 300 words total). The owner reads you live and may
edit your text — write it as the final description of the scenarios, not as a chat. Write ONLY in the owner's
language.`;
  return [
    { role: "system", content: system },
    { role: "user", content: transcript ? `What has been said so far:\n${transcript}\n\nContinue describing the user cases.` : "Describe the user cases." },
  ];
}

// ── СИНТЕЗ РАЗГОВОРА В КЕЙСЫ — промпт дословно из v1 `synthesizeUseCases`. ───────────────────────────────
export async function synthesizeUseCases(lang: string, instruction: string, turns: Turn[]): Promise<{ title: string; summary: string }[]> {
  const transcript = turns.map((t) => `${t.role === "user" ? "OWNER" : "YOU"}: ${t.content}`).join("\n");
  const out = await chat([
    { role: "system", content: `You turn a conversation about an automation into its USER CASES. Reply with STRICT JSON only:
{"cases":[{"title":"<a short case title, max 8 words>","summary":"<the scenario in 1-4 sentences: who does what, the input, the expected result, the edge case>"}]}

DECOMPOSE the owner's description into its DISTINCT user cases: the main path, each meaningful variation, each
different trigger or output, and the important failure / edge cases — EACH AS A SEPARATE CASE. Aim for SEVERAL
(typically 3 to 8), not one. NEVER invent a scenario the owner did not imply or state. Only if the owner truly
described a single, indivisible scenario is one case acceptable — but first look for the natural sub-scenarios
inside what they said (e.g. "log a meal", "get the calorie count back", "the daily summary", "an unrecognised
photo" are four cases, not one).
Write the title and summary in the SAME LANGUAGE the owner used in the conversation.` },
    { role: "user", content: `The owner's instruction:\n${instruction || "(not stated)"}\n\nThe conversation:\n${transcript || "(the owner said nothing — derive the cases from the instruction alone)"}` },
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
