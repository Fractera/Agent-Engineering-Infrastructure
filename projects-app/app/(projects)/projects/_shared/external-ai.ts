import { openAiKey } from "@/lib/quiz";

// THE ONE EXTERNAL-AI PATH FOR NODE CODE (step 241).
//
// The contract (README, "The node → functions contract"): a node's functions are DETERMINISTIC application
// code. The application never "thinks"; AI is allowed ONLY as an explicit, declared, external tool-call step
// of a node — a NodeFunction carrying `externalAi.systemInstruction`. This helper is that call, and the only
// one: a node must never open its own connection to a model, so there is exactly one place where the key, the
// model and the failure behaviour live.
//
// The KEY is the workspace-global one (step 208 — one key, many automations); the MODEL is per-automation
// (<SLUG>_MODEL, chosen in the automation's Settings), which is why it is passed in by the executor rather
// than hardcoded here.
//
// FAILURE IS LOUD, never silent: with no key, or on a non-2xx, this throws. The executor records the node as
// FAILED with the real message — an automation that quietly produced an empty article would be far worse than
// one that says "the AI step could not run".
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

export async function callExternalAi(
  systemInstruction: string,
  userContent: string,
  opts?: { model?: string; json?: boolean },
): Promise<string> {
  const key = openAiKey();
  if (!key) throw new Error("no OpenAI key — set it in the workspace settings (the node's external AI step cannot run)");
  const r = await fetch(OPENAI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: opts?.model ?? "gpt-4o-mini",
      messages: [
        { role: "system", content: systemInstruction },
        { role: "user", content: userContent },
      ],
      temperature: 0.3,
      ...(opts?.json === false ? {} : { response_format: { type: "json_object" } }),
    }),
  });
  if (!r.ok) throw new Error(`external AI call failed: ${r.status} ${(await r.text()).slice(0, 160)}`);
  const d = (await r.json()) as { choices?: { message?: { content?: string } }[] };
  const out = d.choices?.[0]?.message?.content?.trim() ?? "";
  if (!out) throw new Error("external AI returned an empty answer");
  return out;
}
